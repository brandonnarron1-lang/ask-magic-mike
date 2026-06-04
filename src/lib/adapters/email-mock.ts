import type { EmailAdapter, EmailSendParams, EmailSendResult } from "./email-types";

export function createMockEmailAdapter(): EmailAdapter {
  return {
    name: "email_mock",
    async send(params: EmailSendParams): Promise<EmailSendResult> {
      const now = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log("[email_mock]", {
        to: params.to,
        subject: params.subject,
        textLen: params.text.length,
        htmlLen: params.html.length,
        at: now,
      });
      return {
        provider: "email_mock",
        providerMessageId: `mock_${Date.now()}`,
        status: "sent",
        acknowledgedAt: now,
      };
    },
  };
}
