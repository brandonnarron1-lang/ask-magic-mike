import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAssignmentAuditPayload,
  loadRecentAssignmentAuditEvents,
  normalizeAssignmentAuditRow,
  writeAssignmentAuditEvent,
  type AdminAssignmentAuditEvent,
} from "../../app/lib/adminAssignmentAudit";

const ORIGINAL_FETCH = globalThis.fetch;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const OLD_AGENT_ID = "22222222-2222-4222-8222-222222222222";
const NEW_AGENT_ID = "33333333-3333-4333-8333-333333333333";

const event: AdminAssignmentAuditEvent = {
  lead_id: LEAD_ID,
  previous_agent_id: OLD_AGENT_ID,
  new_agent_id: NEW_AGENT_ID,
  action: "reassigned",
  source: "admin_allocation",
  actor: "system/admin_basic_auth",
  assignment_status: "assigned",
  action_route: "/admin/allocation",
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

describe("AdminOps assignment audit", () => {
  it("builds a safe assignment audit payload", () => {
    expect(buildAssignmentAuditPayload(event)).toEqual({
      actor: "system/admin_basic_auth",
      action: "lead.reassigned",
      resource_type: "lead",
      resource_id: LEAD_ID,
      before_state: {
        assigned_agent_id: OLD_AGENT_ID,
      },
      after_state: {
        assigned_agent_id: NEW_AGENT_ID,
        assignment_status: "assigned",
      },
      metadata: {
        source: "admin_allocation",
        assignment_action: "reassigned",
        action_route: "/admin/allocation",
        warning_flags: [],
      },
    });
  });

  it("writes audit events to Supabase REST with POST only", async () => {
    const captured: Array<{ url: string; init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ url: String(url), init, body });
      return { ok: true, status: 201, statusText: "Created" } as Response;
    }) as unknown as typeof fetch;

    await expect(writeAssignmentAuditEvent(event)).resolves.toEqual({ ok: true });

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toContain("https://fake.supabase.co/rest/v1/audit_logs");
    expect(captured[0].init?.method).toBe("POST");
    expect(captured[0].body).toMatchObject({
      actor: "system/admin_basic_auth",
      action: "lead.reassigned",
      resource_type: "lead",
      resource_id: LEAD_ID,
    });
    expect(JSON.stringify(captured)).not.toContain("/api/leads");
    expect(JSON.stringify(captured)).not.toMatch(/DELETE|PUT/);
  });

  it("returns a safe missing-env result without calling fetch", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(writeAssignmentAuditEvent(event)).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "audit_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a safe audit write failure without raw Supabase details", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })) as unknown as typeof fetch;

    await expect(writeAssignmentAuditEvent(event)).resolves.toEqual({
      ok: false,
      statusCode: 500,
      error: "audit_write_failed",
    });
  });

  it("normalizes audit rows for read-only activity display", () => {
    expect(normalizeAssignmentAuditRow({
      id: "audit-1",
      created_at: "2026-07-09T12:00:00.000Z",
      actor: "system/admin_basic_auth",
      action: "lead.unassigned",
      resource_id: LEAD_ID,
      before_state: { assigned_agent_id: OLD_AGENT_ID },
      after_state: { assigned_agent_id: null, assignment_status: "unassigned" },
      metadata: { source: "admin_allocation", action_route: "/admin/allocation" },
    })).toMatchObject({
      id: "audit-1",
      action: "unassigned",
      lead_id: LEAD_ID,
      previous_agent_id: OLD_AGENT_ID,
      new_agent_id: null,
      assignment_status: "unassigned",
    });
  });

  it("loads recent audit activity with bounded GET-only REST access", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        json: async () => [],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(loadRecentAssignmentAuditEvents(999)).resolves.toMatchObject({
      configured: true,
      events: [],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].init?.method).toBeUndefined();
    expect(calls[0].url).toContain("/rest/v1/audit_logs");
    expect(calls[0].url).toContain("limit=50");
    expect(calls[0].url).toContain("action=in.%28lead.assigned%2Clead.reassigned%2Clead.unassigned%29");
  });
});
