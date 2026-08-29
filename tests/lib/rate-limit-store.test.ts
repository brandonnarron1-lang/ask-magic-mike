import { afterEach, describe, expect, it, vi } from "vitest";
import {
  durableRateLimitBucketKey,
  durableRateLimitDedicatedSecretReady,
  durableRateLimitHashSecretReady,
  durableRateLimitRequired,
  InMemoryRateLimitStore,
  checkRateLimit,
  nonDurableRateLimitFallbackAllowed,
  rateLimitEmergencyMemoryEnabled,
  rateLimitKey,
} from "@/lib/security/rate-limit";

describe("InMemoryRateLimitStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", () => {
    const store = new InMemoryRateLimitStore();
    const result = store.check("key-a", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests up to the limit", () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 5; i++) {
      expect(store.check("key-b", 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks the (limit+1)-th request in the same window", () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 5; i++) store.check("key-c", 5, 60_000);
    const blocked = store.check("key-c", 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks keys independently", () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 5; i++) store.check("key-d", 5, 60_000);
    expect(store.check("key-e", 5, 60_000).allowed).toBe(true);
  });

  it("resets the window when windowMs has elapsed", () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 5; i++) store.check("key-f", 5, 1);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(store.check("key-f", 5, 1).allowed).toBe(true);
        resolve();
      }, 5);
    });
  });

  it("returns resetAt as a future unix ms timestamp", () => {
    const store = new InMemoryRateLimitStore();
    const before = Date.now();
    const result = store.check("key-g", 5, 60_000);
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000 - 50);
  });

  it("result.durable is false for in-memory store", () => {
    const store = new InMemoryRateLimitStore();
    const result = store.check("key-h", 5, 60_000);
    expect(result.durable).toBe(false);
  });

  it("fails closed for unseen identifiers when its bounded capacity is full", () => {
    const store = new InMemoryRateLimitStore(2);

    expect(store.check("key-capacity-a", 5, 60_000).allowed).toBe(true);
    expect(store.check("key-capacity-b", 5, 60_000).allowed).toBe(true);
    expect(store.check("key-capacity-c", 5, 60_000)).toMatchObject({
      allowed: false,
      remaining: 0,
      durable: false,
    });
  });

  it("reclaims expired identifiers before enforcing its capacity cap", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T07:00:00.000Z"));
    const store = new InMemoryRateLimitStore(1);

    expect(store.check("key-expired-a", 5, 1_000).allowed).toBe(true);
    vi.advanceTimersByTime(1_001);
    expect(store.check("key-expired-b", 5, 1_000).allowed).toBe(true);
  });
});

