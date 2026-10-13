// @vitest-environment node
// Scripted repository/provider only. Actual SQL claim/lease proof is opt-in PG.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../../src/lib/preview-security", async original => ({ ...await original<object>(), assertProviderDeliveryAllowed: () => ({ ok: true }) }));
import { dispatchLaunchAlertEnvelope, processNewLaunchAlerts } from "../../app/lib/leadAlertService";
import { normalizeLeadNotificationRow } from "../../app/lib/persistence/supabase/leadNotificationRepository";
import type { LeadNotificationStatus, NotificationRequest } from "../../app/lib/leadNotificationTypes";
import { LAUNCH_LEAD_ALERT_TEMPLATE_VERSION, launchEnvelopeKey, type FrozenLaunchAlert } from "../../app/lib/leadAlertLaunch";
const id = "00000000-0000-4000-8000-000000000001";
const cutoff = "2026-10-13T18:11:00.000Z";
const record = () => normalizeLeadNotificationRow({ id, lead_id: id, notification_type: "lead_alert", channel: "email", recipient_type: "internal",
  template_version: LAUNCH_LEAD_ALERT_TEMPLATE_VERSION, idempotency_key: launchEnvelopeKey(id, "mike"), status: "pending", attempt_count: 0, max_attempts: 3 });
const snapshot = (): FrozenLaunchAlert => ({ version: 1, template_version: LAUNCH_LEAD_ALERT_TEMPLATE_VERSION, launch_cutoff: cutoff,
  operator: "mike", recipient: "mike@example.test", from: "Our Town <sender@example.test>", subject: "Synthetic fixture",
  text: "Frozen synthetic inquiry", html: "<p>Frozen synthetic inquiry</p>", inquiry_id: id, session_id: id,
  submitted: {}, is_test: false, qa_initial_authorized: false });
function dependencies() {
  const envelope = { notification: record(), snapshot: snapshot(), firstProviderAttemptAt: new Date().toISOString() };
  const repository = { findLaunchEnvelope: vi.fn(async () => envelope), claimLaunchEnvelope: vi.fn(async () => ({ ...envelope, notification: { ...envelope.notification, status: "processing" as const, attempt_count: 1 } })),
    finishLaunchAttempt: vi.fn(async (_id: string, patch: { status: string }) => ({ ...envelope.notification, status: patch.status as LeadNotificationStatus })),
    findById: vi.fn(async () => envelope.notification), listLaunchDue: vi.fn(async () => [envelope.notification]),
    holdExpiredLaunchEnvelopes: vi.fn(async () => undefined), acquireLaunchBatch: vi.fn(async () => id as string | null), releaseLaunchBatch: vi.fn(async () => undefined) };
  const provider = { name: "resend", send: vi.fn(async (_request: NotificationRequest) => ({ ok: true as const, provider: "resend", providerMessageId: "synthetic-receipt" })) };
  return { repository, provider, envelope };
}
beforeEach(() => {
  for (const [key, value] of Object.entries({ LEAD_NOTIFICATION_MODE: "production", EMAIL_ENABLED: "true", LEAD_NOTIFICATION_PRODUCTION_ENABLED: "true",
    EMAIL_PROVIDER: "resend", RESEND_API_KEY: "synthetic-no-key", RESEND_FROM: "Our Town <sender@example.test>",
    LEAD_ALERT_V6_ENABLED: "true", LEAD_ALERT_V6_WORKER_ENABLED: "true", LEAD_ALERT_V6_CUTOFF: cutoff })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
it("delivers the captured envelope, not current contact/configuration or BCC", async () => {
  const d = dependencies(); await dispatchLaunchAlertEnvelope(id, { initial: true }, d);
  expect(d.provider.send).toHaveBeenCalledWith(expect.objectContaining({ recipient: "mike@example.test", text: d.envelope.snapshot.text, frozenFrom: d.envelope.snapshot.from, idempotencyKey: launchEnvelopeKey(id, "mike") }));
  expect(d.provider.send.mock.calls[0][0]).not.toHaveProperty("bcc");
  expect(d.repository.finishLaunchAttempt).toHaveBeenCalledWith(id, expect.objectContaining({ status: "sent", providerMessageId: "synthetic-receipt" }));
});
it.each(["processing", "sent"] as const)("never claims an already %s envelope", async status => {
  const d = dependencies(); d.envelope.notification.status = status;
  await dispatchLaunchAlertEnvelope(id, { initial: true }, d); expect(d.repository.claimLaunchEnvelope).not.toHaveBeenCalled(); expect(d.provider.send).not.toHaveBeenCalled();
});
it("excludes QA from automated recovery even if its initial send was authorized", async () => {
  const d = dependencies(); d.envelope.snapshot.is_test = true; d.envelope.snapshot.qa_initial_authorized = true;
  await dispatchLaunchAlertEnvelope(id, {}, d); expect(d.repository.claimLaunchEnvelope).not.toHaveBeenCalled(); expect(d.provider.send).not.toHaveBeenCalled();
});
it("does no work when another batch owns the lease", async () => {
  const d = dependencies(); d.repository.acquireLaunchBatch.mockResolvedValue(null);
  expect(await processNewLaunchAlerts(100, d)).toEqual([]); expect(d.repository.listLaunchDue).not.toHaveBeenCalled(); expect(d.provider.send).not.toHaveBeenCalled();
});
it("bounds selection and carries the lease into each claim, releasing it afterward", async () => {
  const d = dependencies(); await processNewLaunchAlerts(100, d);
  expect(d.repository.listLaunchDue).toHaveBeenCalledWith(cutoff, 4);
  expect(d.repository.claimLaunchEnvelope).toHaveBeenCalledWith(id, cutoff, false, id);
  expect(d.repository.releaseLaunchBatch).toHaveBeenCalledWith(id);
});
it("releases the batch lease even when selection fails", async () => {
  const d = dependencies(); d.repository.listLaunchDue.mockRejectedValue(new Error("synthetic-query-failure"));
  await expect(processNewLaunchAlerts(4, d)).rejects.toThrow("synthetic-query-failure"); expect(d.repository.releaseLaunchBatch).toHaveBeenCalledWith(id); expect(d.provider.send).not.toHaveBeenCalled();
});
