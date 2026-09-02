/**
 * Source-level invariants for the canonical Resend lifecycle callback.
 * Runtime behavior and signed payload handling are covered in
 * phase7-resend-webhook.test.ts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  join(process.cwd(), "app/api/webhooks/email/events/route.ts"),
  "utf8",
);

describe("POST /api/webhooks/email/events — reliability contract", () => {
  it("keeps receipt, notification, timeline, and suppression writes atomic", () => {
    expect(route).toContain("WITH notification_candidate AS MATERIALIZED");
    expect(route).toContain("claimed_webhook AS");
    expect(route).toContain("notification_update AS");
    expect(route).toContain("communication_insert AS");
    expect(route).toContain("lead_suppression AS");
    expect(route).toContain("WHERE receipt.processing_status = 'failed'");
    expect(route).not.toContain("SELECT id, processing_status FROM public.provider_webhook_events");
  });

  it("fails safely so provider retries remain possible", () => {
    expect(route).toContain("atomic persistence failed");
    expect(route).toContain('{ ok: false, error: "database_unavailable" }, 503');
    expect(route).toContain("receipt_not_confirmed");
    expect(route).not.toContain("error instanceof Error ? error.message");
  });

  it("bounds the raw signed body before verification and stores no raw payload", () => {
    expect(route).toContain("MAX_WEBHOOK_BODY_BYTES = 256_000");
    expect(route).toContain("request.body.getReader()");
    expect(route).toContain("WebhookPayloadTooLargeError");
    expect(route).toContain('createHash("sha256").update(raw).digest("hex")');
    expect(route).not.toContain("normalized.email");
    expect(route).not.toContain("raw: payload");
  });

  it("keeps Preview read-only and every response private and correlated", () => {
    expect(route).toContain("isPreviewRuntime()");
    expect(route).toContain('error: "preview_data_disabled"');
    expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(route).toContain('"X-AMM-Correlation-Id": correlationId');
  });

  it("accepts only the configured Resend lifecycle event set", () => {
    for (const event of [
      "sent",
      "delivered",
      "delivery_delayed",
      "bounced",
      "complained",
      "failed",
      "opened",
      "clicked",
    ]) {
      expect(route).toContain(`"${event}"`);
    }
    expect(route).toContain('error: "event_not_supported"');
  });
});
