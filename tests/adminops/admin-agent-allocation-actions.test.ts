import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignLeadToAgent,
  unassignLead,
} from "../../app/lib/adminAgentAllocationActions";

const ORIGINAL_FETCH = globalThis.fetch;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

describe("AdminOps agent allocation actions", () => {
  it("GETs current assignment, assigns through narrow PATCH, then writes audit", async () => {
    const captured: Array<{ url: string; init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ url: String(url), init, body });
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, assigned_agent_id: null, assignment_status: null }],
        } as Response;
      }
      if (init.method === "POST") {
        return { ok: true, status: 201, statusText: "Created" } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, assigned_agent_id: AGENT_ID }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "assigned",
    });

    expect(captured).toHaveLength(3);
    expect(captured[0].url).toBe(
      "https://fake.supabase.co/rest/v1/leads?id=eq." +
        LEAD_ID +
        "&select=id%2Cassigned_agent_id%2Cassignment_status&limit=1",
    );
    expect(captured[0].init?.method).toBeUndefined();
    expect(captured[1].url).toBe(
      "https://fake.supabase.co/rest/v1/leads?id=eq." +
        LEAD_ID +
        "&select=id%2Cassigned_agent_id%2Cassignment_status",
    );
    expect(captured[1].init?.method).toBe("PATCH");
    expect(captured[1].body).toEqual({
      assigned_agent_id: AGENT_ID,
      assigned_at: "2026-07-09T12:00:00.000Z",
      assignment_status: "assigned",
    });
    expect(captured[1].body).not.toHaveProperty("status");
    expect(captured[1].body).not.toHaveProperty("email");
    expect(captured[2].url).toBe("https://fake.supabase.co/rest/v1/audit_logs");
    expect(captured[2].init?.method).toBe("POST");
    expect(captured[2].body).toMatchObject({
      actor: "system/admin_basic_auth",
      action: "lead.assigned",
      resource_type: "lead",
      resource_id: LEAD_ID,
      before_state: { assigned_agent_id: null },
      after_state: { assigned_agent_id: AGENT_ID, assignment_status: "assigned" },
    });
    expect(JSON.stringify(captured)).not.toContain("/api/leads");
    expect(JSON.stringify(captured)).not.toMatch(/DELETE|PUT/);
  });

  it("records reassignment when the lead already has an agent", async () => {
    const captured: Array<{ init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ init, body });
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{
            id: LEAD_ID,
            assigned_agent_id: "33333333-3333-4333-8333-333333333333",
            assignment_status: "assigned",
          }],
        } as Response;
      }
      if (init.method === "POST") {
        return { ok: true, status: 201, statusText: "Created" } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, assigned_agent_id: AGENT_ID }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "reassigned",
    });
    expect(captured[2].body).toMatchObject({
      action: "lead.reassigned",
      before_state: { assigned_agent_id: "33333333-3333-4333-8333-333333333333" },
      after_state: { assigned_agent_id: AGENT_ID, assignment_status: "assigned" },
    });
  });

  it("does not label same-agent assignment as reassignment", async () => {
    const captured: Array<{ init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ init, body });
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{
            id: LEAD_ID,
            assigned_agent_id: AGENT_ID,
            assignment_status: "assigned",
          }],
        } as Response;
      }
      if (init.method === "POST") {
        return { ok: true, status: 201, statusText: "Created" } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, assigned_agent_id: AGENT_ID }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "assigned",
    });
    expect(captured[2].body).toMatchObject({
      action: "lead.assigned",
      before_state: { assigned_agent_id: AGENT_ID },
      after_state: { assigned_agent_id: AGENT_ID, assignment_status: "assigned" },
    });
  });

  it("unassigns a lead through GET, PATCH, and audit without touching public lead capture", async () => {
    const captured: Array<{ init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ init, body });
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, assigned_agent_id: AGENT_ID, assignment_status: "assigned" }],
        } as Response;
      }
      if (init.method === "POST") {
        return { ok: true, status: 201, statusText: "Created" } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, assigned_agent_id: null }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(unassignLead(LEAD_ID)).resolves.toEqual({
      ok: true,
      action: "unassigned",
    });

    expect(captured).toHaveLength(3);
    expect(captured[0].init?.method).toBeUndefined();
    expect(captured[1].init?.method).toBe("PATCH");
    expect(captured[1].body).toEqual({
      assigned_agent_id: null,
      assigned_at: null,
      assignment_status: "unassigned",
    });
    expect(captured[2].init?.method).toBe("POST");
    expect(captured[2].body).toMatchObject({
      action: "lead.unassigned",
      before_state: { assigned_agent_id: AGENT_ID },
      after_state: { assigned_agent_id: null, assignment_status: "unassigned" },
    });
  });

  it("rejects invalid lead and agent IDs before calling Supabase", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(assignLeadToAgent("not-a-uuid", AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_lead_id",
    });
    await expect(assignLeadToAgent(LEAD_ID, "not-a-uuid")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_agent_id",
    });
    await expect(unassignLead("not-a-uuid")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_lead_id",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns safe errors for missing env and unknown leads", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "lead_store_not_configured",
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => [],
    })) as unknown as typeof fetch;

    await expect(unassignLead(LEAD_ID)).resolves.toEqual({
      ok: false,
      statusCode: 404,
      error: "lead_not_found",
    });
  });

  it("returns a warning if audit fails after assignment succeeds", async () => {
    const captured: Array<{ init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ init });
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, assigned_agent_id: null, assignment_status: null }],
        } as Response;
      }
      if (init.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, assigned_agent_id: AGENT_ID }],
        } as Response;
      }
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response;
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "assigned",
      warning: "audit_write_failed",
    });
    expect(captured.map((call) => call.init?.method || "GET")).toEqual(["GET", "PATCH", "POST"]);
  });
});
