/**
 * Reliability tests for POST /api/admin/leads/[id]/notes.
 *
 * Verifies that a canonical persistence failure returns 500, not 200.
 * The invariant: { ok: true } means the note was saved.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const operationMock = vi.fn();
const trackMock  = vi.fn();

vi.mock("@/lib/admin/auth", () => ({
  checkAdminAuth: () => ({ ok: true, actor: "admin@test.com", status: 200 }),
}));

vi.mock("@/lib/analytics/ledger", () => ({
  trackEventNoWait: (...args: unknown[]) => trackMock(...args),
}));

vi.mock("@/lib/admin/lead-operations", () => ({
  addCanonicalAdminLeadNote: (...args: unknown[]) => operationMock(...args),
}));

import { POST } from "@/app/api/admin/leads/[id]/notes/route";

const VALID_ID = "00000000-0000-0000-0000-000000000001";

function makeRequest(note = "Follow up tomorrow"): NextRequest {
  return new NextRequest(`http://localhost/api/admin/leads/${VALID_ID}/notes`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": "Basic dGVzdDp0ZXN0", // test:test
    },
    body: JSON.stringify({ note }),
  });
}

describe("POST /api/admin/leads/[id]/notes — DB reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operationMock.mockResolvedValue({
      ok: true,
      value: {
        messageId: "00000000-0000-0000-0000-000000000010",
        auditId: "00000000-0000-0000-0000-000000000011",
        createdAt: "2026-08-30T12:00:00.000Z",
      },
    });
  });

  it("returns 200 with ok:true when insert succeeds", async () => {
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message_id).toBe("00000000-0000-0000-0000-000000000010");
  });

  it("returns 500 when messages insert fails", async () => {
    operationMock.mockResolvedValue({ ok: false, statusCode: 500, error: "note_save_failed" });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("note_save_failed");
  });

  it("does NOT return ok:true on DB failure", async () => {
    operationMock.mockResolvedValue({ ok: false, statusCode: 502, error: "note_save_failed" });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: VALID_ID }) });
    const body = await res.json();
    expect(body.ok).not.toBe(true);
  });

  it("returns 400 when note is empty string", async () => {
    const res = await POST(makeRequest(""), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("note_required");
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await POST(
      makeRequest(),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(res.status).toBe(400);
  });
});
