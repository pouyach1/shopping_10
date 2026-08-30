import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_METHODS,
  type ShippingMethodId,
} from '../config/constants';
import { badRequest } from '../utils/AppError';
import { getFreeShippingThreshold, getStorePublicConfig } from './storeConfig.service';

export async function getShippingMethod(id: string) {
  const config = await getStorePublicConfig();
  const fromStore = config.shippingMethods?.find((item) => item.code === id);
  if (fromStore) {
    return {
      id: fromStore.code as ShippingMethodId,
      title: fromStore.label,
      basePrice: fromStore.baseFee,
    };
  }
  const fallback = SHIPPING_METHODS.find((item) => item.id === id);
  if (!fallback) {
    throw badRequest('روش ارسال معتبر نیست.', {
      shippingMethodId: 'روش ارسال معتبر نیست.',
    });
  }
  return fallback;
}

/**
 * Authoritative shipping cost. Client-supplied shipping amounts are ignored.
 * Free when subtotal >= store free-shipping threshold (inclusive).
 */
export async function resolveShippingCost(
  methodId: ShippingMethodId | string,
  subtotal: number,
): Promise<{ methodId: ShippingMethodId; title: string; cost: number }> {
  const method = await getShippingMethod(methodId);
  const threshold = await getFreeShippingThreshold();
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, Math.trunc(subtotal)) : 0;
  const cost =
    safeSubtotal >= threshold ? 0 : Math.trunc(method.basePrice);
  return {
    methodId: method.id,
    title: method.title,
    cost,
  };
}

export async function qualifiesForFreeShipping(subtotal: number): Promise<boolean> {
  const threshold = await getFreeShippingThreshold();
  return Number.isFinite(subtotal) && subtotal >= threshold;
}

/** Legacy constant fallback for callers that cannot await config. */
export { FREE_SHIPPING_THRESHOLD };
