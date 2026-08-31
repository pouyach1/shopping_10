import { env } from '../../config/env';
import type { PaymentProviderId } from '../../config/constants';
import { AppError } from '../../utils/AppError';
import { requireStoreId } from '../../tenant/TenantContext';
import { getStorePrivateConfig } from '../storeConfig.service';
import { MockPaymentProvider } from './mock.provider';
import { ZarinpalPaymentProvider } from './zarinpal.provider';
import type { PaymentProvider } from './types';
import type { HttpJsonClient } from './httpClient';

const cacheByStore = new Map<string, PaymentProvider>();

function resolveProviderId(
  storeProvider: string,
  credentialsConfigured: boolean,
): PaymentProviderId {
  if (storeProvider === 'zarinpal' && credentialsConfigured) {
    return 'zarinpal';
  }
  if (storeProvider === 'stripe' && credentialsConfigured) {
    return 'stripe';
  }
  if (storeProvider === 'none' || !credentialsConfigured) {
    return env.PAYMENT_PROVIDER;
  }
  return env.PAYMENT_PROVIDER;
}

export async function getPaymentProvider(
  storeId?: string,
): Promise<PaymentProvider> {
  const id = storeId ?? requireStoreId();
  const cached = cacheByStore.get(id);
  if (cached) return cached;

  const privateConfig = await getStorePrivateConfig(id);
  const providerId = resolveProviderId(
    privateConfig.payment.provider,
    privateConfig.payment.credentialsConfigured,
  );
  const provider = createPaymentProvider(providerId, {
    merchantRef: privateConfig.payment.merchantRef,
  });
  cacheByStore.set(id, provider);
  return provider;
}

/** Test helper — reset singleton between suites if needed. */
export function resetPaymentProviderCache(): void {
  cacheByStore.clear();
}

/** Test helper — inject a provider instance (e.g. Zarinpal with stub HTTP). */
export function setPaymentProvider(
  provider: PaymentProvider,
  storeId?: string,
): void {
  cacheByStore.set(storeId ?? requireStoreId(), provider);
}

export function createPaymentProvider(
  providerId: PaymentProviderId,
  overrides?: { http?: HttpJsonClient; merchantRef?: string },
): PaymentProvider {
  switch (providerId) {
    case 'mock':
      return new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
    case 'zarinpal':
      return new ZarinpalPaymentProvider({
        merchantId:
          overrides?.merchantRef?.trim() ||
          env.ZARINPAL_MERCHANT_ID ||
          '',
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
