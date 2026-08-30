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
import { emitCommerceEvent } from './notifications';
import {
  assertPaymentTransition,
  isOpenPaymentStatus,
} from './paymentTransitions';
import { getPaymentProvider } from './payments';
import { claimAndRestoreOrderInventory } from './inventoryRelease.service';
import { releaseCouponForOrder } from './coupon.service';
import {
  parseOrThrow,
  createPaymentSchema,
  paymentCallbackSchema,
  paymentListQuerySchema,
} from '../validators/payment.validators';

function hashPaymentRequest(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

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
  idempotencyKey: string,
): Promise<PublicPayment> {
  const input = parseOrThrow(createPaymentSchema, raw);
  const requestHash = hashPaymentRequest({
    orderNumber: input.orderNumber,
    simulate: input.simulate ?? null,
  });

  const existing = await Payment.findOne({
    user: userId,
    idempotencyKey,
  });
  if (existing) {
    if (
      existing.requestHash &&
      existing.requestHash !== requestHash
    ) {
      throw conflict(
        'کلید تکرار با درخواست متفاوت در تداخل است.',
        undefined,
        'IDEMPOTENCY_CONFLICT',
      );
    }
    if (existing.orderNumber !== input.orderNumber) {
      throw conflict(
        'کلید تکرار با درخواست متفاوت در تداخل است.',
        undefined,
        'IDEMPOTENCY_CONFLICT',
      );
    }
    return toPublicPayment(existing);
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

  let payment;
  try {
    payment = await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      user: new Types.ObjectId(userId),
      provider: provider.id,
      status: 'created',
      amount: order.total,
      currency: order.currency,
      idempotencyKey,
      requestHash,
      expiresAt,
      refundedAmount: 0,
      needsManualRefund: false,
      metadata: input.simulate ? { simulate: input.simulate } : undefined,
    });
  } catch (createError) {
    // Partial unique index: one open payment per order — concurrent create loses.
    const isDup =
      typeof createError === 'object' &&
      createError !== null &&
      'code' in createError &&
      (createError as { code?: number }).code === 11000;
    if (isDup) {
      const raced = await Payment.findOne({
        orderNumber: input.orderNumber,
        user: userId,
        status: { $in: ['created', 'pending', 'redirected', 'processing'] },
      }).sort({ createdAt: -1 });
      if (raced) return toPublicPayment(raced);
      const byKey = await Payment.findOne({ user: userId, idempotencyKey });
      if (byKey) return toPublicPayment(byKey);
    }
    throw createError;
  }

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
    await recordAudit({
      action: 'payment.redirected',
      actorType: 'customer',
      actorId: userId,
      entityType: 'payment',
      entityId: String(payment._id),
      orderNumber: order.orderNumber,
      metadata: { provider: provider.id },
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
  // Atomic — never overwrite paid/refunded via a stale in-memory document.
  const failed = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: { $in: ['created', 'pending', 'redirected', 'processing'] },
    },
    {
      $set: {
        status: 'failed',
        failureCode: code,
        failureReason: reason,
      },
    },
    { returnDocument: 'after' },
  );
  if (!failed) {
    return;
  }

  payment.status = failed.status;
  payment.failureCode = failed.failureCode;
  payment.failureReason = failed.failureReason;

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
 *
 * Payment success only moves the order to paid via conditional update on a
 * still-payable status. Late success after cancel never marks the order paid;
 * auto-refund only when the provider confirms — otherwise needs_manual_refund.
 */
