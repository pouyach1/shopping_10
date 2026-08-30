import { Types } from 'mongoose';

import {
  CART_MAX_QUANTITY,
  CART_MIN_QUANTITY,
} from '../config/constants';
import { Cart, type CartDocument, type CartItemAttrs } from '../models/Cart';
import { Product, type ProductDocument } from '../models/Product';
import {
  badRequest,
  conflict,
  notFound,
  validationError,
} from '../utils/AppError';
import { logger } from '../utils/logger';
import { requireStoreId } from '../tenant/TenantContext';
import { storeObjectId, storeScope } from '../tenant/storeScope';
import {
  parseOrThrow,
  cartAddItemSchema,
  cartUpdateItemSchema,
  cartMergeSchema,
  cartItemQuerySchema,
  type CartAddItemInput,
  type CartMergeInput,
} from '../validators/commerce.validators';
import { toPublicProduct } from './catalog.mapper';
import {
  buildCartSummary,
  buildLineKey,
  derivePricing,
  resolveLineAvailability,
  toCartLineProduct,
  type CartDto,
  type CartLineDto,
} from './commerce.mapper';
import { getFreeShippingThreshold } from './storeConfig.service';

function normalizeVariant(value?: string | null): string {
  return (value ?? '').trim();
}

function findLineIndex(
  cart: CartDocument,
  productId: string,
  size: string,
  color: string,
): number {
  return cart.items.findIndex(
    (item) =>
      String(item.product) === productId &&
      normalizeVariant(item.size) === size &&
      normalizeVariant(item.color) === color,
  );
}

async function getOrCreateCart(userId: string): Promise<CartDocument> {
  const existing = await Cart.findOne(storeScope({ user: userId }));
  if (existing) return existing;
  try {
    return await Cart.create({
      storeId: storeObjectId(),
      user: userId,
      items: [],
    });
  } catch (error) {
    // Race: another request created the cart.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      const cart = await Cart.findOne(storeScope({ user: userId }));
      if (cart) return cart;
    }
    throw error;
  }
}

async function loadProductsByIds(
  ids: string[],
): Promise<Map<string, ProductDocument>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const docs = await Product.find(
    storeScope({
      _id: { $in: unique.map((id) => new Types.ObjectId(id)) },
    }),
  ).populate('category', 'name slug');
  const map = new Map<string, ProductDocument>();
  for (const doc of docs) {
    map.set(String(doc._id), doc);
  }
  return map;
}

function assertPurchasableProduct(product: ProductDocument): void {
  if (product.status !== 'active') {
    throw conflict('این محصول قابل خرید نیست.', {
      productId: 'این محصول قابل خرید نیست.',
    });
  }
  if (product.stock <= 0) {
    throw conflict('موجودی این محصول کافی نیست.', {
      stock: 'موجودی این محصول کافی نیست.',
    });
  }
}

function assertQuantityAgainstStock(
  quantity: number,
  stock: number,
): void {
  if (quantity > stock) {
    throw conflict('موجودی کافی نیست.', {
      quantity: `حداکثر موجودی قابل سفارش ${stock} عدد است.`,
      stock: String(stock),
    });
  }
}

function toLineDto(
  item: CartItemAttrs & { _id?: Types.ObjectId },
  productDoc: ProductDocument | undefined,
): CartLineDto {
  const productId = String(item.product);
  const publicProduct = productDoc ? toPublicProduct(productDoc) : null;
  const availability = resolveLineAvailability(publicProduct);
  const unitPrice = publicProduct
    ? publicProduct.displayPrice
    : item.unitPriceSnapshot;
  const priceChanged =
    publicProduct != null &&
    Number(item.unitPriceSnapshot) !== Number(unitPrice);
  const purchasable =
    availability.purchasable && item.quantity <= (publicProduct?.stock ?? 0);
  const lineTotal = purchasable ? unitPrice * item.quantity : 0;
  const size = normalizeVariant(item.size);
  const color = normalizeVariant(item.color);
  const name = publicProduct?.name ?? 'محصول نامشخص';
  const imageSrc = publicProduct?.imageSrc ?? '';
  const imageAlt = publicProduct?.imageAlt ?? name;

  let unavailableReason = availability.reason;
  if (availability.available && !purchasable && publicProduct) {
    unavailableReason = `موجودی کافی نیست (حداکثر ${publicProduct.stock}).`;
  }

  return {
    id: buildLineKey(productId, color, size),
    lineId: item._id ? String(item._id) : buildLineKey(productId, color, size),
    productId,
    quantity: item.quantity,
    size,
    color: color || undefined,
    colorValue: item.colorValue || undefined,
    unitPrice,
    unitPriceSnapshot: item.unitPriceSnapshot,
    priceChanged,
    lineTotal,
    currency: publicProduct?.currency ?? 'تومان',
    available: availability.available,
    purchasable,
    unavailableReason,
    product: publicProduct ? toCartLineProduct(publicProduct) : null,
    name,
    price: unitPrice,
    imageSrc,
    imageAlt,
    addedAt: item.addedAt?.toISOString?.() ?? undefined,
    updatedAt: item.updatedAt?.toISOString?.() ?? undefined,
  };
}

