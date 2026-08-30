import { Types } from 'mongoose';

import type { AuditAction, PaymentProviderId } from '../config/constants';
import {
  formatStoreOrderNumber,
  getOrderPrefix,
  getStorePrivateConfig,
} from './storeConfig.service';
import { AuditLog } from '../models/AuditLog';
import { Coupon } from '../models/Coupon';
import {
  IdempotencyRecord,
  idempotencyExpiry,
} from '../models/IdempotencyRecord';
import {
  INVENTORY_HOLD_RECOVER_MS,
  InventoryHold,
} from '../models/InventoryHold';
import { NotificationDelivery } from '../models/NotificationDelivery';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { PaymentProviderEvent } from '../models/PaymentProviderEvent';
import { Refund } from '../models/Refund';
import { Product } from '../models/Product';
import { requireStoreId, assertStoreIdMatchesContext } from '../tenant/TenantContext';
import { conflict, forbidden, notFound } from '../utils/AppError';

function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** Fail-closed: foreign storeId in payload is rejected. */
export function rejectForeignStoreId(candidate?: string | null): void {
  assertStoreIdMatchesContext(candidate);
}

export async function findOrderForStore(orderId: string) {
  const storeId = requireStoreId();
  const order = await Order.findOne({ _id: oid(orderId), storeId: oid(storeId) });
  if (!order) throw notFound('سفارش یافت نشد.');
  return order;
}

export async function findPaymentForStore(paymentId: string) {
  const storeId = requireStoreId();
  const payment = await Payment.findOne({
    _id: oid(paymentId),
    storeId: oid(storeId),
  });
  if (!payment) throw notFound('پرداخت یافت نشد.');
  return payment;
}

export async function findCouponByCode(code: string) {
  const storeId = requireStoreId();
  return Coupon.findOne({
    storeId: oid(storeId),
    code: code.trim().toUpperCase(),
  });
}

/**
 * Atomic stock decrement scoped by store — never productId alone.
 * Returns null when stock insufficient or product missing in this store.
 */
export async function decrementStoreStock(
  productId: string,
  quantity: number,
): Promise<boolean> {
  const storeId = requireStoreId();
  const updated = await Product.findOneAndUpdate(
    {
      _id: oid(productId),
      storeId: oid(storeId),
      status: 'active',
      stock: { $gte: quantity },
    },
    { $inc: { stock: -quantity } },
    { new: true },
  );
  return updated != null;
}

export async function allocateOrderNumber(sequence: number): Promise<string> {
  const prefix = await getOrderPrefix();
  return formatStoreOrderNumber(prefix, new Date().getFullYear(), sequence);
}

/**
 * Resolve payment provider binding for the current store.
 * Never returns raw secrets — only provider name + whether credentials exist.
 */
export async function resolveStorePaymentBinding() {
  const privateConfig = await getStorePrivateConfig();
  return {
    provider: privateConfig.payment.provider,
    merchantRef: privateConfig.payment.merchantRef,
    credentialsConfigured: privateConfig.payment.credentialsConfigured,
  };
}

export async function claimIdempotencyKey(
  key: string,
  operation: string,
): Promise<void> {
  const storeId = requireStoreId();
  try {
    await IdempotencyRecord.create({
      storeId: oid(storeId),
      key,
      operation,
      expiresAt: idempotencyExpiry(),
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw conflict('درخواست تکراری است.');
    }
    throw error;
  }
}

export async function writeAuditLog(input: {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  actorUserId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const storeId = requireStoreId();
  await AuditLog.create({
    storeId: oid(storeId),
    action: input.action,
    actorType: input.actorUserId ? 'admin' : 'system',
    actorId: input.actorUserId,
    entityType: input.resourceType,
    entityId: input.resourceId,
    metadata: input.meta,
  });
}

export async function listAuditForStore(limit = 50) {
  const storeId = requireStoreId();
  return AuditLog.find({ storeId: oid(storeId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function findNotificationForStore(deliveryKey: string) {
  const storeId = requireStoreId();
  return NotificationDelivery.findOne({
    storeId: oid(storeId),
    deliveryKey,
  });
}

export async function findWebhookEvent(
  provider: string,
  eventId: string,
) {
  const storeId = requireStoreId();
  return PaymentProviderEvent.findOne({
    storeId: oid(storeId),
    provider: provider as PaymentProviderId,
    eventId,
  });
}

export async function assertRefundInStore(refundId: string) {
  const storeId = requireStoreId();
  const refund = await Refund.findOne({
    _id: oid(refundId),
    storeId: oid(storeId),
  });
  if (!refund) throw notFound('بازپرداخت یافت نشد.');
  return refund;
}

export async function createInventoryHold(input: {
  userId: string;
  productId: string;
  quantity: number;
  orderId?: string;
}) {
  const storeId = requireStoreId();
  const recoverAfter = new Date(Date.now() + INVENTORY_HOLD_RECOVER_MS);
  return InventoryHold.create({
    storeId: oid(storeId),
    user: oid(input.userId),
    items: [{ productId: oid(input.productId), quantity: input.quantity }],
    order: input.orderId ? oid(input.orderId) : undefined,
    status: 'open',
    recoverAfter,
  });
}

/** Guard: staff of store A cannot mutate store B resources via guessed ids. */
export function assertResourceStore(
  resourceStoreId: string | Types.ObjectId,
): void {
  const storeId = requireStoreId();
  if (String(resourceStoreId) !== storeId) {
    throw notFound('مورد درخواستی یافت نشد.');
  }
}

export function forbidCrossStorePaymentAccess(): never {
  throw forbidden('دسترسی پرداخت بین فروشگاهی مجاز نیست.');
}
