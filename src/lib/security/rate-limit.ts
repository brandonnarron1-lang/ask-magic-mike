import { createHmac } from "node:crypto";

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
  expiresAt: number;
}

const DURABLE_BUCKET_KEY_VERSION = "v1";
const DURABLE_BUCKET_RETENTION_MS = 24 * 60 * 60 * 1000;
const DURABLE_BUCKET_SECRET_MIN_LENGTH = 32;
const IN_MEMORY_RATE_LIMIT_MAX_BUCKETS = 10_000;
const IN_MEMORY_RATE_LIMIT_SWEEP_INTERVAL = 256;

type DurableRateLimitSecretEnv = Partial<Record<
  "RATE_LIMIT_HASH_SECRET" | "CONSENT_IP_HASH_SALT" | "CRON_SECRET" | "ADMIN_SECRET",
  string | undefined
>>;

type RateLimitRuntimeEnv = Partial<Record<"VERCEL_ENV" | "NODE_ENV", string | undefined>>;

type RateLimitEmergencyEnv = Partial<Record<"RATE_LIMIT_EMERGENCY_MEMORY", string | undefined>>;

type RateLimitFallbackEnv = RateLimitRuntimeEnv & RateLimitEmergencyEnv;

function durableBucketHashSecret(env: DurableRateLimitSecretEnv = process.env): string | null {
  const candidates = [
    env.RATE_LIMIT_HASH_SECRET,
    env.CONSENT_IP_HASH_SALT,
    env.CRON_SECRET,
    env.ADMIN_SECRET,
  ];
  return candidates
    .map((candidate) => candidate?.trim() || "")
    .find((candidate) => candidate.length >= DURABLE_BUCKET_SECRET_MIN_LENGTH) || null;
}

/** Boolean-only readiness probe for protected health output and tests. */
export function durableRateLimitHashSecretReady(env: DurableRateLimitSecretEnv = process.env): boolean {
  return durableBucketHashSecret(env) !== null;
}

/** Production readiness requires the purpose-specific secret, not a reused credential. */
export function durableRateLimitDedicatedSecretReady(
  env: DurableRateLimitSecretEnv = process.env,
): boolean {
  return (env.RATE_LIMIT_HASH_SECRET?.trim().length || 0) >= DURABLE_BUCKET_SECRET_MIN_LENGTH;
}

/** Preview is read-only; every real production runtime requires shared limiting. */
export function durableRateLimitRequired(env: RateLimitRuntimeEnv = process.env): boolean {
  return env.VERCEL_ENV ? env.VERCEL_ENV === "production" : env.NODE_ENV === "production";
}

/** Break-glass mode is deliberately narrow: only the documented exact value enables it. */
export function rateLimitEmergencyMemoryEnabled(
  env: RateLimitEmergencyEnv = process.env,
): boolean {
  return env.RATE_LIMIT_EMERGENCY_MEMORY?.trim() === "1";
}

/** Non-durable limiting is normal off Production and break-glass-only on Production. */
export function nonDurableRateLimitFallbackAllowed(
  env: RateLimitFallbackEnv = process.env,
): boolean {
  return !durableRateLimitRequired(env) || rateLimitEmergencyMemoryEnabled(env);
}

/**
 * Build the durable identifier stored in Neon without persisting the raw
 * client IP, staff principal, session identifier, or other limiter key.
 *
 * The route prefix remains visible for operations, while the sensitive key is
 * domain-separated and HMAC-SHA-256 pseudonymized with a server-only secret.
 */
export function durableRateLimitBucketKey(
  key: string,
  prefix: LimitKey,
  secret: string,
): string {
  const normalizedSecret = secret.trim();
  if (normalizedSecret.length < DURABLE_BUCKET_SECRET_MIN_LENGTH) {
    throw new Error("A durable rate-limit hash secret of at least 32 characters is required.");
  }
  const digest = createHmac("sha256", normalizedSecret)
    .update(`ask-magic-mike:rate-limit:${DURABLE_BUCKET_KEY_VERSION}\0${prefix}\0${key}`)
    .digest("hex");
  return `amm:rl:${DURABLE_BUCKET_KEY_VERSION}:${prefix}:${digest}`;
}

