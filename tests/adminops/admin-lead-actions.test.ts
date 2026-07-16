import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_LEAD_STATUS_ACTIONS,
  ADMIN_LEAD_STATUSES,
  isAdminLeadStatus,
  updateAdminLeadStatus,
} from "../../app/lib/adminLeadActions";
import {
  buildLeadLifecyclePatch,
  buildStalledLeadSignals,
  DISQUALIFIED_REASONS,
  isAllowedLeadTransition,
  LOST_REASONS,
  validateTerminalReasonForStatus,
} from "../../app/lib/adminLeadLifecycle";

const ORIGINAL_FETCH = globalThis.fetch;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";

function response(value: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => value,
  } as Response;
}

function installStatusFetch(currentStatus: string, rpcResult: Record<string, unknown>) {
  const calls: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    calls.push({ url, method, body });
    if (method === "GET") return response([{ id: LEAD_ID, status: currentStatus }]);
    if (url.includes("/rest/v1/rpc/mutate_admin_lead_status_v1")) return response(rpcResult);
    throw new Error(`Unexpected request ${method} ${url}`);
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VERCEL_ENV",
    "DATABASE_ENV",
    "PREVIEW_DATA_MODE",
    "ALLOW_PREVIEW_DB_MUTATION",
  ]) Reflect.deleteProperty(process.env, key);
});

describe("AdminOps lead lifecycle domain", () => {
  it("keeps the supported status set and operational actions explicit", () => {
    expect(ADMIN_LEAD_STATUSES).toEqual([
      "new", "scored", "qualified", "assigned", "contacted",
      "appointment_requested", "appointment_set", "nurture", "dead",
      "converted", "spam", "escalated",
    ]);
    expect(isAdminLeadStatus("spam")).toBe(true);
    expect(isAdminLeadStatus("internal_qa")).toBe(false);
    expect(ADMIN_LEAD_STATUS_ACTIONS.map((action) => action.status)).toContain("converted");
  });

  it("validates transitions, terminal reasons, and bounded lifecycle patches", () => {
    expect(isAllowedLeadTransition("new", "contacted")).toBe(true);
    expect(isAllowedLeadTransition("converted", "contacted")).toBe(false);
    expect(validateTerminalReasonForStatus("dead", LOST_REASONS[0])).toEqual({
      ok: true,
      reason: LOST_REASONS[0],
    });
    expect(validateTerminalReasonForStatus("spam", DISQUALIFIED_REASONS[0])).toEqual({
      ok: true,
      reason: DISQUALIFIED_REASONS[0],
    });
    const patch = buildLeadLifecyclePatch("spam", {
      nowIso: "2026-07-16T12:00:00.000Z",
      reason: "internal_test",
    });
    expect(patch).toMatchObject({
      status: "spam",
      appointment_requested: false,
      conversion_stage: "disqualified",
      closed_lost_reason: "internal_test",
    });
    expect(patch).not.toHaveProperty("email");
    expect(patch).not.toHaveProperty("address_raw");
  });

  it("retains canonical stalled-lead signals", () => {
    const signals = buildStalledLeadSignals({
      status: "assigned",
      created_at: "2026-07-10T10:00:00.000Z",
      assigned_agent_id: "agent-1",
      assigned_at: "2026-07-12T08:00:00.000Z",
      last_contacted_at: null,
      lead_grade: "A",
      timeline_months: 0,
    }, new Date("2026-07-12T12:30:00.000Z"));
    expect(signals.map((signal) => signal.key)).toEqual([
      "assigned_not_contacted",
      "hot_idle",
    ]);
  });
});

describe("atomic AdminOps lead status action", () => {
  it("commits lifecycle projection and audit through one RPC", async () => {
    const calls = installStatusFetch("qualified", {
      ok: true,
      status: "spam",
      audit_id: "44444444-4444-4444-8444-444444444444",
      idempotent_replay: false,
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "spam", {
      reason: "internal_test",
      now: new Date("2026-07-16T12:00:00.000Z"),
    })).resolves.toEqual({ ok: true, status: "spam" });
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(calls[1].url).toBe(
      "https://fake.supabase.co/rest/v1/rpc/mutate_admin_lead_status_v1",
    );
    expect(calls[1].body).toMatchObject({
      p_lead_id: LEAD_ID,
      p_expected_status: "qualified",
      p_next_status: "spam",
      p_reason: "internal_test",
      p_actor: "system/admin_basic_auth",
      p_occurred_at: "2026-07-16T12:00:00.000Z",
    });
    expect(calls[1].body.p_patch).toMatchObject({
      status: "spam",
      appointment_requested: false,
      closed_lost_reason: "internal_test",
    });
    expect(JSON.stringify(calls)).not.toContain("/rest/v1/audit_logs");
  });

  it("returns optimistic conflict from the transaction contract", async () => {
    installStatusFetch("qualified", { ok: false, error: "concurrent_status_update" });
    await expect(updateAdminLeadStatus(LEAD_ID, "appointment_set")).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "concurrent_status_update",
    });
  });

  it("never reports partial success if audit insertion rolls back the transaction", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return response([{ id: LEAD_ID, status: "contacted" }]);
      return response({ message: "transaction rolled back" }, 500);
    }) as unknown as typeof fetch;
    await expect(updateAdminLeadStatus(LEAD_ID, "qualified")).resolves.toEqual({
      ok: false,
      statusCode: 500,
      error: "status_update_failed",
    });
  });

  it("revalidates same-state requests through the atomic RPC", async () => {
    const calls = installStatusFetch("contacted", {
      ok: true,
      status: "contacted",
      idempotent_replay: true,
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: true,
      status: "contacted",
      warning: "status_already_current",
    });
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(calls[1].body).toMatchObject({
      p_expected_status: "contacted",
      p_next_status: "contacted",
    });
  });

  it("does not claim same-state success when database revalidation detects a stale read", async () => {
    installStatusFetch("contacted", { ok: false, error: "concurrent_status_update" });
    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "concurrent_status_update",
    });
  });

  it("rejects invalid reasons and forbidden transitions before mutation", async () => {
    const reasonCalls = installStatusFetch("qualified", {});
    await expect(updateAdminLeadStatus(LEAD_ID, "dead")).resolves.toMatchObject({
      ok: false,
      error: "invalid_terminal_reason",
    });
    expect(reasonCalls).toHaveLength(1);

    const transitionCalls = installStatusFetch("converted", {});
    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toMatchObject({
      ok: false,
      error: "forbidden_transition",
    });
    expect(transitionCalls).toHaveLength(1);
  });

  it("refuses Preview mutation and missing configuration with zero calls", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    await expect(updateAdminLeadStatus(LEAD_ID, "qualified")).resolves.toMatchObject({
      ok: false,
      error: "preview_data_disabled",
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    for (const key of [
      "VERCEL_ENV",
      "DATABASE_ENV",
      "PREVIEW_DATA_MODE",
      "ALLOW_PREVIEW_DB_MUTATION",
    ]) Reflect.deleteProperty(process.env, key);
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");
    await expect(updateAdminLeadStatus(LEAD_ID, "qualified")).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "lead_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid identifiers and status values before persistence", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    await expect(updateAdminLeadStatus("not-a-uuid", "spam")).resolves.toMatchObject({
      ok: false,
      error: "invalid_lead_id",
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "internal_qa")).resolves.toMatchObject({
      ok: false,
      error: "invalid_status",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
