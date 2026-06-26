/**
 * Reliability tests for POST /api/admin/leads/[id]/assign.
 *
 * Verifies that DB failures surface as 500, not silent 200.
 * Critical: a 200 means the lead is assigned. 500 means it failed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const leadsUpdateMock = vi.fn();
const assignmentsInsertMock = vi.fn();
const auditInsertMock = vi.fn();

vi.mock("@/lib/admin/auth", () => ({
  checkAdminAuth: () => ({ ok: true, actor: "admin@test.com", status: 200 }),
}));

vi.mock("@/lib/analytics/ledger", () => ({
  trackEventNoWait: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "leads") return {
        update: () => ({ eq: () => leadsUpdateMock() }),
      };
      if (table === "agent_assignments") return {
        insert: (...args: unknown[]) => assignmentsInsertMock(...args),
      };
      if (table === "audit_logs") return {
        insert: (...args: unknown[]) => auditInsertMock(...args),
      };
      return { update: vi.fn(), insert: vi.fn() };
    },
  }),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

import { POST } from "@/app/api/admin/leads/[id]/assign/route";

const LEAD_ID  = "00000000-0000-0000-0000-000000000001";
const AGENT_ID = "00000000-0000-0000-0000-000000000002";

function makeRequest(body = { agent_id: AGENT_ID }): NextRequest {
  return new NextRequest(`http://localhost/api/admin/leads/${LEAD_ID}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": "test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/leads/[id]/assign — DB reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadsUpdateMock.mockResolvedValue({ error: null });
    assignmentsInsertMock.mockResolvedValue({ error: null });
    auditInsertMock.mockResolvedValue({ error: null });
  });

  it("returns 200 ok:true on successful assignment", async () => {
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 500 when leads.update fails (critical: assignment not persisted)", async () => {
    leadsUpdateMock.mockResolvedValue({ error: { message: "constraint violation" } });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("assignment_failed");
  });

  it("does NOT return 200 when leads.update fails", async () => {
    leadsUpdateMock.mockResolvedValue({ error: { message: "DB timeout" } });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).not.toBe(200);
  });

  it("still returns 200 when only audit_log insert fails (non-fatal)", async () => {
    auditInsertMock.mockResolvedValue({ error: { message: "audit table missing" } });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 400 when agent_id is missing", async () => {
    const res = await POST(makeRequest({ agent_id: undefined as unknown as string }), {
      params: Promise.resolve({ id: LEAD_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when agent_id is not a UUID", async () => {
    const res = await POST(makeRequest({ agent_id: "not-a-uuid" }), {
      params: Promise.resolve({ id: LEAD_ID }),
    });
    expect(res.status).toBe(400);
  });
});
