import { Types } from 'mongoose';
import { z, ZodError, type ZodType } from 'zod';

import { validationError } from '../utils/AppError';

export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), {
    message: 'شناسه نامعتبر است.',
  });

export function zodErrorToFieldMap(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (!fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw validationError(
      'اطلاعات وارد شده صحیح نیست.',
      zodErrorToFieldMap(result.error),
    );
  }
  return result.data;
}