/**
 * In-memory rate limit store (dev / test / emergency fallback only).
 *
 * LIMITATIONS — not launch-grade:
 * - Resets on every cold start
 * - Each serverless instance has independent state
 * - No shared state across horizontal scale-out
 *
 * The emergency store is still bounded. Expired buckets are reclaimed and new
 * identifiers fail closed once the cap is reached, preventing an attacker from
 * turning unique-IP traffic into unbounded process memory growth.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, BucketEntry>();
  private checksSinceSweep = 0;

  constructor(private readonly maxBuckets = IN_MEMORY_RATE_LIMIT_MAX_BUCKETS) {
    if (!Number.isSafeInteger(maxBuckets) || maxBuckets < 1) {
      throw new Error("In-memory rate-limit capacity must be a positive safe integer.");
    }
  }

  private sweepExpired(now: number) {
    for (const [bucketKey, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(bucketKey);
    }
    this.checksSinceSweep = 0;
  }

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now   = Date.now();
    let entry = this.store.get(key);

    if (entry && entry.expiresAt <= now) {
      this.store.delete(key);
      entry = undefined;
    }

    if (!entry) {
      this.checksSinceSweep += 1;
      if (
        this.checksSinceSweep >= IN_MEMORY_RATE_LIMIT_SWEEP_INTERVAL
        || this.store.size >= this.maxBuckets
      ) {
        this.sweepExpired(now);
      }

      if (this.store.size >= this.maxBuckets) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: now + windowMs,
          durable: false,
        };
      }

      this.store.set(key, { count: 1, expiresAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, durable: false };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.expiresAt, durable: false };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.expiresAt, durable: false };
  }
}

let _neonSql: ReturnType<typeof import("@neondatabase/serverless")["neon"]> | null = null;

function classifyDurableStoreError(error: unknown):
  | "authentication_failed"
  | "permission_denied"
  | "connection_failed"
  | "query_failed" {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("authentication") || message.includes("password")) {
    return "authentication_failed";
  }
  if (message.includes("permission") || message.includes("privilege")) {
    return "permission_denied";
  }
  if (
    message.includes("connect")
    || message.includes("fetch")
    || message.includes("network")
    || message.includes("timeout")
  ) {
    return "connection_failed";
  }
  return "query_failed";
}

async function checkNeonRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  prefix: LimitKey,
): Promise<RateLimitResult | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const hashSecret = durableBucketHashSecret();
  if (!hashSecret) {
    console.error(
      "[rate-limit] Durable limiting is unavailable because no server-only hash secret is configured. " +
      "Set a 32+ character RATE_LIMIT_HASH_SECRET or retain one of the documented strong server-secret fallbacks.",
    );
    return null;
  }

  try {
    if (!_neonSql) {
      const { neon } = await import("@neondatabase/serverless");
      _neonSql = neon(databaseUrl);
    }
    const bucketKey = durableRateLimitBucketKey(key, prefix, hashSecret);
    const rows = (await _neonSql`
      WITH pruned_stale_buckets AS (
        DELETE FROM public.rate_limit_buckets
        WHERE window_started_at <= NOW() - (${DURABLE_BUCKET_RETENTION_MS} * INTERVAL '1 millisecond')
        RETURNING bucket_key
      )
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
        END,
        updated_at = NOW()
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
    console.error(
      "[rate-limit] Failed to use Neon durable rate limiting; "
      + `error_code=${classifyDurableStoreError(error)}`,
    );
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
  const isProduction = durableRateLimitRequired();

  const neonResult = await checkNeonRateLimit(key, limit, windowMs, prefix);
  if (neonResult) return neonResult;

  // Production without credentials: fail-open with critical log
  if (isProduction && !nonDurableRateLimitFallbackAllowed()) {
    console.error(
      "[rate-limit] CRITICAL: Production is using non-durable in-memory rate limiting. " +
      "Set DATABASE_URL, apply the rate_limit_buckets migration, and configure a server-only hash secret. " +
      "Set RATE_LIMIT_EMERGENCY_MEMORY=1 to acknowledge this degraded state."
    );
  }

  // Match the durable bucket contract: activity on one route must never consume
  // another route's fallback allowance during Preview or emergency operation.
  return _memStore.check(`${prefix}\0${key}`, limit, windowMs);
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
