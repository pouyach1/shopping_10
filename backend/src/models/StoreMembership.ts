import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import {
  STORE_MEMBERSHIP_ROLES,
  STORE_MEMBERSHIP_STATUSES,
  type StoreMembershipRole,
  type StoreMembershipStatus,
} from '../config/constants';

export interface StoreMembershipAttrs {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  role: StoreMembershipRole;
  status: StoreMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const storeMembershipSchema = new Schema<StoreMembershipAttrs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    role: {
      type: String,
      enum: STORE_MEMBERSHIP_ROLES,
      required: true,
      default: 'customer',
    },
    status: {
      type: String,
      enum: STORE_MEMBERSHIP_STATUSES,
      required: true,
      default: 'active',
    },
  },
  { timestamps: true },
);

// One membership record per user per store.
storeMembershipSchema.index({ storeId: 1, userId: 1 }, { unique: true });
// Serves: list members by store + role (admin roster).
storeMembershipSchema.index({ storeId: 1, role: 1, status: 1 });
// Serves: reverse lookup — stores a user belongs to.
storeMembershipSchema.index({ userId: 1, status: 1 });

export type StoreMembershipDocument = HydratedDocument<StoreMembershipAttrs>;

export const StoreMembership = model<StoreMembershipAttrs>(
  'StoreMembership',
  storeMembershipSchema,
);
