import { Schema, model, type HydratedDocument } from 'mongoose';

import {
  COMMERCE_EVENTS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_DELIVERY_STATUSES,
  type CommerceEventType,
  type NotificationChannel,
  type NotificationDeliveryStatus,
} from '../config/constants';

export interface NotificationDeliveryAttrs {
  /** Deterministic idempotency key: event:channel:recipient:entity */
  deliveryKey: string;
  event: CommerceEventType;
  channel: NotificationChannel;
  recipient: string;
  userId?: string;
  orderNumber?: string;
  paymentId?: string;
  subject?: string;
  body: string;
  status: NotificationDeliveryStatus;
  attempts: number;
  /** Lease end — worker crash recovery allows re-claim after expiry. */
  lockedUntil?: Date;
  lastError?: string;
  nextAttemptAt?: Date;
  sentAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<NotificationDeliveryAttrs>(
  {
    deliveryKey: {
      type: String,
      required: true,
      unique: true,
      maxlength: 240,
      index: true,
    },
    event: { type: String, enum: COMMERCE_EVENTS, required: true, index: true },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      required: true,
      index: true,
    },
    recipient: { type: String, required: true, maxlength: 200 },
    userId: { type: String, maxlength: 64, index: true },
    orderNumber: { type: String, maxlength: 40, index: true },
    paymentId: { type: String, maxlength: 64 },
    subject: { type: String, maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: NOTIFICATION_DELIVERY_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, index: true },
    lastError: { type: String, maxlength: 400 },
    nextAttemptAt: { type: Date, index: true },
    sentAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

schema.index({ status: 1, nextAttemptAt: 1 });

export type NotificationDeliveryDocument =
  HydratedDocument<NotificationDeliveryAttrs>;

export const NotificationDelivery = model<NotificationDeliveryAttrs>(
  'NotificationDelivery',
  schema,
);

export function buildDeliveryKey(input: {
  event: string;
  channel: string;
  recipient: string;
  entityId: string;
}): string {
  return `${input.event}:${input.channel}:${input.recipient}:${input.entityId}`;
}
