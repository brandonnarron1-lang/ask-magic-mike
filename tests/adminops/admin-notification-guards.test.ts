import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isNotificationRetryEligible,
  summarizeNotifications,
} from "../../app/lib/adminLeadNotificationView";
import type { LeadNotificationRecord } from "../../app/lib/leadNotificationTypes";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function notification(overrides: Partial<LeadNotificationRecord>): LeadNotificationRecord {
  return {
    id: "notification-1",
    lead_id: "11111111-1111-4111-8111-111111111111",
    agent_id: "22222222-2222-4222-8222-222222222222",
    assignment_audit_id: "33333333-3333-4333-8333-333333333333",
    assignment_event_at: "2026-07-10T12:00:00.000Z",
    notification_type: "agent_assignment",
    channel: "email",
    recipient_type: "agent",
    recipient_reference: "email_configured",
    template_version: "agent_assignment_email_v1",
    idempotency_key: "lead_assignment:test",
    status: "pending",
    attempt_count: 0,
    max_attempts: 3,
    provider: "console",
    provider_message_id: null,
    error_code: null,
    error_summary: null,
    next_attempt_at: null,
    created_at: "2026-07-10T12:00:00.000Z",
    updated_at: "2026-07-10T12:00:00.000Z",
    sent_at: null,
    failed_at: null,
    metadata: {},
    ...overrides,
  };
}

describe("AdminOps notification guards", () => {
  it("keeps notification controls under the protected admin matcher", () => {
    const rootMiddleware = read("middleware.ts");
    const srcMiddleware = read("src/middleware.ts");
    expect(rootMiddleware).toContain('matcher: ["/admin/:path*"]');
    expect(srcMiddleware).toContain('matcher: ["/admin/:path*"]');
    expect("/admin/notifications").toMatch(/^\/admin(?:\/.*)?$/);
  });

  it("does not expose notification controls through public routes", () => {
    const publicFiles = [
      "app/page.tsx",
      "app/home-value/page.tsx",
      "app/sell/page.tsx",
      "app/ask/page.tsx",
      "app/widget/page.tsx",
      "app/embed/ask/page.tsx",
      "app/api/leads/route.ts",
    ];

    for (const file of publicFiles) {
      expect(read(file), file).not.toContain("leadNotificationService");
      expect(read(file), file).not.toContain("lead_notifications");
      expect(read(file), file).not.toContain("retryLeadNotificationAction");
    }
  });

  it("keeps manual retry one-record and server-action based", () => {
    const action = read("app/admin/notifications/actions.ts");
    expect(action).toContain('"use server"');
    expect(action).toContain("retryNotification(notificationId)");
    expect(action).toContain("redirect(");
    expect(action).not.toContain("listRetryable");
    expect(action).not.toMatch(/\bbulk\b/i);
    expect(action).not.toContain("/api/leads");
  });

  it("summarizes status counts and retry eligibility without recipient values", () => {
    const summary = summarizeNotifications([
      notification({ id: "pending-1", status: "pending" }),
      notification({ id: "sent-1", status: "sent", sent_at: "2026-07-10T12:01:00.000Z" }),
      notification({ id: "failed-1", status: "permanently_failed", attempt_count: 3 }),
      notification({ id: "retry-1", status: "retry_scheduled", attempt_count: 1 }),
      notification({ id: "skipped-1", status: "skipped" }),
    ]);

    expect(summary.kpis).toEqual({
      total: 5,
      pending: 1,
      sent: 1,
      failed: 1,
      skipped: 1,
      retryScheduled: 1,
    });
    expect(isNotificationRetryEligible(notification({ status: "retry_scheduled", attempt_count: 1 }))).toBe(true);
    expect(isNotificationRetryEligible(notification({ status: "permanently_failed", attempt_count: 3 }))).toBe(false);
    expect(JSON.stringify(summary)).not.toContain("agent@example");
  });
});
