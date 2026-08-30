import type {
  CreatePaymentProviderInput,
  CreatePaymentProviderResult,
  PaymentProvider,
  RefundPaymentProviderInput,
  RefundPaymentProviderResult,
  VerifyPaymentProviderInput,
  VerifyPaymentProviderResult,
} from './types';

/**
 * Zarinpal adapter skeleton.
 * Real HTTP calls are intentionally not wired in automated tests.
 * When PAYMENT_PROVIDER=zarinpal, merchant id is required at boot.
 *
 * This class fails closed unless explicitly extended with live API calls —
 * production deployments that select zarinpal without a live client should
 * replace this with a full HTTP implementation before going live.
 */
export class ZarinpalPaymentProvider implements PaymentProvider {
  readonly id = 'zarinpal' as const;

  constructor(
    private readonly _merchantId: string,
    private readonly sandbox: boolean,
  ) {
    if (!_merchantId) {
      throw new Error('ZARINPAL_MERCHANT_ID is required for zarinpal provider');
    }
  }

  async createPayment(
    _input: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult> {
    void this.sandbox;
    void this._merchantId;
    throw new Error(
      'Zarinpal live client is not configured in this build. Use PAYMENT_PROVIDER=mock for development/tests, or implement the HTTP client against Zarinpal request/verify APIs.',
    );
  }

  async verifyPayment(
    _input: VerifyPaymentProviderInput,
  ): Promise<VerifyPaymentProviderResult> {
    throw new Error('Zarinpal live verify is not configured in this build.');
  }

  async refundPayment(
    _input: RefundPaymentProviderInput,
  ): Promise<RefundPaymentProviderResult> {
    throw new Error('Zarinpal live refund is not configured in this build.');
  }
}
