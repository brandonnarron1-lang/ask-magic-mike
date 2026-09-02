import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  requestPublicAppointment: vi.fn(),
  recordServerAnalyticsEvent: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { appointmentRequest: { limit: 10, windowMs: 600_000 } },
  rateLimitKey: (value: string | null) => value || "anonymous",
  checkRateLimit: mocks.checkRateLimit,
  nonDurableRateLimitFallbackAllowed: () =>
    process.env.VERCEL_ENV !== "production" || process.env.RATE_LIMIT_EMERGENCY_MEMORY?.trim() === "1",
}));

vi.mock("../../app/lib/publicAppointmentRequest", () => ({
  requestPublicAppointment: mocks.requestPublicAppointment,
}));

vi.mock("../../app/lib/serverAnalytics", () => ({
  recordServerAnalyticsEvent: mocks.recordServerAnalyticsEvent,
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
    emergencyMemory: process.env.RATE_LIMIT_EMERGENCY_MEMORY,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL_ENV;
    delete process.env.DATABASE_ENV;
    delete process.env.PREVIEW_DATA_MODE;
    delete process.env.ALLOW_PREVIEW_DB_MUTATION;
    delete process.env.RATE_LIMIT_EMERGENCY_MEMORY;
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
    mocks.recordServerAnalyticsEvent.mockResolvedValue(true);
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
    restore("RATE_LIMIT_EMERGENCY_MEMORY", originalPreviewEnv.emergencyMemory);
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
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("X-AMM-Correlation-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("passes a valid request through after the rate-limit check", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.11" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "seller_page" }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.correlation_id).toBe(response.headers.get("X-AMM-Correlation-Id"));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("192.0.2.11", 10, 600_000, "appointmentRequest");
    expect(mocks.requestPublicAppointment).toHaveBeenCalledWith({
      leadId: LEAD_ID,
      sessionId: SESSION_ID,
      requestSurface: "seller_page",
    });
    expect(mocks.recordServerAnalyticsEvent).toHaveBeenCalledWith({
      eventName: "appointment_requested",
      category: "intake",
      sessionId: SESSION_ID,
      leadId: LEAD_ID,
      properties: { request_surface: "seller_page" },
      userAgent: null,
    });
  });

  it("rejects an unapproved explicit origin before limiting or persistence", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "seller_page" }),
    }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "origin_not_approved" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("requires JSON before limiting or persistence", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not-json",
    }));
    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({ code: "unsupported_media_type" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("rejects declared and streamed oversized payloads", async () => {
    const declared = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "4096" },
      body: "{}",
    }));
    expect(declared.status).toBe(413);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();

    const streamed = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(2_100) }),
    }));
    expect(streamed.status).toBe(413);
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("rejects malformed, non-object, and unknown-surface payloads", async () => {
    for (const body of ["{bad", "[]", JSON.stringify({
      lead_id: LEAD_ID,
      session_id: SESSION_ID,
      request_surface: "thank_you",
    })]) {
      const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }));
      expect(response.status).toBe(400);
    }
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("accepts the renter conversion surface", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "renter_page" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.requestPublicAppointment).toHaveBeenCalledWith(expect.objectContaining({
      requestSurface: "renter_page",
    }));
  });

  it("fails closed when Production limiting is non-durable without break-glass approval", async () => {
    process.env.VERCEL_ENV = "production";
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "seller_page" }),
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "rate_limit_store_unavailable" });
    expect(mocks.requestPublicAppointment).not.toHaveBeenCalled();
  });

  it("allows the explicit Production in-memory break-glass mode", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.RATE_LIMIT_EMERGENCY_MEMORY = "1";
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "seller_page" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.requestPublicAppointment).toHaveBeenCalledOnce();
  });

  it("does not duplicate the trusted outcome event on an idempotent replay", async () => {
    mocks.requestPublicAppointment.mockResolvedValue({
      ok: true,
      status: "already_requested",
      appointment_id: "33333333-3333-4333-8333-333333333333",
      appointment_status: "requested",
      followup_status: "existing",
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "seller_page" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.recordServerAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("keeps a durably stored appointment truthful when analytics is unavailable", async () => {
    mocks.recordServerAnalyticsEvent.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(new Request("https://www.askmagicmike.com/api/appointments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: LEAD_ID, session_id: SESSION_ID, request_surface: "seller_page" }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "requested" });
    expect(errorSpy).toHaveBeenCalledWith(
      "[appointments] canonical outcome event write failed",
      expect.objectContaining({ error: "analytics_persistence_unavailable" }),
    );
  });
});
