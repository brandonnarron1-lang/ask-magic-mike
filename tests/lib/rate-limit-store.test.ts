import { describe, expect, it } from "vitest";
import {
  InMemoryRateLimitStore,
  checkRateLimit,
  rateLimitKey,
} from "@/lib/security/rate-limit";

describe("InMemoryRateLimitStore", () => {
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

  it("uses in-memory fallback (durable: false) when no Upstash creds", async () => {
    const result = await checkRateLimit("test-durable-check", 10, 60_000);
    expect(result.durable).toBe(false);
  });

  it("returns remaining count and resetAt timestamp", async () => {
    const before = Date.now();
    const result = await checkRateLimit("test-unique-key-3", 5, 60_000);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThanOrEqual(before);
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
