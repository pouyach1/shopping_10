/**
 * Storefront shipping rules — single source of truth.
 * Admin seed settings import FREE_SHIPPING_THRESHOLD from here.
 */

export const FREE_SHIPPING_THRESHOLD = 5_000_000;

/** Subtotal is inclusive: exactly 5,000,000 تومان qualifies. */
export function qualifiesForFreeShipping(subtotal: number): boolean {
  return Number.isFinite(subtotal) && subtotal >= FREE_SHIPPING_THRESHOLD;
}

/**
 * Resolves payable shipping for a selected method given cart subtotal.
 * When free shipping applies, cost is always 0 regardless of method base price.
 */
export function resolveShippingCost(
  methodBasePrice: number,
  subtotal: number,
): number {
  if (qualifiesForFreeShipping(subtotal)) return 0;
  const base = Number(methodBasePrice);
  return Number.isFinite(base) && base > 0 ? base : 0;
}
