import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { MockPaymentProvider } from './mock.provider';
import { ZarinpalPaymentProvider } from './zarinpal.provider';
import type { PaymentProvider, PaymentProviderId } from './types';

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
): PaymentProvider {
  switch (providerId) {
    case 'mock':
      return new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
    case 'zarinpal':
      return new ZarinpalPaymentProvider(
        env.ZARINPAL_MERCHANT_ID ?? '',
        env.ZARINPAL_SANDBOX,
      );
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
