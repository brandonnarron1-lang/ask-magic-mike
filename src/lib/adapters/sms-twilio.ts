import type { SmsAdapter, SmsSendParams, SmsSendResult } from "./sms-types";

/**
 * Twilio SMS adapter.
 *
 * Only activated when `SMS_PROVIDER=twilio`, `ENABLE_SMS=true`, and the
 * three Twilio env vars are present. Otherwise we return a `skipped`
 * status so call sites can fall back to the mock adapter or log+skip.
 *
 * NOTE: this uses `fetch` against the Twilio REST API directly to avoid
 * pulling in the `twilio` SDK as a hard dependency. The function shape
 * matches the SDK so a swap is trivial.
 */
export function createTwilioSmsAdapter(): SmsAdapter {
  const enabled =
    (process.env.ENABLE_SMS ?? "false").toLowerCase() === "true" &&
    process.env.SMS_PROVIDER === "twilio" &&
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_PHONE_NUMBER;

  return {
    name: "twilio",
    async send(params: SmsSendParams): Promise<SmsSendResult> {
      if (!enabled) {
        return {
          provider: "twilio",
          providerMessageId: null,
          status: "skipped",
          reason: "twilio_disabled_or_missing_creds",
          acknowledgedAt: new Date().toISOString(),
        };
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken  = process.env.TWILIO_AUTH_TOKEN!;
      const from       = process.env.TWILIO_PHONE_NUMBER!;

      const body = new URLSearchParams({
        From: from,
        To: params.to,
        Body: params.body,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );

      const now = new Date().toISOString();
      if (!res.ok) {
        return {
          provider: "twilio",
          providerMessageId: null,
          status: "failed",
          reason: `twilio_http_${res.status}`,
          acknowledgedAt: now,
        };
      }

      const json = (await res.json()) as { sid?: string; status?: string };
      return {
        provider: "twilio",
        providerMessageId: json.sid ?? null,
        status: json.status === "failed" ? "failed" : "queued",
        acknowledgedAt: now,
      };
    },
  };
}
