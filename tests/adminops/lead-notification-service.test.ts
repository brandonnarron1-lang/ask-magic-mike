import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsoleNotificationProvider, DisabledNotificationProvider } from "../../app/lib/leadNotificationProvider";
import { LeadNotificationService, assignmentNotificationIdempotencyKey } from "../../app/lib/leadNotificationService";
import type {
  AssignmentNotificationContext,
  LeadNotificationCreateInput,
  LeadNotificationRecord,
  LeadNotificationRepository,
} from "../../app/lib/leadNotificationTypes";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";

class MemoryNotificationRepo implements LeadNotificationRepository {
  rows: LeadNotificationRecord[] = [];

  async create(input: LeadNotificationCreateInput) {
    const existing = this.rows.find((row) => row.idempotency_key === input.idempotency_key);
    if (existing) return existing;
    const row: LeadNotificationRecord = {
      id: `notification-${this.rows.length + 1}`,
      lead_id: input.lead_id,
      agent_id: input.agent_id,
      assignment_audit_id: input.assignment_audit_id || null,
      assignment_event_at: input.assignment_event_at || null,
      notification_type: input.notification_type,
      channel: input.channel,
      recipient_type: input.recipient_type,
      recipient_reference: input.recipient_reference || null,
      template_version: input.template_version,
      idempotency_key: input.idempotency_key,
      status: input.status || "pending",
      attempt_count: 0,
      max_attempts: input.max_attempts || 3,
      provider: input.provider || null,
      provider_message_id: null,
      error_code: null,
      error_summary: null,
      next_attempt_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_at: null,
      failed_at: null,
      metadata: input.metadata || {},
    };
    this.rows.push(row);
    return row;
  }

  async findById(id: string) {
    return this.rows.find((row) => row.id === id) || null;
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return this.rows.find((row) => row.idempotency_key === idempotencyKey) || null;
  }

  async update(id: string, patch: Partial<LeadNotificationRecord>) {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index < 0) return null;
    this.rows[index] = { ...this.rows[index], ...patch, updated_at: new Date().toISOString() };
    return this.rows[index];
  }

  async listRecent() {
    return [...this.rows].reverse();
  }

  async listByLead(leadId: string) {
    return this.rows.filter((row) => row.lead_id === leadId);
  }

  async listRetryable() {
    return this.rows.filter((row) => ["failed", "retry_scheduled"].includes(row.status));
  }
}

function context(overrides: Partial<AssignmentNotificationContext> = {}): AssignmentNotificationContext {
  return {
    lead: {
      id: LEAD_ID,
      status: "assigned",
      assigned_agent_id: AGENT_ID,
      assigned_at: "2026-07-10T12:00:00.000Z",
      assignment_status: "assigned",
      address_raw: "000 QA Test Property, Wilson, NC",
      primary_intent: "sell",
      timeline_months: 3,
      lead_type: "home_value",
      source: "qa_lifecycle",
      source_detail: "home_value_page / controlled_production_qa",
      page_url: "https://www.askmagicmike.com/home-value",
    },
    agent: {
      id: AGENT_ID,
      name: "Mike Eatmon",
      email: "agent@example.test",
      phone: "+15555550123",
      is_active: true,
    },
    assignmentAuditId: "33333333-3333-4333-8333-333333333333",
    assignmentEventAt: "2026-07-10T12:00:00.000Z",
    assignmentRoute: "/admin/allocation",
    actor: "system/admin_basic_auth",
    action: "assigned",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-10T12:00:00.000Z"));
  process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
  process.env.LEAD_NOTIFICATION_MODE = "console";
});

afterEach(() => {
  vi.useRealTimers();
  delete (process.env as Record<string, string | undefined>).AGENT_NOTIFICATIONS_ENABLED;
  delete (process.env as Record<string, string | undefined>).AGENT_SMS_NOTIFICATIONS_ENABLED;
  delete (process.env as Record<string, string | undefined>).LEAD_NOTIFICATION_MODE;
  delete (process.env as Record<string, string | undefined>).CUSTOMER_EMAIL_ENABLED;
  delete (process.env as Record<string, string | undefined>).CUSTOMER_SMS_ENABLED;
});

