/**
 * Rate limiter — Neon PostgreSQL in production, in-memory in development/test.
 *
 * Production requires DATABASE_URL and the canonical rate_limit_buckets table.
 * If Neon is unavailable the limiter logs a critical warning and falls back to
 * in-memory (fail-open, not fail-closed) so a database incident does not turn
 * every public request into an outage.
 * Set RATE_LIMIT_EMERGENCY_MEMORY=1 in Vercel env to acknowledge the fallback
 * and silence the warning during a controlled degraded-mode deploy.
 *
 * checkRateLimit() is now async — all three callers must await it.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
  /** true = backed by Neon PostgreSQL; false = in-memory fallback (not durable) */
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

let _neonSql: ReturnType<typeof import("@neondatabase/serverless")["neon"]> | null = null;

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
  /** /api/chat — 20 messages per 10 minutes */
  chatMessage:    { limit: 20, windowMs: 10 * 60 * 1000 },
  /** Short-lived staff phone setup — 10 actions per 10 minutes */
  phoneSetup:     { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Public appointment follow-up request — 10 per 10 minutes */
  appointmentRequest: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Privileged KPI target writes — 30 per operator per hour */
  growthTarget: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;

export type LimitKey = keyof typeof LIMITS;

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given key. Async — must be awaited.
 *
 * @param key    - IP address, session ID, or "anonymous" fallback
 * @param limit  - Max requests per window
 * @param windowMs - Window size in milliseconds
 * @param prefix - LIMITS key used to partition durable buckets
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

  const neonResult = await checkNeonRateLimit(key, limit, windowMs, prefix);
  if (neonResult) return neonResult;

  // Production without credentials: fail-open with critical log
  if (isProduction && !process.env.RATE_LIMIT_EMERGENCY_MEMORY) {
    console.error(
      "[rate-limit] CRITICAL: Production is using non-durable in-memory rate limiting. " +
      "Set DATABASE_URL and apply the rate_limit_buckets migration to enable durable limits. " +
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
