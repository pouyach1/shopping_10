/**
 * Explicit multi-tenant migration — NEVER run automatically on app startup.
 *
 * Usage:
 *   cd backend && npm run migrate:tenancy
 *
 * Steps (observable / repeatable):
 * 1. Ensure default store (slug=luxora)
 * 2. Assign storeId to Category/Product/Cart/Wishlist missing storeId
 * 3. Grant StoreMembership for User.role=admin → store admin
 * 4. Drop legacy global unique indexes when safe (logged; optional --drop-legacy-indexes)
 *
 * Does not invent data ownership for ambiguous records beyond the default store.
 */
import mongoose from 'mongoose';

import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { Wishlist } from '../models/Wishlist';
import { User } from '../models/User';
import { ensureDefaultStore } from '../services/storeBootstrap.service';
import { grantStoreRole } from '../services/membership.service';
import { logger } from '../utils/logger';

async function dropLegacyIndex(
  collectionName: string,
  indexName: string,
): Promise<void> {
  try {
    const col = mongoose.connection.collection(collectionName);
    await col.dropIndex(indexName);
    logger.info('migrate.drop_index', { collectionName, indexName });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('migrate.drop_index_skipped', {
      collectionName,
      indexName,
      message,
    });
  }
}

export async function migrateTenancy(options?: {
  dropLegacyIndexes?: boolean;
}): Promise<Record<string, unknown>> {
  const store = await ensureDefaultStore();
  const storeId = store._id;

  const categoryResult = await Category.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId } },
  );
  const productResult = await Product.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId } },
  );
  const cartResult = await Cart.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId } },
  );
  const wishlistResult = await Wishlist.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId } },
  );

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  let membershipsGranted = 0;
  for (const admin of admins) {
    await grantStoreRole(String(storeId), String(admin._id), 'admin');
    membershipsGranted += 1;
  }

  if (options?.dropLegacyIndexes) {
    // Legacy single-field uniques that conflict with per-store compounds.
    await dropLegacyIndex('categories', 'slug_1');
    await dropLegacyIndex('products', 'slug_1');
    await dropLegacyIndex('products', 'sku_1');
    await dropLegacyIndex('carts', 'user_1');
    await dropLegacyIndex('wishlists', 'user_1');
  }

  // Ensure compound indexes exist (additive createIndexes — never syncIndexes).
  await Promise.all([
    Category.createIndexes(),
    Product.createIndexes(),
    Cart.createIndexes(),
    Wishlist.createIndexes(),
  ]);

  const summary = {
    storeId: String(storeId),
    storeSlug: store.slug,
    categoriesUpdated: categoryResult.modifiedCount,
    productsUpdated: productResult.modifiedCount,
    cartsUpdated: cartResult.modifiedCount,
    wishlistsUpdated: wishlistResult.modifiedCount,
    membershipsGranted,
    dropLegacyIndexes: Boolean(options?.dropLegacyIndexes),
  };

  logger.info('migrate.tenancy.complete', summary);
  return summary;
}

async function main(): Promise<void> {
  const dropLegacyIndexes = process.argv.includes('--drop-legacy-indexes');
  await connectDB(env.MONGODB_URI);
  await migrateTenancy({ dropLegacyIndexes });
  await disconnectDB();
}

const isDirectRun =
  process.argv[1]?.includes('migrateTenancy') ||
  process.argv[1]?.includes('migrate:tenancy');

if (isDirectRun) {
  main().catch((error) => {
    logger.error(
      'migrate.tenancy.failed',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