export async function getCartDto(userId: string): Promise<CartDto> {
  const cart = await getOrCreateCart(userId);
  const productMap = await loadProductsByIds(
    cart.items.map((item) => String(item.product)),
  );
  const items = cart.items.map((item) =>
    toLineDto(item, productMap.get(String(item.product))),
  );
  const freeShippingThreshold = await getFreeShippingThreshold();
  return { items, summary: buildCartSummary(items, freeShippingThreshold) };
}

export async function addCartItem(
  userId: string,
  raw: unknown,
): Promise<CartDto> {
  const input: CartAddItemInput = parseOrThrow(cartAddItemSchema, raw);
  const size = normalizeVariant(input.size);
  const color = normalizeVariant(input.color);
  const quantity = input.quantity;

  const product = await Product.findOne(
    storeScope({ _id: input.productId }),
  ).populate('category', 'name slug');
  if (!product) throw notFound('محصول یافت نشد.');
  assertPurchasableProduct(product);

  const pricing = derivePricing(product.price, product.salePrice);
  const unitPrice = pricing.displayPrice;

  const cart = await getOrCreateCart(userId);
  const index = findLineIndex(cart, input.productId, size, color);

  if (index >= 0) {
    const nextQty = cart.items[index]!.quantity + quantity;
    if (nextQty > CART_MAX_QUANTITY) {
      throw validationError(`حداکثر تعداد در سبد ${CART_MAX_QUANTITY} است.`, {
        quantity: `حداکثر تعداد در سبد ${CART_MAX_QUANTITY} است.`,
      });
    }
    assertQuantityAgainstStock(nextQty, product.stock);
    cart.items[index]!.quantity = nextQty;
    cart.items[index]!.unitPriceSnapshot = unitPrice;
    cart.items[index]!.updatedAt = new Date();
    if (input.colorValue) cart.items[index]!.colorValue = input.colorValue;
  } else {
    assertQuantityAgainstStock(quantity, product.stock);
    const now = new Date();
    cart.items.push({
      product: new Types.ObjectId(input.productId),
      quantity,
      size,
      color,
      colorValue: input.colorValue,
      unitPriceSnapshot: unitPrice,
      addedAt: now,
      updatedAt: now,
    });
  }

  await cart.save();
  logger.info('cart.item_added', {
    storeId: requireStoreId(),
    userId,
    productId: input.productId,
    quantity,
  });
  return getCartDto(userId);
}

export async function updateCartItem(
  userId: string,
  productId: string,
  rawBody: unknown,
  rawQuery: unknown,
): Promise<CartDto> {
  const body = parseOrThrow(cartUpdateItemSchema, rawBody);
  const query = parseOrThrow(cartItemQuerySchema, rawQuery ?? {});

  const size = normalizeVariant(
    body.size !== undefined ? body.size : query.size,
  );
  const color = normalizeVariant(
    body.color !== undefined ? body.color : query.color,
  );

  if (body.quantity < CART_MIN_QUANTITY) {
    throw validationError('تعداد نامعتبر است.', {
      quantity: 'تعداد باید حداقل ۱ باشد.',
    });
  }

  const product = await Product.findOne(storeScope({ _id: productId }));
  if (!product) throw notFound('محصول یافت نشد.');

  // Updates allowed for inspection even if inactive — but stock still enforced when active.
  if (product.status === 'active') {
    assertQuantityAgainstStock(body.quantity, product.stock);
  } else if (body.quantity > 0) {
    throw conflict('این محصول قابل خرید نیست.', {
      productId: 'این محصول قابل خرید نیست.',
    });
  }

  const pricing = derivePricing(product.price, product.salePrice);

  const cart = await getOrCreateCart(userId);
  const index = findLineIndex(cart, productId, size, color);
  if (index < 0) throw notFound('آیتم سبد یافت نشد.');

  cart.items[index]!.quantity = body.quantity;
  cart.items[index]!.unitPriceSnapshot = pricing.displayPrice;
  cart.items[index]!.updatedAt = new Date();
  await cart.save();

  logger.info('cart.item_updated', {
    storeId: requireStoreId(),
    userId,
    productId,
    quantity: body.quantity,
  });
  return getCartDto(userId);
}

