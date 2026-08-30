import { Types } from 'mongoose';

import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import type { ReconciliationFinding } from '../config/constants';
import { recordAudit } from './audit.service';
import { getPaymentProvider } from './payments';
import { applySuccessfulPaymentForReconcile } from './payment.service';
import { notFound, conflict } from '../utils/AppError';
import { logger } from '../utils/logger';
import { isOpenPaymentStatus } from './paymentTransitions';

export interface ReconciliationReport {
  paymentId: string;
  orderNumber: string;
  localPaymentStatus: string;
  localOrderStatus: string;
  localOrderPaymentStatus: string;
  providerSuccess?: boolean;
  providerTransactionId?: string;
  findings: ReconciliationFinding[];
  notes: string[];
  appliedFix?: boolean;
  needsManualReview?: boolean;
}

/**
 * Detect payment/order/provider inconsistencies.
 * Controlled resolution only when applySafeFix=true and finding is
 * provider_paid_local_pending.
 */
export async function reconcilePayment(
  paymentId: string,
  options?: { applySafeFix?: boolean; actorId?: string },
): Promise<ReconciliationReport> {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');

  const order = await Order.findById(payment.order);
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');

  const findings: ReconciliationFinding[] = [];
  const notes: string[] = [];
  let needsManualReview = false;

  if (
    (order.paymentStatus === 'paid' &&
      payment.status !== 'paid' &&
      payment.status !== 'refunded' &&
      payment.status !== 'partially_refunded') ||
    (payment.status === 'paid' &&
      order.paymentStatus !== 'paid' &&
      order.paymentStatus !== 'refunded' &&
      order.paymentStatus !== 'partially_refunded' &&
      order.status !== 'cancelled')
  ) {
    findings.push('order_payment_mismatch');
    notes.push('Order.paymentStatus and Payment.status disagree');
    needsManualReview = true;
  }

  let providerSuccess: boolean | undefined;
  let providerTransactionId: string | undefined;

  if (payment.authority) {
    try {
      const provider = getPaymentProvider();
      const verified = await provider.verifyPayment({
        authority: payment.authority,
        amount: payment.amount,
        currency: payment.currency,
        providerTransactionId: payment.providerTransactionId,
        metadata: payment.metadata,
      });
      providerSuccess = verified.success;
      providerTransactionId = verified.providerTransactionId;

      if (
        verified.success &&
        (payment.status === 'pending' ||
          payment.status === 'redirected' ||
          payment.status === 'processing' ||
          payment.status === 'created')
      ) {
        findings.push('provider_paid_local_pending');
        notes.push('Provider reports paid while local payment is still open');
      }

      if (
        verified.success &&
        (payment.status === 'failed' ||
          payment.status === 'expired' ||
          payment.status === 'cancelled')
      ) {
        findings.push('provider_paid_local_terminal');
        notes.push(
          'Provider reports paid while local payment is terminal — needs recovery',
        );
        needsManualReview = true;
      }

      if (
        verified.success &&
        (payment.status === 'paid' ||
          payment.status === 'refunded' ||
          payment.status === 'partially_refunded') &&
        order.paymentStatus === 'paid'
      ) {
        findings.push('already_reconciled');
        notes.push('Local and provider already agree on paid');
      }

      if (
        !verified.success &&
        (payment.status === 'paid' || order.paymentStatus === 'paid')
      ) {
        findings.push('local_paid_provider_failed');
        notes.push(
          'Local state is paid but provider verify did not confirm (manual review required)',
        );
        needsManualReview = true;
      }
    } catch (error) {
      findings.push('provider_unreachable');
      notes.push(
        error instanceof Error ? error.message : 'provider verify failed',
      );
      // Timeout / unreachable is NOT treated as payment failure.
      needsManualReview = true;
    }
  } else {
    notes.push('No authority on payment — skipped provider verify');
  }

  if (findings.length === 0) {
    findings.push('in_sync');
    notes.push('No inconsistency detected');
  }

  let appliedFix = false;
  if (
    options?.applySafeFix &&
    (findings.includes('provider_paid_local_pending') ||
      findings.includes('provider_paid_local_terminal'))
  ) {
    await applySuccessfulPaymentForReconcile(
      payment,
      providerTransactionId,
    );
    appliedFix = true;
    notes.push(
      'Applied safe fix: applied provider-confirmed capture to local state',
    );
  } else if (
    options?.applySafeFix &&
    needsManualReview &&
    !findings.includes('provider_paid_local_pending') &&
    !findings.includes('provider_paid_local_terminal')
  ) {
    await recordAudit({
      action: 'reconciliation.manual_review',
      actorType: 'admin',
      actorId: options.actorId,
      entityType: 'payment',
      entityId: String(payment._id),
      orderNumber: payment.orderNumber,
      metadata: { findings },
    });
    notes.push('Safe fix not applied — marked for manual review');
  }

  await recordAudit({
    action: 'payment.reconciled',
    actorType: 'admin',
    actorId: options?.actorId,
    entityType: 'payment',
    entityId: String(payment._id),
    orderNumber: payment.orderNumber,
    metadata: {
      findings,
      appliedFix,
      providerSuccess,
      needsManualReview,
    },
  });

  logger.info('payment.reconciled', {
    paymentId,
    findings,
    appliedFix,
    needsManualReview,
  });

  const freshPayment = await Payment.findById(paymentId);
  const freshOrder = await Order.findById(payment.order);

  return {
    paymentId: String(payment._id),
    orderNumber: payment.orderNumber,
    localPaymentStatus: freshPayment?.status ?? payment.status,
    localOrderStatus: freshOrder?.status ?? order.status,
    localOrderPaymentStatus:
      freshOrder?.paymentStatus ?? order.paymentStatus,
    providerSuccess,
    providerTransactionId,
    findings,
    notes,
    appliedFix,
    needsManualReview,
  };
}

