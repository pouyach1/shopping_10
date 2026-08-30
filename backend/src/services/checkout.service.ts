import { Types } from 'mongoose';

import {
  type ShippingMethodId,
} from '../config/constants';
import { Cart } from '../models/Cart';
import { Product, type ProductDocument } from '../models/Product';
import { Order, type OrderDocument } from '../models/Order';
import {
  IdempotencyRecord,
  idempotencyExpiry,
} from '../models/IdempotencyRecord';
import {
  badRequest,
  conflict,
  validationError,
} from '../utils/AppError';
import { logger } from '../utils/logger';
import { storeObjectId, storeScope } from '../tenant/storeScope';
import { getFreeShippingThreshold } from './storeConfig.service';
import {
  parseOrThrow,
  createOrderSchema,
  checkoutPreviewSchema,
  hashCheckoutRequest,
  type CreateOrderInput,
  type CheckoutAddressInput,
} from '../validators/order.validators';
import { toPublicProduct, derivePricing } from './catalog.mapper';
import { resolveLineAvailability } from './commerce.mapper';
import { restoreMany } from './inventory.service';
import {
  beginInventoryHold,
  claimReleaseDecrementedHold,
  commitInventoryHold,
  decrementUnderHold,
} from './inventoryHold.service';
import { InventoryHold } from '../models/InventoryHold';
import { allocateOrderNumber } from './orderNumber.service';
import { toPublicOrder, type PublicOrder } from './order.mapper';
import { resolveShippingCost } from './shipping.service';
import { clearCart } from './cart.service';
import { quoteCoupon, redeemCouponForOrder, releaseCouponForOrder } from './coupon.service';
import { recordAudit } from './audit.service';
import { emitCommerceEvent } from './notifications';
import { env } from '../config/env';

export interface CheckoutIssue {
  code:
    | 'PRODUCT_UNAVAILABLE'
    | 'PRODUCT_ARCHIVED'
    | 'INSUFFICIENT_STOCK'
    | 'PRICE_CHANGED'
    | 'INVALID_VARIANT';
  productId: string;
  lineId: string;
  message: string;
}

export interface CheckoutLinePreview {
  lineId: string;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  imageSrc: string;
  productKind: string;
  size: string;
  color: string;
  colorValue?: string;
  quantity: number;
  unitPrice: number;
  unitFinalPrice: number;
  originalPrice?: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
  currency: string;
  available: boolean;
  purchasable: boolean;
  priceChanged: boolean;
  stock: number;
  categoryId?: string;
}

export interface CheckoutPreviewDto {
  ready: boolean;
  items: CheckoutLinePreview[];
  issues: CheckoutIssue[];
  summary: {
    subtotal: number;
    discountTotal: number;
    couponDiscount: number;
    couponCode?: string;
    shippingCost: number;
    total: number;
    itemCount: number;
    currency: string;
    freeShippingThreshold: number;
    qualifiesForFreeShipping: boolean;
  };
  shippingMethodId: ShippingMethodId;
  shippingMethodTitle: string;
}

function normalizeVariant(value?: string | null): string {
  return (value ?? '').trim();
}

function moneyInt(value: number): number {
  return Math.trunc(value);
}

async function loadCartOrThrow(userId: string) {
  const cart = await Cart.findOne(storeScope({ user: userId }));
  if (!cart || cart.items.length === 0) {
    throw conflict('سبد خرید خالی است.', undefined, 'CART_EMPTY');
  }
  return cart;
}

async function loadProducts(
  ids: string[],
): Promise<Map<string, ProductDocument>> {
  const docs = await Product.find(
    storeScope({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    }),
  ).populate('category', 'name slug');
  return new Map(docs.map((doc) => [String(doc._id), doc]));
}