async function applySuccessfulPayment(
  payment: PaymentDocument,
  providerTransactionId: string | undefined,
  source: 'callback' | 'webhook' | 'reconcile',
): Promise<{
  outcome: 'paid' | 'auto_refunded' | 'needs_manual_refund' | 'already_paid';
}> {
  if (
    payment.status === 'paid' ||
    payment.status === 'refunded' ||
    payment.status === 'partially_refunded'
  ) {
    return { outcome: 'already_paid' };
  }

  const claimed = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      // Include terminal open-adjacent states so provider-confirmed capture
      // after expiry / false NOK can still enter the late-payment path.
      status: {
        $in: [
          'created',
          'pending',
          'redirected',
          'processing',
          'expired',
          'failed',
          'cancelled',
        ],
      },
    },
    { $set: { status: 'processing' } },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    const fresh = await Payment.findById(payment._id);
    if (
      fresh &&
      (fresh.status === 'paid' ||
        fresh.status === 'refunded' ||
        fresh.status === 'partially_refunded')
    ) {
      return { outcome: 'already_paid' };
    }
    return { outcome: 'already_paid' };
  }

  const paidDoc = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'processing' },
    {
      $set: {
        status: 'paid',
        paidAt: new Date(),
        verifiedAt: new Date(),
        providerTransactionId:
          providerTransactionId ?? claimed.providerTransactionId,
      },
    },
    { returnDocument: 'after' },
  );

  if (!paidDoc) {
    return { outcome: 'already_paid' };
  }

  // Atomic order transition — only if still payable (never from cancelled).
  const priorOrder = await Order.findById(paidDoc.order).select('status');
  const orderUpdated = await Order.findOneAndUpdate(
    {
      _id: paidDoc.order,
      status: { $in: ['awaiting_payment', 'pending'] },
      paymentStatus: { $nin: ['paid'] },
    },
    {
      $set: {
        status: 'paid',
        paymentStatus: 'paid',
        paidAt: new Date(),
        inventoryReservedUntil: null,
        financialIntegrityStatus: 'ok',
      },
      $push: {
        history: {
          fromStatus: priorOrder?.status ?? 'awaiting_payment',
          toStatus: 'paid',
          actorType: 'system',
          reason: `payment_${source}`,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );

  if (orderUpdated) {
    await recordAudit({
      action: 'payment.verified',
      actorType: 'system',
      entityType: 'payment',
      entityId: String(payment._id),
      orderNumber: orderUpdated.orderNumber,
      metadata: { source, amount: paidDoc.amount },
    });
    emitCommerceEvent('PaymentSuccessful', {
      orderNumber: orderUpdated.orderNumber,
      userId: String(orderUpdated.user),
      paymentId: String(payment._id),
      amount: paidDoc.amount,
      currency: paidDoc.currency,
    });
    return { outcome: 'paid' };
  }

  // Order not payable — typically cancelled/failed. Do NOT flip to paid.
  const order = await Order.findById(paidDoc.order);
  if (!order) {
    throw notFound('سفارش یافت نشد.', 'ORDER_NOT_FOUND');
  }

  if (order.status === 'paid' && order.paymentStatus === 'paid') {
    return { outcome: 'already_paid' };
  }

  if (order.status === 'cancelled' || order.status === 'failed') {
    return handleLatePaymentOnCancelledOrder(paidDoc, order, source);
  }

  // Unexpected state — keep payment paid, flag for ops.
  await Order.findByIdAndUpdate(order._id, {
    $set: {
      financialIntegrityStatus: 'paid_needs_manual_refund',
    },
  });
  await Payment.findByIdAndUpdate(paidDoc._id, {
    $set: {
      needsManualRefund: true,
      financialHoldReason: `late_payment_unexpected_${order.status}`,
    },
  });
  await recordAudit({
    action: 'payment.needs_manual_refund',
    actorType: 'system',
    entityType: 'payment',
    entityId: String(paidDoc._id),
    orderNumber: order.orderNumber,
    metadata: { source, orderStatus: order.status },
  });
  return { outcome: 'needs_manual_refund' };
}

async function handleLatePaymentOnCancelledOrder(
  paidDoc: PaymentDocument,
  order: OrderDocument,
  source: string,
): Promise<{
  outcome: 'auto_refunded' | 'needs_manual_refund';
}> {
  const provider = getPaymentProvider();
  const refund = await provider.refundPayment({
    authority: paidDoc.authority!,
    providerTransactionId: paidDoc.providerTransactionId,
    amount: paidDoc.amount,
    currency: paidDoc.currency,
    reason: 'order_already_cancelled',
    idempotencyKey: `auto-refund-${String(paidDoc._id)}`,
  });

  if (refund.success) {
    await Payment.findOneAndUpdate(
      { _id: paidDoc._id, status: 'paid' },
      {
        $set: {
          status: 'refunded',
          refundedAt: new Date(),
          refundedAmount: paidDoc.amount,
          needsManualRefund: false,
          financialHoldReason: 'auto_refund_cancelled_order',
        },
      },
    );
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        financialIntegrityStatus: 'ok',
        paymentStatus: 'refunded',
      },
    });
    await recordAudit({
      action: 'payment.verified',
      actorType: 'system',
      entityType: 'payment',
      entityId: String(paidDoc._id),
      orderNumber: order.orderNumber,
      metadata: {
        source,
        policy: 'auto_refund_cancelled_order',
        refundSuccess: true,
      },
    });
    await recordAudit({
      action: 'payment.refunded',
      actorType: 'system',
      entityType: 'payment',
      entityId: String(paidDoc._id),
      orderNumber: order.orderNumber,
      metadata: { reason: 'order_already_cancelled' },
    });
    return { outcome: 'auto_refunded' };
  }

  // Provider did not confirm refund — NEVER label as auto_refunded.
  await Payment.findByIdAndUpdate(paidDoc._id, {
    $set: {
      needsManualRefund: true,
      financialHoldReason:
        refund.failureCode === 'NOT_SUPPORTED'
          ? 'provider_refund_not_supported'
          : 'provider_refund_failed',
    },
  });
  await Order.findByIdAndUpdate(order._id, {
    $set: {
      financialIntegrityStatus: 'paid_needs_manual_refund',
    },
  });
  await recordAudit({
    action: 'payment.needs_manual_refund',
    actorType: 'system',
    entityType: 'payment',
    entityId: String(paidDoc._id),
    orderNumber: order.orderNumber,
    metadata: {
      source,
      failureCode: refund.failureCode,
      failureMessage: refund.failureMessage,
    },
  });
  return { outcome: 'needs_manual_refund' };
}

