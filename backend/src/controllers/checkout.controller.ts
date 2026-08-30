import type { Request, Response } from 'express';

import * as checkoutService from '../services/checkout.service';
import { asyncHandler } from '../utils/asyncHandler';

export const preview = asyncHandler(async (req: Request, res: Response) => {
  const data = await checkoutService.previewCheckout(req.user!.id, req.body);
  res.status(200).json({ status: 'success', data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const key = checkoutService.requireIdempotencyKey(
    req.header('Idempotency-Key'),
  );
  const order = await checkoutService.createOrder(req.user!.id, req.body, key);
  res.status(201).json({ status: 'success', data: { order } });
});
