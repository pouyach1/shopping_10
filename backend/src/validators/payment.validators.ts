import { z } from 'zod';

import {
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENTS_DEFAULT_LIMIT,
  PAYMENTS_DEFAULT_PAGE,
  PAYMENTS_MAX_LIMIT,
} from '../config/constants';
import { parseOrThrow } from './shared';

export { parseOrThrow };

export const createPaymentSchema = z
  .object({
    orderNumber: z
      .string()
      .trim()
      .regex(/^LUX-\d{4}-\d{6}$/i)
      .transform((value) => value.toUpperCase()),
    /** Test-only simulation hint for mock provider — ignored in production mapping. */
    simulate: z
      .enum(['success', 'failure', 'timeout', 'wrong_amount', 'invalid'])
      .optional(),
  })
  .strict();

export const paymentCallbackSchema = z
  .object({
    authority: z.string().trim().min(4).max(200),
    status: z.string().trim().max(40).optional(),
  })
  .strict();

export const paymentIdParamSchema = z
  .object({
    paymentId: z.string().trim().min(1).max(64),
  })
  .strict();

export const paymentListQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(PAYMENTS_DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAYMENTS_MAX_LIMIT)
      .optional()
      .default(PAYMENTS_DEFAULT_LIMIT),
    status: z.enum(PAYMENT_ATTEMPT_STATUSES).optional(),
    orderNumber: z
      .string()
      .trim()
      .regex(/^LUX-\d{4}-\d{6}$/i)
      .transform((value) => value.toUpperCase())
      .optional(),
  })
  .strict();

export const createRefundSchema = z
  .object({
    amount: z.number().int().positive().optional(),
    reason: z.string().trim().max(400).optional(),
    idempotencyKey: z.string().trim().min(8).max(128),
    simulate: z.enum(['refund_failure']).optional(),
  })
  .strict();
