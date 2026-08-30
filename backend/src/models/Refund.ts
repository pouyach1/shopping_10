import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  DEFAULT_CURRENCY,
  REFUND_STATUSES,
  type RefundStatus,
} from '../config/constants';

export interface RefundAttrs {
  order: Types.ObjectId;
  orderNumber: string;
  payment: Types.ObjectId;
  user: Types.ObjectId;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  idempotencyKey: string;
  providerRefundId?: string;
  failureCode?: string;
  failureReason?: string;
  requestedBy: Types.ObjectId;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<RefundAttrs>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true, index: true, maxlength: 40 },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, default: DEFAULT_CURRENCY },
    status: {
      type: String,
      enum: REFUND_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    reason: { type: String, maxlength: 400 },
    idempotencyKey: { type: String, required: true, maxlength: 128 },
    providerRefundId: { type: String, maxlength: 200 },
    failureCode: { type: String, maxlength: 80 },
    failureReason: { type: String, maxlength: 400 },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

schema.index(
  { payment: 1, idempotencyKey: 1 },
  { unique: true },
);
/** Service looks up refunds globally by idempotencyKey — enforce uniqueness. */
schema.index({ idempotencyKey: 1 }, { unique: true });
schema.index({ status: 1, createdAt: -1 });

export type RefundDocument = HydratedDocument<RefundAttrs>;

export const Refund = model<RefundAttrs>('Refund', schema);