async function buildPreviewFromCart(
  cartItems: Array<{
    _id?: { toString(): string };
    product: unknown;
    quantity: number;
    size: string;
    color: string;
    colorValue?: string;
    unitPriceSnapshot: number;
  }>,
  products: Map<string, ProductDocument>,
  shippingMethodId: string,
): Promise<CheckoutPreviewDto> {
  const items: CheckoutLinePreview[] = [];
  const issues: CheckoutIssue[] = [];

  for (const item of cartItems) {
    const productId = String(item.product);
    const size = normalizeVariant(item.size);
    const color = normalizeVariant(item.color);
    const lineId = `${productId}__${color}__${size}`;
    const product = products.get(productId);

    if (!product) {
      issues.push({
        code: 'PRODUCT_UNAVAILABLE',
        productId,
        lineId,
        message: 'محصول دیگر در دسترس نیست.',
      });
      items.push({
        lineId,
        productId,
        name: 'محصول نامشخص',
        slug: '',
        sku: '',
        imageSrc: '',
        productKind: 'other',
        size,
        color,
        colorValue: item.colorValue,
        quantity: item.quantity,
        unitPrice: item.unitPriceSnapshot,
        unitFinalPrice: item.unitPriceSnapshot,
        lineSubtotal: 0,
        lineDiscount: 0,
        lineTotal: 0,
        currency: 'تومان',
        available: false,
        purchasable: false,
        priceChanged: false,
        stock: 0,
      });
      continue;
    }

    const publicProduct = toPublicProduct(product);
    const availability = resolveLineAvailability(publicProduct);
    const pricing = derivePricing(product.price, product.salePrice);
    const unitFinal = moneyInt(pricing.displayPrice);
    const unitList = moneyInt(pricing.price);
    const priceChanged = moneyInt(item.unitPriceSnapshot) !== unitFinal;
    const purchasable =
      availability.purchasable && item.quantity <= product.stock;

    if (product.status !== 'active') {
      issues.push({
        code: 'PRODUCT_ARCHIVED',
        productId,
        lineId,
        message: 'این محصول دیگر موجود نیست.',
      });
    } else if (product.stock < item.quantity) {
      issues.push({
        code: 'INSUFFICIENT_STOCK',
        productId,
        lineId,
        message: `موجودی کافی نیست (حداکثر ${product.stock}).`,
      });
    } else if (priceChanged) {
      issues.push({
        code: 'PRICE_CHANGED',
        productId,
        lineId,
        message: 'قیمت این محصول تغییر کرده است.',
      });
    }

    // Soft variant check — sizes/colors are advisory on catalog today.
    if (
      product.sizes.length > 0 &&
      size &&
      !product.sizes.includes(size)
    ) {
      issues.push({
        code: 'INVALID_VARIANT',
        productId,
        lineId,
        message: 'سایز انتخاب‌شده معتبر نیست.',
      });
    }

    const lineSubtotal = moneyInt(unitList * item.quantity);
    const lineTotal = moneyInt(unitFinal * item.quantity);
    const lineDiscount = moneyInt(lineSubtotal - lineTotal);

    items.push({
      lineId,
      productId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      imageSrc: publicProduct.imageSrc ?? '',
      productKind: product.productKind,
      size,
      color,
      colorValue: item.colorValue,
      quantity: item.quantity,
      unitPrice: unitList,
      unitFinalPrice: unitFinal,
      originalPrice: pricing.originalPrice,
      lineSubtotal,
      lineDiscount,
      lineTotal: purchasable ? lineTotal : 0,
      currency: product.currency,
      available: availability.available,
      purchasable,
      priceChanged,
      stock: product.stock,
      categoryId: product.category
        ? String(
            typeof product.category === 'object' &&
              product.category !== null &&
              '_id' in product.category
              ? (product.category as { _id: unknown })._id
              : product.category,
          )
        : undefined,
    });
  }

  const purchasableItems = items.filter((item) => item.purchasable);
  const subtotal = moneyInt(
    purchasableItems.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const discountTotal = moneyInt(
    purchasableItems.reduce((sum, item) => sum + item.lineDiscount, 0),
  );
  // Shipping qualifies on merchandise subtotal before coupon.
  const shipping = await resolveShippingCost(shippingMethodId, subtotal);
  const freeShippingThreshold = await getFreeShippingThreshold();
  const itemCount = purchasableItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = moneyInt(subtotal + shipping.cost);

  const blocking = issues.filter((issue) => issue.code !== 'PRICE_CHANGED');
  const ready =
    purchasableItems.length > 0 &&
    purchasableItems.length === items.length &&
    blocking.length === 0;

  return {
    ready,
    items,
    issues,
    summary: {
      subtotal,
      discountTotal,
      couponDiscount: 0,
      shippingCost: shipping.cost,
      total,
      itemCount,
      currency: items[0]?.currency ?? 'تومان',
      freeShippingThreshold,
      qualifiesForFreeShipping: subtotal >= freeShippingThreshold,
    },
    shippingMethodId: shipping.methodId,
    shippingMethodTitle: shipping.title,
  };
}

async function applyCouponToPreview(
  preview: CheckoutPreviewDto,
  userId: string,
  couponCode?: string,
): Promise<CheckoutPreviewDto> {
  if (!couponCode) return preview;
  const quote = await quoteCoupon(couponCode, {
    userId,
    merchandiseSubtotal: preview.summary.subtotal,
    productIds: preview.items.map((i) => i.productId),
    categoryIds: preview.items
      .map((i) => i.categoryId)
      .filter((id): id is string => Boolean(id)),
  });
  const merchandiseAfter = moneyInt(
    preview.summary.subtotal - quote.discountAmount,
  );
  const total = moneyInt(merchandiseAfter + preview.summary.shippingCost);
  return {
    ...preview,
    summary: {
      ...preview.summary,
      couponDiscount: quote.discountAmount,
      couponCode: quote.code,
      total,
    },
  };
}

export async function previewCheckout(
  userId: string,
  raw: unknown,
): Promise<CheckoutPreviewDto> {
  const input = parseOrThrow(checkoutPreviewSchema, raw);
  const cart = await loadCartOrThrow(userId);
  const products = await loadProducts(
    cart.items.map((item) => String(item.product)),
  );
  let preview = await buildPreviewFromCart(
    cart.items,
    products,
    input.shippingMethodId,
  );
  preview = await applyCouponToPreview(preview, userId, input.couponCode);
  logger.info('checkout.preview', {
    userId,
    ready: preview.ready,
    issues: preview.issues.length,
  });
  return preview;
}

function assertAddress(address: CheckoutAddressInput): void {
  if (!address.recipientName || !address.phone || !address.addressLine) {
    throw validationError(
      'آدرس ارسال ناقص است.',
      undefined,
      'INVALID_ADDRESS',
    );
  }
}

export async function createOrder(
  userId: string,
  raw: unknown,
  idempotencyKey: string,
): Promise<PublicOrder> {
  const input: CreateOrderInput = parseOrThrow(createOrderSchema, raw);
  assertAddress(input.shippingAddress);
  const requestHash = hashCheckoutRequest(raw);

  const existing = await IdempotencyRecord.findOne(
    storeScope({
      key: idempotencyKey,
      userId,
    }),
  );
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw conflict(
        'کلید تکرار با درخواست متفاوت در تداخل است.',
        undefined,
        'IDEMPOTENCY_CONFLICT',
      );
    }
    const order = await Order.findOne(storeScope({ orderNumber: existing.orderNumber }));
    if (order) {
      logger.info('checkout.idempotency_replay', {
        userId,
        orderNumber: order.orderNumber,
      });
      return toPublicOrder(order);
    }
  }

  const cart = await loadCartOrThrow(userId);
  const products = await loadProducts(
    cart.items.map((item) => String(item.product)),
  );
  let preview = await buildPreviewFromCart(
    cart.items,
    products,
    input.shippingMethodId,
  );
  preview = await applyCouponToPreview(preview, userId, input.couponCode);

  if (preview.issues.some((i) => i.code === 'PRICE_CHANGED')) {
    if (
      input.expectedTotal == null ||
      input.expectedTotal !== preview.summary.total
    ) {
      throw conflict(
        'سبد خرید تغییر کرده است. لطفاً دوباره بررسی کنید.',
        undefined,
        'CHECKOUT_CHANGED',
        preview,
      );
    }
  }

  const blocking = preview.issues.filter((i) => i.code !== 'PRICE_CHANGED');
  if (blocking.length > 0 || !preview.ready) {
    throw conflict(
      'سبد خرید برای ثبت سفارش آماده نیست.',
      undefined,
      'CHECKOUT_CHANGED',
      preview,
    );
  }

  if (
    input.expectedSubtotal != null &&
    input.expectedSubtotal !== preview.summary.subtotal
  ) {
    throw conflict(
      'مبالغ سبد تغییر کرده است.',
      undefined,
      'CHECKOUT_CHANGED',
      preview,
    );
  }

  if (
    input.expectedTotal != null &&
    input.expectedTotal !== preview.summary.total
  ) {
    throw conflict(
      'مبالغ سبد تغییر کرده است.',
      undefined,
      'CHECKOUT_CHANGED',
      preview,
    );
  }

  const stockLines = preview.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  // Durable hold → decrement → create order. Crash between decrement and
  // create leaves a recoverable hold (not silent inventory loss).
  const hold = await beginInventoryHold({ userId, items: stockLines });
  try {
    await decrementUnderHold(hold);
  } catch (error) {
    await claimReleaseDecrementedHold(hold._id, 'decrement_failed');
    throw error;
  }

  let order: OrderDocument | undefined;
  try {
    const orderNumber = await allocateOrderNumber();
    const now = new Date();
    const reservedUntil = new Date(
      now.getTime() + env.PAYMENT_RESERVATION_TTL_MS,
    );
    try {
      order = await Order.create({
        storeId: storeObjectId(),
        orderNumber,
        user: new Types.ObjectId(userId),
        status: 'awaiting_payment',
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'unfulfilled',
        items: preview.items.map((item) => ({
          productId: new Types.ObjectId(item.productId),
          sku: item.sku,
          name: item.name,
          slug: item.slug,
          imageSrc: item.imageSrc,
          productKind: item.productKind,
          size: item.size,
          color: item.color,
          colorValue: item.colorValue,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitSalePrice:
            item.unitFinalPrice < item.unitPrice
              ? item.unitFinalPrice
              : undefined,
          unitFinalPrice: item.unitFinalPrice,
          lineSubtotal: item.lineSubtotal,
          lineDiscount: item.lineDiscount,
          lineTotal: item.lineTotal,
          currency: item.currency,
        })),
        shippingAddress: {
          recipientName: input.shippingAddress.recipientName,
          phone: input.shippingAddress.phone,
          province: input.shippingAddress.province,
          city: input.shippingAddress.city,
          addressLine: input.shippingAddress.addressLine,
          postalCode: input.shippingAddress.postalCode,
          landline: input.shippingAddress.landline,
          notes: input.shippingAddress.notes,
        },
        shippingMethodId: preview.shippingMethodId as ShippingMethodId,
        shippingMethodTitle: preview.shippingMethodTitle,
        paymentMethod: input.paymentMethod,
        currency: preview.summary.currency,
        itemCount: preview.summary.itemCount,
        subtotal: preview.summary.subtotal,
        discountTotal: preview.summary.discountTotal,
        couponDiscount: preview.summary.couponDiscount,
        couponCode: preview.summary.couponCode,
        shippingCost: preview.summary.shippingCost,
        total: preview.summary.total,
        refundedTotal: 0,
        history: [
          {
            fromStatus: null,
            toStatus: 'awaiting_payment' as const,
            actorType: 'customer' as const,
            actorId: userId,
            reason: 'ثبت سفارش',
            at: now,
          },
        ],
        idempotencyKey,
        inventoryDecremented: true,
        inventoryReleaseClaimedAt: null,
        inventoryHoldId: hold._id,
        financialIntegrityStatus: 'ok',
        inventoryReservedUntil: reservedUntil,
      });
    } catch (createError) {
      // Concurrent same Idempotency-Key: unique (user, idempotencyKey) lost the race.
      const isDup =
        typeof createError === 'object' &&
        createError !== null &&
        'code' in createError &&
        (createError as { code?: number }).code === 11000;
      if (isDup) {
        await claimReleaseDecrementedHold(hold._id, 'idempotency_race');
        const existingRecord = await IdempotencyRecord.findOne(
          storeScope({
            key: idempotencyKey,
            userId,
          }),
        );
        if (existingRecord) {
          if (existingRecord.requestHash !== requestHash) {
            throw conflict(
              'کلید تکرار با درخواست متفاوت در تداخل است.',
              undefined,
              'IDEMPOTENCY_CONFLICT',
            );
          }
          const existingOrder = await Order.findOne(
            storeScope({ orderNumber: existingRecord.orderNumber }),
          );
          if (existingOrder) return toPublicOrder(existingOrder);
        }
        const byKey = await Order.findOne(
          storeScope({
            user: userId,
            idempotencyKey,
          }),
        );
        if (byKey) {
          // Ensure record exists for future replays.
          try {
            await IdempotencyRecord.create({
              storeId: storeObjectId(),
              key: idempotencyKey,
              userId,
              requestHash,
              orderNumber: byKey.orderNumber,
              expiresAt: idempotencyExpiry(),
            });
          } catch {
            /* already present */
          }
          return toPublicOrder(byKey);
        }
      }
      throw createError;
    }

    await commitInventoryHold(hold._id, order._id, order.orderNumber);

    if (preview.summary.couponCode) {
      const redeemed = await redeemCouponForOrder({
        code: preview.summary.couponCode,
        userId,
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        merchandiseSubtotal: preview.summary.subtotal,
        productIds: preview.items.map((i) => i.productId),
        categoryIds: preview.items
          .map((i) => i.categoryId)
          .filter((id): id is string => Boolean(id)),
      });
      order.couponId = new Types.ObjectId(redeemed.couponId);
      order.couponDiscount = redeemed.discountAmount;
      await order.save();
    }

    await clearCart(userId);

    try {
      await IdempotencyRecord.create({
        storeId: storeObjectId(),
        key: idempotencyKey,
        userId,
        requestHash,
        orderNumber: order.orderNumber,
        expiresAt: idempotencyExpiry(),
      });
    } catch {
      const raced = await IdempotencyRecord.findOne(
        storeScope({
          key: idempotencyKey,
          userId,
        }),
      );
      if (raced && raced.requestHash !== requestHash) {
        await releaseCouponForOrder({
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          reason: 'idempotency_conflict',
        }).catch(() => undefined);
        await Order.deleteOne(storeScope({ _id: order._id }));
        await restoreMany(stockLines);
        await InventoryHold.updateOne(
          storeScope({ _id: hold._id }),
          { $set: { status: 'released', releasedAt: new Date() } },
        );
        throw conflict(
          'کلید تکرار با درخواست متفاوت در تداخل است.',
          undefined,
          'IDEMPOTENCY_CONFLICT',
        );
      }
      if (raced && raced.orderNumber !== order.orderNumber) {
        const other = await Order.findOne(
          storeScope({ orderNumber: raced.orderNumber }),
        );
        if (other) {
          await releaseCouponForOrder({
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            reason: 'idempotency_race',
          }).catch(() => undefined);
          await Order.deleteOne({ _id: order._id });
          await restoreMany(stockLines);
          await InventoryHold.updateOne(
            { _id: hold._id },
            { $set: { status: 'released', releasedAt: new Date() } },
          );
          return toPublicOrder(other);
        }
      }
    }
  } catch (error) {
    if (order) {
      await releaseCouponForOrder({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        reason: 'order_create_failed',
      }).catch(() => undefined);
      await Order.deleteOne(storeScope({ _id: order._id })).catch(() => undefined);
    }
    const holdFresh = await InventoryHold.findOne(storeScope({ _id: hold._id }));
    if (holdFresh?.status === 'decremented') {
      await claimReleaseDecrementedHold(hold._id, 'order_create_failed');
    } else if (holdFresh?.status === 'committed') {
      await restoreMany(stockLines);
      await InventoryHold.updateOne(
        storeScope({ _id: hold._id }),
        { $set: { status: 'released', releasedAt: new Date() } },
      );
    } else if (holdFresh?.status === 'open') {
      await claimReleaseDecrementedHold(hold._id, 'order_create_failed');
    }
    throw error;
  }

  await recordAudit({
    action: 'order.created',
    actorType: 'customer',
    actorId: userId,
    entityType: 'order',
    entityId: String(order!._id),
    orderNumber: order!.orderNumber,
    metadata: { total: order!.total },
  });
  emitCommerceEvent('OrderCreated', {
    orderNumber: order!.orderNumber,
    userId,
    amount: order!.total,
    currency: order!.currency,
  });

  logger.info('checkout.order_created', {
    userId,
    orderNumber: order!.orderNumber,
    total: order!.total,
  });

  return toPublicOrder(order!);
}

/**
 * Idempotency-Key is required for money-moving order creation.
 */
export function requireIdempotencyKey(headerValue: unknown): string {
  if (headerValue == null || headerValue === '') {
    throw badRequest(
      'هدر Idempotency-Key الزامی است.',
      undefined,
      'BAD_REQUEST',
    );
  }
  if (typeof headerValue !== 'string') {
    throw badRequest('کلید Idempotency نامعتبر است.');
  }
  const key = headerValue.trim();
  if (key.length < 8 || key.length > 128) {
    throw badRequest('کلید Idempotency نامعتبر است.');
  }
  return key;
}
