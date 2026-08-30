import { createHmac, timingSafeEqual } from 'node:crypto';

import { AppError } from '../../utils/AppError';
import { createFetchJsonClient, type HttpJsonClient } from './httpClient';
import { isTomanCurrency, tomanToRial } from './money';
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

export interface ZarinpalProviderOptions {
  merchantId: string;
  sandbox: boolean;
  webhookSecret?: string;
  http?: HttpJsonClient;
  timeoutMs?: number;
}

/**
 * Real Zarinpal v4 provider (official REST contract).
 *
 * Request:  POST {api}/pg/v4/payment/request.json
 * Verify:   POST {api}/pg/v4/payment/verify.json
 * StartPay: GET  {start}/pg/StartPay/{authority}
 *
 * Amounts sent to Zarinpal are integer ریال. Luxora stores تومان —
 * conversion happens only inside this adapter.
 *
 * code 100 = verified success; code 101 = already verified (idempotent success).
 */
export class ZarinpalPaymentProvider implements PaymentProvider {
  readonly id = 'zarinpal' as const;
  private readonly http: HttpJsonClient;
  private readonly timeoutMs: number;
  private readonly apiBase: string;
  private readonly startPayBase: string;

  constructor(private readonly options: ZarinpalProviderOptions) {
    if (!options.merchantId || options.merchantId.length < 36) {
      throw new Error(
        'ZARINPAL_MERCHANT_ID is required and must be a 36-character merchant UUID',
      );
    }
    this.http = options.http ?? createFetchJsonClient();
    this.timeoutMs = options.timeoutMs ?? 15_000;
    if (options.sandbox) {
      this.apiBase = 'https://sandbox.zarinpal.com';
      this.startPayBase = 'https://sandbox.zarinpal.com';
    } else {
      this.apiBase = 'https://api.zarinpal.com';
      this.startPayBase = 'https://www.zarinpal.com';
    }
  }

  private toProviderAmount(amountToman: number, currency: string): number {
    if (!isTomanCurrency(currency)) {
      throw new AppError(500, 'واحد پول پشتیبانی نمی‌شود.', {
        code: 'PAYMENT_PROVIDER_ERROR',
      });
    }
    return tomanToRial(amountToman);
  }

  async createPayment(
    input: CreatePaymentProviderInput,
  ): Promise<CreatePaymentProviderResult> {
    const amountRial = this.toProviderAmount(input.amount, input.currency);
    const payload = {
      merchant_id: this.options.merchantId,
      amount: amountRial,
      description: input.description.slice(0, 500),
      callback_url: input.callbackUrl,
      metadata: {
        order_number: input.orderNumber,
        payment_id: input.paymentId,
        ...(typeof input.metadata?.mobile === 'string'
          ? { mobile: input.metadata.mobile }
          : {}),
        ...(typeof input.metadata?.email === 'string'
          ? { email: input.metadata.email }
          : {}),
      },
    };

    let response;
    try {
      response = await this.http.postJson(
        `${this.apiBase}/pg/v4/payment/request.json`,
        payload,
        { timeoutMs: this.timeoutMs },
      );
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || /aborted|timeout/i.test(error.message));
      throw new AppError(
        502,
        aborted
          ? 'مهلت اتصال به درگاه به پایان رسید.'
          : 'خطا در اتصال به درگاه پرداخت.',
        { code: 'PAYMENT_PROVIDER_ERROR' },
      );
    }

    const parsed = parseZarinpalEnvelope(response.data);
    if (parsed.dataCode !== 100 || !parsed.authority) {
      throw new AppError(502, parsed.errorMessage ?? 'درگاه پرداخت پاسخ نامعتبر داد.', {
        code: 'PAYMENT_PROVIDER_ERROR',
        details: { code: parsed.dataCode ?? parsed.errorCode },
      });
    }

