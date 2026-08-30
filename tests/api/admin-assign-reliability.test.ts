/**
 * Reliability tests for POST /api/admin/leads/[id]/assign.
 *
 * Verifies that DB failures surface as 500, not silent 200.
 * Critical: a 200 means the lead is assigned. 500 means it failed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const operationMock = vi.fn();

vi.mock("@/lib/admin/auth", () => ({
  checkAdminAuth: () => ({ ok: true, actor: "admin@test.com", status: 200 }),
}));

vi.mock("@/lib/analytics/ledger", () => ({
  trackEventNoWait: vi.fn(),
}));

vi.mock("@/lib/admin/lead-operations", () => ({
  assignCanonicalAdminLead: (...args: unknown[]) => operationMock(...args),
}));

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
    operationMock.mockResolvedValue({
      ok: true,
      value: {
        action: "assigned",
        auditId: "00000000-0000-0000-0000-000000000020",
        notificationId: null,
        notificationStatus: "skipped",
        idempotentReplay: false,
      },
    });
  });

  it("returns 200 ok:true on successful assignment", async () => {
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 500 when leads.update fails (critical: assignment not persisted)", async () => {
    operationMock.mockResolvedValue({ ok: false, statusCode: 500, error: "assignment_failed" });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("assignment_failed");
  });

  it("does NOT return 200 when leads.update fails", async () => {
    operationMock.mockResolvedValue({ ok: false, statusCode: 502, error: "assignment_failed" });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).not.toBe(200);
  });

  it("fails closed when the atomic assignment/audit operation fails", async () => {
    operationMock.mockResolvedValue({ ok: false, statusCode: 500, error: "assignment_failed" });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: LEAD_ID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
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
