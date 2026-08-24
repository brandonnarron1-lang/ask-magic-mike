# Changelog

## 2026-08-24 — PR #210 stack refresh onto the sealed PR #209 candidate

- Preserved PR #210's pre-refresh head at remote rescue branch
  `rescue/amm-pr210-pre-pr209-security-sync-20260824-0401`.
- Merged exact PR #209 candidate
  `6eb89264d59c8d25a711a1ffa178828343772f75` into the stacked alias branch.
- Resolved the sole conflict in `docs/CHANGELOG.md` by preserving both release
  records; the redirect implementation and monitor contract had no overlap with
  PR #209's limiter hardening.
- Invalidated the older PR #210 exact-head evidence pending fresh Node 24,
  Preview, and protected no-write verification.
- Changed no Production deployment, environment, database row, lead, message,
  WordPress surface, DNS, spend, deletion, or NellySelly system.

## 2026-08-24 — PR #209 emergency-limiter security hardening

- Preserved the exact reviewed candidate at remote rescue branch
  `rescue/amm-pr209-pre-memory-fallback-hardening-20260824-0333`.
- Bounded the Preview/emergency in-memory limiter to 10,000 active identifiers,
  reclaimed expired entries, and made unseen identifiers fail closed at
  capacity instead of allowing unbounded process-memory growth.
- Partitioned fallback counters by the same typed route prefix used by Neon so
  analytics, chat, lead, appointment, and staff-setup traffic cannot consume
  one another's degraded-mode allowance.
- Added dedicated capacity, expiry-reclamation, and route-isolation regression
  tests plus a structured security review.
- Changed no Production environment, deployment, database row, lead, event,
  message, WordPress surface, DNS, NellySelly system, or external provider.

## 2026-08-23 — Field-experience trust fast-track candidate

- Preserved PR #199 and its exact head, then transplanted only its unique
  privacy-safe field-performance capability onto canonical PR #205.
- Added Production-only LCP/INP/CLS reporting for exact public routes through
  the existing durable event boundary and protected Growth Command Center.
- Removed lead, session, attribution, query, raw URL, raw user-agent, and raw
  metric-ID identity from the stored contract; metric IDs are reduced to
  domain-separated SHA-256 digests before persistence.
- Added component-level proof for canonical emission and QA, automation,
  private-route, and noncanonical-host suppression.
- Passed 5 focused files / 29 tests, all 226 files / 3,031 tests, strict
  typecheck, ESLint, optimized build, route proof, release safety, system
  isolation, and the Production dependency audit.
- No migration, Production action, field event, lead, message, WordPress edit,
  publication, spend, DNS change, deletion, or NellySelly action occurred.

## 2026-08-23 — Conversion-journey integrity fast-track candidate

- Reused the already-reviewed PR #200 application and test changes on top of
  exact PR #202 head instead of rebuilding the buyer/renter/open-house flow.
- Current mobile Production no-write audit reconfirmed that blank Buyer submit
  shows the either-or contact error while focus remains on the submit button.
- The isolated candidate preserves first touch, refreshes truthful last touch,
  separates renter source identity, suppresses replay KPI inflation, and makes
  contact recovery accessible.
- Every application and test file applied cleanly; only cumulative operating
  documents required reconciliation. No migration, Production action, lead,
  message, WordPress edit, publication, spend, DNS change, deletion, or
  NellySelly action occurred.

## 2026-08-22 — Conversion identity polish

- Added required seller identity to the existing four-stage home-value funnel.
- Improved invalid-field focus and precise accessible error association.
- Kept internal preview routes out of consumer footer navigation.
- Hard-intercepted lead creation, durable analytics, and public experiment
  events in screenshot QA so visual capture performs no application writes.
- No Production, database, notification, provider, WordPress, or publication
  action was performed.
## 2026-08-22 — WordPress owned-demand activation change set

- Stacked the candidate behind PR #197 after preserving its released-main state
  at `rescue/amm-pr198-pre-pr197-stack-refresh-20260822-2247`; application code
  composed without conflict and only cumulative release evidence required
  reconciliation.
- Reused the protected Distribution Command and canonical owned-demand UTM
  registry to generate live, placement-specific WordPress readiness manifests.
- Added exact-host public page and page-index inspection, redirect and size
  limits, one-target classification, rollback hrefs, page-ID checks, and
  deterministic SHA-256 preconditions.
- Hardened public reads with an explicit published-row requirement, a 3 MB
  streaming cap, and precondition hashes that include every ambiguity and
  rejected-link signal.
- Added protected private/no-store JSON downloads for the existing homepage,
  home-value, and We Buy Homes placements plus fail-closed security coverage.
- Expanded the brokerage placement card across the desktop command grid while
  preserving the existing mobile stack, eliminating an avoidable blank column.
- Verified all three live public placements as `legacy_match_ready`; selected
  only the homepage CTA as the recommended first separately approved edit.
- Performed no WordPress edit, publication, form submission, message send,
  database migration, Production deployment, DNS change, cache purge, or spend.
## 2026-08-22 — Privacy and KPI-trust consolidation

- Consolidated the independent privacy/security/KPI evidence from PRs #190-#192
  onto the single PR #185 owned-demand command candidate.
- Pseudonymized durable rate-limit buckets with versioned HMAC identifiers and
  bounded stale-row retention.
- Minimized public analytics to approved events and scalar dimensions, removed
  public lead/agent binding, restricted public attribution to a registered
  operational vocabulary, and repeated sanitization at the Neon write layer.
- Added aggregate-only live outcome and notification-delivery evidence to the
  protected Growth Command Center with honest unavailable states.
- Excluded the deferred KPI target migration and made no Production, provider,
  external publication, or live-data change.

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
