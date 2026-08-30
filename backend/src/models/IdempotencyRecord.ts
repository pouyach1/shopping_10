import { Schema, model, type HydratedDocument } from 'mongoose';

import { IDEMPOTENCY_TTL_MS } from '../config/constants';

/**
 * Stores checkout idempotency outcomes so retries return the same order.
 */
export interface IdempotencyRecordAttrs {
  key: string;
  userId: string;
  requestHash: string;
  orderNumber: string;
  createdAt: Date;
  expiresAt: Date;
}

const idempotencySchema = new Schema<IdempotencyRecordAttrs>(
  {
    key: { type: String, required: true, maxlength: 128 },
    userId: { type: String, required: true, maxlength: 64 },
    requestHash: { type: String, required: true, maxlength: 128 },
    orderNumber: { type: String, required: true, maxlength: 40 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

idempotencySchema.index({ key: 1, userId: 1 }, { unique: true });
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IdempotencyRecordDocument = HydratedDocument<IdempotencyRecordAttrs>;

export const IdempotencyRecord = model<IdempotencyRecordAttrs>(
  'IdempotencyRecord',
  idempotencySchema,
);

export function idempotencyExpiry(from = new Date()): Date {
  return new Date(from.getTime() + IDEMPOTENCY_TTL_MS);
}
