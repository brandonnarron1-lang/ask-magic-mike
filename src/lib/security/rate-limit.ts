/**
 * Rate limiter — in-memory for development/test, Upstash Redis in production.
 *
 * Production requires:
 *   UPSTASH_REDIS_REST_URL    — Upstash console → REST API → Endpoint
 *   UPSTASH_REDIS_REST_TOKEN  — Upstash console → REST API → Token (server-only)
 *
 * If those vars are absent in production the limiter logs a critical warning
 * and falls back to in-memory (fail-open, not fail-closed).
 * Set RATE_LIMIT_EMERGENCY_MEMORY=1 in Vercel env to acknowledge the fallback
 * and silence the warning during a controlled degraded-mode deploy.
 *
 * checkRateLimit() is now async — all three callers must await it.
 */

import type { Ratelimit as UpstashRatelimit } from "@upstash/ratelimit";
import type { Redis as UpstashRedis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
  /** true = backed by Upstash Redis; false = in-memory fallback (not durable) */
  durable: boolean;
}

export interface RateLimitStore {
  check(key: string, limit: number, windowMs: number): RateLimitResult;
}

interface BucketEntry {
  count: number;
  windowStart: number;
}

/**
 * In-memory rate limit store (dev / test / emergency fallback only).
 *
 * LIMITATIONS — not launch-grade:
 * - Resets on every cold start
 * - Each serverless instance has independent state
 * - No shared state across horizontal scale-out
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, BucketEntry>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now   = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, durable: false };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs, durable: false };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.windowStart + windowMs, durable: false };
  }
}

// ─── Upstash singleton ─────────────────────────────────────────────────────────

let _redis: UpstashRedis | null = null;
let _limiters: Map<string, UpstashRatelimit> | null = null;
let _initAttempted = false;
let _neonSql: ReturnType<typeof import("@neondatabase/serverless")["neon"]> | null = null;

export function normalizeUpstashRestUrl(value: string | undefined) {
  const configuredUrl = value?.trim();
  if (!configuredUrl) return undefined;
  return /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;
}

async function getUpstashLimiter(prefix: string): Promise<UpstashRatelimit | null> {
  if (_initAttempted && !_redis) return null;

  const url = normalizeUpstashRestUrl(process.env.UPSTASH_REDIS_REST_URL);
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!_redis || !_limiters) {
    _initAttempted = true;
    try {
      const { Redis }     = await import("@upstash/redis");
      const { Ratelimit } = await import("@upstash/ratelimit");
      _redis    = new Redis({ url, token });
      _limiters = new Map();

      for (const [k, v] of Object.entries(LIMITS)) {
        const windowSecs = Math.ceil(v.windowMs / 1000);
        _limiters.set(k, new Ratelimit({
          // _redis is non-null here — we just constructed it above
          redis: _redis!,
          limiter: Ratelimit.slidingWindow(v.limit, `${windowSecs} s`),
          prefix: `amm:${k}`,
        }));
      }
    } catch (err) {
      console.error("[rate-limit] Failed to initialize Upstash Redis:", err);
      _redis    = null;
      _limiters = null;
      return null;
    }
  }

  return _limiters?.get(prefix) ?? null;
}

async function checkNeonRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  prefix: LimitKey,
): Promise<RateLimitResult | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    if (!_neonSql) {
      const { neon } = await import("@neondatabase/serverless");
      _neonSql = neon(databaseUrl);
    }
    const bucketKey = `${prefix}:${key}`;
    const rows = (await _neonSql`
      INSERT INTO public.rate_limit_buckets (bucket_key, request_count, window_started_at)
      VALUES (${bucketKey}, 1, NOW())
      ON CONFLICT (bucket_key) DO UPDATE SET
        request_count = CASE
          WHEN public.rate_limit_buckets.window_started_at <= NOW() - (${windowMs} * INTERVAL '1 millisecond')
            THEN 1
          ELSE public.rate_limit_buckets.request_count + 1
        END,
        window_started_at = CASE
          WHEN public.rate_limit_buckets.window_started_at <= NOW() - (${windowMs} * INTERVAL '1 millisecond')
            THEN NOW()
          ELSE public.rate_limit_buckets.window_started_at
        END
      RETURNING
        request_count,
        EXTRACT(EPOCH FROM (window_started_at + (${windowMs} * INTERVAL '1 millisecond'))) * 1000 AS reset_at
    `) as Array<{ request_count: number | string; reset_at: number | string }>;
    const requestCount = Number(rows[0]?.request_count || 0);
    const resetAt = Number(rows[0]?.reset_at || Date.now() + windowMs);
    return {
      allowed: requestCount <= limit,
      remaining: Math.max(0, limit - requestCount),
      resetAt,
      durable: true,
    };
  } catch (error) {
    console.error("[rate-limit] Failed to use Neon durable rate limiting:", error);
    _neonSql = null;
    return null;
  }
}

// ─── In-memory singleton ────────────────────────────────────────────────────────

const _memStore = new InMemoryRateLimitStore();

// ─── Preset configurations ──────────────────────────────────────────────────────

export const LIMITS = {
  /** /api/intake/submit — 10 per 10 minutes */
  intakeSubmit:   { limit: 10, windowMs: 10 * 60 * 1000 },
  /** /api/intake/step — 30 per 5 minutes */
  intakeStep:     { limit: 30, windowMs:  5 * 60 * 1000 },
  /** /api/session/create — 30 per 10 minutes */
  sessionCreate:  { limit: 30, windowMs: 10 * 60 * 1000 },
  /** /api/analytics/event — 60 per minute */
  analyticsEvent: { limit: 60, windowMs:       60 * 1000 },
} as const;

