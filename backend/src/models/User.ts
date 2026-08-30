import {
  Schema,
  model,
  type HydratedDocument,
  type Types,
} from 'mongoose';

import { USER_ROLES, type UserRole } from '../config/constants';

export interface AddressAttrs {
  _id?: Types.ObjectId;
  title: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode?: string;
  addressLine: string;
  plaque?: string;
  unit?: string;
  isDefault: boolean;
}

export interface UserAttrs {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  addresses: Types.DocumentArray<AddressAttrs>;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<AddressAttrs>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    province: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    addressLine: { type: String, required: true, trim: true, maxlength: 400 },
    plaque: { type: String, trim: true, maxlength: 40 },
    unit: { type: String, trim: true, maxlength: 40 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const userSchema = new Schema<UserAttrs>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      maxlength: 20,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'customer',
      required: true,
    },
    isActive: { type: Boolean, default: true, required: true },
    addresses: { type: [addressSchema], default: [] },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const value = ret as Record<string, unknown>;
        value.id = String(value._id);
        delete value._id;
        delete value.__v;
        delete value.passwordHash;
        return value;
      },
    },
  },
);

// Serves: admin / ops chronological user listing.
userSchema.index({ createdAt: -1 });
// Serves: admin filter by role + active flag.
userSchema.index({ role: 1, isActive: 1 });

export type UserDocument = HydratedDocument<UserAttrs>;
export type AddressDocument = AddressAttrs & { _id: Types.ObjectId };

export const User = model<UserAttrs>('User', userSchema);
