import type { Request, Response } from 'express';

import * as paymentService from '../services/payment.service';
import { reconcilePayment } from '../services/reconciliation.service';
import { processPendingNotifications } from '../services/notifications';
import { asyncHandler } from '../utils/asyncHandler';
import { requireIdempotencyKey } from '../services/checkout.service';
import {
  parseOrThrow,
  paymentIdParamSchema,
} from '../validators/payment.validators';

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
    const report = await reconcilePayment(paymentId, { applySafeFix });
    res.status(200).json({ status: 'success', data: { report } });
  },
);

export const adminProcessNotifications = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await processPendingNotifications(100);
    res.status(200).json({ status: 'success', data });
  },
);
