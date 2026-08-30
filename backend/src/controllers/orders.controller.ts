import type { Request, Response } from 'express';

import * as orderService from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  parseOrThrow,
  orderNumberParamSchema,
} from '../validators/order.validators';

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const data = await orderService.listCustomerOrders(req.user!.id, req.query);
  res.status(200).json({ status: 'success', data });
});

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, req.params);
  const order = await orderService.getCustomerOrder(req.user!.id, orderNumber);
  res.status(200).json({ status: 'success', data: { order } });
});

export const cancelMine = asyncHandler(async (req: Request, res: Response) => {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, req.params);
  const order = await orderService.cancelCustomerOrder(
    req.user!.id,
    orderNumber,
    req.body,
  );
  res.status(200).json({ status: 'success', data: { order } });
});

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const data = await orderService.listAdminOrders(req.query);
  res.status(200).json({ status: 'success', data });
});

export const adminGet = asyncHandler(async (req: Request, res: Response) => {
  const { orderNumber } = parseOrThrow(orderNumberParamSchema, req.params);
  const order = await orderService.getAdminOrder(orderNumber);
  res.status(200).json({ status: 'success', data: { order } });
});

export const adminUpdateStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderNumber } = parseOrThrow(orderNumberParamSchema, req.params);
    const order = await orderService.updateAdminOrderStatus(
      orderNumber,
      req.body,
      req.user!.id,
    );
    res.status(200).json({ status: 'success', data: { order } });
  },
);
