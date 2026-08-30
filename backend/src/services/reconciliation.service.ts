import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import type { ReconciliationFinding } from '../config/constants';
import { recordAudit } from './audit.service';
import { getPaymentProvider } from './payments';
import { applySuccessfulPaymentForReconcile } from './payment.service';
import { notFound } from '../utils/AppError';
import { logger } from '../utils/logger';

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
}

/**
 * Detect payment/order/provider inconsistencies.
 * Controlled resolution only when applySafeFix=true and finding is
 * provider_paid_local_pending.
 */
export async function reconcilePayment(
  paymentId: string,
  options?: { applySafeFix?: boolean },
): Promise<ReconciliationReport> {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');

  const order = await Order.findById(payment.order);
  if (!order) throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');

  const findings: ReconciliationFinding[] = [];
  const notes: string[] = [];

  if (
    (order.paymentStatus === 'paid' && payment.status !== 'paid' && payment.status !== 'refunded' && payment.status !== 'partially_refunded') ||
    (payment.status === 'paid' && order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && order.paymentStatus !== 'partially_refunded')
  ) {
    findings.push('order_payment_mismatch');
    notes.push('Order.paymentStatus and Payment.status disagree');
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
        !verified.success &&
        (payment.status === 'paid' || order.paymentStatus === 'paid')
      ) {
        findings.push('local_paid_provider_failed');
        notes.push(
          'Local state is paid but provider verify did not confirm (manual review required)',
        );
      }
    } catch (error) {
      findings.push('provider_unreachable');
      notes.push(
        error instanceof Error ? error.message : 'provider verify failed',
      );
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
    findings.includes('provider_paid_local_pending')
  ) {
    await applySuccessfulPaymentForReconcile(
      payment,
      providerTransactionId,
    );
    appliedFix = true;
    notes.push('Applied safe fix: marked payment/order paid from provider truth');
  }

  await recordAudit({
    action: 'payment.reconciled',
    actorType: 'admin',
    entityType: 'payment',
    entityId: String(payment._id),
    orderNumber: payment.orderNumber,
    metadata: {
      findings,
      appliedFix,
      providerSuccess,
    },
  });

  logger.info('payment.reconciled', {
    paymentId,
    findings,
    appliedFix,
  });

  return {
    paymentId: String(payment._id),
    orderNumber: payment.orderNumber,
    localPaymentStatus: payment.status,
    localOrderStatus: order.status,
    localOrderPaymentStatus: order.paymentStatus,
    providerSuccess,
    providerTransactionId,
    findings,
    notes,
    appliedFix,
  };
}
