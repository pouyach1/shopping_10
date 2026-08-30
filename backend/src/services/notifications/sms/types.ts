export interface SendSmsInput {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SendSmsResult {
  success: boolean;
  providerMessageId?: string;
  retryable?: boolean;
  failureCode?: string;
  failureMessage?: string;
}

export interface SmsProvider {
  readonly id: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
