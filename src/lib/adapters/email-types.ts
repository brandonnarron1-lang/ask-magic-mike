export interface EmailSendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  provider: string;
  providerMessageId: string | null;
  status: "queued" | "sent" | "skipped" | "failed";
  reason?: string;
  acknowledgedAt: string;
}

export interface EmailAdapter {
  name: string;
  send(params: EmailSendParams): Promise<EmailSendResult>;
}
