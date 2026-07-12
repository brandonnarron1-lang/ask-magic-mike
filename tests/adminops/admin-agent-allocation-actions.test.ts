import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignLeadToAgent,
  updateAgentOperations,
  unassignLead,
} from "../../app/lib/adminAgentAllocationActions";

const ORIGINAL_FETCH = globalThis.fetch;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";
const PREVIOUS_AGENT_ID = "33333333-3333-4333-8333-333333333333";

function jsonResponse(rows: Array<Record<string, unknown>>, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => rows,
  } as Response;
}

function mockAssignmentFetch(initialAgentId: string | null) {
  const captured: Array<{ url: string; init?: RequestInit; body: Record<string, unknown> }> = [];
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = String(url);
    const method = init?.method || "GET";
    const body = init?.body && typeof init.body === "string"
      ? JSON.parse(init.body) as Record<string, unknown>
      : {};
    captured.push({ url: requestUrl, init, body });

    if (
      requestUrl.includes("/rest/v1/leads") &&
      method === "GET" &&
      requestUrl.includes("select=id%2Cassigned_agent_id%2Cassignment_status")
    ) {
      return jsonResponse([{ id: LEAD_ID, assigned_agent_id: initialAgentId, assignment_status: initialAgentId ? "assigned" : null }]);
    }
    if (
      requestUrl.includes("/rest/v1/agents") &&
      method === "GET" &&
      requestUrl.includes("select=id%2Cis_active%2Cmax_daily_leads")
    ) {
      return jsonResponse([{ id: AGENT_ID, is_active: true, max_daily_leads: 20 }]);
    }
    if (
      requestUrl.includes("/rest/v1/leads") &&
      method === "GET" &&
      requestUrl.includes("assigned_agent_id=eq." + AGENT_ID) &&
      requestUrl.includes("select=id")
    ) {
      return jsonResponse([]);
    }
    if (requestUrl.includes("/rest/v1/leads") && method === "PATCH") {
      return jsonResponse([{ id: LEAD_ID, assigned_agent_id: AGENT_ID, assignment_status: "assigned" }]);
    }
    if (requestUrl.includes("/rest/v1/audit_logs") && method === "POST") {
      return jsonResponse([{ id: "audit-1", created_at: "2026-07-09T12:00:00.000Z" }], 201);
    }
    if (requestUrl.includes("/rest/v1/leads") && method === "GET") {
      return jsonResponse([{
        id: LEAD_ID,
        status: "new",
        assigned_agent_id: AGENT_ID,
        assigned_at: "2026-07-09T12:00:00.000Z",
        assignment_status: "assigned",
        address_raw: "000 QA Test Property, Wilson, NC",
        primary_intent: "sell",
        timeline_months: 3,
        lead_type: "home_value",
        source: "qa",
        source_detail: "home_value",
        page_url: "https://www.askmagicmike.com/home-value",
      }]);
    }
    if (requestUrl.includes("/rest/v1/agents") && method === "GET") {
      return jsonResponse([{ id: AGENT_ID, name: "Mike Eatmon", email: "agent@example.test", phone: null, role: "agent", is_active: true }]);
    }
    if (requestUrl.includes("/rest/v1/lead_notifications") && method === "GET") {
      return jsonResponse([]);
    }
    if (requestUrl.includes("/rest/v1/lead_notifications") && method === "POST") {
      return jsonResponse([{
        id: "notification-1",
        lead_id: LEAD_ID,
        agent_id: AGENT_ID,
        assignment_audit_id: "audit-1",
        notification_type: "agent_assignment",
        channel: "email",
        recipient_type: "agent",
        template_version: "agent_assignment_email_v1",
        idempotency_key: "test-key",
        status: "pending",
        attempt_count: 0,
        max_attempts: 3,
        provider: "disabled",
        metadata: {},
      }], 201);
    }
    if (requestUrl.includes("/rest/v1/lead_notifications") && method === "PATCH") {
      return jsonResponse([{
        id: "notification-1",
        lead_id: LEAD_ID,
        agent_id: AGENT_ID,
        notification_type: "agent_assignment",
        channel: "email",
        recipient_type: "agent",
        template_version: "agent_assignment_email_v1",
        idempotency_key: "test-key",
        status: "skipped",
        attempt_count: 0,
        max_attempts: 3,
        provider: "disabled",
        error_code: "agent_notifications_disabled",
        metadata: {},
      }]);
    }

    throw new Error(`Unexpected request ${method} ${requestUrl}`);
  }) as unknown as typeof fetch;
  return captured;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
  process.env.AGENT_NOTIFICATIONS_ENABLED = "false";
  process.env.LEAD_NOTIFICATION_MODE = "disabled";
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
  delete (process.env as Record<string, string | undefined>).AGENT_NOTIFICATIONS_ENABLED;
  delete (process.env as Record<string, string | undefined>).LEAD_NOTIFICATION_MODE;
});

