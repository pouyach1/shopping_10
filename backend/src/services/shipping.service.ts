import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_METHODS,
  type ShippingMethodId,
} from '../config/constants';
import { badRequest } from '../utils/AppError';

export function getShippingMethod(id: string) {
  const method = SHIPPING_METHODS.find((item) => item.id === id);
  if (!method) {
    throw badRequest('روش ارسال معتبر نیست.', {
      shippingMethodId: 'روش ارسال معتبر نیست.',
    });
  }
  return method;
}

/**
 * Authoritative shipping cost. Client-supplied shipping amounts are ignored.
 * Free when subtotal >= FREE_SHIPPING_THRESHOLD (inclusive).
 */
export function resolveShippingCost(
  methodId: ShippingMethodId | string,
  subtotal: number,
): { methodId: ShippingMethodId; title: string; cost: number } {
  const method = getShippingMethod(methodId);
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, Math.trunc(subtotal)) : 0;
  const cost =
    safeSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : Math.trunc(method.basePrice);
  return {
    methodId: method.id,
    title: method.title,
    cost,
  };
}

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return Number.isFinite(subtotal) && subtotal >= FREE_SHIPPING_THRESHOLD;
}