describe("LeadNotificationService", () => {
  it("builds stable idempotency keys for assignment notifications", () => {
    expect(
      assignmentNotificationIdempotencyKey({
        leadId: LEAD_ID,
        agentId: AGENT_ID,
        assignmentEvent: "audit-1",
        channel: "email",
        templateVersion: "agent_assignment_email_v1",
      }),
    ).toBe(`${"lead_assignment"}:${LEAD_ID}:${AGENT_ID}:audit-1:email:agent_assignment_email_v1`);
  });

  it("creates one event and prevents duplicate sends for the same assignment", async () => {
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("success");
    const spy = vi.spyOn(provider, "send");
    const service = new LeadNotificationService(repo, provider);

    const first = await service.createAssignmentNotification(context());
    const second = await service.createAssignmentNotification(context());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(repo.rows).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(repo.rows[0].status).toBe("sent");
  });

  it("records skipped when mode is disabled and never calls a live provider", async () => {
    process.env.AGENT_NOTIFICATIONS_ENABLED = "false";
    process.env.LEAD_NOTIFICATION_MODE = "disabled";
    const repo = new MemoryNotificationRepo();
    const provider = new DisabledNotificationProvider();
    const spy = vi.spyOn(provider, "send");
    const service = new LeadNotificationService(repo, provider);

    const result = await service.createAssignmentNotification(context());

    expect(result.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    expect(repo.rows[0].status).toBe("skipped");
    expect(repo.rows[0].error_code).toBe("agent_notifications_disabled");
  });

  it("schedules retryable failures without creating another event", async () => {
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("retryable_failure");
    const service = new LeadNotificationService(repo, provider);

    const result = await service.createAssignmentNotification(context());

    expect(result.ok).toBe(true);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].status).toBe("retry_scheduled");
    expect(repo.rows[0].attempt_count).toBe(1);
    expect(repo.rows[0].next_attempt_at).toBeTruthy();
  });

  it("allows bounded manual retry using the same notification event", async () => {
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("retryable_failure");
    const service = new LeadNotificationService(repo, provider);

    await service.createAssignmentNotification(context());
    await service.retryNotification("notification-1", context());
    await service.retryNotification("notification-1", context());
    const blocked = await service.retryNotification("notification-1", context());

    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].attempt_count).toBe(3);
    expect(repo.rows[0].status).toBe("permanently_failed");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("notification_not_retryable");
  });

  it("blocks missing recipients and inactive agents safely", async () => {
    const missingRepo = new MemoryNotificationRepo();
    const service = new LeadNotificationService(missingRepo, new ConsoleNotificationProvider("success"));
    const missing = await service.createAssignmentNotification(
      context({ agent: { id: AGENT_ID, name: "Mike", email: null, is_active: true } }),
    );
    expect(missing.ok).toBe(true);
    expect(missingRepo.rows[0].status).toBe("skipped");
    expect(missingRepo.rows[0].error_code).toBe("missing_agent_email");

    const inactiveRepo = new MemoryNotificationRepo();
    const inactiveService = new LeadNotificationService(inactiveRepo, new ConsoleNotificationProvider("success"));
    const inactive = await inactiveService.createAssignmentNotification(
      context({ agent: { id: AGENT_ID, name: "Mike", email: "agent@example.test", is_active: false } }),
    );
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) expect(inactive.error).toBe("assigned_agent_inactive");
  });

  it("prevents notifying the wrong agent after reassignment", async () => {
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("success");
    const service = new LeadNotificationService(repo, provider);
    const created = await service.createAssignmentNotification(context());
    expect(created.ok).toBe(true);

    repo.rows[0].status = "retry_scheduled";
    const retry = await service.processNotification(
      repo.rows[0].id,
      context({
        lead: { ...context().lead, assigned_agent_id: "44444444-4444-4444-8444-444444444444" },
      }),
    );

    expect(retry.ok).toBe(true);
    expect(repo.rows[0].status).toBe("skipped");
    expect(repo.rows[0].error_code).toBe("assignment_changed");
  });

  it("keeps customer notification activation disabled independently", async () => {
    process.env.CUSTOMER_EMAIL_ENABLED = "false";
    process.env.CUSTOMER_SMS_ENABLED = "false";
    const repo = new MemoryNotificationRepo();
    const service = new LeadNotificationService(repo, new ConsoleNotificationProvider("success"));
    await service.createAssignmentNotification(context());
    expect(repo.rows[0].recipient_type).toBe("agent");
  });

  it("keeps agent SMS readiness gated independently from email", async () => {
    process.env.AGENT_SMS_NOTIFICATIONS_ENABLED = "false";
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("success");
    const spy = vi.spyOn(provider, "send");
    const service = new LeadNotificationService(repo, provider);

    const result = await service.createAssignmentNotification(context(), "sms");

    expect(result.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    expect(repo.rows[0].channel).toBe("sms");
    expect(repo.rows[0].status).toBe("skipped");
    expect(repo.rows[0].error_code).toBe("agent_sms_notifications_disabled");
  });
});
