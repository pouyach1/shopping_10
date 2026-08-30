import { Types } from 'mongoose';

import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { Refund } from '../models/Refund';
import {
  conflict,
  notFound,
  validationError,
} from '../utils/AppError';
import { recordAudit } from './audit.service';
import { emitCommerceEvent } from './notifications';
import { assertPaymentTransition } from './paymentTransitions';
import { getPaymentProvider } from './payments';
import {
  parseOrThrow,
  createRefundSchema,
} from '../validators/payment.validators';
import { orderNumberParamSchema } from '../validators/order.validators';

export interface PublicRefund {
  id: string;
  orderNumber: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  completedAt?: string;
  createdAt: string;
}

function toPublicRefund(doc: {
  _id: Types.ObjectId;
  orderNumber: string;
  payment: Types.ObjectId;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  completedAt?: Date;
  createdAt: Date;
}): PublicRefund {
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    paymentId: String(doc.payment),
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    reason: doc.reason,
    completedAt: doc.completedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Atomically reserve refund capacity on the payment.
 * Invariant: refundedAmount + amount <= amount (captured).
 */
async function reserveRefundAmount(
  paymentId: Types.ObjectId,
  amount: number,
) {
  return Payment.findOneAndUpdate(
    {
      _id: paymentId,
      status: { $in: ['paid', 'partially_refunded'] },
      $expr: {
        $lte: [{ $add: ['$refundedAmount', amount] }, '$amount'],
      },
    },
    { $inc: { refundedAmount: amount } },
    { returnDocument: 'after' },
  );
}

async function releaseRefundAmount(
  paymentId: Types.ObjectId,
  amount: number,
): Promise<void> {
  await Payment.findOneAndUpdate(
    { _id: paymentId },
    { $inc: { refundedAmount: -amount } },
  );
}

export async function createAdminRefund(
  orderNumberRaw: string,
  adminId: string,
  raw: unknown,
): Promise<PublicRefund> {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
    orderNumber: orderNumberRaw,
  });
  const input = parseOrThrow(createRefundSchema, raw);

  const existing = await Refund.findOne({
    idempotencyKey: input.idempotencyKey,
  });
  if (existing) {
    return toPublicRefund(existing);
  }

  const order = await Order.findOne({ orderNumber });
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');

  const payment = await Payment.findOne({
    order: order._id,
    status: { $in: ['paid', 'partially_refunded'] },
  }).sort({ paidAt: -1 });

  if (!payment) {
    throw conflict('پرداخت قابل بازپرداخت یافت نشد.', undefined, 'PAYMENT_NOT_FOUND');
  }

  const remaining = payment.amount - payment.refundedAmount;
  const amount = input.amount ?? remaining;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw validationError('مبلغ بازپرداخت نامعتبر است.');
  }

  let refund;
  try {
    refund = await Refund.create({
      order: order._id,
      orderNumber: order.orderNumber,
      payment: payment._id,
      user: order.user,
      amount,
      currency: payment.currency,
      status: 'pending',
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      requestedBy: new Types.ObjectId(adminId),
      metadata: input.simulate ? { simulate: input.simulate } : undefined,
    });
  } catch {
    const raced = await Refund.findOne({ idempotencyKey: input.idempotencyKey });
    if (raced) return toPublicRefund(raced);
    throw conflict('درخواست بازپرداخت تکراری است.', undefined, 'DUPLICATE_REQUEST');
  }

  // Atomic capacity reservation — concurrent refunds cannot over-refund.
  const reserved = await reserveRefundAmount(payment._id, amount);
  if (!reserved) {
    refund.status = 'failed';
    refund.failureCode = 'REFUND_EXCEEDS_PAID_AMOUNT';
    refund.failureReason = 'مبلغ بازپرداخت از مبلغ پرداخت‌شده بیشتر است.';
    await refund.save();
    throw conflict(
      'مبلغ بازپرداخت از مبلغ پرداخت‌شده بیشتر است.',
      undefined,
      'REFUND_EXCEEDS_PAID_AMOUNT',
    );
  }

  await Order.findByIdAndUpdate(order._id, {
    $set: { financialIntegrityStatus: 'refund_pending' },
  });

  await recordAudit({
    action: 'refund.created',
    actorType: 'admin',
    actorId: adminId,
    entityType: 'refund',
    entityId: String(refund._id),
    orderNumber: order.orderNumber,
    metadata: { amount },
  });
  emitCommerceEvent('RefundCreated', {
    orderNumber: order.orderNumber,
    userId: String(order.user),
    amount,
    currency: payment.currency,
  });

  refund.status = 'processing';
  await refund.save();

  const provider = getPaymentProvider();
  const result = await provider.refundPayment({
    authority: payment.authority!,
    providerTransactionId: payment.providerTransactionId,
    amount,
    currency: payment.currency,
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
    metadata: refund.metadata,
  });

  if (!result.success) {
    await releaseRefundAmount(payment._id, amount);
    refund.status = 'failed';
    refund.failureCode = result.failureCode;
    refund.failureReason = result.failureMessage;
    await refund.save();
    await Order.findByIdAndUpdate(order._id, {
      $set: { financialIntegrityStatus: 'refund_failed' },
    });
    await recordAudit({
      action: 'refund.failed',
      actorType: 'admin',
      actorId: adminId,
      entityType: 'refund',
      entityId: String(refund._id),
      orderNumber: order.orderNumber,
      metadata: { code: result.failureCode },
    });
    emitCommerceEvent('RefundFailed', {
      orderNumber: order.orderNumber,
      userId: String(order.user),
      reason: result.failureMessage,
    });
    throw conflict(
      result.failureMessage ?? 'بازپرداخت ناموفق بود.',
      undefined,
      'REFUND_FAILED',
    );
  }

  refund.status = 'succeeded';
  refund.providerRefundId = result.providerRefundId;
  refund.completedAt = new Date();
  await refund.save();

  const nextStatus =
    reserved.refundedAmount >= reserved.amount
      ? 'refunded'
      : 'partially_refunded';

  if (nextStatus === 'refunded') {
    assertPaymentTransition(
      reserved.status === 'partially_refunded' ? 'partially_refunded' : 'paid',
      'refunded',
    );
  } else if (reserved.status === 'paid') {
    assertPaymentTransition('paid', 'partially_refunded');
  }

  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      status: nextStatus,
      ...(nextStatus === 'refunded' ? { refundedAt: new Date() } : {}),
      needsManualRefund: false,
    },
  });

  await Order.findByIdAndUpdate(order._id, {
    $inc: { refundedTotal: amount },
    $set: {
      paymentStatus: nextStatus,
      financialIntegrityStatus: 'ok',
    },
  });

  await recordAudit({
    action: 'refund.completed',
    actorType: 'admin',
    actorId: adminId,
    entityType: 'refund',
    entityId: String(refund._id),
    orderNumber: order.orderNumber,
    metadata: { amount, providerRefundId: result.providerRefundId },
  });
  emitCommerceEvent('RefundSuccessful', {
    orderNumber: order.orderNumber,
    userId: String(order.user),
    amount,
    currency: payment.currency,
  });

  return toPublicRefund(refund);
}

