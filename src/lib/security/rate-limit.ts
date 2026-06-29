/**
 * Rate limiter stub — in-memory for development, Upstash-ready for production.
 *
 * TODO (before launch): Replace the in-memory store with Upstash Redis:
 *   npm install @upstash/ratelimit @upstash/redis
 *   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production env.
 *
 * NOTE: The in-memory limiter resets on every cold start and does not share
 * state across multiple server instances. It provides best-effort protection
 * in single-instance dev environments only.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

/**
 * Abstraction over the rate-limit backing store.
 *
 * The current implementation is InMemoryRateLimitStore — it works for
 * local dev and single-instance deploys but is NOT launch-grade.
 *
 * To upgrade to Upstash Redis:
 *   1. Install @upstash/ratelimit @upstash/redis
 *   2. Implement DurableRateLimitStore using @upstash/ratelimit (see
 *      docs/RATE_LIMITING_DURABILITY_PLAN.md for the full migration sketch)
 *   3. Export the durable store from this file and swap the call site below
 *
 * The interface is synchronous-only for now (matching the current Map
 * implementation). A durable store would need async — update the interface
 * and callers at that point.
 */
export interface RateLimitStore {
  check(key: string, limit: number, windowMs: number): RateLimitResult;
}

interface BucketEntry {
  count: number;
  windowStart: number;
}

/**
 * In-memory rate limit store.
 *
 * LIMITATIONS (not launch-grade):
 * - Resets to zero on every cold start (serverless functions = frequent resets)
 * - Each Vercel/Node instance has its own isolated store
 * - No shared state across horizontally-scaled instances
 *
 * See docs/RATE_LIMITING_DURABILITY_PLAN.md for the Upstash upgrade path.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, BucketEntry>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.windowStart + windowMs,
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.windowStart + windowMs,
    };
  }
}

// In-memory store: key → { count, windowStart }
// Used by the legacy checkRateLimit() function below. The InMemoryRateLimitStore
// class above provides the same logic through the RateLimitStore interface.
const store = new Map<string, BucketEntry>();

/**
 * Check rate limit for a given key.
 * @param key     - IP address, session ID, or anonymous fallback
 * @param limit   - Max requests per window
 * @param windowMs - Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return {
      allowed:   false,
      remaining: 0,
      resetAt:   entry.windowStart + windowMs,
    };
  }

  entry.count += 1;
  return {
    allowed:   true,
    remaining: limit - entry.count,
    resetAt:   entry.windowStart + windowMs,
  };
}

// Preset configurations for each route
export const LIMITS = {
  /** /api/intake/submit — 10 per 10 minutes */
  intakeSubmit: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** /api/intake/step — 30 per 5 minutes */
  intakeStep: { limit: 30, windowMs: 5 * 60 * 1000 },
  /** /api/session/create — 30 per 10 minutes */
  sessionCreate: { limit: 30, windowMs: 10 * 60 * 1000 },
  /** /api/analytics/event — 60 per minute */
  analyticsEvent: { limit: 60, windowMs: 60 * 1000 },
} as const;

/**
 * Derive a rate-limit key from a request.
 * Falls back to "anonymous" when IP is unavailable (e.g. unit tests).
 */
export function rateLimitKey(ipHeader: string | null): string {
  const ip = ipHeader?.split(",")[0]?.trim();
  return ip ?? "anonymous";
}
