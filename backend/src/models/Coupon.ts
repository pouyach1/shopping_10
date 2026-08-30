import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { COUPON_TYPES, type CouponType } from '../config/constants';

export interface CouponAttrs {
  code: string;
  type: CouponType;
  /** Percentage 1-100 or fixed integer تومان. */
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  /** Empty = all products. */
  productIds: Types.ObjectId[];
  /** Empty = all categories. */
  categoryIds: Types.ObjectId[];
  /** If false, cannot combine with sale markdowns beyond product sale (future stacking). */
  stackable: boolean;
  singleUse: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<CouponAttrs>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
      index: true,
    },
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, min: 1 },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    stackable: { type: Boolean, default: true },
    singleUse: { type: Boolean, default: false },
  },
  { timestamps: true },
);

couponSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export type CouponDocument = HydratedDocument<CouponAttrs>;

export const Coupon = model<CouponAttrs>('Coupon', couponSchema);
