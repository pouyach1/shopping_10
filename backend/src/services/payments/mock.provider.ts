import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  CreatePaymentProviderInput,
  CreatePaymentProviderResult,
  PaymentProvider,
  ProviderWebhookEvent,
  RefundPaymentProviderInput,
  RefundPaymentProviderResult,
  VerifyPaymentProviderInput,
  VerifyPaymentProviderResult,
} from './types';

/**
 * Deterministic mock gateway for local + automated tests.
 *
 * Authority encoding (after create):
 *   mock_<scenario>_<paymentId>
 *
 * Scenario hints (via metadata.simulate or authority prefix):
 *   success (default) | failure | timeout | wrong_amount | invalid
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = 'mock' as const;

  constructor(private readonly webhookSecret: string) {}

  async createPayment(
    input: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult> {
    const scenario = String(input.metadata?.simulate ?? 'success');
    if (scenario === 'timeout') {
      // Simulated provider hang — tests assert the thrown error path.
      throw Object.assign(new Error('MOCK_PROVIDER_TIMEOUT'), {
        code: 'PAYMENT_PROVIDER_ERROR',
      });
    }
    const authority = `mock.${scenario}.${input.paymentId}`;
    return {
      authority,
      redirectUrl: `${input.callbackUrl}?Authority=${encodeURIComponent(authority)}&Status=OK`,
      providerTransactionId: `mock-tx-${input.paymentId}`,
      raw: { scenario },
    };
  }

  async verifyPayment(
    input: VerifyPaymentProviderInput,
  ): Promise<VerifyPaymentProviderResult> {
    const scenario = parseScenario(input.authority);
    if (scenario === 'invalid' || !input.authority.startsWith('mock.')) {
      return {
        success: false,
        amount: 0,
        failureCode: 'INVALID_AUTHORITY',
        failureMessage: 'نامعتبر',
      };
    }
    if (scenario === 'failure') {
      return {
        success: false,
        amount: input.amount,
        failureCode: 'MOCK_FAILURE',
        failureMessage: 'پرداخت ناموفق (mock)',
      };
    }
    if (scenario === 'wrong_amount') {
      return {
        success: true,
        amount: Math.max(0, input.amount - 1),
        providerTransactionId: `mock-tx-verify-${input.authority}`,
        raw: { note: 'wrong_amount' },
      };
    }
    return {
      success: true,
      amount: input.amount,
      providerTransactionId: `mock-tx-verify-${input.authority}`,
    };
  }

  async refundPayment(
    input: RefundPaymentProviderInput,
  ): Promise<RefundPaymentProviderResult> {
    if (input.metadata?.simulate === 'refund_failure') {
      return {
        success: false,
        failureCode: 'MOCK_REFUND_FAILURE',
        failureMessage: 'بازپرداخت ناموفق (mock)',
      };
    }
    return {
      success: true,
      providerRefundId: `mock-refund-${input.idempotencyKey}`,
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const header = headers['x-luxora-webhook-signature'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !this.webhookSecret) return false;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  parseWebhook(body: unknown): ProviderWebhookEvent {
    const data = (body ?? {}) as Record<string, unknown>;
    const eventId = String(data.eventId ?? '');
    const authority = String(data.authority ?? '');
    const statusRaw = String(data.status ?? 'failed');
    const status =
      statusRaw === 'paid' ||
      statusRaw === 'failed' ||
      statusRaw === 'cancelled' ||
      statusRaw === 'expired'
        ? statusRaw
        : 'failed';
    if (!eventId || !authority) {
      throw new Error('Invalid webhook payload');
    }
    return {
      eventId,
      authority,
      status,
      amount: typeof data.amount === 'number' ? data.amount : undefined,
      providerTransactionId:
        typeof data.providerTransactionId === 'string'
          ? data.providerTransactionId
          : undefined,
      raw: data,
    };
  }
}

function parseScenario(authority: string): string {
  // mock.<scenario>.<paymentId>
  const parts = authority.split('.');
  return parts[1] ?? 'success';
}

/** Helper for tests to sign mock webhooks. */
export function signMockWebhook(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}
