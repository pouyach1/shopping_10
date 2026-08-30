import type { Request, Response } from 'express';

import * as categoryService from '../services/category.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  parseOrThrow,
  mongoIdParamSchema,
  slugParamSchema,
} from '../validators/catalog.validators';

export const listPublic = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.listPublicCategories();
  res.status(200).json({
    status: 'success',
    data: { items: categories },
  });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = parseOrThrow(slugParamSchema, req.params);
  const category = await categoryService.getCategoryBySlug(slug, {
    publicOnly: true,
  });
  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const adminList = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.listAdminCategories();
  res.status(200).json({
    status: 'success',
    data: { items: categories },
  });
});

export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseOrThrow(mongoIdParamSchema, req.params);
  const category = await categoryService.getCategoryById(id);
  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const adminCreate = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({
    status: 'success',
    data: { category },
  });
});

export const adminUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseOrThrow(mongoIdParamSchema, req.params);
  const category = await categoryService.updateCategory(id, req.body);
  res.status(200).json({
    status: 'success',
    data: { category },
  });
});

export const adminDeactivate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseOrThrow(mongoIdParamSchema, req.params);
  const category = await categoryService.deactivateCategory(id);
  res.status(200).json({
    status: 'success',
    data: { category },
  });
});
