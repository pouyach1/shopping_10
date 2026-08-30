import { Types } from 'mongoose';

import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import { notFound } from '../utils/AppError';
import { logger } from '../utils/logger';
import {
  parseOrThrow,
  wishlistMergeSchema,
  type WishlistMergeInput,
} from '../validators/commerce.validators';
import { toPublicProduct } from './catalog.mapper';
import {
  resolveLineAvailability,
  toCartLineProduct,
  type WishlistDto,
  type WishlistItemDto,
} from './commerce.mapper';

async function getOrCreateWishlist(userId: string) {
  const existing = await Wishlist.findOne({ user: userId });
  if (existing) return existing;
  try {
    return await Wishlist.create({ user: userId, products: [] });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      const doc = await Wishlist.findOne({ user: userId });
      if (doc) return doc;
    }
    throw error;
  }
}

export async function getWishlistDto(userId: string): Promise<WishlistDto> {
  const wishlist = await getOrCreateWishlist(userId);
  if (wishlist.products.length === 0) {
    return { items: [], itemCount: 0 };
  }

  const products = await Product.find({
    _id: { $in: wishlist.products },
  }).populate('category', 'name slug');

  const byId = new Map(products.map((p) => [String(p._id), p]));

  // Preserve wishlist order as stored.
  const items: WishlistItemDto[] = wishlist.products.map((ref) => {
    const id = String(ref);
    const doc = byId.get(id);
    const publicProduct = doc ? toPublicProduct(doc) : null;
    const availability = resolveLineAvailability(publicProduct);
    const name = publicProduct?.name ?? 'محصول نامشخص';
    return {
      id,
      productId: id,
      name,
      price: publicProduct?.displayPrice ?? 0,
      originalPrice: publicProduct?.originalPrice,
      currency: publicProduct?.currency ?? 'تومان',
      size: '',
      imageSrc: publicProduct?.imageSrc ?? '',
      imageAlt: publicProduct?.imageAlt ?? name,
      available: availability.available,
      purchasable: availability.purchasable,
      unavailableReason: availability.reason,
      product: publicProduct ? toCartLineProduct(publicProduct) : null,
    };
  });

  return { items, itemCount: items.length };
}

/**
 * Add product to wishlist. Idempotent — duplicate add is a no-op success.
 * Product must exist; archived products may still be saved (user intent).
 */
export async function addWishlistProduct(
  userId: string,
  productId: string,
): Promise<WishlistDto> {
  const product = await Product.findById(productId).select('_id');
  if (!product) throw notFound('محصول یافت نشد.');

  await Wishlist.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: { user: userId },
      $addToSet: { products: new Types.ObjectId(productId) },
    },
    { upsert: true, returnDocument: 'after' },
  );

  logger.info('wishlist.item_added', { userId, productId });
  return getWishlistDto(userId);
}

/**
 * Remove product. Idempotent — missing product returns current wishlist (200).
 */
export async function removeWishlistProduct(
  userId: string,
  productId: string,
): Promise<WishlistDto> {
  await Wishlist.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: { user: userId },
      $pull: { products: new Types.ObjectId(productId) },
    },
    { upsert: true, returnDocument: 'after' },
  );

  logger.info('wishlist.item_removed', { userId, productId });
  return getWishlistDto(userId);
}

export async function mergeWishlistProducts(
  userId: string,
  raw: unknown,
): Promise<WishlistDto> {
  const input: WishlistMergeInput = parseOrThrow(wishlistMergeSchema, raw);
  const unique = [...new Set(input.productIds)];
  if (unique.length === 0) return getWishlistDto(userId);

  const existing = await Product.find({
    _id: { $in: unique.map((id) => new Types.ObjectId(id)) },
  }).select('_id');
  const validIds = existing.map((doc) => doc._id);

  await Wishlist.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: { user: userId },
      $addToSet: { products: { $each: validIds } },
    },
    { upsert: true, returnDocument: 'after' },
  );

  logger.info('wishlist.merged', { userId, count: validIds.length });
  return getWishlistDto(userId);
}
