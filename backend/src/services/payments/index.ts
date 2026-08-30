import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { MockPaymentProvider } from './mock.provider';
import { ZarinpalPaymentProvider } from './zarinpal.provider';
import type { PaymentProvider, PaymentProviderId } from './types';
import type { HttpJsonClient } from './httpClient';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  cached = createPaymentProvider(env.PAYMENT_PROVIDER);
  return cached;
}

/** Test helper — reset singleton between suites if needed. */
export function resetPaymentProviderCache(): void {
  cached = null;
}

export function createPaymentProvider(
  providerId: PaymentProviderId,
  overrides?: { http?: HttpJsonClient },
): PaymentProvider {
  switch (providerId) {
    case 'mock':
      return new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
    case 'zarinpal':
      return new ZarinpalPaymentProvider({
        merchantId: env.ZARINPAL_MERCHANT_ID ?? '',
        sandbox: env.ZARINPAL_SANDBOX,
        webhookSecret: env.PAYMENT_WEBHOOK_SECRET,
        http: overrides?.http,
      });
    case 'idpay':
    case 'stripe':
      throw new AppError(500, 'درگاه پرداخت پیکربندی نشده است.', {
        code: 'PAYMENT_PROVIDER_ERROR',
        isOperational: true,
      });
    default: {
      const _exhaustive: never = providerId;
      void _exhaustive;
      throw new AppError(500, 'درگاه پرداخت نامعتبر است.', {
        code: 'PAYMENT_PROVIDER_ERROR',
      });
    }
  }
}

export { tomanToRial, rialToToman, isTomanCurrency } from './money';
export { signMockWebhook } from './mock.provider';
