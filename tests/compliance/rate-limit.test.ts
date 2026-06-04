import { describe, expect, it, beforeEach } from "vitest";
import {
  createInMemoryRateLimiter,
  bucketKey,
} from "@/lib/compliance/rate-limit";

describe("rate limiter", () => {
  const limiter = createInMemoryRateLimiter({ windowMs: 1_000, max: 3 });

  beforeEach(() => {
    limiter.reset();
  });

  it("allows requests up to max", () => {
    const k = bucketKey("1.2.3.4", "/api/leads");
    expect(limiter.check(k).allowed).toBe(true);
    expect(limiter.check(k).allowed).toBe(true);
    expect(limiter.check(k).allowed).toBe(true);
  });

  it("blocks the (max+1)-th request", () => {
    const k = bucketKey("1.2.3.4", "/api/leads");
    for (let i = 0; i < 3; i++) limiter.check(k);
    const blocked = limiter.check(k);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("counts buckets per key independently", () => {
    const a = bucketKey("1.2.3.4", "/api/leads");
    const b = bucketKey("5.6.7.8", "/api/leads");
    for (let i = 0; i < 3; i++) limiter.check(a);
    expect(limiter.check(b).allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const k = bucketKey("1.2.3.4", "/api/leads");
    for (let i = 0; i < 3; i++) limiter.check(k);
    expect(limiter.check(k).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 1_050));
    expect(limiter.check(k).allowed).toBe(true);
  });
});
