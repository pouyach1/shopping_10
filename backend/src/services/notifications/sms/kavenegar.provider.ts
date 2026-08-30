import type { HttpJsonClient } from '../../payments/httpClient';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './types';

export interface KavenegarOptions {
  apiKey: string;
  sender?: string;
  baseUrl?: string;
  http?: HttpJsonClient;
  timeoutMs?: number;
}

/**
 * Kavenegar simple send API boundary.
 * Injectable HTTP — tests never hit the network.
 */
export class KavenegarSmsProvider implements SmsProvider {
  readonly id = 'kavenegar';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: KavenegarOptions) {
    if (!options.apiKey) {
      throw new Error('SMS_API_KEY required for kavenegar');
    }
    this.baseUrl = (options.baseUrl ?? 'https://api.kavenegar.com/v1').replace(
      /\/$/,
      '',
    );
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    if (!isLikelyIranMobile(input.to)) {
      return {
        success: false,
        retryable: false,
        failureCode: 'INVALID_RECIPIENT',
        failureMessage: 'شماره موبایل نامعتبر است.',
      };
    }

    const http = this.options.http;
    if (!http) {
      return {
        success: false,
        retryable: false,
        failureCode: 'NOT_WIRED',
        failureMessage: 'Kavenegar HTTP client is not configured.',
      };
    }

    const path = `${this.baseUrl}/${this.options.apiKey}/sms/send.json`;
    try {
      const response = await http.postJson(
        path,
        {
          receptor: input.to,
          message: input.body,
          ...(this.options.sender ? { sender: this.options.sender } : {}),
        },
        { timeoutMs: this.timeoutMs },
      );

      const parsed = parseKavenegar(response.data);
      if (parsed.ok) {
        return {
          success: true,
          providerMessageId: parsed.messageId,
        };
      }

      const retryable = isRetryableKavenegar(parsed.status, response.status);
      return {
        success: false,
        retryable,
        failureCode: parsed.failureCode,
        failureMessage: parsed.failureMessage,
      };
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || /aborted|timeout/i.test(error.message));
      return {
        success: false,
        retryable: true,
        failureCode: aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_ERROR',
        failureMessage: aborted
          ? 'مهلت ارسال پیامک به پایان رسید.'
          : 'خطا در اتصال به سرویس پیامک.',
      };
    }
  }
}

function isLikelyIranMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return (
    /^09\d{9}$/.test(digits) ||
    /^989\d{9}$/.test(digits) ||
    /^\+989\d{9}$/.test(phone.trim())
  );
}

function parseKavenegar(data: unknown): {
  ok: boolean;
  messageId?: string;
  status?: number;
  failureCode: string;
  failureMessage: string;
} {
  if (!data || typeof data !== 'object') {
    return {
      ok: false,
      failureCode: 'MALFORMED_RESPONSE',
      failureMessage: 'پاسخ نامعتبر از سرویس پیامک',
    };
  }
  const root = data as Record<string, unknown>;
  const returnNode = root.return as Record<string, unknown> | undefined;
  const entries = root.entries;
  const status =
    typeof returnNode?.status === 'number' ? returnNode.status : undefined;
  if (status === 200 && Array.isArray(entries) && entries.length > 0) {
    const first = entries[0] as Record<string, unknown>;
    return {
      ok: true,
      messageId: first.messageid != null ? String(first.messageid) : undefined,
      status,
      failureCode: 'OK',
      failureMessage: '',
    };
  }
  return {
    ok: false,
    status,
    failureCode: status != null ? `KAVENEGAR_${status}` : 'SEND_FAILED',
    failureMessage:
      typeof returnNode?.message === 'string'
        ? returnNode.message
        : 'ارسال پیامک ناموفق بود.',
  };
}

function isRetryableKavenegar(
  providerStatus: number | undefined,
  httpStatus: number,
): boolean {
  if (httpStatus >= 500 || httpStatus === 429) return true;
  if (providerStatus != null && providerStatus >= 500) return true;
  return false;
}
