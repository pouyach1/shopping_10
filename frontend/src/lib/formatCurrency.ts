/**
 * Shared price/number formatting for the Persian (fa-IR) storefront.
 *
 * Formats the numeric amount only (no currency label appended), matching the
 * previous per-component `new Intl.NumberFormat('fa-IR').format(value)` usage.
 * A single formatter instance is reused for efficiency.
 */
const priceFormatter = new Intl.NumberFormat('fa-IR');

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}
