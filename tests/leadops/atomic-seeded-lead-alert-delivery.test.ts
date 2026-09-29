import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueLeadNotifications } from "../../app/lib/leadAlertService";
import { routeLead } from "../../app/lib/leadRouting";
import { scoreLead } from "../../app/lib/leadScoring";
import type {
  LeadNotificationRecord,
  LeadNotificationRepository,
  NotificationProvider,
} from "../../app/lib/leadNotificationTypes";
import type { LeadPayload } from "../../app/lib/leadPayload";

const leadId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

function seededPending(): LeadNotificationRecord {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    lead_id: leadId,
    agent_id: null,
    assignment_audit_id: null,
    assignment_event_at: null,
    notification_type: "lead_alert",
    channel: "email",
    recipient_type: "internal",
    recipient_reference: "email_configured",
    template_version: "lead_alert_email_v3",
    idempotency_key: `lead_alert:${leadId}:lead_alert_email_v3`,
    status: "pending",
    attempt_count: 0,
    max_attempts: 3,
    provider: "sandbox",
    provider_message_id: null,
    error_code: null,
    error_summary: null,
    next_attempt_at: null,
    created_at: "2026-09-02T05:30:00.000Z",
    updated_at: "2026-09-02T05:30:00.000Z",
    sent_at: null,
    failed_at: null,
    metadata: { capture_transaction: "capture_public_lead_v2" },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("atomic seeded lead-alert delivery", () => {
  it("claims and sends the pending row without creating a duplicate", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "sandbox");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "mike@example.test");
    vi.stubEnv("AGENT_SMS_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("AGENT_PUSH_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("CONSUMER_ACKNOWLEDGMENT_ENABLED", "false");
    vi.stubEnv("VERCEL_ENV", "development");

    let current = seededPending();
    const create = vi.fn();
    const repository: LeadNotificationRepository = {
      create,
      findById: vi.fn(async () => current),
      findByIdempotencyKey: vi.fn(async () => current),
      update: vi.fn(async (_id, patch) => {
        current = { ...current, ...patch };
        return current;
      }),
      claimForProcessing: vi.fn(async (_id, patch) => {
        if (current.status !== "pending") return null;
        current = { ...current, ...patch };
        return current;
      }),
      listRecent: vi.fn(async () => []),
      listByLead: vi.fn(async () => []),
      listRetryable: vi.fn(async () => []),
    };
    const send = vi.fn(async () => ({
      ok: true as const,
      provider: "synthetic-sandbox",
      providerMessageId: "synthetic-message-id",
    }));
    const provider: NotificationProvider = {
      name: "synthetic-sandbox",
      send,
    };
    const payload: LeadPayload = {
      funnel_type: "seller",
      lead_source_surface: "seller_page",
      lead_type: "seller",
      name: "INTERNAL QA DO NOT CONTACT",
      email: "lead@example.test",
      phone: "2525550101",
      city: "Wilson",
      timeline: "ASAP",
      question: "INTERNAL QA DO NOT CONTACT",
      is_test: true,
      consent_email: true,
      attribution: { source: "synthetic", placement_id: "atomic-contract" },
      status: "new",
      assigned_agent_id: null,
    };
    const score = scoreLead(payload);

    const result = await enqueueLeadNotifications({
      leadId,
      sessionId,
      correlationId: "synthetic-correlation",
      payload,
      score,
      routing: routeLead(payload, score.score),
      submittedAt: "2026-09-02T05:30:00.000Z",
      duplicateOfLeadId: null,
    }, { repository, provider });

    expect(create).not.toHaveBeenCalled();
    expect(repository.claimForProcessing).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.internal).toMatchObject({
      status: "sent",
      attempt_count: 1,
      provider_message_id: "synthetic-message-id",
    });
  });
});
