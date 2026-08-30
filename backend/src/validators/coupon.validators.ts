import { z } from 'zod';

import { COUPON_TYPES } from '../config/constants';
import { parseOrThrow, objectIdSchema } from './shared';

export { parseOrThrow };

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(3).max(40),
    type: z.enum(COUPON_TYPES),
    value: z.number().positive(),
    minOrderAmount: z.number().int().min(0).optional().default(0),
    maxDiscountAmount: z.number().int().positive().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isActive: z.boolean().optional().default(true),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    productIds: z.array(objectIdSchema).max(200).optional(),
    categoryIds: z.array(objectIdSchema).max(50).optional(),
    stackable: z.boolean().optional().default(true),
    singleUse: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === 'percentage' && value.value > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد.',
      });
    }
    if (value.endsAt && value.startsAt && value.endsAt < value.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'تاریخ پایان باید بعد از شروع باشد.',
      });
    }
  });

export const updateCouponSchema = z
  .object({
    code: z.string().trim().min(3).max(40).optional(),
    type: z.enum(COUPON_TYPES).optional(),
    value: z.number().positive().optional(),
    minOrderAmount: z.number().int().min(0).optional(),
    maxDiscountAmount: z.number().int().positive().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    productIds: z.array(objectIdSchema).max(200).optional(),
    categoryIds: z.array(objectIdSchema).max(50).optional(),
    stackable: z.boolean().optional(),
    singleUse: z.boolean().optional(),
  })
  .strict();

export const applyCouponSchema = z
  .object({
    code: z.string().trim().min(3).max(40),
  })
  .strict();

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
