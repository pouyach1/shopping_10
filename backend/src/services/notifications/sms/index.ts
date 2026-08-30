import { logger } from '../../../utils/logger';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './types';

export class MockSmsProvider implements SmsProvider {
  readonly id = 'mock';
  readonly sent: SendSmsInput[] = [];
  failNext = false;
  permanentFailNext = false;

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    if (this.permanentFailNext) {
      this.permanentFailNext = false;
      return {
        success: false,
        retryable: false,
        failureCode: 'PERMANENT',
        failureMessage: 'mock permanent SMS failure',
      };
    }
    if (this.failNext) {
      this.failNext = false;
      return {
        success: false,
        retryable: true,
        failureCode: 'TRANSIENT',
        failureMessage: 'mock transient SMS failure',
      };
    }
    this.sent.push(input);
    logger.info('sms.mock.sent', { to: input.to });
    return {
      success: true,
      providerMessageId: `mock-sms-${this.sent.length}`,
    };
  }
}

/**
 * Boundary for a real Iranian SMS vendor (e.g. Kavenegar).
 * Credentials come from env — no network calls until API key + HTTP client are wired.
 */
export class KavenegarSmsProvider implements SmsProvider {
  readonly id = 'kavenegar';

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error('SMS_API_KEY required for kavenegar');
  }

  async send(_input: SendSmsInput): Promise<SendSmsResult> {
    void this.apiKey;
    return {
      success: false,
      retryable: false,
      failureCode: 'NOT_WIRED',
      failureMessage:
        'Kavenegar HTTP client is not wired in this build. Use SMS_PROVIDER=mock until credentials and HTTP client are configured.',
    };
  }
}

export type { SmsProvider, SendSmsInput, SendSmsResult } from './types';
