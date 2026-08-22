# Phase 9 Privacy and KPI-Trust Consolidation

Date: 2026-08-22

Candidate branch: `codex/phase9-privacy-kpi-trust-consolidation-20260822`

Base: PR #185 exact head `1593302a1354d5b8b77baa2340287a7d043dc297`

## Purpose

This candidate consolidates the useful, independent security/privacy/KPI-trust
work from PRs #190-#192 onto the single owned-demand command candidate. It does
not introduce another application, database, analytics store, dashboard,
notification engine, CRM, publisher, or provider.

## Source audit

| Source | Audited code commit | Disposition |
| --- | --- | --- |
| PR #190 | `ccaf50071d3a07328ad35b8d6729c85bdf60e10b` | Merge the durable rate-limit privacy boundary; replace stale documentation with canonical Neon/Vercel facts. |
| PR #191 | `30f0457b95316608c875e907c1bb2082f652033f` | Merge the public analytics minimization boundary and repository-level defense in depth; adapt both active route trees to the PR #185 router contract. |
| PR #192 | `7ceb8a70b2422e6b849fbf4b8a20c1b51c9ffcb5` | Select only independently useful aggregate outcome/delivery evidence and its protected UI; do not import the PR #187 target register or migration dependency. |

The pre-consolidation state is preserved as remote rescue branch
`rescue/amm-pre-phase9-trust-consolidation-20260822-1039`. Source branches and
Git history remain intact until the consolidated candidate is accepted.

## Included once

1. Durable Neon rate-limit bucket identifiers are HMAC-SHA-256 pseudonyms. The
   raw IP, staff principal, session identifier, and secret are never written to
   the bucket table. Stale buckets are pruned after 24 hours.
2. Browser analytics accepts only named public event types and scalar,
   event-specific dimensions. Full URLs, referrers, click IDs, contact fields,
   arbitrary text, provider identifiers, errors, and secret-like values are
   rejected before browser publication and before server persistence.
3. Public analytics callers cannot attach an event to a canonical lead or
   agent. Trusted server workflows retain that capability through the existing
   internal ledger after durable lead creation.
4. The final Neon analytics repository repeats the scalar/dimension/UA
   minimization so a future caller cannot bypass route-level filtering.
5. The existing protected Growth Command Center receives aggregate-only counts
   for exact appointment and agreement-signed outcomes, internal alert terminal
   states/failures, provider-backed email sends/bounces, and customer delivery
   confirmations/complaints.
6. KPI queries include only canonical non-test, non-suppressed leads. Missing
   tables or failed aggregate queries render an unavailable state, not a false
   zero.

## Deliberately excluded

- PR #187's KPI target register, target-setting UI, and database migration.
  Production still lacks an eligible live-demand baseline for evidence-based
  targets.
- Stale Upstash/Supabase/Vercel assumptions from source-branch documentation.
- Any recipient reference, contact detail, message body, raw user agent, raw IP,
  full referrer, click ID, provider message ID, provider error, or secret value
  in analytics or aggregate Growth output.
- A valid analytics write during Preview acceptance. Preview testing uses
  rejected/invalid requests and rendered protected views only.
- Production deployment, database migration/write, lead submission, email/SMS/
  Push send, WordPress mutation, external publication, DNS change, spend, or
  NellySelly action.

## Database and environment impact

This candidate contains **no database migration**. It reuses the existing
`rate_limit_buckets`, `analytics_events`, `lead_outcomes`,
`lead_notifications`, and `communication_events` structures.

`RATE_LIMIT_HASH_SECRET` is the preferred 32+ character server-only secret.
Existing strong server secrets are supported as documented fallbacks to avoid a
cutover outage. Protected health output reports only a boolean readiness value.
No secret value may enter source, logs, screenshots, tests, or reports.

## Risk and rollback

Primary risks are over-filtering a useful analytics dimension, event inflation
from an untrusted public analytics caller, an unavailable optional aggregate
table, or an application regression in the protected Growth view. Canonical
lead attribution, consent, scoring, routing, notifications, and audit records do
not depend on the public analytics route.

Rollback is application-only:

1. Repoint Production to the recorded pre-release Vercel deployment.
2. Revert the consolidated application commit if a narrow rollback is needed.
3. Leave Neon unchanged; there is no schema or data rollback.
4. Existing HMAC bucket rows expire through the bounded 24-hour retention path.
5. Preserve source branches and the rescue branch until post-release acceptance.

## Release authority

This document is evidence, not release authority. After exact-head Node 24 CI,
canonical Vercel Preview, authorization, privacy, responsive visual, and runtime
acceptance pass, the only application release gate for this candidate is:

`APPROVE PHASE 9 PRIVACY AND KPI TRUST MERGE AND PRODUCTION DEPLOYMENT`

External publication, WordPress changes, live lead/message tests, provider
changes, database writes, DNS changes, and spend remain separate exact gates.
