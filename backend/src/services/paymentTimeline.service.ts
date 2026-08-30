import { Types } from 'mongoose';

import { AuditLog } from '../models/AuditLog';
import { InventoryHold } from '../models/InventoryHold';
import { NotificationDelivery } from '../models/NotificationDelivery';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { PaymentProviderEvent } from '../models/PaymentProviderEvent';
import { Refund } from '../models/Refund';
import { notFound } from '../utils/AppError';

export interface TimelineEntry {
  at: string;
  kind: string;
  summary: string;
  meta?: Record<string, unknown>;
}

/**
 * Admin diagnostic timeline: chronological join of commerce state.
 * Never includes provider secrets.
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

  const [refunds, audits, notifications, providerEvents, holds] =
    await Promise.all([
      Refund.find({ order: order._id }).sort({ createdAt: 1 }).lean(),
      AuditLog.find({ orderNumber: order.orderNumber })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean(),
      NotificationDelivery.find({ orderNumber: order.orderNumber })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean(),
      PaymentProviderEvent.find(eventFilter)
        .sort({ createdAt: 1 })
        .limit(50)
        .lean(),
      order.inventoryHoldId
        ? InventoryHold.find({ _id: order.inventoryHoldId }).lean()
        : InventoryHold.find({ orderNumber: order.orderNumber }).lean(),
    ]);

  const entries: TimelineEntry[] = [];

  for (const h of order.history ?? []) {
    entries.push({
      at: new Date(h.at).toISOString(),
      kind: 'order.history',
      summary: `Order ${h.fromStatus ?? '∅'} → ${h.toStatus}`,
      meta: { actorType: h.actorType, reason: h.reason },
    });
  }

  entries.push({
    at: order.createdAt.toISOString(),
    kind: 'order.created',
    summary: `Order created (${order.status})`,
    meta: {
      total: order.total,
      inventoryDecremented: order.inventoryDecremented,
    },
  });

  if (order.inventoryReservedUntil) {
    entries.push({
      at: order.createdAt.toISOString(),
      kind: 'inventory.reserved',
      summary: 'Inventory reserved until payment/expiry',
      meta: { until: order.inventoryReservedUntil },
    });
  }

  if (order.inventoryReleaseClaimedAt) {
    entries.push({
      at: new Date(order.inventoryReleaseClaimedAt).toISOString(),
      kind: 'inventory.released',
      summary: 'Inventory release claimed',
    });
  }

  for (const hold of holds) {
    entries.push({
      at: new Date(hold.createdAt).toISOString(),
      kind: 'inventory.hold',
      summary: `Inventory hold ${hold.status}`,
      meta: { holdId: String(hold._id), status: hold.status },
    });
  }

  for (const p of payments) {
    entries.push({
      at: new Date(p.createdAt).toISOString(),
      kind: 'payment.created',
      summary: `Payment created (${p.status})`,
      meta: {
        paymentId: String(p._id),
        amount: p.amount,
        provider: p.provider,
        authority: p.authority,
      },
    });
    if (p.paidAt) {
      entries.push({
        at: new Date(p.paidAt).toISOString(),
        kind: 'payment.paid',
        summary: 'Payment marked paid',
        meta: { paymentId: String(p._id), needsManualRefund: p.needsManualRefund },
      });
    }
  }

  for (const e of providerEvents) {
    entries.push({
      at: new Date(e.processedAt ?? e.createdAt).toISOString(),
      kind: 'provider.event',
      summary: `Provider event ${e.eventId} (${e.outcome})`,
      meta: { note: e.note, authority: e.authority },
    });
  }

  for (const r of refunds) {
    entries.push({
      at: new Date(r.createdAt).toISOString(),
      kind: 'refund',
      summary: `Refund ${r.status} amount=${r.amount}`,
      meta: {
        refundId: String(r._id),
        failureCode: r.failureCode,
      },
    });
  }

  for (const n of notifications) {
    entries.push({
      at: new Date(n.sentAt ?? n.createdAt).toISOString(),
      kind: 'notification',
      summary: `Notification ${n.channel} ${n.status} (${n.event})`,
      meta: {
        deliveryKey: n.deliveryKey,
        failureCode: n.failureCode,
        attempts: n.attempts,
      },
    });
  }

  for (const a of audits) {
    entries.push({
      at: new Date(a.createdAt).toISOString(),
      kind: 'audit',
      summary: a.action,
      meta: {
        actorType: a.actorType,
        requestId: a.requestId,
        entityType: a.entityType,
      },
    });
  }

  entries.sort(
    (x, y) => new Date(x.at).getTime() - new Date(y.at).getTime(),
  );

  const summary = buildOpsSummary({
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    financialIntegrityStatus: order.financialIntegrityStatus,
    payments: payments.map((p) => ({
      status: p.status,
      needsManualRefund: p.needsManualRefund,
    })),
    notifications: notifications.map((n) => n.status),
  });

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
      requestId: a.requestId,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
    notifications: notifications.map((n) => ({
      deliveryKey: n.deliveryKey,
      event: n.event,
      channel: n.channel,
      status: n.status,
      attempts: n.attempts,
      failureCode: n.failureCode,
      lastError: n.lastError,
      sentAt: n.sentAt,
      createdAt: n.createdAt,
    })),
    timeline: entries,
    summary,
  };
}

function buildOpsSummary(input: {
  orderStatus: string;
  paymentStatus: string;
  financialIntegrityStatus: string;
  payments: Array<{ status: string; needsManualRefund?: boolean }>;
  notifications: string[];
}): { headline: string; recommendedAction?: string } {
  if (input.financialIntegrityStatus === 'paid_needs_manual_refund') {
    return {
      headline: 'Payment captured after cancel — manual refund required',
      recommendedAction: 'Refund via provider panel / admin refund workflow',
    };
  }
  if (
    input.payments.some((p) => p.needsManualRefund) ||
    input.financialIntegrityStatus === 'refund_failed'
  ) {
    return {
      headline: 'Refund unresolved',
      recommendedAction: 'Inspect refunds and retry or complete manually',
    };
  }
  const openPay = input.payments.find((p) =>
    ['created', 'pending', 'redirected', 'processing'].includes(p.status),
  );
  if (openPay && input.orderStatus === 'awaiting_payment') {
    return {
      headline: 'Payment still open',
      recommendedAction: 'Run reconcile or wait for callback/webhook',
    };
  }
  if (input.notifications.some((s) => s === 'permanent_failure')) {
    return {
      headline: 'Order flow ok but a notification permanently failed',
      recommendedAction: 'Retry notification from admin',
    };
  }
  if (input.orderStatus === 'paid' || input.paymentStatus === 'paid') {
    return { headline: 'Payment confirmed' };
  }
  return { headline: `Order ${input.orderStatus} / payment ${input.paymentStatus}` };
}
