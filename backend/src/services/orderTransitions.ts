import type { OrderStatus } from '../config/constants';
import { conflict } from '../utils/AppError';

/**
 * Centralized order status transition graph.
 * Admin, customer cancel, and future payment webhooks must all use this.
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['awaiting_payment', 'cancelled', 'failed'],
  awaiting_payment: ['paid', 'cancelled', 'failed'],
  paid: ['processing', 'cancelled', 'failed'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  failed: [],
};

/** Customer-initiated cancel allowed only from these states. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'paid',
];

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw conflict(
      'تغییر وضعیت سفارش مجاز نیست.',
      { status: `${from} → ${to}` },
      'INVALID_ORDER_TRANSITION',
    );
  }
}

export function assertCustomerCancellable(status: OrderStatus): void {
  if (!CUSTOMER_CANCELLABLE.includes(status)) {
    throw conflict(
      'این سفارش قابل لغو نیست.',
      { status: 'این سفارش قابل لغو نیست.' },
      'ORDER_NOT_CANCELLABLE',
    );
  }
}

export function nextFulfillmentForOrderStatus(
  status: OrderStatus,
): 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | undefined {
  switch (status) {
    case 'processing':
      return 'processing';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
    case 'failed':
      return undefined;
    default:
      return undefined;
  }
}
