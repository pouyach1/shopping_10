import { logger } from '../../../utils/logger';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './types';

export class MockSmsProvider implements SmsProvider {
  readonly id = 'mock';
  readonly sent: SendSmsInput[] = [];
  failNext = false;
  permanentFailNext = false;
  timeoutNext = false;
  rateLimitNext = false;

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    if (this.permanentFailNext) {
      this.permanentFailNext = false;
      return {
        success: false,
        retryable: false,
        failureCode: 'INVALID_RECIPIENT',
        failureMessage: 'mock permanent SMS failure',
      };
    }
    if (this.timeoutNext) {
      this.timeoutNext = false;
      return {
        success: false,
        retryable: true,
        failureCode: 'PROVIDER_TIMEOUT',
        failureMessage: 'mock SMS timeout',
      };
    }
    if (this.rateLimitNext) {
      this.rateLimitNext = false;
      return {
        success: false,
        retryable: true,
        failureCode: 'RATE_LIMIT',
        failureMessage: 'mock SMS rate limit',
      };
    }
    if (this.failNext) {
      this.failNext = false;
      return {
        success: false,
        retryable: true,
        failureCode: 'PROVIDER_5XX',
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
