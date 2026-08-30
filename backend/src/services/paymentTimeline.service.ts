import { Types } from 'mongoose';

import { AuditLog } from '../models/AuditLog';
import { NotificationDelivery } from '../models/NotificationDelivery';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { PaymentProviderEvent } from '../models/PaymentProviderEvent';
import { Refund } from '../models/Refund';
import { notFound } from '../utils/AppError';

/**
 * Admin diagnostic timeline: "customer paid but order still pending — why?"
 * Joins order + payments + provider events + audits + notifications + refunds.
 * Never includes provider secrets or raw credentials.
 */
export async function getPaymentTimeline(orderNumber: string) {
  const order = await Order.findOne({ orderNumber });
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');

  const payments = await Payment.find({ order: order._id })
    .sort({ createdAt: 1 })
    .lean();
  const paymentIds = payments.map((p) => p._id as Types.ObjectId);
  const authorities = payments
    .map((p) => p.authority)
    .filter((a): a is string => Boolean(a));

  const eventFilter =
    paymentIds.length || authorities.length
      ? {
          $or: [
            ...(paymentIds.length ? [{ payment: { $in: paymentIds } }] : []),
            ...(authorities.length
              ? [{ authority: { $in: authorities } }]
              : []),
          ],
        }
      : { _id: null };

  const [refunds, audits, notifications, providerEvents] = await Promise.all([
    Refund.find({ order: order._id }).sort({ createdAt: 1 }).lean(),
    AuditLog.find({ orderNumber: order.orderNumber })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    NotificationDelivery.find({ orderNumber: order.orderNumber })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean(),
    PaymentProviderEvent.find(eventFilter)
      .sort({ createdAt: 1 })
      .limit(50)
      .lean(),
  ]);

  return {
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      total: order.total,
      currency: order.currency,
      financialIntegrityStatus: order.financialIntegrityStatus,
      inventoryDecremented: order.inventoryDecremented,
      inventoryReleaseClaimedAt: order.inventoryReleaseClaimedAt,
      inventoryReservedUntil: order.inventoryReservedUntil,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      history: order.history,
      createdAt: order.createdAt,
    },
    payments: payments.map((p) => ({
      id: String(p._id),
      status: p.status,
      provider: p.provider,
      amount: p.amount,
      authority: p.authority,
      providerTransactionId: p.providerTransactionId,
      refundedAmount: p.refundedAmount,
      needsManualRefund: p.needsManualRefund,
      financialHoldReason: p.financialHoldReason,
      failureCode: p.failureCode,
      failureReason: p.failureReason,
      paidAt: p.paidAt,
      verifiedAt: p.verifiedAt,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
    })),
    providerEvents: providerEvents.map((e) => ({
      eventId: e.eventId,
      authority: e.authority,
      outcome: e.outcome,
      note: e.note,
      processedAt: e.processedAt,
      createdAt: e.createdAt,
    })),
    refunds: refunds.map((r) => ({
      id: String(r._id),
      amount: r.amount,
      status: r.status,
      failureCode: r.failureCode,
      failureReason: r.failureReason,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    })),
    audits: audits.map((a) => ({
      action: a.action,
      actorType: a.actorType,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
    notifications: notifications.map((n) => ({
      deliveryKey: n.deliveryKey,
      event: n.event,
      channel: n.channel,
      status: n.status,
      attempts: n.attempts,
      lastError: n.lastError,
      sentAt: n.sentAt,
      createdAt: n.createdAt,
    })),
  };
}
