/**
 * Provider-agnostic payment contracts.
 * OrderService never imports a concrete gateway.
 */

export type PaymentProviderId = 'mock' | 'zarinpal' | 'idpay' | 'stripe';

export interface CreatePaymentProviderInput {
  /** Internal payment document id (used to correlate callbacks). */
  paymentId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentProviderResult {
  authority: string;
  redirectUrl: string;
  providerTransactionId?: string;
  raw?: Record<string, unknown>;
}

export interface VerifyPaymentProviderInput {
  authority: string;
  amount: number;
  currency: string;
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentProviderResult {
  success: boolean;
  amount: number;
  providerTransactionId?: string;
  failureCode?: string;
  failureMessage?: string;
  raw?: Record<string, unknown>;
}

export interface RefundPaymentProviderInput {
  authority: string;
  providerTransactionId?: string;
  amount: number;
  currency: string;
  reason?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface RefundPaymentProviderResult {
  success: boolean;
  providerRefundId?: string;
  failureCode?: string;
  failureMessage?: string;
  raw?: Record<string, unknown>;
}

export interface ProviderWebhookEvent {
  eventId: string;
  authority: string;
  status: 'paid' | 'failed' | 'cancelled' | 'expired';
  amount?: number;
  providerTransactionId?: string;
  raw?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPayment(
    input: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult>;
  verifyPayment(
    input: VerifyPaymentProviderInput,
  ): Promise<VerifyPaymentProviderResult>;
  refundPayment(
    input: RefundPaymentProviderInput,
  ): Promise<RefundPaymentProviderResult>;
  verifyWebhookSignature?(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean;
  parseWebhook?(body: unknown): ProviderWebhookEvent;
}
