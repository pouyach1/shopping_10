import type { OrderStatus, PaymentStatus } from '../types/order';
import type { AdminOrder } from '../types/order';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار',
  confirmed: 'تأیید شده',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  cod: 'پرداخت در محل',
  failed: 'ناموفق',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  zarinpal: 'درگاه زرین‌پال',
  'cash-on-delivery': 'پرداخت در محل',
  online: 'پرداخت آنلاین',
  card: 'کارت به کارت',
};

/** Happy-path fulfillment sequence (cancelled is separate). */
export const ORDER_TIMELINE_STEPS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
] as const satisfies ReadonlyArray<Exclude<OrderStatus, 'cancelled'>>;

export type OrderTimelineStep = (typeof ORDER_TIMELINE_STEPS)[number];

export const ORDER_TIMELINE_LABELS: Record<OrderTimelineStep, string> = {
  pending: 'ثبت سفارش',
  confirmed: 'تأیید',
  processing: 'پردازش',
  shipped: 'ارسال',
  delivered: 'تحویل',
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function getOrderItemLineTotal(
  unitPrice: number,
  quantity: number,
): number {
  return unitPrice * quantity;
}

export function getOrderDiscount(order: AdminOrder): number {
  if (typeof order.discount === 'number' && order.discount > 0) {
    return order.discount;
  }
  const implied = order.subtotal + order.shippingCost - order.total;
  return implied > 0 ? implied : 0;
}

export function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatOrderDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function matchesOrderSearch(
  query: string,
  order: AdminOrder,
  customer?: { name: string; phone: string; email?: string },
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    order.orderNumber,
    order.id,
    customer?.name ?? '',
    customer?.phone ?? '',
    customer?.email ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function isDateInRange(
  iso: string,
  from?: string,
  to?: string,
): boolean {
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export type OrderListStats = {
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
};

const OPEN_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
];

export function getOrderListStats(orders: AdminOrder[]): OrderListStats {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(
    (order) =>
      order.orderStatus !== 'cancelled' &&
      order.createdAt.slice(0, 10) === today,
  );

  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) =>
      OPEN_STATUSES.includes(order.orderStatus),
    ).length,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, order) => sum + order.total, 0),
  };
}
