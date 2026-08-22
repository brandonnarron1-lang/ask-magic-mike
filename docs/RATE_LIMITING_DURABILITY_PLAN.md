# Rate-Limiting Durability and Privacy

## Current production architecture

Ask Magic Mike uses the canonical Neon `public.rate_limit_buckets` table for
atomic counters shared across Vercel instances. The in-memory store remains only
for local development and an explicitly acknowledged degraded mode. No Redis,
Upstash, paid add-on, second database, or Supabase dependency is required.

The limiter covers lead capture, intake steps and sessions, analytics, chat,
phone setup, and public appointment requests. Each route selects a named bucket
prefix and a bounded window/limit from `src/lib/security/rate-limit.ts`.

## Durable-key privacy

Raw IP addresses, staff principals, session identifiers, and other caller keys
must never be written to Neon. Durable bucket identifiers use this format:

`amm:rl:v1:<route-prefix>:<HMAC-SHA-256 digest>`

The digest is domain-separated by product, key version, and route prefix. The
server selects the first 32-or-more-character secret in this order:

1. `RATE_LIMIT_HASH_SECRET` (recommended dedicated secret)
2. `CONSENT_IP_HASH_SALT`
3. `CRON_SECRET`
4. `ADMIN_SECRET`

Only boolean readiness appears in the protected health response. Secret values,
raw bucket inputs, and the HMAC key are never returned, logged, committed, or
sent as SQL parameters.

## Retention and failure behavior

- Each successful durable check opportunistically removes buckets whose window
  started more than 24 hours ago.
- Existing pre-HMAC bucket rows stop receiving updates and age out through the
  same bounded cleanup.
- A missing database or strong hash secret causes a critical production log and
  an availability-first in-memory fallback; it never writes a raw identifier.
- `RATE_LIMIT_EMERGENCY_MEMORY=1` acknowledges a controlled degraded period. It
  does not make the fallback durable and should not remain enabled normally.
- Database errors fail to the same bounded in-memory fallback so an abuse-store
  incident does not take every public form offline.

## Required production configuration

- `DATABASE_URL` points to the Ask Magic Mike production Neon branch.
- The canonical migration chain includes
  `supabase/migrations/20260811155000_durable_rate_limit.sql`.
- At least one strong secret in the documented fallback order is configured;
  use a dedicated `RATE_LIMIT_HASH_SECRET` when practical.
- NellySelly database URLs, secrets, projects, or aliases are forbidden.

## Verification

Automated tests prove deterministic domain separation, short-secret rejection,
no raw key/secret SQL parameter, 24-hour pruning, `updated_at` maintenance,
durable/in-memory behavior, and boolean-only protected health reporting.

This candidate is application-only. It requires no production migration and
does not rotate or display any existing secret.
