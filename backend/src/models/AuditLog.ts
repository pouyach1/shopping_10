import { Schema, model, type HydratedDocument } from 'mongoose';

import { AUDIT_ACTIONS, type AuditAction } from '../config/constants';

export interface AuditLogAttrs {
  action: AuditAction;
  actorType: 'customer' | 'admin' | 'system' | 'provider';
  actorId?: string;
  entityType: string;
  entityId?: string;
  orderNumber?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<AuditLogAttrs>(
  {
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    actorType: {
      type: String,
      enum: ['customer', 'admin', 'system', 'provider'],
      required: true,
    },
    actorId: { type: String, maxlength: 64 },
    entityType: { type: String, required: true, maxlength: 40, index: true },
    entityId: { type: String, maxlength: 64, index: true },
    orderNumber: { type: String, maxlength: 40, index: true },
    requestId: { type: String, maxlength: 128, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });
schema.index({ action: 1, createdAt: -1 });

export type AuditLogDocument = HydratedDocument<AuditLogAttrs>;

export const AuditLog = model<AuditLogAttrs>('AuditLog', schema);
