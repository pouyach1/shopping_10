import { logger } from '../../../utils/logger';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

export class MockEmailProvider implements EmailProvider {
  readonly id = 'mock';
  readonly sent: SendEmailInput[] = [];
  failNext = false;
  permanentFailNext = false;

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (this.permanentFailNext) {
      this.permanentFailNext = false;
      return {
        success: false,
        retryable: false,
        failureCode: 'INVALID_RECIPIENT',
        failureMessage: 'mock permanent email failure',
      };
    }
    if (this.failNext) {
      this.failNext = false;
      return {
        success: false,
        retryable: true,
        failureCode: 'PROVIDER_5XX',
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

/** Minimal injectable SMTP transport — tests inject a fake. */
export interface SmtpTransport {
  sendMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<{ messageId?: string }>;
}

export interface SmtpEmailProviderOptions {
  from: string;
  host?: string;
  port?: number;
  user?: string;
  /** Never logged. */
  password?: string;
  secure?: boolean;
  transport?: SmtpTransport;
}

/**
 * SMTP boundary. Without an injected transport, builds a fetch-like stub
 * that fails closed unless transport is provided (production wires nodemailer
 * or similar outside core if desired).
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly id = 'smtp';

  constructor(private readonly options: SmtpEmailProviderOptions) {
    if (!options.from) {
      throw new Error('EMAIL_FROM required for smtp');
    }
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!isLikelyEmail(input.to)) {
      return {
        success: false,
        retryable: false,
        failureCode: 'INVALID_RECIPIENT',
        failureMessage: 'ایمیل نامعتبر است.',
      };
    }

    const transport = this.options.transport;
    if (!transport) {
      if (!this.options.host) {
        return {
          success: false,
          retryable: false,
          failureCode: 'NOT_WIRED',
          failureMessage:
            'SMTP transport is not configured. Set SMTP_HOST or inject a transport.',
        };
      }
      // Built-in minimal TCP-less fallback: refuse rather than pretend.
      return {
        success: false,
        retryable: false,
        failureCode: 'NOT_WIRED',
        failureMessage:
          'SMTP_HOST is set but no transport adapter was injected at boot.',
      };
    }

    try {
      const result = await transport.sendMail({
        from: this.options.from,
        to: input.to,
        subject: input.subject,
        text: input.body,
      });
      return {
        success: true,
        providerMessageId: result.messageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'smtp error';
      const retryable = /timeout|temporar|421|450|451|452|5\d\d/i.test(message);
      return {
        success: false,
        retryable,
        failureCode: retryable ? 'PROVIDER_ERROR' : 'SMTP_REJECTED',
        failureMessage: 'ارسال ایمیل ناموفق بود.',
      };
    }
  }
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type { EmailProvider, SendEmailInput, SendEmailResult } from './types';
