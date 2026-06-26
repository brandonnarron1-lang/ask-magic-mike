/**
 * Reliability tests for POST /api/webhooks/email/events.
 *
 * Invariants:
 *   1. Always returns 200 (prevents provider retry loops).
 *   2. DB failures must be logged — never swallowed silently.
 *   3. Compliance flag failure on bounce/complaint must be visible in logs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const messageDeliveriesUpdateMock = vi.fn();
const messageDeliveriesSelectMock = vi.fn();
const complianceFlagsInsertMock = vi.fn();
const webhookEventsInsertMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "message_deliveries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => messageDeliveriesSelectMock(),
            }),
          }),
          update: () => ({ eq: () => messageDeliveriesUpdateMock() }),
        };
      }
      if (table === "compliance_flags") return { insert: (...a: unknown[]) => complianceFlagsInsertMock(...a) };
      if (table === "webhook_events") return { insert: (...a: unknown[]) => webhookEventsInsertMock(...a) };
      return {};
    },
  }),
}));

vi.mock("@/lib/analytics/ledger", () => ({ trackEventNoWait: vi.fn() }));

vi.mock("@/lib/adapters/email-webhook-normalizer", () => ({
  normalizeEmailEvent: (payload: Record<string, unknown>) => ({
    eventType: (payload.event as string) ?? "delivered",
    provider: "mock",
    providerMessageId: (payload.message_id as string) ?? "msg-123",
  }),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.ADMIN_SECRET = "test-secret";
});

import { POST } from "@/app/api/webhooks/email/events/route";

function makeRequest(body: Record<string, unknown> = { event: "delivered", message_id: "msg-123" }) {
  return new NextRequest("http://localhost/api/webhooks/email/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": "test-secret",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/email/events — DB reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageDeliveriesSelectMock.mockResolvedValue({ data: { id: "del-1", lead_id: "lead-123" }, error: null });
    messageDeliveriesUpdateMock.mockResolvedValue({ error: null });
    complianceFlagsInsertMock.mockResolvedValue({ error: null });
    webhookEventsInsertMock.mockResolvedValue({ error: null });
  });

  it("returns 200 ok:true on happy path", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.ok).toBe(true);
  });

  it("still returns 200 and logs error when message_deliveries.update fails", async () => {
    messageDeliveriesUpdateMock.mockResolvedValue({ error: { message: "timeout" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("still returns 200 and logs error when webhook_events.insert fails", async () => {
    webhookEventsInsertMock.mockResolvedValue({ error: { message: "table missing" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs error when compliance_flags.insert fails on bounce event", async () => {
    complianceFlagsInsertMock.mockResolvedValue({ error: { message: "constraint" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ event: "bounced", message_id: "msg-123" }));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
