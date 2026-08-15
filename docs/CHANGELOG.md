# Changelog

## 2026-08-15 — Phase 6 Production schema acceptance

- Applied the Preview-accepted Phase 6 communication-permission, sequence,
  provider-event, AI-intelligence, and AI-usage migration to canonical Neon
  Production in one transaction.
- Verified seven tables, RLS on all seven, zero public/anonymous grants, zero
  new rows, and unchanged lead/notification/session aggregates.
- Re-ran public smoke, funnel, monitoring, lead-pipe, and system-isolation
  checks after migration; all passed and the observed Production log window
  contained no errors or warnings.
- Kept consumer email, nurture, auto-send, carrier SMS, Mike activation, and
  held Gravity Forms outside this release.

## 2026-08-14 — Free-first reconciliation and release hardening

- Completed isolated Preview RBAC acceptance, removed the temporary bootstrap
  surface, aligned the Better Auth server/client path, and added a gated,
  exact-origin, one-time password activation/reset flow using the existing
  authenticated Resend transport.
- Applied the accepted additive RBAC and Push device-label migrations to Neon
  Production, merged PR 143, activated the approved Brandon administrator and
  dormant Mike primary-owner identities, and passed Production session/logout
  acceptance without changing lead or notification data.
- Normalized auth-database SSL aliases to explicit `verify-full`, preserving
  strong certificate/hostname verification and removing the `pg` v9 migration
  warning from Production auth routes.

- Reconfirmed the existing Vercel + Neon deployment as canonical; no parallel
  repository, database, notification engine, or visual system was introduced.
- Updated health/startup/launch checks for the active Neon runtime and active
  root `app/` tree.
- Added an approved public analytics event allowlist and admin no-store/frame
  headers.
- Reconciled architecture, security, privacy, QA, environment, WordPress,
  widget, phone enrollment, deployment, rollback, and owner-gate documentation.
- Kept carrier SMS deferred and reused free Web Push for staff phone alerts.
- No production deployment, migration, WordPress publication, DNS change,
  external send, or production data mutation was performed.
- Added route-level Basic Auth to all admin Web Push handlers behind the existing
  middleware boundary and retained exact-origin checks for mutations.
- Added a dedicated durable rate-limit bucket to public appointment follow-up
  requests before body parsing or persistence.
- Added regression coverage for unauthorized push operations, sensitive endpoint
  omission, same-origin enforcement, and appointment throttling; the final local
  matrix passes 2,538 tests, 13 browser tests, build, lint, typecheck, dependency
  audit, release safety, isolation, route manifest, and secret scan.

## 2026-08-10 — Same-day lead-engine consolidation (local preparation)

- Selected the mature `Projects/ask-magic-mike` repository as canonical.
- Preserved dirty work on `rescue/amm-pre-consolidation-20260810-162915`.
- Recorded live/DNS/Vercel/WordPress evidence and non-mutating blockers.
- Prepared canonical route, consent, attribution, notification, widget, analytics,
  security, QA, go-live, and rollback documentation.
- No production deployment, database migration, WordPress publication, DNS change,
  marketing send, or real email was performed.
- Added buyer/renter intake, explicit consent evidence, deterministic score/routing,
  canonical internal alert/consumer-ack outbox, origin-safe widget messaging,
  server analytics ledger, retry endpoint, and read-only lead-pipe health check.
- Added explicit renter, open-house, privacy, terms, accessibility, and contact
  routes so the local candidate has no required public intake/compliance 404s.
