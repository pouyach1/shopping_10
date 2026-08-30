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
 */
export async function decrementUnderHold(
  hold: InventoryHoldDocument,
): Promise<void> {
  const lines = hold.items.map((item) => ({
    productId: String(item.productId),
    quantity: item.quantity,
  }));
  await decrementMany(lines);
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
    // Maybe still open (never decremented) — just mark released.
    await InventoryHold.findOneAndUpdate(
      { _id: holdId, status: 'open' },
      { $set: { status: 'released', releasedAt: new Date() } },
    );
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
 * Recover orphaned decremented holds after crash / timeout.
 * Safe to run concurrently — each hold is claimed once.
 */
export async function recoverOrphanedInventoryHolds(
  limit = 50,
): Promise<{ recovered: number }> {
  const now = new Date();
  const candidates = await InventoryHold.find({
    status: 'decremented',
    recoverAfter: { $lte: now },
  })
    .limit(limit)
    .select('_id order orderNumber');

  let recovered = 0;
  for (const hold of candidates) {
    if (hold.order || hold.orderNumber) {
      const order = hold.order
        ? await Order.findById(hold.order)
        : await Order.findOne({ orderNumber: hold.orderNumber });
      if (order) {
        await InventoryHold.findOneAndUpdate(
          { _id: hold._id, status: 'decremented' },
          {
            $set: {
              status: 'committed',
              order: order._id,
              orderNumber: order.orderNumber,
            },
          },
        );
        continue;
      }
    }

    const released = await claimReleaseDecrementedHold(
      hold._id,
      'orphan_hold_recovery',
    );
    if (released) recovered += 1;
  }

  return { recovered };
}
