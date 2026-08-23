# Phase 9 field-experience trust

Updated 2026-08-22. This is a dependent, application-only candidate stacked
after PR #198. It is not active in Production and contains no database
migration, numeric KPI target, lead mutation, message, or publication action.

## Decision

Reuse the useful privacy-safe field-performance work preserved in Draft PR
#187, but do not revive PR #187's stale stack or its deferred KPI-target
register. Production has no eligible live-demand baseline from which to set
numeric conversion targets. It can still begin collecting minimized real-user
LCP, INP, and CLS observations so future performance decisions have evidence.

The implementation stays inside the canonical Next.js application, existing
`POST /api/events` boundary, existing Neon `analytics_events` ledger, existing
protected Growth Command Center, and existing Lead Center `report:view`
authorization. It creates no second analytics store or dashboard.

## Collection contract

- The reporter renders only when `VERCEL_ENV=production` and only on
  `askmagicmike.com` or `www.askmagicmike.com`.
- Only LCP, INP, and CLS from an exact registered public route are accepted.
  Dynamic open-house paths collapse to `/open-house/[property-or-id]`.
- Preview, private/admin/API routes, browser automation, `navigator.webdriver`,
  query-identified QA, and session-persisted QA attribution are excluded.
- The server independently requires the exact canonical Production origin,
  validates the 4 KB JSON body, applies the existing durable rate limit, derives
  the rating from the bounded value, and rejects malformed dimensions.
- No lead ID, session ID, attribution, click ID, query string, raw URL, raw user
  agent, IP address, cookie, token, or consumer field is written.
- The durable record contains only metric code, random metric ID, rounded value,
  server-derived rating, navigation type, normalized route, mobile/desktop
  class, `public_production`, and a coarse `browser/mobile|desktop` agent class.

## Protected read model

The Growth Command Center calculates deduplicated P75 values for each metric,
including mobile and desktop evidence. The SQL is fixed and parameterized,
uses the existing `(event_name, occurred_at)` index, scans at most the newest
25,000 eligible rows in the selected 30/90/365-day window, and deduplicates on
metric code plus metric ID before aggregation.

Zero samples display as unavailable evidence, not a zero-millisecond page.
Query/schema failure also displays unavailable. Sample maturity is labeled:

- fewer than 75 observations: `collecting`;
- 75–199 observations: `directional`;
- 200 or more observations: `operational`.

Those labels describe sample size only. They do not claim formal Core Web
Vitals, accessibility, conversion, or legal certification.

## Security and integrity limits

Browser analytics is an operational signal, not an authenticated transaction
ledger. Exact-origin checks, normal-browser classification, bounded input,
registered dimensions, rate limiting, deduplication, and sample labels reduce
contamination risk, but a determined non-browser caller can spoof browser
headers. Performance evidence must therefore remain aggregate, corroborated,
and advisory; it cannot assign leads, publish content, or change spend.

The shared browser module contains no environment-dependent trust decision or
server credential. Canonical-origin and raw-user-agent classification live on a
server-only import path. Session storage is treated as untrusted, bounded before
parsing, and used solely to exclude known QA traffic.

## Activation and rollback

The strict release order is `#195 → #197 → #198 → this candidate`. After each
predecessor releases, preserve a rescue ref, refresh the next candidate onto
the exact new `main`, and rerun Node 24 CI, Vercel Preview, protected no-write
QA, dependency/secret checks, and release safety.

The later exact gate is:

`APPROVE PHASE 9 FIELD EXPERIENCE TRUST MERGE, PRODUCTION DEPLOYMENT, AND FIELD TELEMETRY ACTIVATION`

That gate authorizes only the reviewed application merge, canonical Vercel
Production deployment, and the resulting minimized `web_vital_observed`
writes to the existing analytics ledger. It does not authorize a migration,
numeric target, lead/form submission, consumer or staff message, WordPress or
social publication, device enrollment, spend, DNS change, deletion, provider
purchase, or NellySelly action.

Rollback is an immediate Vercel rollback to the prior accepted Production
deployment. That removes the reporter and protected panel code without a schema
rollback. Existing minimized observations may remain immutable and ignored;
deletion is not part of rollback authority.

## Local acceptance evidence

- 5 focused files / 28 tests and the full 219-file / 2,982-test suite pass.
- System isolation, 14/14 release safety, strict TypeScript, full ESLint,
  optimized Next.js 15.5.21 build, 52 generated static pages, and the 83/17
  route manifest pass.
- Production dependency audit, candidate gitleaks/credential-pattern scan,
  diff integrity, and empty migration delta pass.
- Protected no-write rendering at 1440×1000 and 390×844 passes with one main
  landmark, no horizontal overflow, no framework overlay, zero console
  findings, GET-only application traffic, truthful unavailable evidence, and
  no Preview field-telemetry request.
- Exact-head Node 24 CI, immutable Vercel Preview, and protected Preview QA are
  still required after push and before this dependent candidate can be called
  Preview-ready.