export async function removeCartItem(
  userId: string,
  productId: string,
  rawQuery: unknown,
): Promise<CartDto> {
  const query = parseOrThrow(cartItemQuerySchema, rawQuery ?? {});
  const size = normalizeVariant(query.size);
  const color = normalizeVariant(query.color);

  const cart = await getOrCreateCart(userId);
  const before = cart.items.length;
  cart.items = cart.items.filter(
    (item) =>
      !(
        String(item.product) === productId &&
        normalizeVariant(item.size) === size &&
        normalizeVariant(item.color) === color
      ),
  ) as typeof cart.items;

  if (cart.items.length === before) {
    throw notFound('آیتم سبد یافت نشد.');
  }

  await cart.save();
  logger.info('cart.item_removed', {
    storeId: requireStoreId(),
    userId,
    productId,
  });
  return getCartDto(userId);
}

export async function clearCart(userId: string): Promise<CartDto> {
  const cart = await getOrCreateCart(userId);
  cart.items = [] as typeof cart.items;
  await cart.save();
  logger.info('cart.cleared', { storeId: requireStoreId(), userId });
  return getCartDto(userId);
}

/**
 * Merge guest LocalStorage lines into the server cart.
 * Policy: for matching lines, quantity = min(server + local, stock, CART_MAX).
 * Skips missing/inactive products (does not fail the whole merge).
 */
export async function mergeCartItems(
  userId: string,
  raw: unknown,
): Promise<CartDto & { skipped: Array<{ productId: string; reason: string }> }> {
  const input: CartMergeInput = parseOrThrow(cartMergeSchema, raw);
  const skipped: Array<{ productId: string; reason: string }> = [];

  for (const line of input.items) {
    try {
      const product = await Product.findOne(storeScope({ _id: line.productId }));
      if (!product || product.status !== 'active') {
        skipped.push({
          productId: line.productId,
          reason: 'محصول قابل خرید نیست.',
        });
        continue;
      }
      if (product.stock <= 0) {
        skipped.push({
          productId: line.productId,
          reason: 'موجودی کافی نیست.',
        });
        continue;
      }

      const size = normalizeVariant(line.size);
      const color = normalizeVariant(line.color);
      const pricing = derivePricing(product.price, product.salePrice);
      const cart = await getOrCreateCart(userId);
      const index = findLineIndex(cart, line.productId, size, color);
      const current = index >= 0 ? cart.items[index]!.quantity : 0;
      const desired = Math.min(
        current + line.quantity,
        product.stock,
        CART_MAX_QUANTITY,
      );
      if (desired < CART_MIN_QUANTITY) {
        skipped.push({ productId: line.productId, reason: 'موجودی کافی نیست.' });
        continue;
      }

      if (index >= 0) {
        cart.items[index]!.quantity = desired;
        cart.items[index]!.unitPriceSnapshot = pricing.displayPrice;
        cart.items[index]!.updatedAt = new Date();
        if (line.colorValue) cart.items[index]!.colorValue = line.colorValue;
      } else {
        const now = new Date();
        cart.items.push({
          product: new Types.ObjectId(line.productId),
          quantity: desired,
          size,
          color,
          colorValue: line.colorValue,
          unitPriceSnapshot: pricing.displayPrice,
          addedAt: now,
          updatedAt: now,
        });
      }
      await cart.save();
    } catch {
      skipped.push({ productId: line.productId, reason: 'ادغام انجام نشد.' });
    }
  }

  logger.info('cart.merged', {
    storeId: requireStoreId(),
    userId,
    skipped: skipped.length,
  });
  const dto = await getCartDto(userId);
  return { ...dto, skipped };
}

export function assertValidProductIdParam(productId: string): void {
  if (!/^[a-fA-F0-9]{24}$/.test(productId)) {
    throw badRequest('شناسه محصول معتبر نیست.');
  }
}