/** Controlled reconcile entry — same domain logic as callback/webhook success. */
export async function applySuccessfulPaymentForReconcile(
  payment: PaymentDocument,
  providerTransactionId?: string,
): Promise<{
  outcome: 'paid' | 'auto_refunded' | 'needs_manual_refund' | 'already_paid';
}> {
  return applySuccessfulPayment(payment, providerTransactionId, 'reconcile');
}

/**
 * Browser return URL is only a signal — always verify with the provider.
 */
export async function handlePaymentCallback(
  userId: string,
  raw: unknown,
): Promise<{
  payment: PublicPayment;
  orderStatus: string;
  outcome?: string;
}> {
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

  // Browser Status is a signal only — always verify with the provider.
  // Never terminal-fail on NOK/expired without provider confirmation.
  const browserSaysNok =
    Boolean(input.status) && input.status!.toUpperCase() !== 'OK';

  await recordAudit({
    action: 'payment.verification_started',
    actorType: 'customer',
    actorId: userId,
    entityType: 'payment',
    entityId: String(payment._id),
    orderNumber: payment.orderNumber,
    metadata: {
      source: 'callback',
      browserStatus: input.status ?? null,
      browserSaysNok,
      localStatus: payment.status,
    },
  });

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
    // Timeout / unreachable ≠ proven failure. Leave open for reconcile.
    if (
      verified.failureCode === 'PROVIDER_TIMEOUT' ||
      verified.failureCode === 'PROVIDER_ERROR'
    ) {
      await recordAudit({
        action: 'payment.verification_started',
        actorType: 'system',
        entityType: 'payment',
        entityId: String(payment._id),
        orderNumber: payment.orderNumber,
        metadata: {
          outcome: 'provider_unknown',
          failureCode: verified.failureCode,
        },
      });
      throw new AppError(502, 'تایید پرداخت نامشخص است — بعداً مجدد تلاش کنید.', {
        code: 'PAYMENT_PROVIDER_ERROR',
      });
    }
    await markPaymentFailed(
      payment,
      verified.failureCode ?? (browserSaysNok ? 'CALLBACK_NOK' : 'VERIFY_FAILED'),
      verified.failureMessage ??
        (browserSaysNok ? 'کاربر پرداخت را لغو کرد' : 'تایید ناموفق'),
    );
    throw conflict(
      'پرداخت ناموفق بود.',
      undefined,
      browserSaysNok ? 'PAYMENT_FAILED' : 'PAYMENT_VERIFICATION_FAILED',
    );
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
    orderStatus: order?.status ?? 'paid',
    outcome: result.outcome,
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
    await recordAudit({
      action: 'payment.webhook_duplicate',
      actorType: 'provider',
      entityType: 'payment',
      metadata: { provider: provider.id, eventId: event.eventId },
    });
    // Duplicate event id — idempotent no-op.
    return { ok: true, duplicate: true };
  }

  await recordAudit({
    action: 'payment.webhook_received',
    actorType: 'provider',
    entityType: 'payment',
    metadata: {
      provider: provider.id,
      eventId: event.eventId,
      authority: event.authority,
      status: event.status,
    },
  });

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
      // Timeout / unreachable ≠ proven failure — leave open for reconcile.
      if (
        verified.failureCode === 'PROVIDER_TIMEOUT' ||
        verified.failureCode === 'PROVIDER_ERROR' ||
        verified.failureCode === 'PROVIDER_UNAVAILABLE'
      ) {
        await PaymentProviderEvent.updateOne(
          { provider: provider.id, eventId: event.eventId },
          {
            outcome: 'ignored',
            note: `webhook_verify_${verified.failureCode ?? 'unknown'}`,
          },
        );
        return { ok: true };
      }
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
    // Failure webhooks are NOT authoritative money-moving events.
    // A Luxora-HMAC signature only proves our endpoint secret — not provider truth.
    // Re-verify with the provider before mutating an open payment to a terminal failure.
    if (!isOpenPaymentStatus(payment.status)) {
      return { ok: true };
    }
    try {
      const verified = await provider.verifyPayment({
        authority: payment.authority!,
        amount: payment.amount,
        currency: payment.currency,
        providerTransactionId: payment.providerTransactionId,
        metadata: payment.metadata,
      });
      if (verified.success && verified.amount === payment.amount) {
        // Provider still says paid — ignore forged/stale failure webhook.
        await applySuccessfulPayment(
          payment,
          verified.providerTransactionId,
          'webhook',
        );
        await PaymentProviderEvent.updateOne(
          { provider: provider.id, eventId: event.eventId },
          { outcome: 'ignored', note: 'failure_webhook_but_provider_paid' },
        );
        return { ok: true };
      }
    } catch {
      // Provider unreachable — do not mark failed from webhook alone.
      await PaymentProviderEvent.updateOne(
        { provider: provider.id, eventId: event.eventId },
        { outcome: 'ignored', note: 'failure_webhook_verify_unreachable' },
      );
      return { ok: true };
    }

    if (isOpenPaymentStatus(payment.status)) {
      const target =
        event.status === 'expired'
          ? 'expired'
          : event.status === 'cancelled'
            ? 'cancelled'
            : 'failed';
      // Atomic transition — never stale-save over a concurrent paid claim.
      const moved = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: { $in: ['created', 'pending', 'redirected', 'processing'] },
        },
        {
          $set: {
            status: target,
            failureCode: `webhook_${event.status}`,
          },
        },
        { returnDocument: 'after' },
      );
      if (moved && target === 'expired') {
        await expireOrderReservation(payment.orderNumber);
      }
    }
  }

  return { ok: true };
}