/** Scan open payments and reconcile (bounded). Safe to run repeatedly. */
export async function reconcileOpenPayments(
  limit = 20,
  options?: { applySafeFix?: boolean; actorId?: string },
): Promise<{ scanned: number; fixed: number; reviews: number }> {
  const open = await Payment.find({
    status: { $in: ['created', 'pending', 'redirected', 'processing'] },
    authority: { $exists: true, $type: 'string' },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let fixed = 0;
  let reviews = 0;
  for (const payment of open) {
    if (!isOpenPaymentStatus(payment.status) && payment.status !== 'processing') {
      continue;
    }
    const report = await reconcilePayment(String(payment._id), {
      applySafeFix: options?.applySafeFix === true,
      actorId: options?.actorId,
    });
    if (report.appliedFix) fixed += 1;
    if (report.needsManualReview) reviews += 1;
  }

  return { scanned: open.length, fixed, reviews };
}

export async function markReconciliationManualReview(
  paymentId: string,
  adminId: string,
  note?: string,
) {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  }
  const payment = await Payment.findById(paymentId);
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');

  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      financialHoldReason:
        note?.slice(0, 200) || 'reconciliation_manual_review',
    },
  });

  await recordAudit({
    action: 'reconciliation.manual_review',
    actorType: 'admin',
    actorId: adminId,
    entityType: 'payment',
    entityId: String(payment._id),
    orderNumber: payment.orderNumber,
    metadata: { note },
  });

  return { ok: true as const, paymentId: String(payment._id) };
}

export function assertCanRetryVerification(status: string): void {
  if (
    status !== 'pending' &&
    status !== 'redirected' &&
    status !== 'processing' &&
    status !== 'created'
  ) {
    throw conflict(
      'تلاش مجدد تایید فقط برای پرداخت‌های باز مجاز است.',
      undefined,
      'INVALID_PAYMENT_TRANSITION',
    );
  }
}
