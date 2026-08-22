# Durable Rate Limiting

Updated 2026-08-21.

## Current state

Public and sensitive application endpoints use the existing
`src/lib/security/rate-limit.ts` limiter. Production counters are stored
atomically in the canonical Neon PostgreSQL `public.rate_limit_buckets` table.
The limiter therefore survives Vercel cold starts and is shared across function
instances. The in-memory implementation remains only for local/test use and an
explicitly acknowledged emergency fallback.

This is already the canonical implementation. Do not add Redis, Upstash, a
second counter store, or another rate-limit library merely to replace it.
Legacy `UPSTASH_REDIS_REST_*` variables are not used by this limiter and are not
evidence of an active dependency.

| Property | Production behavior |
|---|---|
| Distributed counters | Atomic Neon upsert |
| Cold-start durability | Yes |
| Raw limiter key stored | No |
| Bucket identifier | Versioned, domain-separated HMAC-SHA-256 |
| Stale-bucket retention | Pruned after 24 hours |
| Database outage | Fail-open to in-memory with a critical log |
| Preview mutation | Blocked before limiter writes where Preview is read-only |

## Privacy boundary

The raw client IP, staff principal, session identifier, or other limiter key is
never written to Neon. The database stores only:

```text
amm:rl:v1:<route-prefix>:<64-character HMAC digest>
```

`RATE_LIMIT_HASH_SECRET` is the preferred dedicated server-only secret and must
contain at least 32 characters. To
avoid an unsafe cutover when that variable is not yet present, the server uses
the first configured value in this order:

1. `RATE_LIMIT_HASH_SECRET`
2. `CONSENT_IP_HASH_SALT`
3. `CRON_SECRET`
4. `ADMIN_SECRET`

Only candidates of at least 32 characters are accepted. All inputs are
domain-separated before HMAC. No value may use a `NEXT_PUBLIC_`
prefix or appear in browser code, logs, screenshots, reports, or source control.
Rotating the selected secret intentionally starts fresh buckets; it does not
alter leads, consent records, notifications, or analytics.

The limiter accepts Vercel's `x-forwarded-for` client address. Vercel documents
that it overwrites this header on direct deployments to prevent spoofing and
also supplies the equivalent `x-vercel-forwarded-for` header. Reassess the
header source before putting a new reverse proxy in front of the canonical
domain. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

## Availability boundary

Production needs all of the following:

- `DATABASE_URL` for canonical Neon;
- migration `20260811155000_durable_rate_limit.sql`; and
- at least one server-only hash secret from the ordered list above.

If any requirement is unavailable, the public request is not turned into a
site-wide outage. The limiter falls back to process memory, returns
`durable=false`, and emits a critical operational warning. Setting
`RATE_LIMIT_EMERGENCY_MEMORY=1` acknowledges a controlled degraded mode; it
does not make that mode durable.

## Operational verification

Use aggregate checks only. Do not select or display bucket keys:

```sql
SELECT
  COUNT(*) AS total_buckets,
  COUNT(*) FILTER (
    WHERE bucket_key ~ '^amm:rl:v1:[A-Za-z][A-Za-z0-9_]*:[0-9a-f]{64}$'
  ) AS hmac_buckets,
  COUNT(*) FILTER (
    WHERE window_started_at < NOW() - INTERVAL '24 hours'
  ) AS stale_buckets
FROM public.rate_limit_buckets;
```

Expected after the first post-release traffic and one retention window:

- `total_buckets = hmac_buckets`;
- `stale_buckets = 0`; and
- repeated requests across warm/cold instances decrement the same logical
  bucket and return `429` after the configured threshold.

Do not perform a live load test against public forms. Use focused unit tests and
a controlled `[TEST]` route exercise under a separately approved QA gate.

## Defense in depth

Vercel WAF rate limiting can be added later as an edge layer after a log-only
observation period. It is optional defense in depth, not a replacement for the
application's intent-specific limits and not a current launch blocker. Any WAF
publication changes live traffic behavior and requires its own exact approval.

## Status

Durable application rate limiting is implemented. The remaining release task is
to deploy the HMAC/retention hardening through the normal reviewed PR sequence
and verify aggregate bucket shape without exposing identifiers.
