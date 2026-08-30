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

  const amount = input.amount ?? payment.amount - payment.refundedAmount;
  if (amount <= 0) {
    throw validationError('مبلغ بازپرداخت نامعتبر است.');
  }
  if (payment.refundedAmount + amount > payment.amount) {
    throw conflict(
      'مبلغ بازپرداخت از مبلغ پرداخت‌شده بیشتر است.',
      undefined,
      'REFUND_EXCEEDS_PAID_AMOUNT',
    );
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
    refund.status = 'failed';
    refund.failureCode = result.failureCode;
    refund.failureReason = result.failureMessage;
    await refund.save();
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

  payment.refundedAmount += amount;
  if (payment.refundedAmount >= payment.amount) {
    assertPaymentTransition(payment.status, 'refunded');
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    order.paymentStatus = 'refunded';
  } else {
    assertPaymentTransition(payment.status, 'partially_refunded');
    payment.status = 'partially_refunded';
    order.paymentStatus = 'partially_refunded';
  }
  await payment.save();
  order.refundedTotal = (order.refundedTotal ?? 0) + amount;
  await order.save();

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
    amount,
    currency: payment.currency,
  });

  return toPublicRefund(refund);
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
