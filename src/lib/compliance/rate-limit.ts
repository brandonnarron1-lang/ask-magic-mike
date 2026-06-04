/**
 * In-memory token-bucket rate limiter.
 *
 * Use for public capture endpoints. Per-IP token bucket with a sliding
 * window — pluggable so a Redis-backed implementation can swap in later
 * without touching callers.
 *
 * NOT cluster-aware in this implementation. On Vercel each function
 * instance has its own bucket; tighten via Redis (Upstash) when traffic
 * warrants. Default limit is 10 req / 60s (override per call site).
 */

export interface RateLimitOptions {
  /** Sliding window in milliseconds. */
  windowMs?: number;
  /** Max requests per window. */
  max?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

export interface RateLimiter {
  check(key: string, opts?: RateLimitOptions): RateLimitResult;
  /** Convenience: clears the in-memory state (useful for tests). */
  reset(): void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = Number(process.env.LEAD_RATE_LIMIT_PER_MINUTE ?? 10);

export function createInMemoryRateLimiter(
  defaults?: RateLimitOptions
): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const windowMs = defaults?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxDefault = defaults?.max ?? DEFAULT_MAX;

  return {
    check(key, opts) {
      const now = Date.now();
      const w = opts?.windowMs ?? windowMs;
      const max = opts?.max ?? maxDefault;
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const fresh: Bucket = { count: 1, resetAt: now + w };
        buckets.set(key, fresh);
        return { allowed: true, remaining: max - 1, resetAtMs: fresh.resetAt };
      }
      if (existing.count >= max) {
        return { allowed: false, remaining: 0, resetAtMs: existing.resetAt };
      }
      existing.count += 1;
      return {
        allowed: true,
        remaining: max - existing.count,
        resetAtMs: existing.resetAt,
      };
    },
    reset() {
      buckets.clear();
    },
  };
}

// Module-singleton default (used by route handlers).
export const defaultLeadRateLimiter = createInMemoryRateLimiter();

/** Derive a stable bucket key from an IP-or-equivalent + route. */
export function bucketKey(ip: string, route: string): string {
  return `${route}:${ip}`;
}