export type LimitKey = keyof typeof LIMITS;

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given key. Async — must be awaited.
 *
 * @param key    - IP address, session ID, or "anonymous" fallback
 * @param limit  - Max requests per window
 * @param windowMs - Window size in milliseconds
 * @param prefix - LIMITS key for Upstash limiter selection
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  prefix: LimitKey = "intakeSubmit",
): Promise<RateLimitResult> {
  // Next.js sets NODE_ENV=production for every optimized Vercel build,
  // including isolated previews. VERCEL_ENV is authoritative when present.
  const isProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";

  // Attempt Upstash whenever credentials are available (also in dev for manual testing)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const upstash = await getUpstashLimiter(prefix);
    if (upstash) {
      try {
        const { success, remaining, reset } = await upstash.limit(key);
        return { allowed: success, remaining, resetAt: reset, durable: true };
      } catch (error) {
        console.error("[rate-limit] Upstash unavailable; trying Neon:", error);
        _redis = null;
        _limiters = null;
      }
    }
  }

  const neonResult = await checkNeonRateLimit(key, limit, windowMs, prefix);
  if (neonResult) return neonResult;

  // Production without credentials: fail-open with critical log
  if (isProduction && !process.env.RATE_LIMIT_EMERGENCY_MEMORY) {
    console.error(
      "[rate-limit] CRITICAL: Production is using non-durable in-memory rate limiting. " +
      "Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable durable limits. " +
      "Set RATE_LIMIT_EMERGENCY_MEMORY=1 to acknowledge this degraded state."
    );
  }

  return _memStore.check(key, limit, windowMs);
}

/**
 * Derive a rate-limit key from an x-forwarded-for header value.
 * Falls back to "anonymous" when IP is unavailable (e.g. unit tests, local).
 */
export function rateLimitKey(ipHeader: string | null): string {
  // Use || null so empty string (empty header) falls through to "anonymous"
  // rather than becoming an empty-string bucket shared across all such requests.
  const ip = (ipHeader?.split(",")[0]?.trim()) || null;
  return ip ?? "anonymous";
}
