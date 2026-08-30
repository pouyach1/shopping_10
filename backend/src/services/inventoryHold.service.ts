import { Types } from 'mongoose';

import {
  InventoryHold,
  INVENTORY_HOLD_RECOVER_MS,
  type InventoryHoldDocument,
} from '../models/InventoryHold';
import { Order } from '../models/Order';
import { recordAudit } from './audit.service';
import { decrementMany, restoreMany } from './inventory.service';
import { logger } from '../utils/logger';

export async function beginInventoryHold(input: {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
}): Promise<InventoryHoldDocument> {
  return InventoryHold.create({
    user: new Types.ObjectId(input.userId),
    status: 'open',
    items: input.items.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      quantity: item.quantity,
    })),
    recoverAfter: new Date(Date.now() + INVENTORY_HOLD_RECOVER_MS),
  });
}

/**
 * Decrement stock and mark hold as decremented (durable crash point).
 *
 * `decrementAttemptedAt` is written immediately before stock mutation so an
 * aged open hold can be recovered without permanently losing units.
 */
export async function decrementUnderHold(
  hold: InventoryHoldDocument,
): Promise<void> {
  const lines = hold.items.map((item) => ({
    productId: String(item.productId),
    quantity: item.quantity,
  }));

  await InventoryHold.findOneAndUpdate(
    { _id: hold._id, status: 'open' },
    { $set: { decrementAttemptedAt: new Date() } },
  );

  try {
    await decrementMany(lines);
  } catch (error) {
    // Decrement did not apply — clear the attempt marker so release won't restock.
    await InventoryHold.updateOne(
      { _id: hold._id },
      { $unset: { decrementAttemptedAt: 1 } },
    );
    throw error;
  }

  const marked = await InventoryHold.findOneAndUpdate(
    { _id: hold._id, status: 'open' },
    { $set: { status: 'decremented' } },
    { returnDocument: 'after' },
  );
  if (!marked) {
    // Hold already moved — compensate the decrement we just applied.
    await restoreMany(lines);
    throw new Error('inventory_hold_state_conflict');
  }
  hold.status = 'decremented';
}

export async function commitInventoryHold(
  holdId: Types.ObjectId | string,
  orderId: Types.ObjectId | string,
  orderNumber: string,
): Promise<void> {
  await InventoryHold.findOneAndUpdate(
    { _id: holdId, status: { $in: ['decremented', 'open'] } },
    {
      $set: {
        status: 'committed',
        order: new Types.ObjectId(String(orderId)),
        orderNumber,
      },
    },
  );
}

/**
 * Atomically claim a decremented hold for release + restore stock.
 * Open holds without a completed decrement are released without restore.
 * Open holds with decrementAttemptedAt restore (crash between decrement and mark).
 */
export async function claimReleaseDecrementedHold(
  holdId: Types.ObjectId | string,
  reason: string,
): Promise<boolean> {
  const claimed = await InventoryHold.findOneAndUpdate(
    { _id: holdId, status: 'decremented' },
    {
      $set: {
        status: 'released',
        releasedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );
  if (!claimed) {
    const open = await InventoryHold.findOneAndUpdate(
      { _id: holdId, status: 'open' },
      { $set: { status: 'released', releasedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (open?.decrementAttemptedAt) {
      await restoreMany(
        open.items.map((item) => ({
          productId: String(item.productId),
          quantity: item.quantity,
        })),
      );
      await recordAudit({
        action: 'inventory.restocked',
        actorType: 'system',
        entityType: 'inventory_hold',
        entityId: String(open._id),
        metadata: { reason, path: 'open_with_decrement_attempted' },
      });
      return true;
    }
    return false;
  }

  await restoreMany(
    claimed.items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
    })),
  );
  await recordAudit({
    action: 'inventory.restocked',
    actorType: 'system',
    entityType: 'inventory_hold',
    entityId: String(claimed._id),
    metadata: { reason },
  });
  logger.info('inventory.hold_released', { holdId: String(holdId), reason });
  return true;
}

/**
 * Recover orphaned holds after crash / timeout.
 * Safe to run concurrently — each hold is claimed once.
 *
 * Critical: never restock a hold that already belongs to a live order
 * (Order.inventoryHoldId), even if commitInventoryHold never ran.
 */
export async function recoverOrphanedInventoryHolds(
  limit = 50,
): Promise<{ recovered: number }> {
  const now = new Date();
  const candidates = await InventoryHold.find({
    status: { $in: ['decremented', 'open'] },
    recoverAfter: { $lte: now },
  })
    .limit(limit)
    .select('_id order orderNumber status decrementAttemptedAt');

  let recovered = 0;
  for (const hold of candidates) {
    // Prefer Order.inventoryHoldId — covers crash after Order.create before commit.
    const linkedOrder =
      (await Order.findOne({ inventoryHoldId: hold._id })) ||
      (hold.order
        ? await Order.findById(hold.order)
        : hold.orderNumber
          ? await Order.findOne({ orderNumber: hold.orderNumber })
          : null);

    if (linkedOrder) {
      await InventoryHold.findOneAndUpdate(
        { _id: hold._id, status: { $in: ['decremented', 'open'] } },
        {
          $set: {
            status: 'committed',
            order: linkedOrder._id,
            orderNumber: linkedOrder.orderNumber,
          },
        },
      );
      await recordAudit({
        action: 'inventory.hold_recovered',
        actorType: 'system',
        entityType: 'inventory_hold',
        entityId: String(hold._id),
        orderNumber: linkedOrder.orderNumber,
        metadata: { outcome: 'committed_to_order' },
      });
      continue;
    }

    if (hold.status === 'open' && !hold.decrementAttemptedAt) {
      // Never took stock — just close.
      await InventoryHold.findOneAndUpdate(
        { _id: hold._id, status: 'open' },
        { $set: { status: 'released', releasedAt: new Date() } },
      );
      continue;
    }

    const released = await claimReleaseDecrementedHold(
      hold._id,
      'orphan_hold_recovery',
    );
    if (released) recovered += 1;
  }

  return { recovered };
}
