/**
 * Tests for PATCH /api/admin/leads/[id] null-value handling.
 *
 * Verifies that:
 *   - next_follow_up_at: null clears the follow-up date (was returning 400)
 *   - last_contacted_at: ISO string sets contact timestamp (new field)
 *   - last_contacted_at: null clears it (new field)
 *   - unknown fields still return 400
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const updateMock = vi.fn();
const selectMock = vi.fn();
const auditInsertMock = vi.fn();

vi.mock("@/lib/admin/auth", () => ({
  checkAdminAuth: () => ({ ok: true, actor: "admin@test.com", status: 200 }),
}));
vi.mock("@/lib/analytics/ledger", () => ({ trackEventNoWait: vi.fn() }));
vi.mock("@/lib/admin/lead-detail", () => ({ loadLeadDetail: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "leads") {
        return {
          update: () => ({ eq: () => updateMock() }),
          select: () => ({ eq: () => ({ maybeSingle: () => selectMock() }) }),
        };
      }
      if (table === "audit_logs") return { insert: (...a: unknown[]) => auditInsertMock(...a) };
      return {};
    },
  }),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

import { PATCH } from "@/app/api/admin/leads/[id]/route";

const LEAD_ID = "00000000-0000-0000-0000-000000000001";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/admin/leads/${LEAD_ID}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": "test",
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/leads/[id] — null and new field handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockResolvedValue({
      data: { status: "new", lead_type: "seller", lead_grade: "A" },
      error: null,
    });
    updateMock.mockResolvedValue({ error: null });
    auditInsertMock.mockResolvedValue({ error: null });
  });

  it("clears follow-up date when next_follow_up_at is null (previously returned 400)", async () => {
    const res = await PATCH(makeRequest({ next_follow_up_at: null }), {
      params: Promise.resolve({ id: LEAD_ID }),
    });
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.ok).toBe(true);
  });

  it("sets last_contacted_at when provided as ISO string", async () => {
    const res = await PATCH(makeRequest({ last_contacted_at: "2026-06-26T10:00:00.000Z" }), {
      params: Promise.resolve({ id: LEAD_ID }),
    });
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.ok).toBe(true);
    expect((b.updates as Record<string, unknown>).last_contacted_at).toBe("2026-06-26T10:00:00.000Z");
  });

  it("clears last_contacted_at when provided as null", async () => {
    const res = await PATCH(makeRequest({ last_contacted_at: null }), {
      params: Promise.resolve({ id: LEAD_ID }),
    });
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.ok).toBe(true);
  });

  it("returns 400 when no recognized fields are provided", async () => {
    const res = await PATCH(makeRequest({ completely_unknown: "value" }), {
      params: Promise.resolve({ id: LEAD_ID }),
    });
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toBe("no_supported_fields");
  });
});
