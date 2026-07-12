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

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

describe("AdminOps lead status actions", () => {
  it("uses only status values supported by the production leads status constraint", () => {
    expect(ADMIN_LEAD_STATUSES).toEqual([
      "new",
      "scored",
      "qualified",
      "assigned",
      "contacted",
      "appointment_requested",
      "appointment_set",
      "nurture",
      "dead",
      "converted",
      "spam",
      "escalated",
    ]);
    expect(isAdminLeadStatus("spam")).toBe(true);
    expect(isAdminLeadStatus("internal_qa")).toBe(false);
    expect(isAdminLeadStatus("archived")).toBe(false);
  });

  it("exposes operational actions for contacted, qualified, appointment, closed, and spam/test workflows", () => {
    expect(ADMIN_LEAD_STATUS_ACTIONS.map((action) => action.status)).toEqual([
      "contacted",
      "qualified",
      "appointment_requested",
      "appointment_set",
      "nurture",
      "converted",
      "dead",
      "spam",
      "escalated",
      "new",
    ]);
    expect(ADMIN_LEAD_STATUS_ACTIONS.find((action) => action.status === "spam")).toMatchObject({
      requiresConfirmation: true,
      confirmationLabel: "Confirm not a real lead",
    });
  });

  it("defines allowed transitions without introducing status synonyms", () => {
    expect(isAllowedLeadTransition("new", "contacted")).toBe(true);
    expect(isAllowedLeadTransition("contacted", "qualified")).toBe(true);
    expect(isAllowedLeadTransition("qualified", "appointment_set")).toBe(true);
    expect(isAllowedLeadTransition("converted", "contacted")).toBe(false);
    expect(isAllowedLeadTransition("dead", "converted")).toBe(false);
    expect(isAllowedLeadTransition("dead", "new")).toBe(true);
  });

  it("defines an explicit cleanup patch for every destination lifecycle status", () => {
    const nowIso = "2026-07-12T12:00:00.000Z";
    const patches = Object.fromEntries(
      ADMIN_LEAD_STATUSES.map((status) => [
        status,
        buildLeadLifecyclePatch(status, {
          nowIso,
          reason: status === "dead" ? "timing_changed" : status === "spam" ? "internal_test" : null,
        }),
      ]),
    );

    expect(Object.keys(patches)).toEqual(ADMIN_LEAD_STATUSES);
    expect(patches.new).toMatchObject({
      status: "new",
      conversion_stage: null,
      converted_at: null,
      closed_won_at: null,
      closed_lost_at: null,
      closed_lost_reason: null,
      appointment_requested: false,
    });
    expect(patches.dead).toMatchObject({
      status: "dead",
      closed_lost_at: nowIso,
      closed_lost_reason: "timing_changed",
      conversion_stage: "dead",
      converted_at: null,
      closed_won_at: null,
    });
    expect(patches.spam).toMatchObject({
      status: "spam",
      closed_lost_at: nowIso,
      closed_lost_reason: "internal_test",
      conversion_stage: "disqualified",
      converted_at: null,
      closed_won_at: null,
      appointment_requested: false,
    });
    expect(patches.converted).toMatchObject({
      status: "converted",
      converted_at: nowIso,
      closed_won_at: nowIso,
      conversion_stage: "converted",
      closed_lost_at: null,
      closed_lost_reason: null,
    });
    expect(patches.appointment_requested).toMatchObject({
      appointment_requested: true,
      conversion_stage: "appointment_requested",
    });
    expect(patches.appointment_set).toMatchObject({
      appointment_requested: true,
      conversion_stage: "appointment_set",
    });
  });

  it("validates destination-specific terminal reasons", () => {
    expect(validateTerminalReasonForStatus("dead", LOST_REASONS[0])).toEqual({
      ok: true,
      reason: LOST_REASONS[0],
    });
    expect(validateTerminalReasonForStatus("spam", DISQUALIFIED_REASONS[0])).toEqual({
      ok: true,
      reason: DISQUALIFIED_REASONS[0],
    });
    expect(validateTerminalReasonForStatus("dead", DISQUALIFIED_REASONS[0])).toEqual({
      ok: false,
      error: "invalid_terminal_reason",
    });
    expect(validateTerminalReasonForStatus("spam", LOST_REASONS[0])).toEqual({
      ok: false,
      error: "invalid_terminal_reason",
    });
    expect(validateTerminalReasonForStatus("qualified", LOST_REASONS[0])).toEqual({
      ok: false,
      error: "invalid_terminal_reason",
    });
    expect(validateTerminalReasonForStatus("dead", null)).toEqual({
      ok: false,
      error: "invalid_terminal_reason",
    });
  });

  it("updates lifecycle status with optimistic concurrency and writes an audit event", async () => {
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
          json: async () => [{ id: LEAD_ID, status: "qualified" }],
        } as Response;
      }
      if (init.method === "POST") {
        return { ok: true, status: 201, statusText: "Created" } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, status: "spam" }],
      } as Response;
    }) as unknown as typeof fetch;

    const result = await updateAdminLeadStatus(LEAD_ID, "spam", {
      reason: "internal_test",
      now: new Date("2026-07-12T12:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, status: "spam" });
    expect(captured.map((call) => call.init?.method || "GET")).toEqual(["GET", "PATCH", "POST"]);
    expect(captured[0].url).toBe("https://fake.supabase.co/rest/v1/leads?id=eq." + LEAD_ID + "&select=id%2Cstatus&limit=1");
    expect(captured[1].url).toBe("https://fake.supabase.co/rest/v1/leads?id=eq." + LEAD_ID + "&status=eq.qualified&select=id%2Cstatus");
    expect(captured[1].body).toEqual({
      status: "spam",
      appointment_requested: false,
      closed_lost_at: "2026-07-12T12:00:00.000Z",
      closed_lost_reason: "internal_test",
      conversion_stage: "disqualified",
      converted_at: null,
      closed_won_at: null,
    });
    expect(captured[1].body).not.toHaveProperty("address_raw");
    expect(captured[1].body).not.toHaveProperty("email");
    expect(captured[1].body).not.toHaveProperty("phone");
    expect(captured[2].url).toContain("/rest/v1/audit_logs");
    expect(captured[2].body).toMatchObject({
      action: "lead.lifecycle_changed",
      resource_type: "lead",
      resource_id: LEAD_ID,
      before_state: { status: "qualified" },
      after_state: { status: "spam", reason: "internal_test" },
    });
  });

  it("rejects invalid lead ids and statuses before calling Supabase", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(updateAdminLeadStatus("not-a-uuid", "spam")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_lead_id",
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "internal_qa")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_status",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects missing or mismatched terminal reasons before patching", async () => {
    const calls: Array<{ init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ init });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, status: "qualified" }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "dead")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_terminal_reason",
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "dead", { reason: "internal_test" })).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_terminal_reason",
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "spam", { reason: "timing_changed" })).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_terminal_reason",
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "qualified", { reason: "timing_changed" })).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_terminal_reason",
    });
    expect(calls.map((call) => call.init?.method || "GET")).toEqual(["GET", "GET", "GET", "GET"]);
  });

  it("handles unknown lead ids without leaking raw database errors", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => [],
    })) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: false,
      statusCode: 404,
      error: "lead_not_found",
    });
  });

  it("treats same-state submission as idempotent without patching or auditing", async () => {
    const calls: Array<{ init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ init });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, status: "contacted" }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: true,
      status: "contacted",
      warning: "status_already_current",
    });
    expect(calls.map((call) => call.init?.method || "GET")).toEqual(["GET"]);
  });

  it("treats terminal same-state submission as idempotent before requiring a reason", async () => {
    const calls: Array<{ init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ init });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, status: "dead" }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "dead")).resolves.toEqual({
      ok: true,
      status: "dead",
      warning: "status_already_current",
    });
    expect(calls.map((call) => call.init?.method || "GET")).toEqual(["GET"]);
  });

  it("rejects forbidden regressions and optimistic conflicts safely", async () => {
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, status: "converted" }],
        } as Response;
      }
      throw new Error("PATCH should not run");
    }) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "forbidden_transition",
    });

    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, status: "qualified" }],
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "appointment_set")).resolves.toEqual({
      ok: false,
      statusCode: 409,
      error: "concurrent_status_update",
    });
  });

  it("reports lifecycle update success with a dedicated audit warning when audit write fails", async () => {
    globalThis.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [{ id: LEAD_ID, status: "contacted" }],
        } as Response;
      }
      if (init.method === "POST") {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, status: "qualified" }],
      } as Response;
    }) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "qualified")).resolves.toEqual({
      ok: true,
      status: "qualified",
      warning: "lifecycle_updated_audit_failed",
    });
  });

  it("detects stalled lead signals from canonical thresholds", () => {
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

  it("returns a safe failure when the lead store is not configured", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "lead_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
