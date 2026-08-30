import type { Request, Response } from 'express';

import * as productService from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  parseOrThrow,
  mongoIdParamSchema,
  slugParamSchema,
} from '../validators/catalog.validators';

export const listPublic = asyncHandler(async (req: Request, res: Response) => {
  productService.parsePublicQuery(req.query);
  const result = await productService.listProducts(req.query, {
    publicOnly: true,
  });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = parseOrThrow(slugParamSchema, req.params);
  const product = await productService.getPublicProductBySlug(slug);
  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.listProducts(req.query, {
    publicOnly: false,
  });
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseOrThrow(mongoIdParamSchema, req.params);
  const product = await productService.getProductById(id);
  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

export const adminCreate = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({
    status: 'success',
    data: { product },
  });
});

export const adminUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseOrThrow(mongoIdParamSchema, req.params);
  const product = await productService.updateProduct(id, req.body);
  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

/** Soft-archives the product (commerce-safe). */
export const adminArchive = asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseOrThrow(mongoIdParamSchema, req.params);
  const product = await productService.archiveProduct(id);
  res.status(200).json({
    status: 'success',
    data: { product },
  });
});
