import { createHash } from 'node:crypto';
import { Types } from 'mongoose';

import {
  PAYMENT_RESERVATION_TTL_MS,
  PAYMENTS_DEFAULT_LIMIT,
  PAYMENTS_DEFAULT_PAGE,
  PAYMENTS_MAX_LIMIT,
} from '../config/constants';
import { env } from '../config/env';
import { Order, type OrderDocument } from '../models/Order';
import { Payment, type PaymentDocument } from '../models/Payment';
import { PaymentProviderEvent } from '../models/PaymentProviderEvent';
import {
  AppError,
  badRequest,
  conflict,
  notFound,
} from '../utils/AppError';
import { recordAudit } from './audit.service';
import { restoreMany } from './inventory.service';
import { emitCommerceEvent } from './notifications';
import {
  assertPaymentTransition,
  isOpenPaymentStatus,
} from './paymentTransitions';
import { assertTransition } from './orderTransitions';
import { getPaymentProvider } from './payments';
import {
  parseOrThrow,
  createPaymentSchema,
  paymentCallbackSchema,
  paymentListQuerySchema,
} from '../validators/payment.validators';

export interface PublicPayment {
  id: string;
  orderNumber: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  redirectUrl?: string;
  authority?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
}

function toPublicPayment(doc: PaymentDocument): PublicPayment {
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    status: doc.status,
    provider: doc.provider,
    amount: doc.amount,
    currency: doc.currency,
    redirectUrl: doc.redirectUrl,
    authority: doc.authority,
    paidAt: doc.paidAt?.toISOString(),
    expiresAt: doc.expiresAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

function reservationExpiry(from = new Date()): Date {
  return new Date(from.getTime() + env.PAYMENT_RESERVATION_TTL_MS);
}

async function loadOwnedPayableOrder(
  userId: string,
  orderNumber: string,
): Promise<OrderDocument> {
  const order = await Order.findOne({ orderNumber, user: userId });
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');

  if (order.status === 'cancelled') {
    throw conflict('سفارش لغو شده است.', undefined, 'ORDER_ALREADY_CANCELLED');
  }
  if (order.status === 'delivered' || order.status === 'shipped') {
    throw conflict('این سفارش قابل پرداخت نیست.', undefined, 'ORDER_NOT_PAYABLE');
  }
  if (order.paymentStatus === 'paid' || order.status === 'paid') {
    throw conflict('سفارش قبلاً پرداخت شده است.', undefined, 'ORDER_ALREADY_PAID');
  }
  if (order.paymentMethod !== 'online') {
    throw conflict(
      'این سفارش برای پرداخت آنلاین نیست.',
      undefined,
      'ORDER_NOT_PAYABLE',
    );
  }
  if (
    order.status !== 'awaiting_payment' &&
    order.status !== 'pending' &&
    order.paymentStatus !== 'pending' &&
    order.paymentStatus !== 'unpaid' &&
    order.paymentStatus !== 'failed'
  ) {
    throw conflict('این سفارش قابل پرداخت نیست.', undefined, 'ORDER_NOT_PAYABLE');
  }
  if (
    order.inventoryReservedUntil &&
    order.inventoryReservedUntil < new Date()
  ) {
    throw conflict('مهلت پرداخت منقضی شده است.', undefined, 'PAYMENT_EXPIRED');
  }
  return order;
}

/**
 * Create or reuse an open payment attempt for an order.
 * Amount always comes from the order document — never the client.
 */
export async function createPayment(
  userId: string,
  raw: unknown,
  idempotencyKey?: string,
): Promise<PublicPayment> {
  const input = parseOrThrow(createPaymentSchema, raw);

  if (idempotencyKey) {
    const existing = await Payment.findOne({
      user: userId,
      idempotencyKey,
    });
    if (existing) {
      if (existing.orderNumber !== input.orderNumber) {
        throw conflict(
          'کلید تکرار با درخواست متفاوت در تداخل است.',
          undefined,
          'IDEMPOTENCY_CONFLICT',
        );
      }
      return toPublicPayment(existing);
    }
  }

  // Reuse open payment for same order (double-click / refresh).
  const open = await Payment.findOne({
    orderNumber: input.orderNumber,
    user: userId,
    status: { $in: ['created', 'pending', 'redirected', 'processing'] },
  }).sort({ createdAt: -1 });
  if (open && open.redirectUrl) {
    return toPublicPayment(open);
  }

  const order = await loadOwnedPayableOrder(userId, input.orderNumber);
  const provider = getPaymentProvider();
  const expiresAt = reservationExpiry();

  const payment = await Payment.create({
    order: order._id,
    orderNumber: order.orderNumber,
    user: new Types.ObjectId(userId),
    provider: provider.id,
    status: 'created',
    amount: order.total,
    currency: order.currency,
    idempotencyKey: idempotencyKey || undefined,
    expiresAt,
    refundedAmount: 0,
    metadata: input.simulate ? { simulate: input.simulate } : undefined,
  });

  if (!order.inventoryReservedUntil) {
    order.inventoryReservedUntil = expiresAt;
    await order.save();
  }

  try {
    const created = await provider.createPayment({
      paymentId: String(payment._id),
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      description: `Luxora order ${order.orderNumber}`,
      callbackUrl: env.PAYMENT_CALLBACK_URL,
      metadata: payment.metadata,
    });

    assertPaymentTransition(payment.status, 'pending');
    payment.status = 'pending';
    payment.authority = created.authority;
    payment.redirectUrl = created.redirectUrl;
    payment.providerTransactionId = created.providerTransactionId;
    assertPaymentTransition(payment.status, 'redirected');
    payment.status = 'redirected';
    await payment.save();

    order.paymentStatus = 'pending';
    await order.save();

    await recordAudit({
      action: 'payment.created',
      actorType: 'customer',
      actorId: userId,
      entityType: 'payment',
      entityId: String(payment._id),
      orderNumber: order.orderNumber,
      metadata: { provider: provider.id, amount: payment.amount },
    });
    emitCommerceEvent('PaymentPending', {
      orderNumber: order.orderNumber,
      userId,
      paymentId: String(payment._id),
      amount: payment.amount,
      currency: payment.currency,
    });

    return toPublicPayment(payment);
  } catch (error) {
    payment.status = 'failed';
    payment.failureCode = 'PAYMENT_PROVIDER_ERROR';
    payment.failureReason =
      error instanceof Error ? error.message : 'provider error';
    await payment.save();
    throw new AppError(502, 'خطا در اتصال به درگاه پرداخت.', {
      code: 'PAYMENT_PROVIDER_ERROR',
    });
  }
}

async function markPaymentFailed(
  payment: PaymentDocument,
  code: string,
  reason: string,
): Promise<void> {
  if (!isOpenPaymentStatus(payment.status) && payment.status !== 'processing') {
    return;
  }
  if (payment.status !== 'failed') {
    assertPaymentTransition(
      payment.status === 'redirected' || payment.status === 'pending'
        ? payment.status
        : payment.status,
      'failed',
    );
    payment.status = 'failed';
  }
  payment.failureCode = code;
  payment.failureReason = reason;
  await payment.save();

  const order = await Order.findById(payment.order);
  if (order && order.paymentStatus !== 'paid') {
    order.paymentStatus = 'failed';
    await order.save();
  }

  await recordAudit({
    action: 'payment.failed',
    actorType: 'system',
    entityType: 'payment',
    entityId: String(payment._id),
    orderNumber: payment.orderNumber,
    metadata: { code, reason },
  });
  emitCommerceEvent('PaymentFailed', {
    orderNumber: payment.orderNumber,
    paymentId: String(payment._id),
    reason,
  });
}

/**
 * Apply verified success to payment + order.
 * Late success after cancel → auto-refund policy (no paid+cancelled).
 */
async function applySuccessfulPayment(
  payment: PaymentDocument,
  providerTransactionId: string | undefined,
  source: 'callback' | 'webhook',
): Promise<{ outcome: 'paid' | 'auto_refunded' | 'already_paid' }> {
  if (payment.status === 'paid' || payment.status === 'refunded') {
    return { outcome: 'already_paid' };
  }

  assertPaymentTransition(
    payment.status === 'redirected' ||
      payment.status === 'pending' ||
      payment.status === 'processing' ||
      payment.status === 'created'
      ? payment.status
      : payment.status,
    'processing',
  );
  if (isOpenPaymentStatus(payment.status) || payment.status === 'created') {
    payment.status = 'processing';
  }

  const order = await Order.findById(payment.order);
  if (!order) {
    throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');
  }

  // Scenario D: payment succeeds after cancel — refund, keep cancelled.
  if (order.status === 'cancelled' || order.status === 'failed') {
    assertPaymentTransition(payment.status, 'paid');
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.verifiedAt = new Date();
    payment.providerTransactionId =
      providerTransactionId ?? payment.providerTransactionId;
    await payment.save();

    const provider = getPaymentProvider();
    const refund = await provider.refundPayment({
      authority: payment.authority!,
      providerTransactionId: payment.providerTransactionId,
      amount: payment.amount,
      currency: payment.currency,
      reason: 'order_already_cancelled',
      idempotencyKey: `auto-refund-${String(payment._id)}`,
    });

    if (refund.success) {
      assertPaymentTransition(payment.status, 'refunded');
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.refundedAmount = payment.amount;
      payment.failureReason = 'auto_refund_cancelled_order';
      await payment.save();
    }

    await recordAudit({
      action: 'payment.verified',
      actorType: 'system',
      entityType: 'payment',
      entityId: String(payment._id),
      orderNumber: order.orderNumber,
      metadata: {
        source,
        policy: 'auto_refund_cancelled_order',
        refundSuccess: refund.success,
      },
    });
    return { outcome: 'auto_refunded' };
  }

  assertPaymentTransition(payment.status, 'paid');
  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.verifiedAt = new Date();
  payment.providerTransactionId =
    providerTransactionId ?? payment.providerTransactionId;
  await payment.save();

  if (order.paymentStatus !== 'paid') {
    assertTransition(order.status, 'paid');
    const previous = order.status;
    order.status = 'paid';
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.inventoryReservedUntil = undefined;
    order.history.push({
      fromStatus: previous,
      toStatus: 'paid',
      actorType: 'system',
      reason: `payment_${source}`,
      at: new Date(),
    });
    await order.save();
  }

  await recordAudit({
    action: 'payment.verified',
    actorType: 'system',
    entityType: 'payment',
    entityId: String(payment._id),
    orderNumber: order.orderNumber,
    metadata: { source, amount: payment.amount },
  });
  emitCommerceEvent('PaymentSuccessful', {
    orderNumber: order.orderNumber,
    userId: String(order.user),
    paymentId: String(payment._id),
    amount: payment.amount,
    currency: payment.currency,
  });

  return { outcome: 'paid' };
}

/**
 * Browser return URL is only a signal — always verify with the provider.
 */
export async function handlePaymentCallback(
  userId: string,
  raw: unknown,
): Promise<{ payment: PublicPayment; orderStatus: string }> {
  const input = parseOrThrow(paymentCallbackSchema, raw);
  const payment = await Payment.findOne({
    authority: input.authority,
    user: userId,
  });
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');

  if (payment.status === 'paid') {
    const order = await Order.findById(payment.order);
    return {
      payment: toPublicPayment(payment),
      orderStatus: order?.status ?? 'paid',
    };
  }

  if (payment.status === 'expired') {
    throw conflict('مهلت پرداخت منقضی شده است.', undefined, 'PAYMENT_EXPIRED');
  }

  if (input.status && input.status.toUpperCase() !== 'OK') {
    await markPaymentFailed(payment, 'CALLBACK_NOK', 'کاربر پرداخت را لغو کرد');
    throw conflict('پرداخت ناموفق بود.', undefined, 'PAYMENT_FAILED');
  }

  const provider = getPaymentProvider();
  let verified;
  try {
    verified = await provider.verifyPayment({
      authority: payment.authority!,
      amount: payment.amount,
      currency: payment.currency,
      providerTransactionId: payment.providerTransactionId,
      metadata: payment.metadata,
    });
  } catch {
    throw new AppError(502, 'خطا در تایید پرداخت.', {
      code: 'PAYMENT_PROVIDER_ERROR',
    });
  }

  if (!verified.success) {
    await markPaymentFailed(
      payment,
      verified.failureCode ?? 'VERIFY_FAILED',
      verified.failureMessage ?? 'تایید ناموفق',
    );
    throw conflict('تایید پرداخت ناموفق بود.', undefined, 'PAYMENT_VERIFICATION_FAILED');
  }

  if (verified.amount !== payment.amount) {
    await markPaymentFailed(
      payment,
      'AMOUNT_mismatch',
      `expected ${payment.amount} got ${verified.amount}`,
    );
    throw conflict(
      'مبلغ پرداخت با سفارش مطابقت ندارد.',
      undefined,
      'PAYMENT_AMOUNT_MISMATCH',
    );
  }

  const result = await applySuccessfulPayment(
    payment,
    verified.providerTransactionId,
    'callback',
  );
  const order = await Order.findById(payment.order);
  const fresh = await Payment.findById(payment._id);
  return {
    payment: toPublicPayment(fresh ?? payment),
    orderStatus:
      result.outcome === 'auto_refunded'
        ? (order?.status ?? 'cancelled')
        : (order?.status ?? 'paid'),
  };
}

export async function handleProviderWebhook(
  providerId: string,
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
  rawBody: string,
): Promise<{ ok: true; duplicate?: boolean }> {
  const provider = getPaymentProvider();
  if (provider.id !== providerId) {
    throw badRequest('درگاه نامعتبر است.', undefined, 'WEBHOOK_INVALID');
  }

  if (provider.verifyWebhookSignature) {
    const valid = provider.verifyWebhookSignature(headers, rawBody);
    if (!valid) {
      throw badRequest('امضای وب‌هوک نامعتبر است.', undefined, 'WEBHOOK_INVALID');
    }
  }

  if (!provider.parseWebhook) {
    throw badRequest('وب‌هوک پشتیبانی نمی‌شود.', undefined, 'WEBHOOK_INVALID');
  }

  let event;
  try {
    event = provider.parseWebhook(body);
  } catch {
    throw badRequest('بدنه وب‌هوک نامعتبر است.', undefined, 'WEBHOOK_INVALID');
  }

  const payloadHash = createHash('sha256').update(rawBody).digest('hex');

  try {
    await PaymentProviderEvent.create({
      provider: provider.id,
      eventId: event.eventId,
      authority: event.authority,
      payloadHash,
      processedAt: new Date(),
      outcome: 'processed',
    });
  } catch {
    // Duplicate event id — idempotent no-op.
    return { ok: true, duplicate: true };
  }

  const payment = await Payment.findOne({ authority: event.authority });
  if (!payment) {
    await PaymentProviderEvent.updateOne(
      { provider: provider.id, eventId: event.eventId },
      { outcome: 'ignored', note: 'payment_not_found' },
    );
    return { ok: true };
  }

  await PaymentProviderEvent.updateOne(
    { provider: provider.id, eventId: event.eventId },
    { payment: payment._id },
  );

  if (event.status === 'paid') {
    if (event.amount != null && event.amount !== payment.amount) {
      await markPaymentFailed(
        payment,
        'amount_mismatch',
        `webhook amount ${event.amount}`,
      );
      return { ok: true };
    }
    // Still verify with provider when possible (never trust webhook alone for money).
    const verified = await provider.verifyPayment({
      authority: payment.authority!,
      amount: payment.amount,
      currency: payment.currency,
      providerTransactionId:
        event.providerTransactionId ?? payment.providerTransactionId,
      metadata: payment.metadata,
    });
    if (!verified.success || verified.amount !== payment.amount) {
      await markPaymentFailed(
        payment,
        verified.failureCode ?? 'WEBHOOK_VERIFY_FAILED',
        verified.failureMessage ?? 'webhook verify failed',
      );
      return { ok: true };
    }
    await applySuccessfulPayment(
      payment,
      verified.providerTransactionId ?? event.providerTransactionId,
      'webhook',
    );
    return { ok: true };
  }

  if (
    event.status === 'failed' ||
    event.status === 'cancelled' ||
    event.status === 'expired'
  ) {
    if (isOpenPaymentStatus(payment.status)) {
      const target =
        event.status === 'expired'
          ? 'expired'
          : event.status === 'cancelled'
            ? 'cancelled'
            : 'failed';
      assertPaymentTransition(payment.status, target);
      payment.status = target;
      payment.failureCode = `webhook_${event.status}`;
      await payment.save();
      if (target === 'expired') {
        await expireOrderReservation(payment.orderNumber);
      }
    }
  }

  return { ok: true };
}

export async function expireOrderReservation(
  orderNumber: string,
): Promise<void> {
  const order = await Order.findOne({ orderNumber });
  if (!order) return;
  if (order.paymentStatus === 'paid') return;
  if (order.status === 'cancelled' || order.status === 'failed') return;

  assertTransition(order.status, 'cancelled');
  const previous = order.status;
  order.status = 'cancelled';
  order.paymentStatus = 'failed';
  order.cancelledAt = new Date();
  order.history.push({
    fromStatus: previous,
    toStatus: 'cancelled',
    actorType: 'system',
    reason: 'payment_reservation_expired',
    at: new Date(),
  });

  if (order.inventoryDecremented) {
    await restoreMany(
      order.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
    );
    order.inventoryDecremented = false;
    await recordAudit({
      action: 'inventory.restocked',
      actorType: 'system',
      entityType: 'order',
      entityId: String(order._id),
      orderNumber: order.orderNumber,
      metadata: { reason: 'payment_expired' },
    });
  }

  await order.save();
  await recordAudit({
    action: 'payment.expired',
    actorType: 'system',
    entityType: 'order',
    entityId: String(order._id),
    orderNumber: order.orderNumber,
  });
  emitCommerceEvent('OrderCancelled', {
    orderNumber: order.orderNumber,
    userId: String(order.user),
    reason: 'payment_expired',
  });
}

/**
 * Service boundary for a future worker — no background scheduler required now.
 */
export async function releaseExpiredReservations(
  limit = 50,
): Promise<{ released: number }> {
  const now = new Date();
  const orders = await Order.find({
    paymentStatus: { $in: ['unpaid', 'pending', 'failed'] },
    status: { $in: ['awaiting_payment', 'pending'] },
    inventoryReservedUntil: { $lte: now },
    inventoryDecremented: true,
  })
    .limit(limit)
    .select('orderNumber');

  let released = 0;
  for (const order of orders) {
    const openPayments = await Payment.find({
      orderNumber: order.orderNumber,
      status: { $in: ['created', 'pending', 'redirected', 'processing'] },
    });
    for (const payment of openPayments) {
      if (isOpenPaymentStatus(payment.status)) {
        assertPaymentTransition(payment.status, 'expired');
        payment.status = 'expired';
        await payment.save();
      }
    }
    await expireOrderReservation(order.orderNumber);
    released += 1;
  }
  return { released };
}

export async function getCustomerPayment(
  userId: string,
  paymentId: string,
): Promise<PublicPayment> {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  }
  const payment = await Payment.findOne({ _id: paymentId, user: userId });
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  return toPublicPayment(payment);
}

export async function listAdminPayments(rawQuery: unknown) {
  const query = parseOrThrow(paymentListQuerySchema, rawQuery);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.orderNumber) filter.orderNumber = query.orderNumber;

  const skip = (query.page - 1) * query.limit;
  const [total, docs] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
  ]);

  return {
    items: docs.map(toPublicPayment),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getAdminPayment(paymentId: string): Promise<PublicPayment> {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  }
  const payment = await Payment.findById(paymentId);
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  return toPublicPayment(payment);
}

export { toPublicPayment, PAYMENT_RESERVATION_TTL_MS, PAYMENTS_DEFAULT_LIMIT, PAYMENTS_DEFAULT_PAGE, PAYMENTS_MAX_LIMIT };
