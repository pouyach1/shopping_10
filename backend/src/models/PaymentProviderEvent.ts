import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  PAYMENT_PROVIDER_IDS,
  type PaymentProviderId,
} from '../config/constants';

/**
 * Stores provider webhook/callback event ids for idempotent replay protection.
 */
export interface PaymentProviderEventAttrs {
  provider: PaymentProviderId;
  eventId: string;
  payment?: Types.ObjectId;
  authority?: string;
  payloadHash: string;
  processedAt: Date;
  outcome: 'processed' | 'ignored' | 'failed';
  note?: string;
  createdAt: Date;
}

const schema = new Schema<PaymentProviderEventAttrs>(
  {
    provider: {
      type: String,
      enum: PAYMENT_PROVIDER_IDS,
      required: true,
    },
    eventId: { type: String, required: true, maxlength: 200 },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    authority: { type: String, maxlength: 200 },
    payloadHash: { type: String, required: true, maxlength: 128 },
    processedAt: { type: Date, required: true },
    outcome: {
      type: String,
      enum: ['processed', 'ignored', 'failed'],
      required: true,
    },
    note: { type: String, maxlength: 400 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ provider: 1, eventId: 1 }, { unique: true });
schema.index({ authority: 1, createdAt: -1 });

export type PaymentProviderEventDocument =
  HydratedDocument<PaymentProviderEventAttrs>;

export const PaymentProviderEvent = model<PaymentProviderEventAttrs>(
  'PaymentProviderEvent',
  schema,
);
