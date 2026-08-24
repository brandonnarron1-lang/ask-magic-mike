# Phase 9 Durable Rate-Limit Readiness

Date: 2026-08-23
Status: Draft candidate; no Production mutation or deployment

## Decision

Keep the existing canonical Neon limiter and close the operational gap that let
Production report ready while public analytics requests were falling back to a
per-instance memory counter. This is a configuration and observability repair,
not a second limiter, database, API, dashboard, or provider.

The application continues to use `public.rate_limit_buckets` and the existing
HMAC-SHA-256 bucket-key implementation in
`src/lib/security/rate-limit.ts`. Preview remains read-only and does not require
durable limiter dependencies. Vercel Production and owned/self-hosted
`NODE_ENV=production` runtimes do.

The non-durable fallback is now explicitly resource-bounded: it reclaims
expired entries, caps active identifiers at 10,000, fails closed for unseen
identifiers once full, and partitions identifiers by the same typed route key
used by Neon. This keeps Preview and break-glass behavior available without an
unbounded process-memory structure or cross-route allowance collisions.

## Current authenticated evidence

- Canonical Production deployment:
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`, commit
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`.
- `GET /api/health/ready` returned HTTP 200 and database `ready`, but did not
  report any durable-limiter dependency.
- Vercel grouped 17 occurrences on `/api/events` and
  `/api/experiments/event` between 2026-08-23T11:34:23Z and
  2026-08-23T15:59:04Z. Each affected invocation logged both the missing-strong-
  secret message and the critical in-memory-fallback message.
- The encrypted Production variable inventory contains `DATABASE_URL` but no
  dedicated `RATE_LIMIT_HASH_SECRET` or `CONSENT_IP_HASH_SALT`. Runtime evidence
  proves the documented `CRON_SECRET`/`ADMIN_SECRET` fallbacks are not currently
  suitable for this use. No secret value was retrieved, displayed, or written.
- The previous status-only monitor passed 9/9. The candidate contract monitor
  correctly reports 8/9 against the unchanged deployment because the durable
  limiter-readiness fields are absent.

## Security finding

- Rule ID: `NEXT-DOS-001 / AMM-RL-READY-001`
- Severity: High operational security gap
- Location: `src/lib/security/rate-limit.ts`,
  `app/api/health/ready/route.ts`, `scripts/monitor-production.mjs`
- Evidence: Production used non-durable memory limiting while the public
  readiness endpoint and synthetic monitor remained green.
- Impact: counters are not shared across serverless instances, so distributed
  abuse can exceed the intended route limits. The evidence does not show a lead
  loss, secret disclosure, or cross-system access.
- Fix: require the exact durable table shape, a valid single-column upsert
  conflict target, schema/table privileges, effective RLS bypass, and a
  purpose-specific server-only HMAC secret for Production readiness. The
  monitor validates the complete response contract. Durable-store failures log
  only a bounded error code, never the raw driver error object.
- Mitigation: the current bounded memory limiter remains availability-first
  until the exact secure secret/deploy gate is approved.
- False-positive notes: Vercel runtime logs and the current public readiness
  body directly confirm the drift; this is not inferred from documentation.

## Candidate behavior

`GET /api/health/ready` returns boolean-only fields:

- `rate_limit_required`
- `rate_limit_table`
- `rate_limit_schema_ready`
- `rate_limit_permissions_ready`
- `rate_limit_rls_ready`
- `rate_limit_store_ready`
- `rate_limit_secret_ready`
- `rate_limit_ready`

Production returns HTTP 503 unless every store capability and the dedicated
`RATE_LIMIT_HASH_SECRET` are ready. A reused cron, admin, or consent secret can
still preserve HMAC pseudonymization in a degraded runtime, but it cannot make
Production readiness green. No role name, secret value, database URL, bucket
key, IP address, or caller identifier is returned. The hourly synthetic monitor
requires the same boolean contract rather than accepting HTTP 200 alone.

The capability probe is read-only. It checks PostgreSQL catalogs and privilege
functions only; it does not insert, update, delete, count, or reveal limiter
rows. On the authenticated Neon `production` branch it returned one row with
all four store booleans true in 35 ms. That validates the object and SQL-editor
role. The exact Vercel runtime role remains unproven until the candidate
Preview/Production health response executes the same query through its own
`DATABASE_URL`.

## Controlled activation

After exact approval:

1. Reconfirm `origin/main`, the reviewed PR head, current Production deployment,
   and the Ask Magic Mike Vercel project identity.
2. Generate a new high-entropy value without printing or persisting it outside
   the Vercel encrypted secret interface.
3. Add `RATE_LIMIT_HASH_SECRET` to the Ask Magic Mike **Production** environment
   only. Do not reuse or copy any NellySelly value.
4. Merge only the reviewed candidate and let Vercel build that exact merge.
5. Verify the custom domains resolve to the new READY deployment and
   `/api/health/ready` reports every limiter capability, dedicated-secret, and
   aggregate readiness boolean true.
6. Send one approved-origin malformed analytics request that executes the
   limiter and then returns HTTP 400 before event persistence. This creates only
   a pseudonymous aggregate limiter bucket—no lead, analytics event, email,
   SMS, Push, or consumer acknowledgment.
7. Confirm no new durable-limiter error appears and rerun the 9-check monitor.

## Rollback

If acceptance fails, immediately restore Production deployment
`dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. The environment addition can then be removed
after the prior deployment is restored. The candidate has no migration and
does not alter lead, notification, consent, attribution, assignment, or audit
records.

The encrypted `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names are
stale configuration and are ignored by the canonical Neon implementation.
Deleting them is a separate cleanup action and is not authorized by this gate.

## Exact gate

`APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`
