// @vitest-environment node
import { describe, expect, it } from "vitest";
import { requestReceiptAvailable } from "../../app/lib/requestReceiptAvailability";

const ready = { REQUEST_RESPONSE_WORKER_ENABLED: "true", REQUEST_RECEIPTS_ENABLED: "true",
  REQUEST_RECEIPTS_ACTIVATED_AT: "2026-11-05T00:00:00.000Z", REQUEST_RECEIPTS_REPLY_TO: "reply@example.test",
  CUSTOMER_EMAIL_ENABLED: "true", LEAD_NOTIFICATION_MODE: "production", LEAD_NOTIFICATION_PRODUCTION_ENABLED: "true",
  EMAIL_ENABLED: "true", EMAIL_PROVIDER: "resend", RESEND_FROM: "Our Town <sender@example.test>", RESEND_API_KEY: "synthetic-not-a-key" };
const now = Date.parse("2026-11-06T00:00:00.000Z");
describe("configuration-only receipt availability", () => {
  it("defaults OFF and offers receipts only with every existing gate and valid current cutoff", () => {
    expect(requestReceiptAvailable({}, now)).toBe(false);
    expect(requestReceiptAvailable(ready, now)).toBe(true);
  });
  it.each(["REQUEST_RESPONSE_WORKER_ENABLED", "REQUEST_RECEIPTS_ENABLED", "CUSTOMER_EMAIL_ENABLED",
    "LEAD_NOTIFICATION_PRODUCTION_ENABLED", "EMAIL_ENABLED"])("does not advertise a disabled gate: %s", key => {
    expect(requestReceiptAvailable({ ...ready, [key]: "false" }, now)).toBe(false);
  });
  it.each(["REQUEST_RECEIPTS_ACTIVATED_AT", "REQUEST_RECEIPTS_REPLY_TO", "RESEND_FROM", "RESEND_API_KEY"])("does not advertise incomplete configuration: %s", key => {
    expect(requestReceiptAvailable({ ...ready, [key]: "" }, now)).toBe(false);
  });
  it.each([
    { REQUEST_RECEIPTS_ACTIVATED_AT: "2026-11-07T00:00:00.000Z" },
    { REQUEST_RECEIPTS_ACTIVATED_AT: "invalid" }, { REQUEST_RECEIPTS_REPLY_TO: "invalid" },
    { RESEND_FROM: "invalid" }, { LEAD_NOTIFICATION_MODE: "disabled" },
    { LEAD_NOTIFICATION_MODE: "sandbox" }, { EMAIL_PROVIDER: "smtp" },
  ])("does not infer a capability from malformed/future/unsupported configuration (%#)", patch => {
    expect(requestReceiptAvailable({ ...ready, ...patch }, now)).toBe(false);
  });
  it("respects the existing email/notification aliases without enabling anything", () => {
    expect(requestReceiptAvailable({ ...ready, EMAIL_ENABLED: "false", AGENT_NOTIFICATIONS_ENABLED: "true" }, now)).toBe(true);
    expect(requestReceiptAvailable({ ...ready, LEAD_NOTIFICATION_MODE: "", NOTIFICATION_PROVIDER_MODE: "production" }, now)).toBe(true);
  });
});
