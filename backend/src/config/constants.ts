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
 * Free-shipping threshold (تومان). Shared commerce constant for cart + checkout.
 */
export const FREE_SHIPPING_THRESHOLD = 5_000_000;

/** Supported shipping methods — prices are integer تومان. */
export const SHIPPING_METHODS = [
  {
    id: 'post-express',
    title: 'پست پیشتاز',
    description: 'ارسال سریع از طریق پست',
    basePrice: 65_000,
  },
  {
    id: 'tipax',
    title: 'تیپاکس',
    description: 'ارسال با تیپاکس',
    basePrice: 85_000,
  },
  {
    id: 'post-regular',
    title: 'پست سفارشی',
    description: 'ارسال اقتصادی',
    basePrice: 45_000,
  },
  {
    id: 'express',
    title: 'ارسال سریع',
    description: 'ارسال ویژه',
    basePrice: 120_000,
  },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]['id'];

export const PAYMENT_METHODS = ['online', 'cash_on_delivery'] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  'unfulfilled',
  'processing',
  'shipped',
  'delivered',
  'returned',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const ORDER_NUMBER_PREFIX = 'LUX';

export const ORDERS_DEFAULT_PAGE = 1;
export const ORDERS_DEFAULT_LIMIT = 20;
export const ORDERS_MAX_LIMIT = 50;

/** Idempotency keys expire after 24h. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

