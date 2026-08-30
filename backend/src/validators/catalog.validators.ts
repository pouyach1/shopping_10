import { z } from 'zod';

import {
  CATALOG_DEFAULT_LIMIT,
  CATALOG_DEFAULT_PAGE,
  CATALOG_MAX_LIMIT,
  DEFAULT_CURRENCY,
  PRODUCT_KINDS,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STATUSES,
} from '../config/constants';
import { normalizeSlug, isValidSlug } from '../utils/slug';
import { parseOrThrow, zodErrorToFieldMap } from './shared';

export { parseOrThrow, zodErrorToFieldMap };

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .transform((value, ctx) => {
    const normalized = normalizeSlug(value);
    if (!isValidSlug(normalized)) {
      ctx.addIssue({ code: 'custom', message: 'اسلاگ معتبر نیست.' });
      return z.NEVER;
    }
    return normalized;
  });

const skuSchema = z
  .string()
  .trim()
  .min(2, 'کد کالا معتبر نیست.')
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9\-_]*$/, 'کد کالا فقط می‌تواند شامل حروف، عدد، - و _ باشد.')
  .transform((value) => value.toUpperCase());

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => /^[a-fA-F0-9]{24}$/.test(value), 'شناسه معتبر نیست.');

const imageSchema = z
  .object({
    url: z.string().trim().min(1).max(1000),
    alt: z.string().trim().max(200).optional(),
    isPrimary: z.boolean().optional().default(false),
    sortOrder: z.number().int().min(0).optional().default(0),
  })
  .strict();

const colorSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    hex: z
      .string()
      .trim()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'کد رنگ معتبر نیست.'),
  })
  .strict();

function refinePricing(
  value: { price: number; salePrice?: number | null },
  ctx: z.RefinementCtx,
): void {
  if (value.price < 0) {
    ctx.addIssue({ code: 'custom', path: ['price'], message: 'قیمت نمی‌تواند منفی باشد.' });
  }
  if (value.salePrice != null && value.salePrice < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['salePrice'],
      message: 'قیمت فروش ویژه نمی‌تواند منفی باشد.',
    });
  }
  if (value.salePrice != null && value.salePrice > value.price) {
    ctx.addIssue({
      code: 'custom',
      path: ['salePrice'],
      message: 'قیمت فروش ویژه نمی‌تواند از قیمت اصلی بیشتر باشد.',
    });
  }
}

function refineImages(
  images: Array<{ url: string; isPrimary?: boolean }> | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!images || images.length === 0) return;
  const urls = images.map((image) => image.url);
  if (new Set(urls).size !== urls.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['images'],
      message: 'آدرس تصاویر تکراری مجاز نیست.',
    });
  }
}

export const categoryCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slugSchema,
    description: z.string().trim().max(2000).optional(),
    image: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).max(10_000).optional().default(0),
  })
  .strict();

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است.',
  });

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    slug: slugSchema,
    sku: skuSchema,
    shortDescription: z.string().trim().max(400).optional(),
    description: z.string().trim().max(10000).optional(),
    categoryId: objectIdSchema,
    productKind: z.enum(PRODUCT_KINDS).optional().default('other'),
    price: z.number().finite(),
    salePrice: z.number().finite().nullable().optional(),
    currency: z.string().trim().min(1).max(32).optional().default(DEFAULT_CURRENCY),
    images: z.array(imageSchema).max(20).optional().default([]),
    colors: z.array(colorSchema).max(30).optional().default([]),
    sizes: z.array(z.string().trim().min(1).max(40)).max(40).optional().default([]),
    stock: z.number().int().min(0).max(1_000_000).optional().default(0),
    lowStockThreshold: z.number().int().min(0).max(1_000_000).optional().default(5),
    status: z.enum(PRODUCT_STATUSES).optional().default('draft'),
    featured: z.boolean().optional().default(false),
    badge: z.string().trim().max(40).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).optional().default([]),
    material: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    refinePricing(value, ctx);
    refineImages(value.images, ctx);
  });

export const productUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    slug: slugSchema.optional(),
    sku: skuSchema.optional(),
    shortDescription: z.string().trim().max(400).nullable().optional(),
    description: z.string().trim().max(10000).nullable().optional(),
    categoryId: objectIdSchema.optional(),
    productKind: z.enum(PRODUCT_KINDS).optional(),
    price: z.number().finite().optional(),
    salePrice: z.number().finite().nullable().optional(),
    currency: z.string().trim().min(1).max(32).optional(),
    images: z.array(imageSchema).max(20).optional(),
    colors: z.array(colorSchema).max(30).optional(),
    sizes: z.array(z.string().trim().min(1).max(40)).max(40).optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    lowStockThreshold: z.number().int().min(0).max(1_000_000).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    featured: z.boolean().optional(),
    badge: z.string().trim().max(40).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    material: z.string().trim().max(80).nullable().optional(),
    brand: z.string().trim().max(80).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است.',
      });
    }
    if (value.price != null && value.price < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'قیمت نمی‌تواند منفی باشد.',
      });
    }
    if (value.salePrice != null && value.salePrice < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['salePrice'],
        message: 'قیمت فروش ویژه نمی‌تواند منفی باشد.',
      });
    }
    refineImages(value.images, ctx);
  });

export const productQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(CATALOG_DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CATALOG_MAX_LIMIT)
      .optional()
      .default(CATALOG_DEFAULT_LIMIT),
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(160).optional(),
    minPrice: z.coerce.number().finite().min(0).optional(),
    maxPrice: z.coerce.number().finite().min(0).optional(),
    featured: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    kind: z.enum(PRODUCT_KINDS).optional(),
    inStock: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    sort: z.enum(PRODUCT_SORT_OPTIONS).optional().default('newest'),
    status: z.enum(PRODUCT_STATUSES).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.minPrice != null &&
      value.maxPrice != null &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['minPrice'],
        message: 'حداقل قیمت نمی‌تواند از حداکثر بیشتر باشد.',
      });
    }
  });

export const mongoIdParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const slugParamSchema = z
  .object({
    slug: slugSchema,
  })
  .strict();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
