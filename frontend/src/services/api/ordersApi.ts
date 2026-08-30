import { apiRequest } from './http';

export interface CheckoutAddress {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode?: string;
  landline?: string;
  notes?: string;
}

export interface CheckoutPreview {
  ready: boolean;
  items: Array<{
    lineId: string;
    productId: string;
    name: string;
    quantity: number;
    unitFinalPrice: number;
    lineTotal: number;
    priceChanged: boolean;
    purchasable: boolean;
  }>;
  issues: Array<{ code: string; message: string; productId: string }>;
  summary: {
    subtotal: number;
    discountTotal: number;
    couponDiscount?: number;
    couponCode?: string;
    shippingCost: number;
    total: number;
    itemCount: number;
    currency: string;
    freeShippingThreshold: number;
    qualifiesForFreeShipping: boolean;
  };
  shippingMethodId: string;
  shippingMethodTitle: string;
}

export interface PublicOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  items: Array<{
    name: string;
    quantity: number;
    unitFinalPrice: number;
    lineTotal: number;
    imageSrc: string;
  }>;
  shippingAddress: CheckoutAddress;
  shippingMethodTitle: string;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  createdAt: string;
}

/** Map frontend shipping ids to backend (cash-on-delivery ↔ cash_on_delivery). */
export function toBackendPaymentMethod(
  method: string,
): 'online' | 'cash_on_delivery' {
  if (method === 'cash-on-delivery') return 'cash_on_delivery';
  return 'online';
}

export async function previewCheckout(
  shippingMethodId: string,
): Promise<CheckoutPreview> {
  return apiRequest<CheckoutPreview>('/api/v1/checkout/preview', {
    method: 'POST',
    body: { shippingMethodId },
  });
}

export async function createOrder(input: {
  shippingMethodId: string;
  paymentMethod: string;
  shippingAddress: CheckoutAddress;
  expectedSubtotal?: number;
  expectedTotal?: number;
  idempotencyKey: string;
}): Promise<PublicOrder> {
  const data = await apiRequest<{ order: PublicOrder }>('/api/v1/orders', {
    method: 'POST',
    body: {
      shippingMethodId: input.shippingMethodId,
      paymentMethod: toBackendPaymentMethod(input.paymentMethod),
      shippingAddress: input.shippingAddress,
      expectedSubtotal: input.expectedSubtotal,
      expectedTotal: input.expectedTotal,
    },
    headers: {
      'Idempotency-Key': input.idempotencyKey,
    },
  });
  return data.order;
}
