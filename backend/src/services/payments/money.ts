/**
 * Luxora storefront money is integer تومان (Toman).
 * Zarinpal v4 APIs expect integer ریال (Rial).
 *
 * Official convention used here: 1 تومان = 10 ریال.
 * Never mix units silently — always convert at the provider boundary.
 */

export const TOMAN_PER_RIAL_FACTOR = 10;

export function tomanToRial(toman: number): number {
  if (!Number.isInteger(toman) || toman < 0) {
    throw new Error('Amount must be a non-negative integer تومان');
  }
  return toman * TOMAN_PER_RIAL_FACTOR;
}

export function rialToToman(rial: number): number {
  if (!Number.isInteger(rial) || rial < 0) {
    throw new Error('Amount must be a non-negative integer ریال');
  }
  if (rial % TOMAN_PER_RIAL_FACTOR !== 0) {
    throw new Error('Rial amount is not evenly convertible to تومان');
  }
  return rial / TOMAN_PER_RIAL_FACTOR;
}

/** Luxora catalog currency label. */
export function isTomanCurrency(currency: string): boolean {
  const normalized = currency.trim().toLowerCase();
  return (
    normalized === 'تومان' ||
    normalized === 'toman' ||
    normalized === 'irr-toman'
  );
}
