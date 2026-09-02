import { describe, expect, it, vi } from "vitest";
import { retryDueNotifications } from "../../app/lib/leadAlertService";
import type {
  LeadNotificationRecord,
  LeadNotificationRepository,
} from "../../app/lib/leadNotificationTypes";

function row(
  id: string,
  notificationType: string,
  overrides: Partial<LeadNotificationRecord> = {},
): LeadNotificationRecord {
  return {
    id,
    lead_id: "11111111-1111-4111-8111-111111111111",
    agent_id: notificationType === "agent_assignment"
      ? "22222222-2222-4222-8222-222222222222"
      : null,
    assignment_audit_id: null,
    assignment_event_at: null,
    notification_type: notificationType,
    channel: "email",
    recipient_type: notificationType === "agent_assignment" ? "agent" : "internal",
    recipient_reference: "email_configured",
    template_version: "test-v1",
    idempotency_key: `retry:${id}`,
    status: "retry_scheduled",
    attempt_count: 1,
    max_attempts: 3,
    provider: "console",
    provider_message_id: null,
    error_code: "temporary",
    error_summary: null,
    next_attempt_at: "2026-09-01T20:00:00.000Z",
    created_at: "2026-09-01T19:00:00.000Z",
    updated_at: "2026-09-01T19:00:00.000Z",
    sent_at: null,
    failed_at: null,
    metadata: {},
    ...overrides,
  };
}

function repository(rows: LeadNotificationRecord[]) {
  const update = vi.fn(async (id: string, patch: Partial<LeadNotificationRecord>) => {
    const current = rows.find((candidate) => candidate.id === id);
    return current ? { ...current, ...patch } : null;
  });
  return {
    repo: {
      listRetryable: vi.fn(async () => rows),
      update,
    } as unknown as LeadNotificationRepository,
    update,
  };
}

describe("notification retry batch", () => {
  it("dispatches every supported notification type through its existing processor", async () => {
    const due = [
      row("lead-alert", "lead_alert"),
      row("consumer-ack", "consumer_ack", { recipient_type: "customer" }),
      row("assignment", "agent_assignment"),
    ];
    const { repo } = repository(due);
    const retryLeadAlert = vi.fn(async (id: string) => ({
      ...due.find((candidate) => candidate.id === id)!,
      status: "sent" as const,
    }));
    const retryAssignment = vi.fn(async (id: string) => ({
      ok: true as const,
      notification: {
        ...due.find((candidate) => candidate.id === id)!,
        status: "sent" as const,
      },
    }));

    const results = await retryDueNotifications(25, {
      repository: repo,
      retryLeadAlert,
      retryAssignment,
    });

    expect(results.map((result) => result?.status)).toEqual(["sent", "sent", "sent"]);
    expect(retryLeadAlert).toHaveBeenCalledTimes(2);
    expect(retryLeadAlert).toHaveBeenNthCalledWith(1, "lead-alert", { automated: true });
    expect(retryAssignment).toHaveBeenCalledWith("assignment");
  });

  it("suppresses test rows before any notification processor can send", async () => {
    const testRow = row("qa", "lead_alert", { lead_is_test: true });
    const { repo, update } = repository([testRow]);
    const retryLeadAlert = vi.fn();
    const retryAssignment = vi.fn();

    const results = await retryDueNotifications(25, {
      repository: repo,
      retryLeadAlert,
      retryAssignment,
    });

    expect(retryLeadAlert).not.toHaveBeenCalled();
    expect(retryAssignment).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith("qa", expect.objectContaining({
      status: "skipped",
      error_code: "automated_test_retry_suppressed",
      next_attempt_at: null,
    }));
    expect(results[0]?.status).toBe("skipped");
  });

  it("terminalizes unsupported types and continues after an isolated processor failure", async () => {
    const due = [
      row("unknown", "future_type"),
      row("throws", "lead_alert"),
      row("continues", "consumer_ack", { recipient_type: "customer" }),
    ];
    const { repo, update } = repository(due);
    const retryLeadAlert = vi.fn(async (id: string) => {
      if (id === "throws") throw new Error("synthetic failure");
      return { ...due.find((candidate) => candidate.id === id)!, status: "sent" as const };
    });

    const results = await retryDueNotifications(25, {
      repository: repo,
      retryLeadAlert,
      retryAssignment: vi.fn(),
    });

    expect(update).toHaveBeenCalledWith("unknown", expect.objectContaining({
      status: "permanently_failed",
      error_code: "notification_type_unsupported",
    }));
    expect(results.map((result) => result?.status ?? null)).toEqual([
      "permanently_failed",
      null,
      "sent",
    ]);
  });
});
