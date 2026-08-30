import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  DEFAULT_CURRENCY,
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_PROVIDER_IDS,
  type PaymentAttemptStatus,
  type PaymentProviderId,
} from '../config/constants';

export interface PaymentAttrs {
  order: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  provider: PaymentProviderId;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  authority?: string;
  providerTransactionId?: string;
  failureCode?: string;
  failureReason?: string;
  redirectUrl?: string;
  idempotencyKey?: string;
  verifiedAt?: Date;
  paidAt?: Date;
  refundedAt?: Date;
  refundedAmount: number;
  expiresAt?: Date;
  /** True when funds are captured but automatic refund did not confirm. */
  needsManualRefund: boolean;
  financialHoldReason?: string;
  requestHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentAttrs>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true, index: true, maxlength: 40 },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: PAYMENT_PROVIDER_IDS,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: PAYMENT_ATTEMPT_STATUSES,
      required: true,
      default: 'created',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: DEFAULT_CURRENCY },
    authority: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
      maxlength: 200,
    },
    providerTransactionId: {
      type: String,
      index: true,
      sparse: true,
      maxlength: 200,
    },
    failureCode: { type: String, maxlength: 80 },
    failureReason: { type: String, maxlength: 400 },
    redirectUrl: { type: String, maxlength: 1000 },
    idempotencyKey: { type: String, maxlength: 128 },
    verifiedAt: { type: Date },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    refundedAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, index: true },
    needsManualRefund: { type: Boolean, default: false, index: true },
    financialHoldReason: { type: String, maxlength: 200 },
    requestHash: { type: String, maxlength: 128 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

paymentSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ provider: 1, providerTransactionId: 1 });

export type PaymentDocument = HydratedDocument<PaymentAttrs>;

export const Payment = model<PaymentAttrs>('Payment', paymentSchema);
