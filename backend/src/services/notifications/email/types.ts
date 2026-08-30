export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  retryable?: boolean;
  failureCode?: string;
  failureMessage?: string;
}

export interface EmailProvider {
  readonly id: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