describe("checkRateLimit — async, in-memory fallback in test env", () => {
  it("allows first request", async () => {
    const result = await checkRateLimit("test-unique-key-1", 10, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("blocks after limit is reached", async () => {
    const key = "test-unique-key-2";
    for (let i = 0; i < 10; i++) await checkRateLimit(key, 10, 60_000);
    const result = await checkRateLimit(key, 10, 60_000);
    expect(result.allowed).toBe(false);
  });

  it("uses in-memory fallback (durable: false) when no database is configured", async () => {
    const result = await checkRateLimit("test-durable-check", 10, 60_000);
    expect(result.durable).toBe(false);
  });

  it("returns remaining count and resetAt timestamp", async () => {
    const before = Date.now();
    const result = await checkRateLimit("test-unique-key-3", 5, 60_000);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThanOrEqual(before);
  });

  it("partitions fallback buckets by route prefix", async () => {
    const key = "test-route-partition-key";

    expect((await checkRateLimit(key, 1, 60_000, "intakeSubmit")).allowed).toBe(true);
    expect((await checkRateLimit(key, 1, 60_000, "intakeSubmit")).allowed).toBe(false);
    expect((await checkRateLimit(key, 1, 60_000, "analyticsEvent")).allowed).toBe(true);
  });
});

describe("rateLimitKey", () => {
  it("returns the IP when present", () => {
    expect(rateLimitKey("1.2.3.4")).toBe("1.2.3.4");
  });

  it("trims and takes the first IP in X-Forwarded-For", () => {
    expect(rateLimitKey("1.2.3.4, 5.6.7.8")).toBe("1.2.3.4");
  });

  it("returns 'anonymous' when IP header is null", () => {
    expect(rateLimitKey(null)).toBe("anonymous");
  });

  it("returns 'anonymous' when IP header is empty string", () => {
    expect(rateLimitKey("")).toBe("anonymous");
  });
});

describe("durableRateLimitBucketKey", () => {
  it("stores a versioned HMAC identifier instead of the raw limiter key", () => {
    const rawKey = "203.0.113.42";
    const result = durableRateLimitBucketKey(rawKey, "intakeSubmit", "test-secret-one-32-characters-long");

    expect(result).toMatch(/^amm:rl:v1:intakeSubmit:[0-9a-f]{64}$/);
    expect(result).not.toContain(rawKey);
    expect(result).not.toContain("test-secret-one-32-characters-long");
  });

  it("domain-separates route prefixes and server secrets", () => {
    const rawKey = "staff-principal-id";
    const intake = durableRateLimitBucketKey(rawKey, "intakeSubmit", "test-secret-one-32-characters-long");
    const chat = durableRateLimitBucketKey(rawKey, "chatMessage", "test-secret-one-32-characters-long");
    const rotated = durableRateLimitBucketKey(rawKey, "intakeSubmit", "test-secret-two-32-characters-long");

    expect(intake).not.toBe(chat);
    expect(intake).not.toBe(rotated);
  });

  it("rejects a short hash secret", () => {
    expect(() => durableRateLimitBucketKey("key", "intakeSubmit", "   ")).toThrow(
      "A durable rate-limit hash secret of at least 32 characters is required.",
    );
  });

  it("requires a strong server secret but accepts the documented fallback order", () => {
    expect(durableRateLimitHashSecretReady({ RATE_LIMIT_HASH_SECRET: "too-short" })).toBe(false);
    expect(durableRateLimitHashSecretReady({
      RATE_LIMIT_HASH_SECRET: "too-short",
      CRON_SECRET: "cron-secret-fallback-with-32-characters",
    })).toBe(true);
  });

  it("requires the dedicated secret for production readiness", () => {
    expect(durableRateLimitDedicatedSecretReady({
      CRON_SECRET: "cron-secret-fallback-with-32-characters",
    })).toBe(false);
    expect(durableRateLimitDedicatedSecretReady({
      RATE_LIMIT_HASH_SECRET: "dedicated-rate-limit-secret-32-characters",
      CRON_SECRET: "cron-secret-fallback-with-32-characters",
    })).toBe(true);
  });
});

describe("durableRateLimitRequired", () => {
  it("uses Vercel environment authority before NODE_ENV", () => {
    expect(durableRateLimitRequired({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(true);
    expect(durableRateLimitRequired({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(false);
  });

  it("requires durability for non-Vercel production runtimes", () => {
    expect(durableRateLimitRequired({ NODE_ENV: "production" })).toBe(true);
    expect(durableRateLimitRequired({ NODE_ENV: "development" })).toBe(false);
    expect(durableRateLimitRequired({ NODE_ENV: "test" })).toBe(false);
  });
});

describe("rateLimitEmergencyMemoryEnabled", () => {
  it("remains disabled when unset or configured with truthy-looking alternatives", () => {
    expect(rateLimitEmergencyMemoryEnabled({})).toBe(false);
    for (const value of ["", "0", "false", "true", "yes", "enabled"]) {
      expect(rateLimitEmergencyMemoryEnabled({ RATE_LIMIT_EMERGENCY_MEMORY: value })).toBe(false);
    }
  });

  it("enables break-glass memory mode only with the documented exact value", () => {
    expect(rateLimitEmergencyMemoryEnabled({ RATE_LIMIT_EMERGENCY_MEMORY: "1" })).toBe(true);
    expect(rateLimitEmergencyMemoryEnabled({ RATE_LIMIT_EMERGENCY_MEMORY: " 1 " })).toBe(true);
  });
});

describe("nonDurableRateLimitFallbackAllowed", () => {
  it("rejects non-durable fallback in Production unless break-glass mode is exact", () => {
    expect(nonDurableRateLimitFallbackAllowed({ VERCEL_ENV: "production" })).toBe(false);
    expect(nonDurableRateLimitFallbackAllowed({
      VERCEL_ENV: "production",
      RATE_LIMIT_EMERGENCY_MEMORY: "false",
    })).toBe(false);
    expect(nonDurableRateLimitFallbackAllowed({
      VERCEL_ENV: "production",
      RATE_LIMIT_EMERGENCY_MEMORY: "1",
    })).toBe(true);
  });

  it("allows the expected development, test, and Preview fallback behavior", () => {
    expect(nonDurableRateLimitFallbackAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(nonDurableRateLimitFallbackAllowed({ NODE_ENV: "test" })).toBe(true);
    expect(nonDurableRateLimitFallbackAllowed({
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    })).toBe(true);
  });
});
