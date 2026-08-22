# Changelog

## 2026-08-21 — Durable rate-limit privacy hardening

- Reused the canonical Neon rate limiter and replaced persisted raw client/
  principal keys with versioned, domain-separated HMAC identifiers.
- Added 24-hour stale-bucket pruning, protected secret-readiness reporting, and
  focused SQL-parameter privacy coverage without another provider or schema.
- Corrected the obsolete in-memory/Upstash blocker and refreshed the exact Draft
  PR stack; Production and all external channels remain unchanged.

## 2026-08-21 — Owned-demand measurement truth hardening

- Distinguished healthy zero-demand measurement from missing configuration,
  pending schema, and query failure in the existing Owned Demand Command.
- Kept prepared campaign assets available during degraded measurement while
  suppressing false numeric counts, bottleneck inference, and data-backed
  channel recommendations.
- Added unit, static-route, desktop, and mobile regression proof without a
  database migration, external publication, provider send, or Production
  mutation.

## 2026-08-14 — Admin push and appointment boundary polish

- Added route-level Basic Auth to every `/admin/api` push handler as defense in
  depth behind middleware.
- Added durable throttling to public appointment follow-up requests before body
  parsing or persistence.
- Added security regression tests and completed the full release gate without a
  production deployment, external message, data mutation, or WordPress change.

## 2026-08-11 — Node 24 and phone-alert readiness

- Aligned local development, package runtime declarations, all CI workflows,
  and Vercel production builds on Node 24 before the Node 20 deployment cutoff.
- Extended production readiness checks to require the Web Push table and safe
  VAPID configuration whenever agent push notifications are enabled, using the
  same canonical environment-variable contract as the delivery provider.
- Added explicit loading, retry, failure, and duplicate-action protection to
  the authenticated phone-registration interface.

## 2026-08-11 — Reuse-first Neon hardening candidate

- Preserved the existing public funnel, black-diamond visual system, canonical
  capture function, scoring/routing engine, notification outbox, and Lead Center.
- Moved SLA sweep, rate limiting, health safety, and server analytics off stale
  Supabase/Upstash assumptions and onto canonical Neon PostgreSQL.
- Added exact-origin, body-size, message-size, rate-limit, and timeout controls to
  public AI chat without changing the visible Ask Mike workflow.
- Added a disabled signed Gravity Forms bridge for exact form IDs 1–7 with HMAC,
  idempotency, bounded retry, and no duplicate WordPress email engine.
- Patched production dependencies and pinned the supported Node 20 runtime.
- Added full-history secret scanning, provider-neutral preview mutation guards,
  Edge-safe admin secret comparison, regression tests, browser E2E corrections,
  and rendered visual evidence.

## 2026-08-11 — Production cutover follow-up

- Promoted the verified Neon-backed candidate to the canonical Ask Magic Mike
  production domains after an isolated production-environment smoke test.
- Verified a controlled public `[TEST]` lead, deterministic score/routing,
  first-attempt Resend delivery, test suppression, and canonical attribution.
- Routed protected Lead Center inbox/detail reads to Neon and surfaced provider
  message IDs in the notification dashboard.
- Corrected protected health reporting to recognize the active email enablement
  variable and report BCC presence as a boolean only.
- Merged PR `#123` and promoted production deployment
  `dpl_BGkVcCMFgeZQgnteRxRUomeJoyRv` after authenticated Neon Lead Center checks.
- Rotated the Vercel automation bypass credential, updated the GitHub Actions
  secret, and revoked both superseded bypasses.
- Installed and activated the reviewed WordPress canonical bridge in inert
  shadow mode. Existing forms, notifications, and historical lead records were
  not modified or imported.
