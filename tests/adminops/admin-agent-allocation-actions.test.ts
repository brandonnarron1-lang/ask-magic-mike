import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignLeadToAgent,
  unassignLead,
  updateAgentOperations,
} from "../../app/lib/adminAgentAllocationActions";

const ORIGINAL_FETCH = globalThis.fetch;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";
const PREVIOUS_AGENT_ID = "33333333-3333-4333-8333-333333333333";

function response(value: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => value,
  } as Response;
}

function installAssignmentFetch(
  currentAgentId: string | null,
  rpcResult: Record<string, unknown>,
) {
  const calls: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    calls.push({ url, method, body });
    if (method === "GET" && url.includes("/rest/v1/leads")) {
      return response([{
        id: LEAD_ID,
        assigned_agent_id: currentAgentId,
        assignment_status: currentAgentId ? "assigned" : "unassigned",
      }]);
    }
    if (method === "POST" && url.includes("/rest/v1/rpc/mutate_admin_assignment_v1")) {
      return response(rpcResult);
    }
    throw new Error(`Unexpected request ${method} ${url}`);
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
  process.env.AGENT_NOTIFICATIONS_ENABLED = "false";
  process.env.LEAD_NOTIFICATION_MODE = "disabled";
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "AGENT_NOTIFICATIONS_ENABLED",
    "LEAD_NOTIFICATION_MODE",
    "VERCEL_ENV",
    "DATABASE_ENV",
    "PREVIEW_DATA_MODE",
    "ALLOW_PREVIEW_DB_MUTATION",
  ]) Reflect.deleteProperty(process.env, key);
});

describe("atomic AdminOps agent allocation actions", () => {
  it("performs zero persistence calls in Preview read-only mode", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toMatchObject({
      ok: false,
      error: "preview_data_disabled",
    });
    await expect(unassignLead(LEAD_ID)).resolves.toMatchObject({
      ok: false,
      error: "preview_data_disabled",
    });
    await expect(updateAgentOperations({
      agentId: AGENT_ID,
      isActive: true,
      maxDailyLeads: 10,
      currentLoad: 0,
      priorityScore: 50,
      notificationEmail: true,
      notificationSms: false,
    })).resolves.toMatchObject({ ok: false, error: "preview_data_disabled" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routes assignment, history, audit, and outbox through one atomic RPC", async () => {
    const calls = installAssignmentFetch(null, {
      ok: true,
      action: "assigned",
      audit_id: "44444444-4444-4444-8444-444444444444",
      notification_id: "55555555-5555-4555-8555-555555555555",
      notification_status: "skipped",
      idempotent_replay: false,
    });

    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "assigned",
      warning: "agent_notifications_disabled",
    });
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(calls[1].url).toBe(
      "https://fake.supabase.co/rest/v1/rpc/mutate_admin_assignment_v1",
    );
    expect(calls[1].body).toEqual({
      p_lead_id: LEAD_ID,
      p_agent_id: AGENT_ID,
      p_expected_agent_id: null,
      p_action: "assigned",
      p_notification_mode: "disabled",
      p_actor: "system/admin_basic_auth",
      p_occurred_at: "2026-07-16T12:00:00.000Z",
    });
    expect(JSON.stringify(calls)).not.toContain("/rest/v1/audit_logs");
    expect(JSON.stringify(calls)).not.toContain("/rest/v1/lead_notifications");
  });

  it("passes the locked expected agent for reassignment", async () => {
    const calls = installAssignmentFetch(PREVIOUS_AGENT_ID, {
      ok: true,
      action: "reassigned",
      idempotent_replay: false,
    });
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "reassigned",
    });
    expect(calls[1].body).toMatchObject({
      p_expected_agent_id: PREVIOUS_AGENT_ID,
      p_action: "reassigned",
    });
  });

  it("revalidates a current assignment through the atomic RPC", async () => {
    const calls = installAssignmentFetch(AGENT_ID, {
      ok: true,
      action: "assigned",
      idempotent_replay: true,
    });
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: true,
      action: "assigned",
      warning: "assignment_already_current",
    });
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(calls[1].body).toMatchObject({
      p_agent_id: AGENT_ID,
      p_expected_agent_id: AGENT_ID,
      p_action: "assigned",
    });
  });

  it("does not claim same-state success when database revalidation detects a stale read", async () => {
    installAssignmentFetch(AGENT_ID, { ok: false, error: "assignment_conflict" });
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "assignment_conflict",
    });
  });

  it("unassigns atomically and maps concurrency and capacity errors", async () => {
    const unassignCalls = installAssignmentFetch(PREVIOUS_AGENT_ID, {
      ok: true,
      action: "unassigned",
      idempotent_replay: false,
    });
    await expect(unassignLead(LEAD_ID)).resolves.toEqual({
      ok: true,
      action: "unassigned",
    });
    expect(unassignCalls[1].body).toMatchObject({
      p_agent_id: null,
      p_expected_agent_id: PREVIOUS_AGENT_ID,
      p_action: "unassigned",
    });

    const alreadyUnassignedCalls = installAssignmentFetch(null, {
      ok: true,
      action: "unassigned",
      idempotent_replay: true,
    });
    await expect(unassignLead(LEAD_ID)).resolves.toEqual({
      ok: true,
      action: "unassigned",
    });
    expect(alreadyUnassignedCalls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(alreadyUnassignedCalls[1].body).toMatchObject({
      p_agent_id: null,
      p_expected_agent_id: null,
      p_action: "unassigned",
    });

    installAssignmentFetch(null, { ok: false, error: "agent_at_capacity" });
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "agent_at_capacity",
    });
    installAssignmentFetch(null, { ok: false, error: "assignment_conflict" });
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "assignment_conflict",
    });
  });

  it("updates agent operations and audit through one atomic RPC", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      calls.push({ url: String(input), body });
      return response({ ok: true, audit_id: "44444444-4444-4444-8444-444444444444" });
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
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/rest/v1/rpc/mutate_admin_agent_operations_v1");
    expect(calls[0].body.p_patch).toEqual({
      is_active: false,
      max_daily_leads: 4,
      current_load: 1,
      priority_score: 80,
      notification_email: true,
      notification_sms: false,
    });
  });

  it("rejects invalid input and missing configuration without calls", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    await expect(assignLeadToAgent("not-a-uuid", AGENT_ID)).resolves.toMatchObject({
      ok: false,
      error: "invalid_lead_id",
    });
    await expect(updateAgentOperations({
      agentId: AGENT_ID,
      isActive: true,
      maxDailyLeads: 1000,
      currentLoad: 0,
      priorityScore: 50,
      notificationEmail: true,
      notificationSms: false,
    })).resolves.toMatchObject({ ok: false, error: "invalid_agent_operations" });
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "lead_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns failure when the atomic transaction fails instead of partial success", async () => {
    installAssignmentFetch(null, {});
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) {
        return response([{ id: LEAD_ID, assigned_agent_id: null, assignment_status: "unassigned" }]);
      }
      return response({ message: "transaction rolled back" }, 500);
    }) as unknown as typeof fetch;
    await expect(assignLeadToAgent(LEAD_ID, AGENT_ID)).resolves.toEqual({
      ok: false,
      statusCode: 500,
      error: "assignment_update_failed",
    });
  });
});
