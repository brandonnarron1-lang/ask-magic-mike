import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { sessionCreate: { limit: 30, windowMs: 600_000 } },
  rateLimitKey: (value: string | null) => value || "anonymous",
  checkRateLimit: mocks.checkRateLimit,
  nonDurableRateLimitFallbackAllowed: () =>
    process.env.VERCEL_ENV !== "production"
    || process.env.RATE_LIMIT_EMERGENCY_MEMORY?.trim() === "1",
}));

import { POST } from "@/../app/api/chat/session/route";

describe("POST /api/chat/session secure public boundary", () => {
  const originalEnv = {
    vercelEnv: process.env.VERCEL_ENV,
    databaseEnv: process.env.DATABASE_ENV,
    emergencyMemory: process.env.RATE_LIMIT_EMERGENCY_MEMORY,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL_ENV;
    delete process.env.DATABASE_ENV;
    delete process.env.RATE_LIMIT_EMERGENCY_MEMORY;
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
      durable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete (process.env as Record<string, string | undefined>)[key];
      else process.env[key] = value;
    };
    restore("VERCEL_ENV", originalEnv.vercelEnv);
    restore("DATABASE_ENV", originalEnv.databaseEnv);
    restore("RATE_LIMIT_EMERGENCY_MEMORY", originalEnv.emergencyMemory);
  });

  it("rejects an unapproved explicit origin before rate limiting", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat/session", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-for": "203.0.113.30",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ code: "origin_not_approved" });
    expect(body.correlation_id).toBe(response.headers.get("x-amm-correlation-id"));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("issues an ephemeral Preview identifier without touching the limiter", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    const response = await POST(new Request("https://preview.example/api/chat/session", {
      method: "POST",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ mode: "preview_ephemeral" });
    expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.correlation_id).toBe(response.headers.get("x-amm-correlation-id"));
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("issues a Production identifier only after a durable limit check", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat/session", {
      method: "POST",
      headers: {
        origin: "https://www.askmagicmike.com",
        "x-forwarded-for": "203.0.113.31",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.correlation_id).toBe(response.headers.get("x-amm-correlation-id"));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "203.0.113.31",
      30,
      600_000,
      "sessionCreate",
    );
  });

  it("fails closed when Production limiting is non-durable", async () => {
    process.env.VERCEL_ENV = "production";
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat/session", {
      method: "POST",
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_store_unavailable",
    });
  });

  it("preserves the exact Production in-memory break-glass mode", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.RATE_LIMIT_EMERGENCY_MEMORY = "1";
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat/session", {
      method: "POST",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      session_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it("returns bounded retry guidance when the session limit is exhausted", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 10_000_000,
      durable: true,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat/session", {
      method: "POST",
    }));
    const body = await response.json();
    const retryAfter = Number(response.headers.get("retry-after"));

    expect(response.status).toBe(429);
    expect(body).toMatchObject({ code: "rate_limited" });
    expect(body).not.toHaveProperty("session_id");
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(600);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });
});
