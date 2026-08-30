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

/** Payment attempt lifecycle (provider-level), distinct from order.paymentStatus. */
export const PAYMENT_ATTEMPT_STATUSES = [
  'created',
  'pending',
  'redirected',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export const PAYMENT_PROVIDER_IDS = [
  'mock',
  'zarinpal',
  'idpay',
  'stripe',
] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

/** How long unpaid order stock stays reserved after checkout (ms). */
export const PAYMENT_RESERVATION_TTL_MS = 30 * 60 * 1000;

export const COUPON_TYPES = ['percentage', 'fixed'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const REFUND_STATUSES = [
  'pending',
  'processing',
  'succeeded',
  'failed',
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/**
 * Explicit financial integrity when money and order lifecycle diverge.
 * Never imply money was refunded unless the provider confirmed it.
 */
export const FINANCIAL_INTEGRITY_STATUSES = [
  'ok',
  'paid_needs_manual_refund',
  'refund_pending',
  'refund_failed',
] as const;
export type FinancialIntegrityStatus =
  (typeof FINANCIAL_INTEGRITY_STATUSES)[number];

export const COMMERCE_EVENTS = [
  'OrderCreated',
  'PaymentPending',
  'PaymentSuccessful',
  'PaymentFailed',
  'OrderCancelled',
  'OrderShipped',
  'OrderDelivered',
  'RefundCreated',
  'RefundSuccessful',
  'RefundFailed',
] as const;
export type CommerceEventType = (typeof COMMERCE_EVENTS)[number];

export const AUDIT_ACTIONS = [
  'payment.created',
  'payment.redirected',
  'payment.verification_started',
  'payment.verified',
  'payment.failed',
  'payment.expired',
  'payment.webhook_received',
  'payment.webhook_duplicate',
  'payment.reconciled',
  'payment.refunded',
  'order.created',
  'order.cancelled',
  'inventory.decremented',
  'inventory.restocked',
  'inventory.reservation_released',
  'inventory.hold_recovered',
  'coupon.applied',
  'coupon.released',
  'refund.created',
  'refund.completed',
  'refund.failed',
  'payment.needs_manual_refund',
  'notification.sent',
  'notification.failed',
  'notification.retried',
  'payment.verify_retried',
  'refund.retried',
  'reconciliation.manual_review',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const NOTIFICATION_CHANNELS = ['sms', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  'pending',
  'processing',
  'sent',
  'failed',
  'retryable',
  'permanent_failure',
] as const;
export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const RECONCILIATION_FINDINGS = [
  'in_sync',
  'provider_paid_local_pending',
  'provider_paid_local_terminal',
  'local_paid_provider_failed',
  'order_payment_mismatch',
  'provider_unreachable',
  'already_reconciled',
] as const;
export type ReconciliationFinding = (typeof RECONCILIATION_FINDINGS)[number];

export const PAYMENTS_DEFAULT_PAGE = 1;
export const PAYMENTS_DEFAULT_LIMIT = 20;
export const PAYMENTS_MAX_LIMIT = 50;

