/**
 * Provider-neutral SMS adapter contract.
 *
 * Engines depend on `SmsAdapter`, not on Twilio specifically. Adapters
 * for Twilio / mock / message-bird etc. are swappable behind the same
 * interface.
 */

export interface SmsSendParams {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SmsSendResult {
  provider: string;
  providerMessageId: string | null;
  status: "queued" | "sent" | "skipped" | "failed";
  reason?: string;
  /** When live providers respond async, we still return a synthetic ack. */
  acknowledgedAt: string;
}

export interface SmsAdapter {
  name: string;
  /** Returns immediately. Carrier delivery state is delivered via webhook. */
  send(params: SmsSendParams): Promise<SmsSendResult>;
}
