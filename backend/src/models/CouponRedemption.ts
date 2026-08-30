import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface CouponRedemptionAttrs {
  storeId: Types.ObjectId;
  coupon: Types.ObjectId;
  code: string;
  user: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: string;
  discountAmount: number;
  /** Set when cancel/expiry reclaims the usage slot (one-time). */
  releasedAt?: Date | null;
  createdAt: Date;
}

const schema = new Schema<CouponRedemptionAttrs>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    coupon: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    code: { type: String, required: true, maxlength: 40 },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderNumber: { type: String, required: true, maxlength: 40 },
    discountAmount: { type: Number, required: true, min: 0 },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ storeId: 1, coupon: 1, order: 1 }, { unique: true });
schema.index({ storeId: 1, coupon: 1, user: 1, createdAt: -1 });
/** releaseCouponForOrder: findOneAndUpdate({ order, releasedAt: null }) */
schema.index({ storeId: 1, order: 1, releasedAt: 1 });

export type CouponRedemptionDocument = HydratedDocument<CouponRedemptionAttrs>;

export const CouponRedemption = model<CouponRedemptionAttrs>(
  'CouponRedemption',
  schema,
);

/** Per-user usage counter for atomic per-user limits. */
export interface CouponUserUsageAttrs {
  storeId: Types.ObjectId;
  coupon: Types.ObjectId;
  user: Types.ObjectId;
  count: number;
}

const usageSchema = new Schema<CouponUserUsageAttrs>({
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 0, min: 0 },
});

usageSchema.index({ storeId: 1, coupon: 1, user: 1 }, { unique: true });

export type CouponUserUsageDocument = HydratedDocument<CouponUserUsageAttrs>;

export const CouponUserUsage = model<CouponUserUsageAttrs>(
  'CouponUserUsage',
  usageSchema,
);
