import { Types } from 'mongoose';

import { Coupon } from '../models/Coupon';
import {
  CouponRedemption,
  CouponUserUsage,
} from '../models/CouponRedemption';
import { conflict, notFound, validationError } from '../utils/AppError';
import { recordAudit } from './audit.service';
import {
  parseOrThrow,
  createCouponSchema,
  updateCouponSchema,
  type CreateCouponInput,
} from '../validators/coupon.validators';

export interface CouponQuoteContext {
  userId: string;
  /** Merchandise subtotal after product sale prices (integer تومان). */
  merchandiseSubtotal: number;
  productIds: string[];
  categoryIds: string[];
}

export interface CouponQuote {
  couponId: string;
  code: string;
  discountAmount: number;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function moneyInt(value: number): number {
  return Math.max(0, Math.trunc(value));
}

export function computeCouponDiscount(
  coupon: {
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscountAmount?: number;
  },
  merchandiseSubtotal: number,
): number {
  let discount =
    coupon.type === 'percentage'
      ? Math.floor((merchandiseSubtotal * coupon.value) / 100)
      : coupon.value;
  if (coupon.maxDiscountAmount != null) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }
  discount = Math.min(discount, merchandiseSubtotal);
  return moneyInt(discount);
}

export async function quoteCoupon(
  codeRaw: string,
  ctx: CouponQuoteContext,
): Promise<CouponQuote> {
  const code = normalizeCode(codeRaw);
  const coupon = await Coupon.findOne({ code });
  if (!coupon) {
    throw validationError('کد تخفیف معتبر نیست.', undefined, 'COUPON_INVALID');
  }
  assertCouponApplicable(coupon, ctx);
  const discountAmount = computeCouponDiscount(coupon, ctx.merchandiseSubtotal);
  if (discountAmount <= 0) {
    throw validationError(
      'کد تخفیف برای این سفارش قابل اعمال نیست.',
      undefined,
      'COUPON_NOT_APPLICABLE',
    );
  }
  return {
    couponId: String(coupon._id),
    code: coupon.code,
    discountAmount,
  };
}

function assertCouponApplicable(
  coupon: {
    isActive: boolean;
    startsAt?: Date;
    endsAt?: Date;
    minOrderAmount: number;
    usageLimit?: number;
    usageCount: number;
    productIds: Types.ObjectId[];
    categoryIds: Types.ObjectId[];
    singleUse: boolean;
  },
  ctx: CouponQuoteContext,
): void {
  const now = new Date();
  if (!coupon.isActive) {
    throw validationError('کد تخفیف غیرفعال است.', undefined, 'COUPON_INACTIVE');
  }
  if (coupon.startsAt && coupon.startsAt > now) {
    throw validationError('کد تخفیف هنوز فعال نشده است.', undefined, 'COUPON_EXPIRED');
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw validationError('کد تخفیف منقضی شده است.', undefined, 'COUPON_EXPIRED');
  }
  if (ctx.merchandiseSubtotal < coupon.minOrderAmount) {
    throw validationError(
      'حداقل مبلغ سفارش برای این کد رعایت نشده است.',
      undefined,
      'COUPON_NOT_APPLICABLE',
    );
  }
  if (
    coupon.usageLimit != null &&
    coupon.usageCount >= coupon.usageLimit
  ) {
    throw conflict(
      'ظرفیت استفاده از کد تخفیف تکمیل شده است.',
      undefined,
      'COUPON_USAGE_LIMIT',
    );
  }
  if (coupon.productIds.length > 0) {
    const allowed = new Set(coupon.productIds.map(String));
    if (!ctx.productIds.some((id) => allowed.has(id))) {
      throw validationError(
        'کد تخفیف شامل محصولات سبد نیست.',
        undefined,
        'COUPON_NOT_APPLICABLE',
      );
    }
  }
  if (coupon.categoryIds.length > 0) {
    const allowed = new Set(coupon.categoryIds.map(String));
    if (!ctx.categoryIds.some((id) => allowed.has(id))) {
      throw validationError(
        'کد تخفیف شامل دسته‌های سبد نیست.',
        undefined,
        'COUPON_NOT_APPLICABLE',
      );
    }
  }
}

/**
 * Atomically reserve one global + per-user use, then record redemption.
 * Concurrent last-use races: only one findOneAndUpdate wins.
 */
