/**
 * Reliability tests for POST /api/webhooks/sms/inbound.
 *
 * Invariants:
 *   1. Always returns 200 to the provider (prevents Twilio retry loops).
 *   2. DB failures must be logged via console.error — never swallowed silently.
 *   3. STOP-handling compliance failure must be logged with high visibility.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const messagesInsertMock = vi.fn();
const complianceFlagsInsertMock = vi.fn();
const webhookEventsInsertMock = vi.fn();
const leadsSelectMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: () => leadsSelectMock() }),
              }),
            }),
          }),
        };
      }
      if (table === "messages") return { insert: (...a: unknown[]) => messagesInsertMock(...a) };
      if (table === "compliance_flags") return { insert: (...a: unknown[]) => complianceFlagsInsertMock(...a) };
      if (table === "webhook_events") return { insert: (...a: unknown[]) => webhookEventsInsertMock(...a) };
      return {};
    },
  }),
}));

vi.mock("@/lib/analytics/ledger", () => ({ trackEventNoWait: vi.fn() }));
vi.mock("@/lib/adapters/twilio-signature", () => ({
  verifyTwilioSignature: () => ({ ok: true }),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.ADMIN_SECRET = "test-secret";
});

import { POST } from "@/app/api/webhooks/sms/inbound/route";

function makeRequest(body: Record<string, unknown> = { from: "+19195550101", body: "Hello" }) {
  return new NextRequest("http://localhost/api/webhooks/sms/inbound", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": "test-secret",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/sms/inbound — DB reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadsSelectMock.mockResolvedValue({ data: { id: "lead-123" }, error: null });
    messagesInsertMock.mockResolvedValue({ error: null });
    complianceFlagsInsertMock.mockResolvedValue({ error: null });
    webhookEventsInsertMock.mockResolvedValue({ error: null });
  });

  it("returns 200 ok:true on happy path", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.ok).toBe(true);
  });

  it("still returns 200 and logs error when messages.insert fails", async () => {
    messagesInsertMock.mockResolvedValue({ error: { message: "constraint violation" } });
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

  it("logs error and still returns 200 when compliance_flags.insert fails on STOP keyword", async () => {
    complianceFlagsInsertMock.mockResolvedValue({ error: { message: "DB timeout" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ from: "+19195550101", body: "STOP" }));
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.stop_handled).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
