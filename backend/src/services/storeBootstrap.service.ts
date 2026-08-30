import {
  DEFAULT_ORDER_PREFIX,
  DEFAULT_STORE_SLUG,
} from '../config/constants';
import { env } from '../config/env';
import {
  defaultPrivateConfig,
  defaultPublicConfig,
  Store,
  type StoreDocument,
} from '../models/Store';
import { grantStoreRole } from '../services/membership.service';

export type EnsureDefaultStoreOptions = {
  slug?: string;
  name?: string;
  displayName?: string;
  orderPrefix?: string;
  subdomain?: string;
};

/**
 * Idempotent bootstrap of the default Luxora store for single-tenant → multi-tenant.
 * Safe to call from seed, migration, and tests.
 */
export async function ensureDefaultStore(
  options: EnsureDefaultStoreOptions = {},
): Promise<StoreDocument> {
  const slug = (options.slug ?? env.DEFAULT_STORE_SLUG ?? DEFAULT_STORE_SLUG)
    .trim()
    .toLowerCase();

  const existing = await Store.findOne({ slug });
  if (existing) return existing;

  return Store.create({
    name: options.name ?? 'Luxora',
    slug,
    status: 'active',
    displayName: options.displayName ?? 'Luxora',
    subdomain: options.subdomain ?? slug,
    currency: 'تومان',
    timezone: 'Asia/Tehran',
    locale: 'fa-IR',
    country: 'IR',
    publicConfig: defaultPublicConfig({
      displayName: options.displayName ?? 'Luxora',
      orderPrefix: options.orderPrefix ?? DEFAULT_ORDER_PREFIX,
    }),
    privateConfig: defaultPrivateConfig(),
  });
}

export async function ensureStore(input: {
  slug: string;
  name: string;
  displayName?: string;
  orderPrefix?: string;
  subdomain?: string;
}): Promise<StoreDocument> {
  const slug = input.slug.trim().toLowerCase();
  const existing = await Store.findOne({ slug });
  if (existing) return existing;
  return Store.create({
    name: input.name,
    slug,
    status: 'active',
    displayName: input.displayName ?? input.name,
    subdomain: input.subdomain ?? slug,
    currency: 'تومان',
    timezone: 'Asia/Tehran',
    locale: 'fa-IR',
    country: 'IR',
    publicConfig: defaultPublicConfig({
      displayName: input.displayName ?? input.name,
      orderPrefix: input.orderPrefix ?? slug.slice(0, 4).toUpperCase(),
    }),
    privateConfig: defaultPrivateConfig(),
  });
}

export async function promoteStoreAdmin(
  storeId: string,
  userId: string,
  role: 'owner' | 'admin' | 'staff' = 'admin',
): Promise<void> {
  await grantStoreRole(storeId, userId, role);
}
