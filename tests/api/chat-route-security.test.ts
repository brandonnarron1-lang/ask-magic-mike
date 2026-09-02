import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { chatMessage: { limit: 20, windowMs: 600_000 } },
  rateLimitKey: (value: string | null) => value || "anonymous",
  checkRateLimit: mocks.checkRateLimit,
  nonDurableRateLimitFallbackAllowed: () =>
    process.env.VERCEL_ENV !== "production"
    || process.env.RATE_LIMIT_EMERGENCY_MEMORY?.trim() === "1",
}));

import { POST } from "@/../app/api/chat/route";

describe("POST /api/chat secure public boundary", () => {
  const originalEnv = {
    databaseUrl: process.env.DATABASE_URL,
    openAiKey: process.env.OPENAI_API_KEY,
    aiEnabled: process.env.AI_PUBLIC_CHAT_ENABLED,
    vercelEnv: process.env.VERCEL_ENV,
    databaseEnv: process.env.DATABASE_ENV,
    emergencyMemory: process.env.RATE_LIMIT_EMERGENCY_MEMORY,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PUBLIC_CHAT_ENABLED;
    delete process.env.VERCEL_ENV;
    delete process.env.DATABASE_ENV;
    delete process.env.RATE_LIMIT_EMERGENCY_MEMORY;
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
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
    restore("DATABASE_URL", originalEnv.databaseUrl);
    restore("OPENAI_API_KEY", originalEnv.openAiKey);
    restore("AI_PUBLIC_CHAT_ENABLED", originalEnv.aiEnabled);
    restore("VERCEL_ENV", originalEnv.vercelEnv);
    restore("DATABASE_ENV", originalEnv.databaseEnv);
    restore("RATE_LIMIT_EMERGENCY_MEMORY", originalEnv.emergencyMemory);
  });

  it("rejects an unapproved browser origin", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.invalid", "x-forwarded-for": "203.0.113.20" },
      body: JSON.stringify({ message: "Hello" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("requires JSON before limiting or provider use", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "https://www.askmagicmike.com" },
      body: "Hello",
    }));
    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({ code: "unsupported_media_type" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an oversized declared body before reading or limiting it", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: {
        "content-length": "8193",
        "content-type": "application/json",
        origin: "https://www.askmagicmike.com",
      },
      body: JSON.stringify({ message: "Hello" }),
    }));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ code: "payload_too_large" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before limiting or provider use", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
      body: "{",
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_json" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("rejects oversized messages before provider use", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com", "x-forwarded-for": "203.0.113.21" },
      body: JSON.stringify({ message: "x".repeat(2_001) }),
    }));
    expect(response.status).toBe(413);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("stream-bounds the entire request when Content-Length is absent", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com", "x-forwarded-for": "203.0.113.23" },
      body: JSON.stringify({ message: "Hello", ignored_padding: "x".repeat(8_192) }),
    }));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: "Message is too large.",
      code: "payload_too_large",
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("rejects arrays and primitive JSON bodies", async () => {
    for (const body of ["[]", '"hello"', "null"]) {
      const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
        body,
      }));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ code: "invalid_json" });
    }
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("returns the safe local fallback with a correlation ID when AI is disabled", async () => {
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com", "x-forwarded-for": "203.0.113.22" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toContain("address-specific guidance");
    expect(body.correlation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("x-amm-correlation-id")).toBe(body.correlation_id);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "203.0.113.22",
      20,
      600_000,
      "chatMessage",
    );
  });

  it("uses deterministic Preview fallback without limiter or provider side effects", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.AI_PUBLIC_CHAT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "synthetic-test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(new Request("https://preview.example/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mode: "preview_fallback" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed before provider use when Production limiting is non-durable", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.AI_PUBLIC_CHAT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "synthetic-test-key";
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "rate_limit_store_unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("preserves the exact Production break-glass mode", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.RATE_LIMIT_EMERGENCY_MEMORY = "1";
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    expect(response.status).toBe(200);
  });

  it("calls the Responses API only after a durable Production limit check", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.AI_PUBLIC_CHAT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "synthetic-test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ output_text: "Start with a local property review." }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: "Start with a local property review.",
      mode: "responses_api",
    });
    expect(mocks.checkRateLimit).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("returns Retry-After when the chat limit is exhausted", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 10_000_000,
      durable: true,
    });
    const response = await POST(new Request("https://www.askmagicmike.com/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.askmagicmike.com" },
      body: JSON.stringify({ message: "How should I prepare to sell?" }),
    }));
    expect(response.status).toBe(429);
    const retryAfter = Number(response.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(600);
  });
});
