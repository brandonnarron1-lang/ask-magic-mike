import type { SmsAdapter, SmsSendParams, SmsSendResult } from "./sms-types";

/**
 * Mock SMS adapter — never hits a carrier. Returns success and logs a
 * structured line so the dev/console output mirrors what a real send
 * would look like. Use whenever `ENABLE_SMS=false` or carrier creds are
 * missing.
 */
export function createMockSmsAdapter(): SmsAdapter {
  return {
    name: "sms_mock",
    async send(params: SmsSendParams): Promise<SmsSendResult> {
      const now = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log("[sms_mock]", {
        to: params.to,
        body: params.body,
        metadata: params.metadata,
        at: now,
      });
      return {
        provider: "sms_mock",
        providerMessageId: `mock_${Date.now()}`,
        status: "sent",
        acknowledgedAt: now,
      };
    },
  };
}
