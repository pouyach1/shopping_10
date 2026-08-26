/**
 * Order SMS / notification readiness layer.
 *
 * REAL SMS IS A BACKEND RESPONSIBILITY.
 * This module only:
 * - defines event contracts
 * - builds concise Persian message payloads
 * - exposes a stub enqueue API the admin UI can call after status changes
 *
 * Future flow:
 *   Admin / Checkout → Backend API → SMS provider → Customer phone
 *
 * Do not put SMS API keys here. Do not call providers from the browser.
 */

import type { AdminCustomer } from '../types/customer';
import type { AdminOrder, OrderStatus } from '../types/order';
import {
  ORDER_STATUS_LABELS,
  formatOrderDateShort,
} from '../utils/orderLabels';
import { formatPrice } from '../../lib/formatCurrency';

export type OrderSmsEvent =
  | 'order_created'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled';

export interface OrderSmsPayload {
  event: OrderSmsEvent;
  orderId: string;
  orderNumber: string;
  phone: string;
  customerName: string;
  /** Concise Persian body ready for an Iranian SMS gateway. */
  message: string;
  meta: {
    orderStatus: OrderStatus;
    total: number;
    trackingCode?: string;
    createdAt: string;
  };
}

export interface OrderNotificationResult {
  queued: false;
  reason: 'backend_required';
  payload: OrderSmsPayload;
}

const STATUS_TO_EVENT: Partial<Record<OrderStatus, OrderSmsEvent>> = {
  confirmed: 'order_confirmed',
  shipped: 'order_shipped',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
};

export function orderStatusToSmsEvent(
  status: OrderStatus,
): OrderSmsEvent | null {
  return STATUS_TO_EVENT[status] ?? null;
}

export function buildOrderSmsPayload(
  event: OrderSmsEvent,
  order: AdminOrder,
  customer: Pick<AdminCustomer, 'name' | 'phone'>,
): OrderSmsPayload {
  const statusLabel = ORDER_STATUS_LABELS[order.orderStatus];
  const total = `${formatPrice(order.total)} تومان`;
  const tracking =
    order.trackingCode?.trim() ||
    (event === 'order_shipped' ? 'به‌زودی اعلام می‌شود' : undefined);

  let message: string;
  switch (event) {
    case 'order_created':
      message = `لوکسورا: ${customer.name} عزیز، سفارش ${order.orderNumber} ثبت شد. مبلغ: ${total}.`;
      break;
    case 'order_confirmed':
      message = `لوکسورا: سفارش ${order.orderNumber} تأیید شد و در صف آماده‌سازی است. مبلغ: ${total}.`;
      break;
    case 'order_shipped':
      message = `لوکسورا: سفارش ${order.orderNumber} ارسال شد.${tracking ? ` پیگیری: ${tracking}.` : ''}`;
      break;
    case 'order_delivered':
      message = `لوکسورا: سفارش ${order.orderNumber} تحویل شد. از خرید شما سپاسگزاریم.`;
      break;
    case 'order_cancelled':
      message = `لوکسورا: سفارش ${order.orderNumber} لغو شد. در صورت نیاز با پشتیبانی تماس بگیرید.`;
      break;
    default:
      message = `لوکسورا: سفارش ${order.orderNumber} — وضعیت: ${statusLabel}.`;
  }

  return {
    event,
    orderId: order.id,
    orderNumber: order.orderNumber,
    phone: customer.phone,
    customerName: customer.name,
    message,
    meta: {
      orderStatus: order.orderStatus,
      total: order.total,
      trackingCode: order.trackingCode,
      createdAt: formatOrderDateShort(order.createdAt),
    },
  };
}

/**
 * Stub enqueue — records intent for future backend wiring.
 * Never sends SMS from the frontend.
 */
export function enqueueOrderSms(
  event: OrderSmsEvent,
  order: AdminOrder,
  customer: Pick<AdminCustomer, 'name' | 'phone'>,
): OrderNotificationResult {
  const payload = buildOrderSmsPayload(event, order, customer);

  if (import.meta.env.DEV) {
    console.info('[luxora-admin][sms-ready]', {
      note: 'SMS deferred to backend',
      event: payload.event,
      orderNumber: payload.orderNumber,
      phone: payload.phone,
      message: payload.message,
    });
  }

  return {
    queued: false,
    reason: 'backend_required',
    payload,
  };
}

/** Call after a successful orderStatus update when an SMS event applies. */
export function notifyOrderStatusChange(
  order: AdminOrder,
  customer: Pick<AdminCustomer, 'name' | 'phone'> | undefined,
): OrderNotificationResult | null {
  const event = orderStatusToSmsEvent(order.orderStatus);
  if (!event || !customer?.phone) return null;
  return enqueueOrderSms(event, order, customer);
}
