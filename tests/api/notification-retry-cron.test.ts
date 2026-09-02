import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { LeadNotificationRecord } from "../../app/lib/leadNotificationTypes";

const retryDueNotifications = vi.hoisted(() => vi.fn());

vi.mock("../../app/lib/leadAlertService", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../app/lib/leadAlertService")>();
  return { ...original, retryDueNotifications };
});

import { GET, POST } from "../../app/api/admin/notifications/retry/route";

function notification(status: LeadNotificationRecord["status"]): LeadNotificationRecord {
  return {
    id: crypto.randomUUID(),
    lead_id: "11111111-1111-4111-8111-111111111111",
    agent_id: null,
    assignment_audit_id: null,
    assignment_event_at: null,
    notification_type: "lead_alert",
    channel: "email",
    recipient_type: "internal",
    recipient_reference: "email_configured",
    template_version: "lead_alert_email_v3",
    idempotency_key: crypto.randomUUID(),
    status,
    attempt_count: 2,
    max_attempts: 3,
    provider: "console",
    provider_message_id: status === "sent" ? "provider-message" : null,
    error_code: status === "retry_scheduled" ? "temporary" : null,
    error_summary: null,
    next_attempt_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sent_at: status === "sent" ? new Date().toISOString() : null,
    failed_at: null,
    metadata: {},
  };
}

const ENV_KEYS = [
  "ADMIN_SECRET",
  "CRON_SECRET",
  "VERCEL_ENV",
  "DATABASE_ENV",
  "PREVIEW_DATA_MODE",
  "ALLOW_PREVIEW_DB_MUTATION",
  "LEAD_NOTIFICATION_MODE",
  "LEAD_NOTIFICATION_PRODUCTION_ENABLED",
  "EMAIL_ENABLED",
  "EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "RESEND_FROM",
] as const;

beforeEach(() => {
  process.env.ADMIN_SECRET = "admin-test-secret";
  process.env.CRON_SECRET = "cron-test-secret";
  process.env.VERCEL_ENV = "production";
  process.env.DATABASE_ENV = "production";
  process.env.LEAD_NOTIFICATION_MODE = "production";
  process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
  process.env.EMAIL_ENABLED = "true";
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "synthetic-resend-key";
  process.env.RESEND_FROM = "alerts@example.test";
  retryDueNotifications.mockReset();
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("scheduled notification retry", () => {
  it("runs an aggregate-only batch for the authenticated cron caller", async () => {
    retryDueNotifications.mockResolvedValue([
      notification("sent"),
      notification("retry_scheduled"),
    ]);

    const response = await GET(new NextRequest(
      "https://www.askmagicmike.com/api/admin/notifications/retry",
      { headers: { authorization: "Bearer cron-test-secret" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(retryDueNotifications).toHaveBeenCalledWith(25);
    expect(body).toEqual({
      ok: true,
      mode: "cron",
      processed: 2,
      unavailable: 0,
      status_counts: { sent: 1, retry_scheduled: 1 },
    });
    expect(JSON.stringify(body)).not.toContain("provider-message");
    expect(JSON.stringify(body)).not.toContain("11111111-1111-4111-8111-111111111111");
  });

  it("keeps an authenticated administrator GET read-only", async () => {
    const response = await GET(new NextRequest(
      "https://www.askmagicmike.com/api/admin/notifications/retry",
      { headers: { "x-admin-secret": "admin-test-secret" } },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "retry_endpoint_ready" });
    expect(retryDueNotifications).not.toHaveBeenCalled();
  });

  it("allows a bounded manual batch through POST", async () => {
    retryDueNotifications.mockResolvedValue([notification("sent")]);
    const response = await POST(new NextRequest(
      "https://www.askmagicmike.com/api/admin/notifications/retry",
      {
        method: "POST",
        headers: {
          "x-admin-secret": "admin-test-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ limit: 7 }),
      },
    ));

    expect(response.status).toBe(200);
    expect(retryDueNotifications).toHaveBeenCalledWith(7);
  });

  it("fails closed without either exact secret", async () => {
    const response = await GET(new NextRequest(
      "https://www.askmagicmike.com/api/admin/notifications/retry",
    ));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(retryDueNotifications).not.toHaveBeenCalled();
  });

  it("refuses Preview processing before the retry repository or provider runs", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";

    const response = await GET(new NextRequest(
      "https://preview.example.test/api/admin/notifications/retry",
      { headers: { authorization: "Bearer cron-test-secret" } },
    ));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "preview_data_disabled",
      mode: "cron",
      processed: 0,
    });
    expect(retryDueNotifications).not.toHaveBeenCalled();
  });

  it("preserves due rows when Production delivery is disabled", async () => {
    process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "false";

    const response = await GET(new NextRequest(
      "https://www.askmagicmike.com/api/admin/notifications/retry",
      { headers: { authorization: "Bearer cron-test-secret" } },
    ));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "notification_retry_delivery_not_ready",
      mode: "cron",
      processed: 0,
    });
    expect(retryDueNotifications).not.toHaveBeenCalled();
  });
});
