import type { Request, Response } from 'express';

import * as couponService from '../services/coupon.service';
import * as refundService from '../services/refund.service';
import { getPaymentTimeline } from '../services/paymentTimeline.service';
import { asyncHandler } from '../utils/asyncHandler';
import { orderNumberParamSchema } from '../validators/order.validators';
import { parseOrThrow } from '../validators/shared';

export const adminCreateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json({ status: 'success', data: { coupon } });
  },
);

export const adminListCoupons = asyncHandler(
  async (_req: Request, res: Response) => {
    const coupons = await couponService.listCoupons();
    res.status(200).json({ status: 'success', data: { coupons } });
  },
);

export const adminUpdateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await couponService.updateCoupon(
      String(req.params.id),
      req.body,
    );
    res.status(200).json({ status: 'success', data: { coupon } });
  },
);

export const adminCreateRefund = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderNumber } = parseOrThrow(orderNumberParamSchema, req.params);
    const refund = await refundService.createAdminRefund(
      orderNumber,
      req.user!.id,
      req.body,
    );
    res.status(201).json({ status: 'success', data: { refund } });
  },
);

export const adminListRefunds = asyncHandler(
  async (req: Request, res: Response) => {
    const orderNumber =
      typeof req.query.orderNumber === 'string'
        ? req.query.orderNumber
        : undefined;
    const refunds = await refundService.listAdminRefunds(orderNumber);
    res.status(200).json({ status: 'success', data: { refunds } });
  },
);

export const adminPaymentTimeline = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderNumber } = parseOrThrow(orderNumberParamSchema, req.params);
    const timeline = await getPaymentTimeline(orderNumber);
    res.status(200).json({ status: 'success', data: { timeline } });
  },
);
