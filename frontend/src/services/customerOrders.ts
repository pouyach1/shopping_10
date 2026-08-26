/**
 * Customer-facing order history for the Profile page (mock).
 * Separate from `/admin/orders` — do not couple UI to the admin store.
 */

export type CustomerOrderStatus =
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: CustomerOrderStatus;
  itemCount: number;
}

export const CUSTOMER_ORDER_STATUS_LABELS: Record<
  CustomerOrderStatus,
  string
> = {
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل شده',
  cancelled: 'لغو شده',
};

/** Demo orders shown after mock login for the demo customer. */
const DEMO_ORDERS: CustomerOrderSummary[] = [
  {
    id: 'ord-c-01',
    orderNumber: 'LX-10421',
    createdAt: '2026-08-18T10:30:00.000Z',
    total: 4280000,
    status: 'delivered',
    itemCount: 3,
  },
  {
    id: 'ord-c-02',
    orderNumber: 'LX-10488',
    createdAt: '2026-08-22T14:05:00.000Z',
    total: 1890000,
    status: 'shipped',
    itemCount: 1,
  },
  {
    id: 'ord-c-03',
    orderNumber: 'LX-10502',
    createdAt: '2026-08-25T09:12:00.000Z',
    total: 2590000,
    status: 'processing',
    itemCount: 2,
  },
];

export function getCustomerOrders(customerId: string): CustomerOrderSummary[] {
  if (customerId !== 'cust-demo') return [];
  return DEMO_ORDERS.map((order) => ({ ...order }));
}

export function formatCustomerOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatMemberSince(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function toPersianItemCount(count: number): string {
  return new Intl.NumberFormat('fa-IR').format(count);
}