export async function redeemCouponForOrder(input: {
  code: string;
  userId: string;
  orderId: string;
  orderNumber: string;
  merchandiseSubtotal: number;
  productIds: string[];
  categoryIds: string[];
}): Promise<CouponQuote> {
  const quote = await quoteCoupon(input.code, {
    userId: input.userId,
    merchandiseSubtotal: input.merchandiseSubtotal,
    productIds: input.productIds,
    categoryIds: input.categoryIds,
  });

  const couponOid = new Types.ObjectId(quote.couponId);
  const userOid = new Types.ObjectId(input.userId);

  const coupon = await Coupon.findById(quote.couponId);
  if (!coupon) {
    throw notFound('کد تخفیف یافت نشد.', 'COUPON_INVALID');
  }

  const perUserLimit = coupon.singleUse
    ? 1
    : coupon.perUserLimit ?? Number.MAX_SAFE_INTEGER;

  // Ensure usage doc exists then conditionally increment.
  await CouponUserUsage.updateOne(
    { coupon: couponOid, user: userOid },
    { $setOnInsert: { count: 0 } },
    { upsert: true },
  );
  const userUsage = await CouponUserUsage.findOneAndUpdate(
    {
      coupon: couponOid,
      user: userOid,
      count: { $lt: perUserLimit },
    },
    { $inc: { count: 1 } },
    { returnDocument: 'after' },
  );
  if (!userUsage) {
    throw conflict(
      'محدودیت استفاده کاربر از این کد تکمیل شده است.',
      undefined,
      'COUPON_USAGE_LIMIT',
    );
  }

  const filter: Record<string, unknown> = {
    _id: couponOid,
    isActive: true,
  };
  if (coupon.usageLimit != null) {
    filter.usageCount = { $lt: coupon.usageLimit };
  }

  const reserved = await Coupon.findOneAndUpdate(
    filter,
    { $inc: { usageCount: 1 } },
    { returnDocument: 'after' },
  );

  if (!reserved) {
    // Compensate per-user increment.
    await CouponUserUsage.updateOne(
      { coupon: couponOid, user: userOid, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
    throw conflict(
      'ظرفیت استفاده از کد تخفیف تکمیل شده است.',
      undefined,
      'COUPON_USAGE_LIMIT',
    );
  }

  try {
    await CouponRedemption.create({
      coupon: couponOid,
      code: reserved.code,
      user: userOid,
      order: new Types.ObjectId(input.orderId),
      orderNumber: input.orderNumber,
      discountAmount: quote.discountAmount,
    });
  } catch (error) {
    await Coupon.findByIdAndUpdate(couponOid, { $inc: { usageCount: -1 } });
    await CouponUserUsage.updateOne(
      { coupon: couponOid, user: userOid, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
    throw error;
  }

  await recordAudit({
    action: 'coupon.applied',
    actorType: 'customer',
    actorId: input.userId,
    entityType: 'coupon',
    entityId: quote.couponId,
    orderNumber: input.orderNumber,
    metadata: { code: quote.code, discountAmount: quote.discountAmount },
  });

  return quote;
}

export async function createCoupon(raw: unknown) {
  const input: CreateCouponInput = parseOrThrow(createCouponSchema, raw);
  const doc = await Coupon.create({
    ...input,
    code: normalizeCode(input.code),
    productIds: (input.productIds ?? []).map((id) => new Types.ObjectId(id)),
    categoryIds: (input.categoryIds ?? []).map((id) => new Types.ObjectId(id)),
    usageCount: 0,
  });
  return toPublicCoupon(doc);
}

export async function updateCoupon(id: string, raw: unknown) {
  const input = parseOrThrow(updateCouponSchema, raw);
  const update: Record<string, unknown> = { ...input };
  if (input.code) update.code = normalizeCode(input.code);
  if (input.productIds) {
    update.productIds = input.productIds.map((pid) => new Types.ObjectId(pid));
  }
  if (input.categoryIds) {
    update.categoryIds = input.categoryIds.map(
      (cid) => new Types.ObjectId(cid),
    );
  }
  const doc = await Coupon.findByIdAndUpdate(id, update, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!doc) throw notFound('کد تخفیف یافت نشد.', 'COUPON_INVALID');
  return toPublicCoupon(doc);
}

export async function listCoupons() {
  const docs = await Coupon.find().sort({ createdAt: -1 }).limit(200);
  return docs.map(toPublicCoupon);
}

export function toPublicCoupon(doc: {
  _id: Types.ObjectId;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  productIds: Types.ObjectId[];
  categoryIds: Types.ObjectId[];
  stackable: boolean;
  singleUse: boolean;
}) {
  return {
    id: String(doc._id),
    code: doc.code,
    type: doc.type,
    value: doc.value,
    minOrderAmount: doc.minOrderAmount,
    maxDiscountAmount: doc.maxDiscountAmount,
    startsAt: doc.startsAt?.toISOString(),
    endsAt: doc.endsAt?.toISOString(),
    isActive: doc.isActive,
    usageLimit: doc.usageLimit,
    usageCount: doc.usageCount,
    perUserLimit: doc.perUserLimit,
    productIds: doc.productIds.map(String),
    categoryIds: doc.categoryIds.map(String),
    stackable: doc.stackable,
    singleUse: doc.singleUse,
  };
}
