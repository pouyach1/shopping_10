import { z } from 'zod';

import {
  CART_MAX_QUANTITY,
  CART_MIN_QUANTITY,
} from '../config/constants';
import { parseOrThrow, zodErrorToFieldMap } from './shared';

export { parseOrThrow, zodErrorToFieldMap };

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => /^[a-fA-F0-9]{24}$/.test(value), 'شناسه محصول معتبر نیست.');

const quantitySchema = z
  .number()
  .int('تعداد باید عدد صحیح باشد.')
  .min(CART_MIN_QUANTITY, `حداقل تعداد ${CART_MIN_QUANTITY} است.`)
  .max(CART_MAX_QUANTITY, `حداکثر تعداد ${CART_MAX_QUANTITY} است.`);

const variantFields = {
  size: z.string().trim().max(40).optional().default(''),
  color: z.string().trim().max(80).optional().default(''),
  colorValue: z.string().trim().max(20).optional(),
};

export const cartAddItemSchema = z
  .object({
    productId: objectIdSchema,
    quantity: quantitySchema.optional().default(1),
    ...variantFields,
  })
  .strict();

export const cartUpdateItemSchema = z
  .object({
    quantity: quantitySchema,
    size: z.string().trim().max(40).optional(),
    color: z.string().trim().max(80).optional(),
  })
  .strict();

export const cartItemParamsSchema = z
  .object({
    productId: objectIdSchema,
  })
  .strict();

export const cartItemQuerySchema = z
  .object({
    size: z.string().trim().max(40).optional().default(''),
    color: z.string().trim().max(80).optional().default(''),
  })
  .strict();

export const cartMergeSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: objectIdSchema,
            quantity: quantitySchema,
            size: z.string().trim().max(40).optional().default(''),
            color: z.string().trim().max(80).optional().default(''),
            colorValue: z.string().trim().max(20).optional(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

export const wishlistProductParamsSchema = z
  .object({
    productId: objectIdSchema,
  })
  .strict();

export const wishlistMergeSchema = z
  .object({
    productIds: z.array(objectIdSchema).max(100),
  })
  .strict();

export type CartAddItemInput = z.infer<typeof cartAddItemSchema>;
export type CartUpdateItemInput = z.infer<typeof cartUpdateItemSchema>;
export type CartMergeInput = z.infer<typeof cartMergeSchema>;
export type WishlistMergeInput = z.infer<typeof wishlistMergeSchema>;
