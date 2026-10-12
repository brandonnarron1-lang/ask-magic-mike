import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendOwnerRequestedQaReviewCopy, type LeadAlertInput } from "../../app/lib/leadAlertService";
import type { LeadNotificationCreateInput, LeadNotificationRecord, LeadNotificationRepository, NotificationProvider, NotificationRequest } from "../../app/lib/leadNotificationTypes";

const originalId = "00000000-0000-4000-8000-000000000001";
const leadId = "00000000-0000-4000-8000-000000000002";
const key = `qa_review_copy:${originalId}:lead_alert_email_v4`;
const original: LeadNotificationRecord = {
  id: originalId, lead_id: leadId, agent_id: null, assignment_audit_id: null,
  assignment_event_at: null, notification_type: "lead_alert", channel: "email",
  recipient_type: "internal", recipient_reference: "email_configured",
  template_version: "lead_alert_email_v3", idempotency_key: "synthetic-original-key",
  status: "sent", attempt_count: 1, max_attempts: 3, provider: "isolated-mock",
  provider_message_id: "synthetic-original-provider", error_code: null, error_summary: null,
  next_attempt_at: null, created_at: "2026-10-09T12:49:40Z", updated_at: "2026-10-09T12:49:40Z",
  sent_at: "2026-10-09T12:49:40Z", failed_at: null, metadata: { is_test: true },
};
const input: LeadAlertInput = {
  leadId, sessionId: "synthetic-session", correlationId: "synthetic-correlation",
  payload: { funnel_type: "renter", name: "INTERNAL QA — DO NOT CONTACT", is_test: true,
    question: "SYNTHETIC UNIT FIXTURE ONLY", city: "Wilson", timeline: "3",
    lead_source_surface: "renter_page", attribution: {}, status: "new", assigned_agent_id: null },
  score: { score: 23, grade: "new", version: "deterministic_v1", factors: [], explanation: "Synthetic" },
  routing: { owner: "mike", sourceLabel: "ourtownproperties", intentLabel: "Renter-to-Homeownership", routingReason: "synthetic" },
  submittedAt: "2026-10-09T12:49:40Z", communicationSuppressed: true, emailSuppressed: true,
};

// In-memory repository is a unit double, not evidence of PostgreSQL transactions
// or hosted exactly-once delivery. Accepted PostgreSQL contracts remain inherited.
function memoryRepository() {
  const records = new Map<string, LeadNotificationRecord>([[originalId, structuredClone(original)]]);
  const findById = vi.fn(async (id: string) => records.get(id) || null);
  const findByIdempotencyKey = vi.fn(async (idempotencyKey: string) =>
    [...records.values()].find(row => row.idempotency_key === idempotencyKey) || null);
  const update = vi.fn(async (id: string, patch: Partial<LeadNotificationRecord>) => {
    const current = records.get(id); if (!current) return null;
    const next = { ...current, ...patch }; records.set(id, next); return next;
  });
  const create = vi.fn(async (value: LeadNotificationCreateInput) => {
    const existing = [...records.values()].find(row => row.idempotency_key === value.idempotency_key);
    if (existing) return existing;
    const next: LeadNotificationRecord = { ...structuredClone(original), ...value,
      id: "00000000-0000-4000-8000-000000000003", assignment_audit_id: null,
      assignment_event_at: null, recipient_reference: value.recipient_reference || null,
      status: value.status || "pending", attempt_count: 0, max_attempts: value.max_attempts || 3,
      provider: value.provider || null, provider_message_id: null, sent_at: null,
      metadata: value.metadata || {} };
    records.set(next.id, next); return next;
  });
  const claimForProcessing = vi.fn(async (id: string, patch: Partial<LeadNotificationRecord>) => {
    const current = records.get(id);
    if (!current || !["pending", "failed", "retry_scheduled"].includes(current.status)
      || current.provider_message_id) return null;
    const next = { ...current, ...patch }; records.set(id, next); return next;
  });
  const repository: LeadNotificationRepository = { findById, findByIdempotencyKey, update, create, claimForProcessing,
    listRecent: async () => [], listByLead: async () => [], listRetryable: async () => [] };
  return { records, repository, create, update, claimForProcessing };
}

