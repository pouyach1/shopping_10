/**
 * Shared domain primitives used across product, cart, and user models.
 */

/**
 * Display currency for a price (e.g. "تومان").
 * Kept as a string alias so existing data (plain currency labels) stays valid
 * while giving the domain a single named type to evolve later.
 */
export type Currency = string;