/**
 * Retry a failed refund with a new idempotency key.
 * Does not re-use the failed key (that would return the failed record).
 */
export async function retryFailedRefund(
  refundId: string,
  adminId: string,
  newIdempotencyKey: string,
): Promise<PublicRefund> {
  const previous = await Refund.findById(refundId);
  if (!previous) throw notFound('بازپرداخت یافت نشد.', 'REFUND_NOT_FOUND');
  if (previous.status !== 'failed') {
    throw conflict(
      'فقط بازپرداخت ناموفق قابل تلاش مجدد است.',
      undefined,
      'REFUND_FAILED',
    );
  }

  await recordAudit({
    action: 'refund.retried',
    actorType: 'admin',
    actorId: adminId,
    entityType: 'refund',
    entityId: String(previous._id),
    orderNumber: previous.orderNumber,
    metadata: { previousIdempotencyKey: previous.idempotencyKey },
  });

  return createAdminRefund(previous.orderNumber, adminId, {
    amount: previous.amount,
    reason: previous.reason ?? 'retry',
    idempotencyKey: newIdempotencyKey,
  });
}

export async function listAdminRefunds(orderNumberRaw?: string) {
  const filter: Record<string, unknown> = {};
  if (orderNumberRaw) {
    const { orderNumber } = parseOrThrow(orderNumberParamSchema, {
      orderNumber: orderNumberRaw,
    });
    filter.orderNumber = orderNumber;
  }
  const docs = await Refund.find(filter).sort({ createdAt: -1 }).limit(100);
  return docs.map(toPublicRefund);
}