describe("existing single-copy service — synthetic fixtures/mocked delivery only", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "development"); vi.stubEnv("DATABASE_ENV", "");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "operator@example.test");
    vi.stubEnv("LEAD_NOTIFICATION_BCC", "audit@example.test");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("external_network_forbidden"); }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  const provider = () => ({ name: "isolated-mock", send: vi.fn(async (_request: NotificationRequest) =>
    ({ ok: true as const, provider: "isolated-mock", providerMessageId: "synthetic-review-provider" })) });

  it("concurrent/repeated commands retain one v4 intent and one mocked provider call", async () => {
    const db = memoryRepository(); const delivery = provider();
    const dependencies = { repository: db.repository, provider: delivery,
      loadInput: async () => structuredClone(input) };
    const before = JSON.stringify(db.records.get(originalId));
    await Promise.all(Array.from({ length: 5 }, () => sendOwnerRequestedQaReviewCopy(originalId, dependencies)));
    const again = await sendOwnerRequestedQaReviewCopy(originalId, dependencies);
    expect(again.notification).toMatchObject({ status: "sent", template_version: "lead_alert_email_v4", max_attempts: 1, attempt_count: 1, idempotency_key: key });
    expect(delivery.send).toHaveBeenCalledOnce(); expect(db.records.size).toBe(2);
    expect(JSON.stringify(db.records.get(originalId))).toBe(before);
    expect(delivery.send.mock.calls[0][0]).toMatchObject({ channel: "email", recipient: "operator@example.test", bcc: ["audit@example.test"], idempotencyKey: key });
    expect(delivery.send.mock.calls[0][0].text).toContain("QA TEST — DO NOT CONTACT");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["pending", "processing", "failed", "skipped", "permanently_failed", "sent"] as const)("preserves an existing %s copy without another provider attempt", async status => {
    const db = memoryRepository(); const delivery = provider();
    db.records.set("copy", { ...original, id: "copy", status, idempotency_key: key,
      template_version: "lead_alert_email_v4", max_attempts: 1 });
    const before = JSON.stringify([...db.records.values()]);
    await sendOwnerRequestedQaReviewCopy(originalId, { repository: db.repository, provider: delivery, loadInput: async () => input });
    expect(JSON.stringify([...db.records.values()])).toBe(before);
    expect(db.create).not.toHaveBeenCalled(); expect(delivery.send).not.toHaveBeenCalled();
  });
  it("retains a failed copy and original evidence without retrying", async () => {
    const db = memoryRepository(); const send = vi.fn(async () => ({ ok: false as const, provider: "isolated-mock", retryable: true, errorCode: "synthetic_failure", errorSummary: "Synthetic failure" }));
    const dependencies = { repository: db.repository, provider: { name: "isolated-mock", send }, loadInput: async () => input };
    const result = await sendOwnerRequestedQaReviewCopy(originalId, dependencies);
    expect(result.notification).toMatchObject({ status: "permanently_failed", attempt_count: 1, max_attempts: 1 });
    await sendOwnerRequestedQaReviewCopy(originalId, dependencies);
    expect(send).toHaveBeenCalledOnce(); expect(db.records.size).toBe(2);
    expect(db.records.get(originalId)).toEqual(original);
  });
  it("keeps an unknown provider outcome processing and never launches another call", async () => {
    const db = memoryRepository(); const send = vi.fn(async () => { throw new Error("synthetic_transport_timeout"); });
    const dependencies = { repository: db.repository, provider: { name: "isolated-mock", send } as NotificationProvider, loadInput: async () => input };
    await expect(sendOwnerRequestedQaReviewCopy(originalId, dependencies)).rejects.toThrow("synthetic_transport_timeout");
    expect((await db.repository.findByIdempotencyKey(key))?.status).toBe("processing");
    await sendOwnerRequestedQaReviewCopy(originalId, dependencies); expect(send).toHaveBeenCalledOnce();
  });
  it.each(["is_test", "communicationSuppressed", "emailSuppressed"])("does not create/send with missing %s evidence", async field => {
    const db = memoryRepository(); const delivery = provider(); const unsafe = structuredClone(input);
    if (field === "is_test") unsafe.payload.is_test = false;
    else if (field === "communicationSuppressed") unsafe.communicationSuppressed = false;
    else unsafe.emailSuppressed = false;
    expect((await sendOwnerRequestedQaReviewCopy(originalId, { repository: db.repository, provider: delivery, loadInput: async () => unsafe })).error).toBe("qa_review_requires_suppressed_test");
    expect(db.create).not.toHaveBeenCalled(); expect(delivery.send).not.toHaveBeenCalled();
  });
  it("rejects an ineligible source and a Preview venue before creating a copy", async () => {
    const db = memoryRepository(); const delivery = provider();
    db.records.set(originalId, { ...original, template_version: "lead_alert_email_v4" });
    const dependencies = { repository: db.repository, provider: delivery, loadInput: async () => input };
    expect((await sendOwnerRequestedQaReviewCopy(originalId, dependencies)).error).toBe("qa_review_source_not_eligible");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await sendOwnerRequestedQaReviewCopy(originalId, dependencies)).error).toBe("qa_review_delivery_not_ready");
    expect(db.create).not.toHaveBeenCalled(); expect(delivery.send).not.toHaveBeenCalled();
  });
});
