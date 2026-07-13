import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestPublicAppointment } from "../../app/lib/publicAppointmentRequest";

const ORIGINAL_FETCH = globalThis.fetch;

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const APPOINTMENT_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    session_id: SESSION_ID,
    widget_session_id: SESSION_ID,
    assigned_agent_id: "44444444-4444-4444-8444-444444444444",
    status: "qualified",
    source: "home_value_page",
    source_detail: "home_value_page / sandbox / campaign",
    lead_type: "home_value",
    page_url: "https://askmagicmike.test/home-value",
    ...overrides,
  };
}

describe("public appointment request boundary", () => {
  it("rejects a valid lead id when the session reference does not match", async () => {
    const calls: Array<{ method: string; path: string }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const parsed = new URL(String(url));
      calls.push({ method: init?.method || "GET", path: parsed.pathname });
      return jsonResponse([leadRow({
        session_id: "99999999-9999-4999-8999-999999999999",
        widget_session_id: "99999999-9999-4999-8999-999999999999",
      })]);
    }) as unknown as typeof fetch;

    const result = await requestPublicAppointment({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
    });

    expect(result).toEqual({ ok: false, statusCode: 404, error: "appointment_request_not_found" });
    expect(calls).toEqual([{ method: "GET", path: "/rest/v1/leads" }]);
  });

  it("creates one requested appointment, syncs lifecycle, creates confirmation follow-up, and writes safe audit metadata", async () => {
    const calls: Array<{ method: string; path: string; body: Record<string, unknown> | null }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const parsed = new URL(String(url));
      const method = init?.method || "GET";
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : null;
      calls.push({ method, path: parsed.pathname, body });

      if (parsed.pathname === "/rest/v1/leads" && method === "GET") {
        return jsonResponse([leadRow()]);
      }
      if (parsed.pathname === "/rest/v1/lead_appointments" && method === "GET") {
        return jsonResponse([]);
      }
      if (parsed.pathname === "/rest/v1/lead_appointments" && method === "POST") {
        return jsonResponse([{
          id: APPOINTMENT_ID,
          lead_id: LEAD_ID,
          assigned_agent_id: "44444444-4444-4444-8444-444444444444",
          status: "requested",
          requested_at: "2026-07-12T18:00:00.000Z",
          timezone: "America/New_York",
          location_type: "office",
          created_at: "2026-07-12T18:00:00.000Z",
          updated_at: "2026-07-12T18:00:00.000Z",
        }]);
      }
      if (parsed.pathname === "/rest/v1/leads" && method === "PATCH") {
        return jsonResponse([{ id: LEAD_ID, status: "appointment_requested" }]);
      }
      if (parsed.pathname === "/rest/v1/tasks" && method === "GET") {
        return jsonResponse([]);
      }
      if (parsed.pathname === "/rest/v1/tasks" && method === "POST") {
        return jsonResponse([]);
      }
      if (parsed.pathname === "/rest/v1/audit_logs" && method === "POST") {
        return jsonResponse([]);
      }
      return jsonResponse([], 500);
    }) as unknown as typeof fetch;

    const result = await requestPublicAppointment({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
      requestSurface: "home_value_page",
      now: new Date("2026-07-12T18:00:00.000Z"),
    });

    expect(result).toMatchObject({
      ok: true,
      status: "requested",
      appointment_id: APPOINTMENT_ID,
      appointment_status: "requested",
      followup_status: "created",
    });
    const appointmentWrite = calls.find((call) => call.path === "/rest/v1/lead_appointments" && call.method === "POST");
    expect(appointmentWrite?.body).toMatchObject({
      lead_id: LEAD_ID,
      status: "requested",
      location_label: "home_value_page",
    });
    expect(appointmentWrite?.body).not.toHaveProperty("starts_at");
    expect(appointmentWrite?.body).not.toHaveProperty("ends_at");

    const leadPatch = calls.find((call) => call.path === "/rest/v1/leads" && call.method === "PATCH");
    expect(leadPatch?.body).toMatchObject({
      status: "appointment_requested",
      appointment_requested: true,
      conversion_stage: "appointment_requested",
    });

    const followupWrite = calls.find((call) => call.path === "/rest/v1/tasks" && call.method === "POST");
    expect(followupWrite?.body).toMatchObject({
      lead_id: LEAD_ID,
      title: "Confirm appointment request",
      status: "open",
      priority: "high",
      category: "followup:appointment_confirmation",
    });

    const serializedCalls = JSON.stringify(calls);
    expect(serializedCalls).not.toContain("fake-service-role");
    expect(serializedCalls).not.toContain("@");
  });

  it("returns an existing active appointment without creating a duplicate", async () => {
    const calls: Array<{ method: string; path: string }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const parsed = new URL(String(url));
      const method = init?.method || "GET";
      calls.push({ method, path: parsed.pathname });
      if (parsed.pathname === "/rest/v1/leads") return jsonResponse([leadRow()]);
      if (parsed.pathname === "/rest/v1/lead_appointments") {
        return jsonResponse([{
          id: APPOINTMENT_ID,
          lead_id: LEAD_ID,
          status: "requested",
          requested_at: "2026-07-12T18:00:00.000Z",
          timezone: "America/New_York",
          location_type: "office",
        }]);
      }
      if (parsed.pathname === "/rest/v1/tasks") return jsonResponse([{ id: "task-1", status: "open" }]);
      return jsonResponse([], 500);
    }) as unknown as typeof fetch;

    const result = await requestPublicAppointment({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "already_requested",
      appointment_id: APPOINTMENT_ID,
      followup_status: "existing",
    });
    expect(calls.filter((call) => call.path === "/rest/v1/lead_appointments" && call.method === "POST")).toHaveLength(0);
  });

  it("keeps the appointment request successful when follow-up creation is degraded", async () => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const parsed = new URL(String(url));
      const method = init?.method || "GET";
      if (parsed.pathname === "/rest/v1/leads" && method === "GET") return jsonResponse([leadRow()]);
      if (parsed.pathname === "/rest/v1/lead_appointments" && method === "GET") return jsonResponse([]);
      if (parsed.pathname === "/rest/v1/lead_appointments" && method === "POST") {
        return jsonResponse([{ id: APPOINTMENT_ID, lead_id: LEAD_ID, status: "requested" }]);
      }
      if (parsed.pathname === "/rest/v1/leads" && method === "PATCH") return jsonResponse([{ id: LEAD_ID }]);
      if (parsed.pathname === "/rest/v1/tasks" && method === "GET") return jsonResponse([]);
      if (parsed.pathname === "/rest/v1/tasks" && method === "POST") return jsonResponse({ error: "temporary" }, 500);
      if (parsed.pathname === "/rest/v1/audit_logs" && method === "POST") return jsonResponse([]);
      return jsonResponse([]);
    }) as unknown as typeof fetch;

    const result = await requestPublicAppointment({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "requested",
      followup_status: "unavailable",
      warning: "appointment_requested_followup_failed",
    });
  });
});
