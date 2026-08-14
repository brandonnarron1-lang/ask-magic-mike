import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  requestPublicAppointment: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { appointmentRequest: { limit: 10, windowMs: 600_000 } },
  rateLimitKey: (value: string | null) => value || "anonymous",
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("../../app/lib/publicAppointmentRequest", () => ({
  requestPublicAppointment: mocks.requestPublicAppointment,
}));

import { POST } from "../../app/api/appointments/request/route";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

describe("POST /api/appointments/request security", () => {
  const originalPreviewEnv = {
    vercel: process.env.VERCEL_ENV,
    database: process.env.DATABASE_ENV,
    mode: process.env.PREVIEW_DATA_MODE,
    allow: process.env.ALLOW_PREVIEW_DB_MUTATION,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL_ENV;
    delete process.env.DATABASE_ENV;
    delete process.env.PREVIEW_DATA_MODE;
    delete process.env.ALLOW_PREVIEW_DB_MUTATION;
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60_000,
      durable: true,
    });
    mocks.requestPublicAppointment.mockResolvedValue({
      ok: true,
      status: "requested",
      appointment_id: "33333333-3333-4333-8333-333333333333",
      appointment_status: "requested",
      followup_status: "created",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete (process.env as Record<string, string | undefined>)[key];
      else process.env[key] = value;
    };
    restore("VERCEL_ENV", originalPreviewEnv.vercel);
    restore("DATABASE_ENV", originalPreviewEnv.database);
    restore("PREVIEW_DATA_MODE", originalPreviewEnv.mode);
    restore("ALLOW_PREVIEW_DB_MUTATION", originalPreviewEnv.allow);
  });

  it("rejects read-only Preview before the durable rate limiter can mutate Neon", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";
    const response = await POST(new Request("https://preview.example/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID }),
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "preview_data_disabled" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("rate-limits before parsing or persistence", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      durable: true,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.10" },
      body: "not-json",
    }));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("passes a valid request through after the rate-limit check", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.11" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "thank_you" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("192.0.2.11", 10, 600_000, "appointmentRequest");
    expect(mocks.requestPublicAppointment).toHaveBeenCalledWith({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
      requestSurface: "thank_you",
    });
  });
});
