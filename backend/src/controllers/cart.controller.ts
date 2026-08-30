import type { Request, Response } from 'express';

import * as cartService from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  parseOrThrow,
  cartItemParamsSchema,
} from '../validators/commerce.validators';

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCartDto(req.user!.id);
  res.status(200).json({ status: 'success', data: cart });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.addCartItem(req.user!.id, req.body);
  res.status(200).json({ status: 'success', data: cart });
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = parseOrThrow(cartItemParamsSchema, req.params);
  const cart = await cartService.updateCartItem(
    req.user!.id,
    productId,
    req.body,
    req.query,
  );
  res.status(200).json({ status: 'success', data: cart });
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = parseOrThrow(cartItemParamsSchema, req.params);
  const cart = await cartService.removeCartItem(
    req.user!.id,
    productId,
    req.query,
  );
  res.status(200).json({ status: 'success', data: cart });
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.clearCart(req.user!.id);
  res.status(200).json({ status: 'success', data: cart });
});

export const merge = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.mergeCartItems(req.user!.id, req.body);
  res.status(200).json({ status: 'success', data: cart });
});
