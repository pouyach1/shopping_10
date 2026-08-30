import type { Request, Response } from 'express';

import * as wishlistService from '../services/wishlist.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  parseOrThrow,
  wishlistProductParamsSchema,
} from '../validators/commerce.validators';

export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const wishlist = await wishlistService.getWishlistDto(req.user!.id);
  res.status(200).json({ status: 'success', data: wishlist });
});

export const addProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = parseOrThrow(wishlistProductParamsSchema, req.params);
  const wishlist = await wishlistService.addWishlistProduct(
    req.user!.id,
    productId,
  );
  res.status(200).json({ status: 'success', data: wishlist });
});

export const removeProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = parseOrThrow(wishlistProductParamsSchema, req.params);
  const wishlist = await wishlistService.removeWishlistProduct(
    req.user!.id,
    productId,
  );
  res.status(200).json({ status: 'success', data: wishlist });
});

export const merge = asyncHandler(async (req: Request, res: Response) => {
  const wishlist = await wishlistService.mergeWishlistProducts(
    req.user!.id,
    req.body,
  );
  res.status(200).json({ status: 'success', data: wishlist });
});
