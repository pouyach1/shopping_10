export const USER_ROLES = ['customer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AUTH_COOKIE_PATH = '/';

/** Fields a client may never set via profile update. */
export const PROTECTED_USER_FIELDS = [
  'role',
  'passwordHash',
  'password',
  'isActive',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const;

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_KINDS = [
  'top',
  'bottom',
  'outerwear',
  'dress',
  'bag',
  'shoes',
  'accessory',
  'other',
] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const PRODUCT_SORT_OPTIONS = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
] as const;
export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

export const DEFAULT_CURRENCY = 'تومان';

export const CATALOG_DEFAULT_PAGE = 1;
export const CATALOG_DEFAULT_LIMIT = 24;
export const CATALOG_MAX_LIMIT = 48;

/** Fields clients may never inject on product create/update. */
export const PROTECTED_PRODUCT_FIELDS = [
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  '__v',
] as const;

/** Cart quantity limits — cart holds intent, not inventory reservation. */
export const CART_MIN_QUANTITY = 1;
export const CART_MAX_QUANTITY = 99;

/**
 * Free-shipping threshold (تومان). Shared commerce constant for future checkout.
 * Cart summary may expose progress toward this; final shipping is Checkout's job.
 */
export const FREE_SHIPPING_THRESHOLD = 5_000_000;