describe("AdminOps agent allocation actions", () => {
  it("GETs current assignment, assigns through narrow PATCH, writes audit, then creates a notification event", async () => {
    const captured = mockAssignmentFetch(null);

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "assigned",
      warning: "agent_notifications_disabled",
    });

    expect(captured[0].url).toBe(
      "https://fake.supabase.co/rest/v1/leads?id=eq." +
        LEAD_ID +
        "&select=id%2Cassigned_agent_id%2Cassignment_status&limit=1",
    );
    expect(captured[0].init?.method).toBeUndefined();
    expect(captured[3].url).toBe(
      "https://fake.supabase.co/rest/v1/leads?id=eq." +
        LEAD_ID +
        "&select=id%2Cassigned_agent_id%2Cassignment_status&assigned_agent_id=is.null",
    );
    expect(captured[3].init?.method).toBe("PATCH");
    expect(captured[3].body).toEqual({
      assigned_agent_id: AGENT_ID,
      assigned_at: "2026-07-09T12:00:00.000Z",
      assignment_status: "assigned",
    });
    expect(captured[3].body).not.toHaveProperty("status");
    expect(captured[3].body).not.toHaveProperty("email");
    expect(captured[4].url).toContain("https://fake.supabase.co/rest/v1/audit_logs");
    expect(captured[4].init?.method).toBe("POST");
    expect(captured[4].body).toMatchObject({
      actor: "system/admin_basic_auth",
      action: "lead.assigned",
      resource_type: "lead",
      resource_id: LEAD_ID,
      before_state: { assigned_agent_id: null },
      after_state: { assigned_agent_id: AGENT_ID, assignment_status: "assigned" },
    });
    expect(captured[1].url).toContain("/rest/v1/agents");
    expect(captured[2].url).toContain("assigned_agent_id=eq." + AGENT_ID);
    expect(captured.some((call) => call.url.includes("/rest/v1/lead_notifications") && call.init?.method === "POST")).toBe(true);
    expect(captured.findIndex((call) => call.url.includes("/rest/v1/audit_logs"))).toBeLessThan(
      captured.findIndex((call) => call.url.includes("/rest/v1/lead_notifications") && call.init?.method === "POST"),
    );
    expect(JSON.stringify(captured)).not.toContain("/api/leads");
    expect(JSON.stringify(captured)).not.toMatch(/DELETE|PUT/);
  });

  it("records reassignment when the lead already has an agent", async () => {
    const captured = mockAssignmentFetch(PREVIOUS_AGENT_ID);

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "reassigned",
      warning: "agent_notifications_disabled",
    });
    expect(captured[4].body).toMatchObject({
      action: "lead.reassigned",
      before_state: { assigned_agent_id: PREVIOUS_AGENT_ID },
      after_state: { assigned_agent_id: AGENT_ID, assignment_status: "assigned" },
    });
    expect(captured[3].url).toContain("assigned_agent_id=eq." + PREVIOUS_AGENT_ID);
  });

  it("does not mutate, audit, or notify when the lead is already assigned to the same agent", async () => {
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
      warning: "assignment_already_current",
    });
    expect(captured).toHaveLength(1);
  });

  it("unassigns a lead through GET, PATCH, and audit without touching public lead capture", async () => {
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
    expect(captured[1].url).toContain("assigned_agent_id=eq." + AGENT_ID);
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

  it("rejects assignment when the lead assignment changes between preflight and PATCH", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      calls.push({ url: requestUrl, init });
      if (!init?.method && requestUrl.includes("select=id%2Cassigned_agent_id%2Cassignment_status")) {
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
      if (requestUrl.includes("/rest/v1/agents")) {
        return jsonResponse([{ id: AGENT_ID, is_active: true, max_daily_leads: 20 }]);
      }
      if (requestUrl.includes("assigned_agent_id=eq." + AGENT_ID)) {
        return jsonResponse([]);
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "assignment_conflict",
    });

    expect(calls).toHaveLength(4);
    expect(calls[3].init?.method).toBe("PATCH");
    expect(calls[3].url).toContain("assigned_agent_id=eq.33333333-3333-4333-8333-333333333333");
    expect(JSON.stringify(calls)).not.toContain("/rest/v1/audit_logs");
  });

  it("returns a warning if audit fails after assignment succeeds", async () => {
    const captured: Array<{ init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      captured.push({ init });
      if (!init?.method && requestUrl.includes("select=id%2Cassigned_agent_id%2Cassignment_status")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, assigned_agent_id: null, assignment_status: null }],
        } as Response;
      }
      if (requestUrl.includes("/rest/v1/agents")) {
        return jsonResponse([{ id: AGENT_ID, is_active: true, max_daily_leads: 20 }]);
      }
      if (requestUrl.includes("assigned_agent_id=eq." + AGENT_ID)) {
        return jsonResponse([]);
      }
      if (init?.method === "PATCH") {
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
    expect(captured.map((call) => call.init?.method || "GET")).toEqual(["GET", "GET", "GET", "PATCH", "POST"]);
  });

  it("rejects inactive and at-capacity agents before assignment mutation", async () => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("select=id%2Cassigned_agent_id%2Cassignment_status")) {
        return jsonResponse([{ id: LEAD_ID, assigned_agent_id: null, assignment_status: null }]);
      }
      if (requestUrl.includes("/rest/v1/agents")) {
        return jsonResponse([{ id: AGENT_ID, is_active: false, max_daily_leads: 20 }]);
      }
      if (requestUrl.includes("assigned_agent_id=eq." + AGENT_ID)) {
        return jsonResponse([]);
      }
      if (init?.method === "PATCH") {
        throw new Error("assignment patch should not run");
      }
      return jsonResponse([]);
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "agent_inactive",
    });

    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("select=id%2Cassigned_agent_id%2Cassignment_status")) {
        return jsonResponse([{ id: LEAD_ID, assigned_agent_id: null, assignment_status: null }]);
      }
      if (requestUrl.includes("/rest/v1/agents")) {
        return jsonResponse([{ id: AGENT_ID, is_active: true, max_daily_leads: 1 }]);
      }
      if (requestUrl.includes("assigned_agent_id=eq." + AGENT_ID)) {
        return jsonResponse([{ id: "active-lead" }]);
      }
      if (init?.method === "PATCH") {
        throw new Error("assignment patch should not run");
      }
      return jsonResponse([]);
    }) as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "agent_at_capacity",
    });
  });

  it("updates agent operations through bounded PATCH and writes an agent audit event", async () => {
    const captured: Array<{ url: string; init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ url: String(url), init, body });

      if (!init?.method && String(url).includes("/rest/v1/agents")) {
        return jsonResponse([{
          id: AGENT_ID,
          is_active: true,
          max_daily_leads: 20,
          current_load: 0,
          priority_score: 50,
          notification_email: true,
          notification_sms: false,
        }]);
      }
      if (init?.method === "PATCH") {
        return jsonResponse([{ id: AGENT_ID }]);
      }
      if (init?.method === "POST" && String(url).includes("/rest/v1/audit_logs")) {
        return jsonResponse([], 201);
      }
      throw new Error(`Unexpected request ${init?.method || "GET"} ${String(url)}`);
    }) as unknown as typeof fetch;

    await expect(updateAgentOperations({
      agentId: AGENT_ID,
      isActive: false,
      maxDailyLeads: 4,
      currentLoad: 1,
      priorityScore: 80,
      notificationEmail: true,
      notificationSms: false,
    })).resolves.toEqual({ ok: true });

    expect(captured.map((call) => call.init?.method || "GET")).toEqual(["GET", "PATCH", "POST"]);
    expect(captured[1].body).toEqual({
      is_active: false,
      max_daily_leads: 4,
      current_load: 1,
      priority_score: 80,
      notification_email: true,
      notification_sms: false,
    });
    expect(captured[2].body).toMatchObject({
      action: "agent.operations_updated",
      resource_type: "agent",
      resource_id: AGENT_ID,
      metadata: { source: "admin_allocation", action_route: "/admin/allocation" },
    });
  });

  it("rejects invalid agent operation values before calling Supabase", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(updateAgentOperations({
      agentId: AGENT_ID,
      isActive: true,
      maxDailyLeads: 1000,
      currentLoad: 0,
      priorityScore: 50,
      notificationEmail: true,
      notificationSms: false,
    })).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_agent_operations",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
