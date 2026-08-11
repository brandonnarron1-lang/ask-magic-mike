import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestPublicAppointment } from "../../app/lib/publicAppointmentRequest";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const APPOINTMENT_ID = "33333333-3333-4333-8333-333333333333";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-local-key";
  delete process.env.VERCEL_ENV;
  delete process.env.DATABASE_ENV;
  delete process.env.PREVIEW_DATA_MODE;
  delete process.env.ALLOW_PREVIEW_DB_MUTATION;
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");
  Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");
  delete process.env.VERCEL_ENV;
  delete process.env.DATABASE_ENV;
  delete process.env.PREVIEW_DATA_MODE;
  delete process.env.ALLOW_PREVIEW_DB_MUTATION;
});

describe("public appointment atomic persistence boundary", () => {
  it("refuses Preview read-only requests before any persistence call", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await requestPublicAppointment({ leadId: LEAD_ID, sessionId: SESSION_ID })).toEqual({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a truthful 503 when appointment persistence is missing", async () => {
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SUPABASE_URL");
    Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await requestPublicAppointment({ leadId: LEAD_ID, sessionId: SESSION_ID })).toEqual({
      ok: false,
      statusCode: 503,
      error: "appointment_request_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects malformed references", async () => {
    expect(await requestPublicAppointment({ leadId: "bad", sessionId: SESSION_ID })).toMatchObject({
      ok: false,
      statusCode: 400,
    });
  });

  it("maps a session mismatch to not found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({
      ok: false,
      error: "appointment_request_not_found",
    })));
    expect(await requestPublicAppointment({ leadId: LEAD_ID, sessionId: SESSION_ID })).toEqual({
      ok: false,
      statusCode: 404,
      error: "appointment_request_not_found",
    });
  });

  it("creates appointment intent, lifecycle, audit, and follow-up through one RPC", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
      });
      return response({
        ok: true,
        status: "requested",
        appointment_id: APPOINTMENT_ID,
        appointment_status: "requested",
        followup_status: "created",
      });
    }));
    const result = await requestPublicAppointment({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
      requestSurface: "home_value_page",
      now: new Date("2026-07-16T12:00:00.000Z"),
    });
    expect(result).toMatchObject({
      ok: true,
      status: "requested",
      appointment_id: APPOINTMENT_ID,
      followup_status: "created",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/rest/v1/rpc/request_public_appointment_v1");
    expect(calls[0].body).toMatchObject({
      p_lead_id: LEAD_ID,
      p_session_id: SESSION_ID,
      p_request_surface: "home_value_page",
    });
  });

  it("returns the existing appointment on a repeated request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({
      ok: true,
      status: "already_requested",
      appointment_id: APPOINTMENT_ID,
      appointment_status: "requested",
      followup_status: "existing",
    })));
    expect(await requestPublicAppointment({ leadId: LEAD_ID, sessionId: SESSION_ID })).toMatchObject({
      ok: true,
      status: "already_requested",
      appointment_id: APPOINTMENT_ID,
      followup_status: "existing",
    });
  });

  it("never reports success when the atomic write fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ error: "synthetic" }, 500)));
    expect(await requestPublicAppointment({ leadId: LEAD_ID, sessionId: SESSION_ID })).toMatchObject({
      ok: false,
      statusCode: 500,
      error: "appointment_request_create_failed",
    });
  });
});
