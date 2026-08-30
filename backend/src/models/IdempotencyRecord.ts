import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { IDEMPOTENCY_TTL_MS } from '../config/constants';

/**
 * Stores checkout idempotency outcomes so retries return the same order.
 * Operation-scoped keys (storeId + key + operation) support generic tenant claims.
 */
export interface IdempotencyRecordAttrs {
  storeId: Types.ObjectId;
  key: string;
  /** Checkout replay — scoped with userId. */
  userId?: string;
  requestHash?: string;
  orderNumber?: string;
  /** Generic tenant operation claim — scoped with operation. */
  operation?: string;
  createdAt: Date;
  expiresAt: Date;
}

const idempotencySchema = new Schema<IdempotencyRecordAttrs>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    key: { type: String, required: true, maxlength: 128 },
    userId: { type: String, maxlength: 64 },
    requestHash: { type: String, maxlength: 128 },
    orderNumber: { type: String, maxlength: 40 },
    operation: { type: String, maxlength: 80 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

idempotencySchema.index(
  { storeId: 1, userId: 1, key: 1 },
  { unique: true, sparse: true },
);
idempotencySchema.index(
  { storeId: 1, key: 1, operation: 1 },
  { unique: true, sparse: true },
);
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IdempotencyRecordDocument = HydratedDocument<IdempotencyRecordAttrs>;

export const IdempotencyRecord = model<IdempotencyRecordAttrs>(
  'IdempotencyRecord',
  idempotencySchema,
);

export function idempotencyExpiry(from = new Date()): Date {
  return new Date(from.getTime() + IDEMPOTENCY_TTL_MS);
}
