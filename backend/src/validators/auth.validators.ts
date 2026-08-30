import { z } from 'zod';

import { normalizeIranianPhone } from '../utils/phone';
import { validationError } from '../utils/AppError';

const nameSchema = z
  .string()
  .trim()
  .min(2, 'نام باید حداقل ۲ کاراکتر باشد.')
  .max(80, 'نام بیش از حد طولانی است.');

const passwordSchema = z
  .string()
  .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.')
  .max(128, 'رمز عبور بیش از حد طولانی است.')
  .regex(/[A-Za-z\u0600-\u06FF]/, 'رمز عبور باید شامل حرف باشد.')
  .regex(/[0-9]/, 'رمز عبور باید شامل عدد باشد.');

const emailSchema = z
  .string()
  .trim()
  .email('ایمیل معتبر نیست.')
  .max(254)
  .transform((value) => value.toLowerCase());

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'شماره موبایل را وارد کنید.')
  .transform((value, ctx) => {
    const normalized = normalizeIranianPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: 'شماره موبایل معتبر نیست.',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.phone && !value.email) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'شماره موبایل یا ایمیل را وارد کنید.',
      });
    }
  });

export const loginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, 'شماره موبایل یا ایمیل را وارد کنید.')
      .max(254),
    password: z.string().min(1, 'رمز عبور را وارد کنید.').max(128),
    remember: z.boolean().optional().default(true),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'رمز عبور فعلی را وارد کنید.'),
    newPassword: passwordSchema,
  })
  .strict();

export const addressSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    recipientName: z.string().trim().min(2).max(120),
    phone: phoneSchema,
    province: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().max(20).optional(),
    addressLine: z.string().trim().min(5).max(400),
    plaque: z.string().trim().max(40).optional(),
    unit: z.string().trim().max(40).optional(),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

export function zodErrorToFieldMap(
  error: z.ZodError,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw validationError(
      'اطلاعات وارد شده صحیح نیست.',
      zodErrorToFieldMap(result.error),
    );
  }
  return result.data;
}
