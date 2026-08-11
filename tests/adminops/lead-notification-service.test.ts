import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsoleNotificationProvider,
  DisabledNotificationProvider,
  ResendEmailNotificationProvider,
  resolveSandboxEmailRecipient,
  selectNotificationProvider,
} from "../../app/lib/leadNotificationProvider";
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

  async claimForProcessing(id: string, patch: Partial<LeadNotificationRecord>) {
    const index = this.rows.findIndex((row) => (
      row.id === id &&
      ["pending", "failed", "retry_scheduled"].includes(row.status)
    ));
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

class LostClaimNotificationRepo extends MemoryNotificationRepo {
  async claimForProcessing(id: string, _patch: Partial<LeadNotificationRecord>) {
    await this.update(id, { status: "processing" });
    return null;
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
  delete (process.env as Record<string, string | undefined>).AGENT_NOTIFICATION_SANDBOX_EMAIL;
  delete (process.env as Record<string, string | undefined>).AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS;
  delete (process.env as Record<string, string | undefined>).AGENT_NOTIFICATION_FROM_EMAIL;
  delete (process.env as Record<string, string | undefined>).LEAD_NOTIFICATION_PRODUCTION_ENABLED;
  delete (process.env as Record<string, string | undefined>).RESEND_API_KEY;
  delete (process.env as Record<string, string | undefined>).FROM_EMAIL;
  delete (process.env as Record<string, string | undefined>).VERCEL_ENV;
  delete (process.env as Record<string, string | undefined>).DATABASE_ENV;
  delete (process.env as Record<string, string | undefined>).PREVIEW_DATA_MODE;
  delete (process.env as Record<string, string | undefined>).ALLOW_PREVIEW_DB_MUTATION;
});

function resendResponse(status: number, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("LeadNotificationService", () => {
  it("refuses notification creation, processing, and retry in Preview read-only mode before provider calls", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("success");
    const spy = vi.spyOn(provider, "send");
    const service = new LeadNotificationService(repo, provider);
    await repo.create({
      lead_id: LEAD_ID,
      agent_id: AGENT_ID,
      notification_type: "agent_assignment",
      channel: "email",
      recipient_type: "agent",
      recipient_reference: "email_configured",
      template_version: "agent_assignment_email_v1",
      idempotency_key: "preview-retry",
      status: "failed",
      max_attempts: 3,
    });

    await expect(service.createAssignmentNotification(context())).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    await expect(service.processNotification("notification-1", context())).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    await expect(service.retryNotification("notification-1", context())).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    expect(spy).not.toHaveBeenCalled();
  });

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

  it("does not call the provider when another worker already claimed the event", async () => {
    const repo = new MemoryNotificationRepo();
    const provider = new ConsoleNotificationProvider("success");
    const spy = vi.spyOn(provider, "send");
    const service = new LeadNotificationService(repo, provider);

    await repo.create({
      lead_id: LEAD_ID,
      agent_id: AGENT_ID,
      notification_type: "agent_assignment",
      channel: "email",
      recipient_type: "agent",
      template_version: "agent_assignment_email_v1",
      idempotency_key: "lead_assignment:claimed",
      status: "processing",
      max_attempts: 3,
    });

    const result = await service.processNotification("notification-1", context());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("notification_not_processable");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not call the provider when a concurrent claim wins first", async () => {
    const repo = new LostClaimNotificationRepo();
    const provider = new ConsoleNotificationProvider("success");
    const spy = vi.spyOn(provider, "send");
    const service = new LeadNotificationService(repo, provider);

    await repo.create({
      lead_id: LEAD_ID,
      agent_id: AGENT_ID,
      notification_type: "agent_assignment",
      channel: "email",
      recipient_type: "agent",
      template_version: "agent_assignment_email_v1",
      idempotency_key: "lead_assignment:lost_claim",
      status: "pending",
      max_attempts: 3,
    });

    const result = await service.processNotification("notification-1", context());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toBe("notification_already_claimed");
    expect(repo.rows[0].status).toBe("processing");
    expect(spy).not.toHaveBeenCalled();
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

  it("keeps missing provider mode fail-closed instead of activating external delivery", async () => {
    delete (process.env as Record<string, string | undefined>).LEAD_NOTIFICATION_MODE;
    expect(selectNotificationProvider()).toBeInstanceOf(DisabledNotificationProvider);
  });

  it("keeps explicit console mode on the no-delivery console provider", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "console";
    expect(selectNotificationProvider()).toBeInstanceOf(ConsoleNotificationProvider);
  });

  it("requires a configured sandbox recipient before provider-compatible sandbox delivery", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-1" }));
    const provider = new ResendEmailNotificationProvider("sandbox", transport as typeof fetch);

    const result = await provider.send({
      notificationId: "notification-1",
      channel: "email",
      recipient: "agent@example.test",
      subject: "Test",
      text: "Test body",
      idempotencyKey: "idem-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("missing_sandbox_recipient");
    expect(transport).not.toHaveBeenCalled();
  });

  it("replaces the real recipient with the allowlisted sandbox recipient", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-2" }));
    const provider = new ResendEmailNotificationProvider("sandbox", transport as typeof fetch);

    const result = await provider.send({
      notificationId: "notification-2",
      channel: "email",
      recipient: "real.agent@real.example",
      subject: "Test",
      text: "Test body",
      html: "<p>Test body</p>",
      idempotencyKey: "idem-2",
    });

    expect(result).toEqual({ ok: true, provider: "resend_sandbox", providerMessageId: "sandbox-msg-2" });
    expect(transport).toHaveBeenCalledTimes(1);
    const [, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init?.body));
    expect(body.to).toBe("sandbox@example.test");
    expect(JSON.stringify(body)).not.toContain("real.agent@real.example");
  });

  it("rejects non-allowlisted sandbox recipients before transport invocation", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@not-allowed.example";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-3" }));
    const provider = new ResendEmailNotificationProvider("sandbox", transport as typeof fetch);

    const result = await provider.send({
      notificationId: "notification-3",
      channel: "email",
      recipient: "agent@example.test",
      text: "Test body",
      idempotencyKey: "idem-3",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("sandbox_recipient_not_allowlisted");
    expect(resolveSandboxEmailRecipient().ok).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });

  it("requires explicit production activation before the production provider can call transport", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "production";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "prod-msg-1" }));
    const provider = new ResendEmailNotificationProvider("production", transport as typeof fetch);

    const result = await provider.send({
      notificationId: "notification-4",
      channel: "email",
      recipient: "agent@example.test",
      text: "Test body",
      idempotencyKey: "idem-4",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("production_provider_disabled");
    expect(transport).not.toHaveBeenCalled();
  });

  it("fails closed when provider credentials are missing", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-4" }));
    const provider = new ResendEmailNotificationProvider("sandbox", transport as typeof fetch);

    const result = await provider.send({
      notificationId: "notification-5",
      channel: "email",
      recipient: "agent@example.test",
      text: "Test body",
      idempotencyKey: "idem-5",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("missing_provider_config");
    expect(transport).not.toHaveBeenCalled();
  });

  it("persists safe provider message IDs from sandbox provider success", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
    const repo = new MemoryNotificationRepo();
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-5" }));
    const service = new LeadNotificationService(repo, new ResendEmailNotificationProvider("sandbox", transport as typeof fetch));

    const result = await service.createAssignmentNotification(context());

    expect(result.ok).toBe(true);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].status).toBe("sent");
    expect(repo.rows[0].provider).toBe("resend_sandbox");
    expect(repo.rows[0].provider_message_id).toBe("sandbox-msg-5");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("maps retryable and permanent provider failures through the existing outbox states", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";

    const retryRepo = new MemoryNotificationRepo();
    const retryTransport = vi.fn(async () => resendResponse(429, { message: "rate limited agent@example.test +15555550123" }));
    const retryResult = await new LeadNotificationService(
      retryRepo,
      new ResendEmailNotificationProvider("sandbox", retryTransport as typeof fetch),
    ).createAssignmentNotification(context({ assignmentAuditId: "retry-audit-id" }));
    expect(retryResult.ok).toBe(true);
    expect(retryRepo.rows[0].status).toBe("retry_scheduled");
    expect(retryRepo.rows[0].error_summary).not.toContain("agent@example.test");
    expect(retryRepo.rows[0].error_summary).not.toContain("+15555550123");

    const permanentRepo = new MemoryNotificationRepo();
    const permanentTransport = vi.fn(async () => resendResponse(422, { message: "invalid recipient agent@example.test +15555550123" }));
    const permanentResult = await new LeadNotificationService(
      permanentRepo,
      new ResendEmailNotificationProvider("sandbox", permanentTransport as typeof fetch),
    ).createAssignmentNotification(context({ assignmentAuditId: "permanent-audit-id" }));
    expect(permanentResult.ok).toBe(true);
    expect(permanentRepo.rows[0].status).toBe("permanently_failed");
    expect(permanentRepo.rows[0].error_summary).not.toContain("agent@example.test");
    expect(permanentRepo.rows[0].error_summary).not.toContain("+15555550123");
  });

  it("does not log recipients, credentials, or message bodies in sandbox provider mode", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = new ResendEmailNotificationProvider("sandbox", vi.fn(async () => resendResponse(200, { id: "sandbox-msg-6" })) as typeof fetch);

    await provider.send({
      notificationId: "notification-6",
      channel: "email",
      recipient: "agent@example.test",
      subject: "Secret-free subject",
      text: "Message body should not be logged",
      idempotencyKey: "idem-6",
    });

    const output = JSON.stringify([...info.mock.calls, ...error.mock.calls]);
    expect(output).not.toContain("agent@example.test");
    expect(output).not.toContain("sandbox@example.test");
    expect(output).not.toContain("test_resend_key");
    expect(output).not.toContain("Message body should not be logged");
    info.mockRestore();
    error.mockRestore();
  });

  it("fails closed for omitted or invalid direct provider construction modes", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "production";
    process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED = "true";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "prod-msg-omitted" }));

    const omitted = await new (ResendEmailNotificationProvider as unknown as new (
      mode?: "sandbox" | "production",
      transport?: typeof fetch,
    ) => ResendEmailNotificationProvider)(undefined, transport as typeof fetch).send({
      notificationId: "notification-7",
      channel: "email",
      recipient: "agent@example.test",
      text: "Test body",
      idempotencyKey: "idem-7",
    });

    const invalid = await new (ResendEmailNotificationProvider as unknown as new (
      mode?: string,
      transport?: typeof fetch,
    ) => ResendEmailNotificationProvider)("preview", transport as typeof fetch).send({
      notificationId: "notification-8",
      channel: "email",
      recipient: "agent@example.test",
      text: "Test body",
      idempotencyKey: "idem-8",
    });

    expect(omitted.ok).toBe(false);
    if (!omitted.ok) expect(omitted.errorCode).toBe("provider_mode_invalid");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errorCode).toBe("provider_mode_invalid");
    expect(transport).not.toHaveBeenCalled();
  });

  it("normalizes provider mode safely and keeps invalid legacy modes disabled", () => {
    delete (process.env as Record<string, string | undefined>).LEAD_NOTIFICATION_MODE;
    delete (process.env as Record<string, string | undefined>).NOTIFICATION_PROVIDER_MODE;
    expect(selectNotificationProvider()).toBeInstanceOf(DisabledNotificationProvider);

    process.env.LEAD_NOTIFICATION_MODE = "";
    expect(selectNotificationProvider()).toBeInstanceOf(DisabledNotificationProvider);

    process.env.LEAD_NOTIFICATION_MODE = "not-a-mode";
    expect(selectNotificationProvider()).toBeInstanceOf(DisabledNotificationProvider);

    process.env.LEAD_NOTIFICATION_MODE = "SANDBOX";
    expect(selectNotificationProvider()).toBeInstanceOf(ResendEmailNotificationProvider);

    delete (process.env as Record<string, string | undefined>).LEAD_NOTIFICATION_MODE;
    process.env.NOTIFICATION_PROVIDER_MODE = "console";
    expect(selectNotificationProvider()).toBeInstanceOf(ConsoleNotificationProvider);
  });

  it("fails closed for missing, empty, malformed, or deceptive sandbox allowlists and recipients", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-edge" }));
    const provider = new ResendEmailNotificationProvider("sandbox", transport as typeof fetch);

    const cases: Array<{ recipient: string; allowlist?: string; code: string }> = [
      { recipient: "sandbox@example.test", allowlist: undefined, code: "missing_sandbox_allowlist" },
      { recipient: "sandbox@example.test", allowlist: " , ", code: "empty_sandbox_allowlist" },
      { recipient: "sandbox@example.test", allowlist: "*", code: "invalid_sandbox_allowlist" },
      { recipient: "sandbox@.example.test", allowlist: "example.test", code: "invalid_sandbox_recipient" },
      { recipient: "sandbox@example.test.", allowlist: "example.test", code: "invalid_sandbox_recipient" },
      { recipient: "sandbox@example.test,other@example.test", allowlist: "example.test", code: "invalid_sandbox_recipient" },
      { recipient: "sandbox@example.test;other@example.test", allowlist: "example.test", code: "invalid_sandbox_recipient" },
      { recipient: "Sandbox <sandbox@example.test>", allowlist: "example.test", code: "invalid_sandbox_recipient" },
      { recipient: "sandbox@example.test\nbcc:other@example.test", allowlist: "example.test", code: "invalid_sandbox_recipient" },
      { recipient: "sandbox@example.test.attacker.invalid", allowlist: "example.test", code: "sandbox_recipient_not_allowlisted" },
    ];

    for (const item of cases) {
      process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = item.recipient;
      if (item.allowlist === undefined) {
        delete (process.env as Record<string, string | undefined>).AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS;
      } else {
        process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = item.allowlist;
      }
      const result = await provider.send({
        notificationId: "notification-edge",
        channel: "email",
        recipient: "agent@example.test",
        text: "Test body",
        idempotencyKey: `idem-${item.code}`,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errorCode).toBe(item.code);
    }

    expect(transport).not.toHaveBeenCalled();
  });

  it("allows exact, subdomain, uppercase, whitespace, and multiple-domain sandbox allowlist matches", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = " example.test, other.test ";
    const transport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-domain" }));
    const provider = new ResendEmailNotificationProvider("sandbox", transport as typeof fetch);

    for (const recipient of ["sandbox@EXAMPLE.TEST", "sandbox@mail.example.test", "sandbox@other.test"]) {
      process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = recipient;
      const result = await provider.send({
        notificationId: "notification-domain",
        channel: "email",
        recipient: "agent@example.test",
        text: "Test body",
        idempotencyKey: `idem-${recipient}`,
      });
      expect(result.ok).toBe(true);
    }

    expect(transport).toHaveBeenCalledTimes(3);
    for (const call of transport.mock.calls) {
      const [, init] = call as unknown as [string, RequestInit];
      expect(String(init.body)).not.toContain("agent@example.test");
    }
  });

  it("classifies Resend status codes without retrying permanent authorization or request failures", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";

    for (const status of [408, 409, 425, 429, 500, 503]) {
      const result = await new ResendEmailNotificationProvider(
        "sandbox",
        vi.fn(async () => resendResponse(status)) as typeof fetch,
      ).send({
        notificationId: `notification-${status}`,
        channel: "email",
        recipient: "agent@example.test",
        text: "Test body",
        idempotencyKey: `idem-${status}`,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.retryable).toBe(true);
    }

    for (const status of [400, 401, 403, 422]) {
      const result = await new ResendEmailNotificationProvider(
        "sandbox",
        vi.fn(async () => resendResponse(status)) as typeof fetch,
      ).send({
        notificationId: `notification-${status}`,
        channel: "email",
        recipient: "agent@example.test",
        text: "Test body",
        idempotencyKey: `idem-${status}`,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.retryable).toBe(false);
    }
  });

  it("sanitizes sender, subject, and provider message IDs at the transport boundary", async () => {
    process.env.LEAD_NOTIFICATION_MODE = "sandbox";
    process.env.AGENT_NOTIFICATIONS_ENABLED = "true";
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.AGENT_NOTIFICATION_SANDBOX_EMAIL = "sandbox@example.test";
    process.env.AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS = "example.test";

    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test\nbcc:other@example.test";
    const invalidSenderTransport = vi.fn(async () => resendResponse(200, { id: "sandbox-msg-invalid" }));
    const invalidSender = await new ResendEmailNotificationProvider("sandbox", invalidSenderTransport as typeof fetch).send({
      notificationId: "notification-invalid-sender",
      channel: "email",
      recipient: "agent@example.test",
      text: "Test body",
      idempotencyKey: "idem-invalid-sender",
    });
    expect(invalidSender.ok).toBe(false);
    if (!invalidSender.ok) expect(invalidSender.errorCode).toBe("missing_provider_config");
    expect(invalidSenderTransport).not.toHaveBeenCalled();

    process.env.AGENT_NOTIFICATION_FROM_EMAIL = "alerts@example.test";
    const transport = vi.fn(async () => resendResponse(200, { id: "bad id with spaces and @ symbol" }));
    const result = await new ResendEmailNotificationProvider("sandbox", transport as typeof fetch).send({
      notificationId: "notification-subject",
      channel: "email",
      recipient: "agent@example.test",
      subject: "Hello\r\nbcc: hidden@example.test",
      text: "Test body",
      idempotencyKey: "idem-subject",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerMessageId).toBeUndefined();
    const [, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.subject).toBe("Hello bcc: hidden@example.test");
  });
});
