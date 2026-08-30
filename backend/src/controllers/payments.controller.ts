import type { Request, Response } from 'express';

import * as paymentService from '../services/payment.service';
import {
  reconcilePayment,
  reconcileOpenPayments,
  markReconciliationManualReview,
  assertCanRetryVerification,
} from '../services/reconciliation.service';
import {
  processPendingNotifications,
  listAdminNotifications,
  retryNotificationDelivery,
} from '../services/notifications';
import { getSchedulerHealth } from '../services/scheduler';
import { recordAudit } from '../services/audit.service';
import { Payment } from '../models/Payment';
import { notFound } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { storeScope } from '../tenant/storeScope';
import { requireIdempotencyKey } from '../services/checkout.service';
import {
  parseOrThrow,
  paymentIdParamSchema,
} from '../validators/payment.validators';
import { applySuccessfulPaymentForReconcile } from '../services/payment.service';
import { getPaymentProvider } from '../services/payments';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const key = requireIdempotencyKey(req.header('Idempotency-Key'));
  const payment = await paymentService.createPayment(
    req.user!.id,
    req.body,
    key,
  );
  res.status(201).json({ status: 'success', data: { payment } });
});

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.handlePaymentCallback(
    req.user!.id,
    req.body,
  );
  res.status(200).json({ status: 'success', data: result });
});

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = parseOrThrow(paymentIdParamSchema, req.params);
  const payment = await paymentService.getCustomerPayment(
    req.user!.id,
    paymentId,
  );
  res.status(200).json({ status: 'success', data: { payment } });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const provider = String(req.params.provider ?? '');
  const result = await paymentService.handleProviderWebhook(
    provider,
    req.headers as Record<string, string | string[] | undefined>,
    req.body,
    req.rawBody ?? JSON.stringify(req.body ?? {}),
  );
  res.status(200).json({ status: 'success', data: result });
});

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.listAdminPayments(req.query);
  res.status(200).json({ status: 'success', data });
});

export const adminGet = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = parseOrThrow(paymentIdParamSchema, req.params);
  const payment = await paymentService.getAdminPayment(paymentId);
  res.status(200).json({ status: 'success', data: { payment } });
});

export const adminReleaseExpired = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await paymentService.releaseExpiredReservations();
    res.status(200).json({ status: 'success', data });
  },
);

export const adminReconcile = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentId } = parseOrThrow(paymentIdParamSchema, req.params);
    const applySafeFix = req.body?.applySafeFix === true;
    const report = await reconcilePayment(paymentId, {
      applySafeFix,
      actorId: req.user!.id,
    });
    res.status(200).json({ status: 'success', data: { report } });
  },
);

export const adminReconcileOpen = asyncHandler(
  async (req: Request, res: Response) => {
    const applySafeFix = req.body?.applySafeFix === true;
    const limit =
      typeof req.body?.limit === 'number' ? Math.min(req.body.limit, 100) : 20;
    const data = await reconcileOpenPayments(limit, {
      applySafeFix,
      actorId: req.user!.id,
    });
    res.status(200).json({ status: 'success', data });
  },
);

export const adminMarkManualReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentId } = parseOrThrow(paymentIdParamSchema, req.params);
    const data = await markReconciliationManualReview(
      paymentId,
      req.user!.id,
      typeof req.body?.note === 'string' ? req.body.note : undefined,
    );
    res.status(200).json({ status: 'success', data });
  },
);

/**
 * Safe verify retry for open payments only — never for already paid/refunded.
 */
export const adminRetryVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentId } = parseOrThrow(paymentIdParamSchema, req.params);
    const payment = await Payment.findOne(storeScope({ _id: paymentId }));
    if (!payment) throw notFound('پرداخت یافت نشد.', 'PAYMENT_NOT_FOUND');
    assertCanRetryVerification(payment.status);

    await recordAudit({
      action: 'payment.verify_retried',
      actorType: 'admin',
      actorId: req.user!.id,
      entityType: 'payment',
      entityId: String(payment._id),
      orderNumber: payment.orderNumber,
    });

    const provider = await getPaymentProvider();
    const verified = await provider.verifyPayment({
      authority: payment.authority!,
      amount: payment.amount,
      currency: payment.currency,
      providerTransactionId: payment.providerTransactionId,
      metadata: payment.metadata,
    });

    if (verified.success && verified.amount === payment.amount) {
      const outcome = await applySuccessfulPaymentForReconcile(
        payment,
        verified.providerTransactionId,
      );
      const fresh = await paymentService.getAdminPayment(paymentId);
      res.status(200).json({
        status: 'success',
        data: { payment: fresh, outcome, verified: true },
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        verified: false,
        failureCode: verified.failureCode,
        failureMessage: verified.failureMessage,
        note: 'Provider did not confirm payment — left local state unchanged',
      },
    });
  },
);

export const adminProcessNotifications = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await processPendingNotifications(100);
    res.status(200).json({ status: 'success', data });
  },
);

export const adminListNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await listAdminNotifications({
      status:
        typeof req.query.status === 'string' ? req.query.status : undefined,
      orderNumber:
        typeof req.query.orderNumber === 'string'
          ? req.query.orderNumber
          : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.status(200).json({ status: 'success', data });
  },
);

export const adminRetryNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const deliveryId = String(req.params.deliveryId ?? '');
    const delivery = await retryNotificationDelivery(deliveryId, req.user!.id);
    if (!delivery) {
      throw notFound('اعلان یافت نشد.');
    }
    const processed = await processPendingNotifications(5);
    res.status(200).json({
      status: 'success',
      data: {
        delivery: {
          id: String(delivery._id),
          status: delivery.status,
          attempts: delivery.attempts,
        },
        processed,
      },
    });
  },
);

export const adminSchedulerHealth = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getSchedulerHealth();
    res.status(200).json({ status: 'success', data });
  },
);
