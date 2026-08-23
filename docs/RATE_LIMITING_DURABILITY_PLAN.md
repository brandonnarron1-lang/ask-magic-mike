# Rate-Limiting Durability and Privacy

## Canonical architecture and current deployment state

Ask Magic Mike is designed to use the canonical Neon
`public.rate_limit_buckets` table for
atomic counters shared across Vercel instances. The in-memory store remains only
for local development and an explicitly acknowledged degraded mode. No Redis,
Upstash, paid add-on, second database, or Supabase dependency is required.

Authenticated runtime evidence on 2026-08-23 found that the current Production
deployment had no suitable 32-or-more-character server-only hash secret. The
two public event routes therefore used the availability-first memory fallback.
This document must not describe durability as live again until the dedicated
Production secret and readiness candidate pass controlled acceptance.

The limiter covers lead capture, intake steps and sessions, analytics, chat,
phone setup, and public appointment requests. Each route selects a named bucket
prefix and a bounded window/limit from `src/lib/security/rate-limit.ts`.

## Durable-key privacy

Raw IP addresses, staff principals, session identifiers, and other caller keys
must never be written to Neon. Durable bucket identifiers use this format:

`amm:rl:v1:<route-prefix>:<HMAC-SHA-256 digest>`

The digest is domain-separated by product, key version, and route prefix. The
limiter runtime selects the first 32-or-more-character secret in this order:

1. `RATE_LIMIT_HASH_SECRET` (required for Production readiness)
2. `CONSENT_IP_HASH_SALT`
3. `CRON_SECRET`
4. `ADMIN_SECRET`

Production readiness requires the purpose-specific first option even though
the compatibility fallbacks preserve pseudonymization in a degraded runtime.
Only boolean readiness appears in health responses. Secret values,
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
- A dedicated 32-or-more-character `RATE_LIMIT_HASH_SECRET` is configured.
- The runtime role has schema `USAGE`, table `SELECT/INSERT/UPDATE/DELETE`, and
  effective RLS access to the canonical bucket table.
- A valid, ready, non-partial single-key unique index exists on `bucket_key` so
  the runtime `ON CONFLICT (bucket_key)` statement is executable.
- NellySelly database URLs, secrets, projects, or aliases are forbidden.

## Verification

Automated tests prove deterministic domain separation, short-secret rejection,
dedicated-secret readiness, no raw key/secret SQL parameter, 24-hour pruning,
`updated_at` maintenance, durable/in-memory behavior, Production/Preview
runtime separation, fail-closed capability mapping, and boolean-only health
reporting. The Production monitor validates the readiness body contract rather
than status alone. `pnpm run rate-limit:verify-store` performs the same
read-only store check when `DATABASE_URL` is supplied through a secure process
environment; it emits safe booleans only.

The candidate requires one new encrypted Production-only
`RATE_LIMIT_HASH_SECRET` plus an application deployment. It requires no
database migration and does not rotate or display any existing secret.
