// @vitest-environment node
// Mock transport/query only; real fenced SQL is a separate opt-in suite.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processRequestResponses, readResponseSnapshot } from "../../app/lib/requestResponseService";
import { renderRequestResponse, requestResponseDraft } from "../../app/lib/requestResponseTemplates";
import { normalizeLeadNotificationRow } from "../../app/lib/persistence/supabase/leadNotificationRepository";
import type { NotificationResult } from "../../app/lib/leadNotificationTypes";

beforeEach(() => {
  for (const [key, value] of Object.entries({ REQUEST_RESPONSE_WORKER_ENABLED: "true", REQUEST_RECEIPTS_ENABLED: "true",
    REQUEST_RECEIPTS_ACTIVATED_AT: "2026-11-05T00:00:00.000Z", REQUEST_RECEIPTS_REPLY_TO: "reply@example.test",
    CUSTOMER_EMAIL_ENABLED: "true", LEAD_NOTIFICATION_MODE: "production", LEAD_NOTIFICATION_PRODUCTION_ENABLED: "true",
    EMAIL_ENABLED: "true", EMAIL_PROVIDER: "resend", RESEND_FROM: "Our Town <sender@example.test>", RESEND_API_KEY: "synthetic-not-a-key" })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
function dependencies(result: NotificationResult = { ok: true, provider: "resend", providerMessageId: "synthetic-accepted" }, audience = "customer") {
  const n = { id: "00000000-0000-4000-8000-000000000123", channel: "email", recipient_type: audience === "customer" ? "customer" : "internal",
    idempotency_key: "request_response:fixed-business-event:inquiry:customer", response_claim_token: "00000000-0000-4000-8000-000000000124",
    first_provider_attempt_at: new Date().toISOString(), attempt_count: 1, max_attempts: 3,
    private_response_snapshot: { version: 1, kind: "inquiry", audience, recipient: "contact@example.test", from: "Our Town <sender@example.test>",
      reply_to: "reply@example.test", body: renderRequestResponse("inquiry", "customer", "private-lead") } };
  const query = vi.fn(async (sql: string, _params: unknown[]) => sql.includes("claim_request_response_v1") ? [n] : sql.includes("SELECT id,recipient_type") ? [n] : []);
  const provider = { name: "resend", send: vi.fn(async () => result) };
  return { n, query, sql: { query } as never, provider };
}
describe("purpose-separated request response", () => {
  it("defaults generation/worker OFF with no cutoff, sender fallback or guessed reply-to", () => {
    expect(requestResponseDraft({})).toMatchObject({ receipts: false, cutoff: null, reply_to: null, mike: null, brandon: null });
  });
  it("does not even read the outbox while the kill switch is OFF", async () => {
    vi.stubEnv("REQUEST_RESPONSE_WORKER_ENABLED", "false"); const d = dependencies();
    expect((await processRequestResponses(d)).processed).toBe(0); expect(d.query).not.toHaveBeenCalled();
  });
  it("disabled consumer receipts do not block the separate staff intent", async () => {
    vi.stubEnv("REQUEST_RECEIPTS_ENABLED", "false");
    const customer = dependencies(); await processRequestResponses(customer); expect(customer.provider.send).not.toHaveBeenCalled();
    const internal = dependencies(undefined, "brandon"); await processRequestResponses(internal); expect(internal.provider.send).toHaveBeenCalledTimes(1);
  });
  it("uses immutable sender, body and event key, with no staff link/BCC/PII in a customer receipt", async () => {
    const d = dependencies(); await processRequestResponses(d);
    expect(d.provider.send).toHaveBeenCalledWith(expect.objectContaining({ recipient: "contact@example.test", replyTo: "reply@example.test", frozenFrom: d.n.private_response_snapshot.from, idempotencyKey: d.n.idempotency_key }));
    const sent = d.provider.send.mock.calls[0]; expect(sent).toBeDefined();
    expect(d.n.private_response_snapshot.body.text).not.toContain("private-lead");
    expect(d.n.private_response_snapshot.body.html).not.toContain("/admin/");
    const finish = d.query.mock.calls.find(([sql]) => sql.includes("finish_request_response_v1"))!;
    expect(JSON.parse(String(finish[1][2]))).toMatchObject({ status: "sent", providerMessageId: "synthetic-accepted" });
  });
  it("ambiguous acceptance remains processing/UNKNOWN, not a scheduled resend", async () => {
    const d = dependencies({ ok: false, provider: "resend", retryable: true, ambiguous: true, errorCode: "resend_network_error", errorSummary: "Synthetic" });
    await processRequestResponses(d);
    const finish = d.query.mock.calls.find(([sql]) => sql.includes("finish_request_response_v1"))!;
    expect(JSON.parse(String(finish[1][2]))).toMatchObject({ status: "processing", errorCode: "provider_acceptance_ambiguous" });
    expect(d.provider.send).toHaveBeenCalledTimes(1);
  });
  it("inventory/claim failures perform no provider call", async () => {
    const d = dependencies(); d.query.mockRejectedValue(new Error("synthetic SQL outage"));
    await expect(processRequestResponses(d)).rejects.toThrow("synthetic SQL outage"); expect(d.provider.send).not.toHaveBeenCalled();
  });
  it("normal DTOs never expose the private response body", () => {
    const d = dependencies();
    expect(normalizeLeadNotificationRow(d.n)).not.toHaveProperty("private_response_snapshot");
    expect(readResponseSnapshot({ ...d.n.private_response_snapshot, reply_to: "bad\r\nBcc: injected@example.test" })).toBeNull();
  });
});
