import { Types } from 'mongoose';

import { Order, type OrderDocument } from '../models/Order';
import { recordAudit } from './audit.service';
import { restoreMany } from './inventory.service';
import { logger } from '../utils/logger';
import { storeScope } from '../tenant/storeScope';

export type InventoryReleaseReason =
  | 'customer_cancel'
  | 'admin_cancel'
  | 'payment_expired'
  | 'order_failed'
  | 'hold_recovery';

/**
 * One-time inventory release claim.
 *
 * Exactly one winner across cancel × expiry × concurrent callers.
 * Uses conditional update — never restock from a stale read.
 */
export async function claimAndRestoreOrderInventory(
  orderId: string | Types.ObjectId,
  reason: InventoryReleaseReason,
  actor?: { type: 'customer' | 'admin' | 'system'; id?: string },
): Promise<{ restored: boolean; order: OrderDocument | null }> {
  const claimed = await Order.findOneAndUpdate(
    storeScope({
      _id: orderId,
      inventoryDecremented: true,
      inventoryReleaseClaimedAt: null,
    }),
    {
      $set: {
        inventoryReleaseClaimedAt: new Date(),
        inventoryDecremented: false,
        inventoryReservedUntil: null,
      },
    },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    return {
      restored: false,
      order: await Order.findOne(storeScope({ _id: orderId })),
    };
  }

  await restoreMany(
    claimed.items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
    })),
  );

  await recordAudit({
    action: 'inventory.restocked',
    actorType: actor?.type ?? 'system',
    actorId: actor?.id,
    entityType: 'order',
    entityId: String(claimed._id),
    orderNumber: claimed.orderNumber,
    metadata: { reason },
  });

  logger.info('inventory.release_claimed', {
    orderNumber: claimed.orderNumber,
    reason,
  });

  return { restored: true, order: claimed };
}