    return {
      authority: parsed.authority,
      redirectUrl: `${this.startPayBase}/pg/StartPay/${parsed.authority}`,
      providerTransactionId: parsed.authority,
      raw: { code: parsed.dataCode, fee: parsed.fee, sandbox: this.options.sandbox },
    };
  }

  async verifyPayment(
    input: VerifyPaymentProviderInput,
  ): Promise<VerifyPaymentProviderResult> {
    const amountRial = this.toProviderAmount(input.amount, input.currency);
    const payload = {
      merchant_id: this.options.merchantId,
      amount: amountRial,
      authority: input.authority,
    };

    let response;
    try {
      response = await this.http.postJson(
        `${this.apiBase}/pg/v4/payment/verify.json`,
        payload,
        { timeoutMs: this.timeoutMs },
      );
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || /aborted|timeout/i.test(error.message));
      return {
        success: false,
        amount: 0,
        failureCode: aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_ERROR',
        failureMessage: aborted
          ? 'مهلت تایید پرداخت به پایان رسید.'
          : 'خطا در تایید پرداخت.',
      };
    }

    const parsed = parseZarinpalEnvelope(response.data);
    // 100 = first verify success; 101 = already verified (idempotent OK).
    if (parsed.dataCode === 100 || parsed.dataCode === 101) {
      return {
        success: true,
        amount: input.amount,
        providerTransactionId:
          parsed.refId != null ? String(parsed.refId) : input.authority,
        raw: {
          code: parsed.dataCode,
          card_pan: parsed.cardPan,
          fee: parsed.fee,
        },
      };
    }

    return {
      success: false,
      amount: 0,
      failureCode: String(parsed.dataCode ?? parsed.errorCode ?? 'VERIFY_FAILED'),
      failureMessage: parsed.errorMessage ?? 'تایید پرداخت ناموفق بود.',
      raw: { code: parsed.dataCode ?? parsed.errorCode },
    };
  }

  async refundPayment(
    _input: RefundPaymentProviderInput,
  ): Promise<RefundPaymentProviderResult> {
    // Zarinpal refund/reverse is merchant-plan specific and not part of the
    // core v4 request/verify contract used here. Fail closed explicitly.
    return {
      success: false,
      failureCode: 'NOT_SUPPORTED',
      failureMessage:
        'بازپرداخت خودکار زرین‌پال در این نسخه پیکربندی نشده است. از پنل زرین‌پال یا پشتیبانی استفاده کنید.',
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const secret = this.options.webhookSecret;
    if (!secret) return false;
    const header = headers['x-luxora-webhook-signature'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Zarinpal does not ship a standard signed webhook like Stripe.
   * Optional IPN-style payloads can still be accepted when configured with our HMAC.
   */
  parseWebhook(body: unknown): ProviderWebhookEvent {
    const data = (body ?? {}) as Record<string, unknown>;
    const eventId = String(data.eventId ?? data.ref_id ?? '');
    const authority = String(data.authority ?? data.Authority ?? '');
    if (!eventId || !authority) {
      throw new Error('Invalid Zarinpal webhook payload');
    }
    const statusRaw = String(data.status ?? data.Status ?? 'paid').toLowerCase();
    const status =
      statusRaw === 'paid' ||
      statusRaw === 'ok' ||
      statusRaw === 'success'
        ? 'paid'
        : statusRaw === 'cancelled' || statusRaw === 'nok'
          ? 'cancelled'
          : statusRaw === 'expired'
            ? 'expired'
            : 'failed';
    return {
      eventId,
      authority,
      status,
      amount:
        typeof data.amount_toman === 'number'
          ? data.amount_toman
          : typeof data.amount === 'number'
            ? Math.trunc(data.amount / 10)
            : undefined,
      providerTransactionId:
        data.ref_id != null ? String(data.ref_id) : undefined,
      raw: data,
    };
  }
}

function parseZarinpalEnvelope(data: unknown): {
  dataCode?: number;
  authority?: string;
  refId?: number;
  cardPan?: string;
  fee?: number;
  errorCode?: number;
  errorMessage?: string;
} {
  if (!data || typeof data !== 'object') {
    return { errorMessage: 'malformed response' };
  }
  const root = data as Record<string, unknown>;
  const dataNode = root.data;
  const errorsNode = root.errors;

  let dataCode: number | undefined;
  let authority: string | undefined;
  let refId: number | undefined;
  let cardPan: string | undefined;
  let fee: number | undefined;

  if (dataNode && typeof dataNode === 'object' && !Array.isArray(dataNode)) {
    const d = dataNode as Record<string, unknown>;
    if (typeof d.code === 'number') dataCode = d.code;
    if (typeof d.authority === 'string') authority = d.authority;
    if (typeof d.ref_id === 'number') refId = d.ref_id;
    if (typeof d.card_pan === 'string') cardPan = d.card_pan;
    if (typeof d.fee === 'number') fee = d.fee;
  }

  let errorCode: number | undefined;
  let errorMessage: string | undefined;
  if (errorsNode && typeof errorsNode === 'object' && !Array.isArray(errorsNode)) {
    const e = errorsNode as Record<string, unknown>;
    if (typeof e.code === 'number') errorCode = e.code;
    if (typeof e.message === 'string') errorMessage = e.message;
  } else if (Array.isArray(errorsNode) && errorsNode.length > 0) {
    const first = errorsNode[0] as Record<string, unknown>;
    if (typeof first?.code === 'number') errorCode = first.code;
    if (typeof first?.message === 'string') errorMessage = first.message;
  }

  return { dataCode, authority, refId, cardPan, fee, errorCode, errorMessage };
}
