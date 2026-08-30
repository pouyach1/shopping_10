import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
  ORDERS_DEFAULT_LIMIT,
  ORDERS_DEFAULT_PAGE,
  ORDERS_MAX_LIMIT,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
} from '../config/constants';
import { parseOrThrow, zodErrorToFieldMap } from './shared';

export { parseOrThrow, zodErrorToFieldMap };

const shippingMethodIds = SHIPPING_METHODS.map((m) => m.id) as [
  (typeof SHIPPING_METHODS)[number]['id'],
  ...(typeof SHIPPING_METHODS)[number]['id'][],
];

export const checkoutAddressSchema = z
  .object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(20),
    province: z.string().trim().min(1).max(80),
    city: z.string().trim().min(1).max(80),
    addressLine: z.string().trim().min(5).max(400),
    postalCode: z.string().trim().max(20).optional(),
    landline: z.string().trim().max(20).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const checkoutPreviewSchema = z
  .object({
    shippingMethodId: z.enum(shippingMethodIds),
    couponCode: z.string().trim().min(3).max(40).optional(),
  })
  .strict();

export const createOrderSchema = z
  .object({
    shippingMethodId: z.enum(shippingMethodIds),
    paymentMethod: z.enum(PAYMENT_METHODS).default('online'),
    shippingAddress: checkoutAddressSchema,
    couponCode: z.string().trim().min(3).max(40).optional(),
    /** Optional client-known totals for CHANGE detection — never authoritative. */
    expectedSubtotal: z.number().int().min(0).optional(),
    expectedTotal: z.number().int().min(0).optional(),
  })
  .strict();

export const orderNumberParamSchema = z
  .object({
    orderNumber: z
      .string()
      .trim()
      .regex(/^LUX-\d{4}-\d{6}$/i, 'شماره سفارش معتبر نیست.')
      .transform((value) => value.toUpperCase()),
  })
  .strict();

export const orderListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(ORDERS_DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ORDERS_MAX_LIMIT)
      .optional()
      .default(ORDERS_DEFAULT_LIMIT),
    status: z.enum(ORDER_STATUSES).optional(),
  })
  .strict();

export const adminOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    reason: z.string().trim().max(400).optional(),
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().max(400).optional(),
  })
  .strict();

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CheckoutPreviewInput = z.infer<typeof checkoutPreviewSchema>;

export function hashCheckoutRequest(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}
