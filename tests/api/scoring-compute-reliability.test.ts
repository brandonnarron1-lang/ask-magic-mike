/**
 * Reliability tests for POST /api/scoring/compute.
 *
 * Verifies that a failed lead_scores upsert returns 500, not 200.
 * Invariant: 200 means the score was computed AND persisted.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const upsertMock   = vi.fn();
const leadSelectMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "lead_scores") return { upsert: (...a: unknown[]) => upsertMock(...a) };
      if (table === "leads") return {
        select: () => ({ eq: () => ({ single: () => leadSelectMock() }) }),
      };
      return {};
    },
  }),
}));

vi.mock("@/lib/analytics/ledger", () => ({ trackEventNoWait: vi.fn() }));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.ADMIN_SECRET = "test-admin-secret";
});

import { POST } from "@/app/api/scoring/compute/route";

const LEAD_ID = "00000000-0000-0000-0000-000000000001";

const MOCK_LEAD = {
  id: LEAD_ID,
  primary_intent: "sell",
  timeline_months: 3,
  question_raw: "What is my home worth?",
  email: "test@example.com",
  phone: "+19195550101",
  address_raw: "123 Main St",
  first_name: "Test",
  last_name: "Lead",
  consent_sms: false,
  consent_call: true,
  consent_email: true,
  cta_chip_used: null,
};

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/scoring/compute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": "test-admin-secret",
    },
    body: JSON.stringify({ leadId: LEAD_ID }),
  });
}

describe("POST /api/scoring/compute — persistence reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadSelectMock.mockResolvedValue({ data: MOCK_LEAD, error: null });
    upsertMock.mockResolvedValue({ error: null });
  });

  it("returns 200 with score when everything succeeds", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leadId).toBe(LEAD_ID);
    expect(body.score).toBeDefined();
  });

  it("returns 500 when lead_scores upsert fails", async () => {
    upsertMock.mockResolvedValue({ error: { message: "relation does not exist" } });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("does NOT return 200 when score persistence fails", async () => {
    upsertMock.mockResolvedValue({ error: { message: "timeout" } });
    const res = await POST(makeRequest());
    expect(res.status).not.toBe(200);
  });

  it("returns 404 when lead is not found", async () => {
    leadSelectMock.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns 503 when Supabase not configured", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });
});
