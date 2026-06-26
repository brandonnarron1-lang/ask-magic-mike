/**
 * Reliability tests for POST /api/admin/leads/[id]/notes.
 *
 * Verifies that a Supabase insert failure returns 500, not 200.
 * The invariant: { ok: true } means the note was saved.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const insertMock = vi.fn();
const trackMock  = vi.fn();

vi.mock("@/lib/admin/auth", () => ({
  checkAdminAuth: () => ({ ok: true, actor: "admin@test.com", status: 200 }),
}));

vi.mock("@/lib/analytics/ledger", () => ({
  trackEventNoWait: (...args: unknown[]) => trackMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: (...args: unknown[]) => {
        if (table === "messages") return insertMock(...args);
        // audit_logs: always succeed
        return { data: null, error: null };
      },
    }),
  }),
}));

// Ensure the route sees Supabase as configured
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
  };
});

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
    insertMock.mockResolvedValue({ data: null, error: null });
  });

  it("returns 200 with ok:true when insert succeeds", async () => {
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 500 when messages insert fails", async () => {
    insertMock.mockResolvedValue({
      data:  null,
      error: { message: "relation \"messages\" does not exist" },
    });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("note_save_failed");
  });

  it("does NOT return ok:true on DB failure", async () => {
    insertMock.mockResolvedValue({ data: null, error: { message: "timeout" } });

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
