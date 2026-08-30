import { logger } from '../../../utils/logger';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

export class MockEmailProvider implements EmailProvider {
  readonly id = 'mock';
  readonly sent: SendEmailInput[] = [];
  failNext = false;

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (this.failNext) {
      this.failNext = false;
      return {
        success: false,
        retryable: true,
        failureCode: 'TRANSIENT',
        failureMessage: 'mock transient email failure',
      };
    }
    this.sent.push(input);
    logger.info('email.mock.sent', { to: input.to, subject: input.subject });
    return {
      success: true,
      providerMessageId: `mock-email-${this.sent.length}`,
    };
  }
}

/** SMTP boundary — fail closed until a transport is configured. */
export class SmtpEmailProvider implements EmailProvider {
  readonly id = 'smtp';

  constructor(private readonly from: string) {}

  async send(_input: SendEmailInput): Promise<SendEmailResult> {
    void this.from;
    return {
      success: false,
      retryable: false,
      failureCode: 'NOT_WIRED',
      failureMessage:
        'SMTP transport is not wired in this build. Use EMAIL_PROVIDER=mock until SMTP is configured.',
    };
  }
}

export type { EmailProvider, SendEmailInput, SendEmailResult } from './types';
