import { DEFAULT_STORE_SLUG } from '../../src/config/constants';
import { Store } from '../../src/models/Store';
import {
  runWithTenantContext,
  type TenantContext,
} from '../../src/tenant/TenantContext';

export async function getDefaultStoreId(): Promise<string> {
  const store = await Store.findOne({ slug: DEFAULT_STORE_SLUG });
  if (!store) {
    throw new Error('Default store missing — ensureDefaultStore() must run in test setup');
  }
  return String(store._id);
}

export async function defaultTenantContext(): Promise<TenantContext> {
  const store = await Store.findOne({ slug: DEFAULT_STORE_SLUG });
  if (!store) {
    throw new Error('Default store missing — ensureDefaultStore() must run in test setup');
  }
  return {
    storeId: String(store._id),
    storeSlug: store.slug,
    storeStatus: store.status,
    resolution: 'default',
  };
}

export async function withDefaultTenant<T>(
  fn: () => T | Promise<T>,
): Promise<T> {
  return runWithTenantContext(await defaultTenantContext(), fn);
}