export async function expireOrderReservation(
  orderNumber: string,
): Promise<void> {
  const existing = await Order.findOne({
    orderNumber,
    paymentStatus: { $in: ['unpaid', 'pending', 'failed'] },
    status: { $in: ['awaiting_payment', 'pending'] },
    inventoryDecremented: true,
  });
  if (!existing) return;

  // Atomic cancel claim — does not restock yet.
  const claimed = await Order.findOneAndUpdate(
    {
      _id: existing._id,
      inventoryDecremented: true,
      paymentStatus: { $in: ['unpaid', 'pending', 'failed'] },
      status: { $in: ['awaiting_payment', 'pending'] },
    },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: 'failed',
        cancelledAt: new Date(),
        inventoryReservedUntil: null,
      },
      $push: {
        history: {
          fromStatus: existing.status,
          toStatus: 'cancelled',
          actorType: 'system',
          reason: 'payment_reservation_expired',
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    return;
  }

  // Shared one-time inventory release (cancel × expiry safe).
  await claimAndRestoreOrderInventory(claimed._id, 'payment_expired', {
    type: 'system',
  });
  await releaseCouponForOrder({
    orderId: String(claimed._id),
    orderNumber: claimed.orderNumber,
    reason: 'payment_expired',
  });

  await recordAudit({
    action: 'inventory.reservation_released',
    actorType: 'system',
    entityType: 'order',
    entityId: String(claimed._id),
    orderNumber: claimed.orderNumber,
    metadata: { reason: 'payment_expired' },
  });
  await recordAudit({
    action: 'payment.expired',
    actorType: 'system',
    entityType: 'order',
    entityId: String(claimed._id),
    orderNumber: claimed.orderNumber,
  });
  emitCommerceEvent('OrderCancelled', {
    orderNumber: claimed.orderNumber,
    userId: String(claimed.user),
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
    // Do NOT terminalize open payments here.
    // Customer cancel leaves payments open so late provider success can enter
    // handleLatePaymentOnCancelledOrder. Reservation expiry must behave the same:
    // cancel+restock the order, leave payment open for verify/reconcile.
    const openPayments = await Payment.find({
      orderNumber: order.orderNumber,
      status: { $in: ['created', 'pending', 'redirected', 'processing'] },
    });
    for (const payment of openPayments) {
      await Payment.findByIdAndUpdate(payment._id, {
        $set: {
          'metadata.reservationExpiredAt': now.toISOString(),
        },
      });
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

export async function getAdminPayment(paymentId: string) {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  }
  const payment = await Payment.findById(paymentId);
  if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
  const events = await PaymentProviderEvent.find({
    payment: payment._id,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    ...toPublicPayment(payment),
    failureCode: payment.failureCode,
    failureReason: payment.failureReason,
    providerTransactionId: payment.providerTransactionId,
    refundedAmount: payment.refundedAmount,
    needsManualRefund: payment.needsManualRefund,
    financialHoldReason: payment.financialHoldReason,
    verifiedAt: payment.verifiedAt?.toISOString(),
    refundedAt: payment.refundedAt?.toISOString(),
    webhookEvents: events.map((event) => ({
      eventId: event.eventId,
      outcome: event.outcome,
      note: event.note,
      processedAt: event.processedAt,
    })),
  };
}

export { toPublicPayment, PAYMENT_RESERVATION_TTL_MS, PAYMENTS_DEFAULT_LIMIT, PAYMENTS_DEFAULT_PAGE, PAYMENTS_MAX_LIMIT };
