import type { Types } from 'mongoose';

import {
  defaultPrivateConfig,
  defaultPublicConfig,
  Store,
  type StoreDocument,
  type StorePrivateConfig,
  type StorePublicConfig,
} from '../models/Store';
import { notFound } from '../utils/AppError';
import { requireStoreId } from '../tenant/TenantContext';

export type PublicStoreDto = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  logo?: string;
  domain?: string;
  subdomain?: string;
  status: string;
  currency: string;
  locale: string;
  timezone: string;
  country: string;
  config: StorePublicConfig;
};

/** Never includes privateConfig / credential material. */
export function toPublicStore(store: StoreDocument): PublicStoreDto {
  return {
    id: String(store._id),
    slug: store.slug,
    name: store.name,
    displayName: store.displayName,
    logo: store.logo,
    domain: store.domain,
    subdomain: store.subdomain,
    status: store.status,
    currency: store.currency,
    locale: store.locale,
    timezone: store.timezone,
    country: store.country,
    config: {
      displayName: store.publicConfig.displayName,
      logo: store.publicConfig.logo ?? store.logo,
      currency: store.publicConfig.currency,
      locale: store.publicConfig.locale,
      timezone: store.publicConfig.timezone,
      country: store.publicConfig.country,
      orderPrefix: store.publicConfig.orderPrefix,
      freeShippingThreshold: store.publicConfig.freeShippingThreshold,
      shippingMethods: store.publicConfig.shippingMethods ?? [],
    },
  };
}

export async function getStoreById(
  storeId: string | Types.ObjectId,
): Promise<StoreDocument> {
  const store = await Store.findById(storeId);
  if (!store) throw notFound('فروشگاه یافت نشد.');
  return store;
}

export async function getActiveStoreById(
  storeId: string | Types.ObjectId,
): Promise<StoreDocument> {
  const store = await getStoreById(storeId);
  if (store.status !== 'active') {
    throw notFound('فروشگاه در دسترس نیست.');
  }
  return store;
}

export async function getStorePublicConfig(
  storeId?: string,
): Promise<StorePublicConfig> {
  const id = storeId ?? requireStoreId();
  const store = await getStoreById(id);
  return store.publicConfig;
}

/**
 * Private config for internal payment/notification wiring only.
 * Callers must never serialize this to client responses.
 */
export async function getStorePrivateConfig(
  storeId?: string,
): Promise<StorePrivateConfig> {
  const id = storeId ?? requireStoreId();
  const store = await getStoreById(id);
  return store.privateConfig;
}

export async function getOrderPrefix(storeId?: string): Promise<string> {
  const config = await getStorePublicConfig(storeId);
  return config.orderPrefix;
}

export async function getFreeShippingThreshold(
  storeId?: string,
): Promise<number> {
  const config = await getStorePublicConfig(storeId);
  return config.freeShippingThreshold;
}

/**
 * Builds a store-namespaced order number.
 * Format: `{PREFIX}-{YYYY}-{NNNNNN}` — sequence is per-store (caller supplies n).
 */
export function formatStoreOrderNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  const safePrefix = prefix.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'STORE';
  const seq = String(Math.max(0, sequence)).padStart(6, '0');
  return `${safePrefix}-${year}-${seq}`;
}

export { defaultPublicConfig, defaultPrivateConfig };
