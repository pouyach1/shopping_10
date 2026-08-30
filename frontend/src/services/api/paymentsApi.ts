import { apiRequest } from './http';

export interface PublicPayment {
  id: string;
  orderNumber: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  redirectUrl?: string;
  authority?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
}

/** Start (or reuse) a payment attempt for an online order. */
export async function createPayment(input: {
  orderNumber: string;
  idempotencyKey: string;
}): Promise<PublicPayment> {
  const data = await apiRequest<{ payment: PublicPayment }>('/api/v1/payments', {
    method: 'POST',
    body: { orderNumber: input.orderNumber },
    headers: {
      'Idempotency-Key': input.idempotencyKey,
    },
  });
  return data.payment;
}

/** Browser return signal — backend always verifies with the provider. */
export async function confirmPaymentCallback(input: {
  authority: string;
  status?: string;
}): Promise<{ payment: PublicPayment; orderStatus: string }> {
  return apiRequest('/api/v1/payments/callback', {
    method: 'POST',
    body: input,
  });
}
