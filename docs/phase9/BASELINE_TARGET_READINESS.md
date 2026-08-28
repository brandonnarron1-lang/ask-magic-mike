# Phase 9 Baseline and Target Readiness

Date: 2026-08-28
Status: stacked read-only release candidate; Production unchanged

## Executive decision

The next useful control is not another CRM, dashboard, lead store, or target
database. Production has no eligible live-demand denominator. Extend the
existing protected Growth Command Center with a read-only baseline-readiness
register that makes this fact visible, names the evidence gaps, and refuses to
turn QA rows into business targets.

This candidate reuses and updates the 38-metric evidence vocabulary reviewed in
Draft PR #187. It keeps that prior candidate's strongest rule—no numeric target
without a measured server-derived baseline—while deliberately excluding its
stale branch stack, target migration, write route, seeded target risk, and
separate target page. Current Growth outcome, delivery, economics, and field
experience aggregates are reused instead of rebuilt. Four current operational
facts bring the resulting catalog to 42 evidence contracts.

## Canonical Production baseline

A read-only, aggregate-only query was run against canonical Neon project
`bitter-star-20214385`, Production branch `br-round-base-auh6h2wd`, database
`neondb`. It returned this snapshot at
`2026-08-28T19:45:52.419594+00:00`:

| Fact | Value |
|---|---:|
| Total lead rows | 6 |
| Test or communication-suppressed rows | 6 |
| Eligible live leads | 0 |
| Contactable eligible live leads | 0 |
| Eligible live outcomes | 0 |
| Eligible first-response milestones | 0 |
| Spend rows / tracked spend | 0 / $0 |
| Eligible market signals | 0 |
| Persisted opportunities | 0 |
| Non-test native publication proofs | 0 |

The query returned counts and sums only. It did not return names, contact
details, messages, addresses, recipient values, credentials, or raw event
payloads. Test and communication-suppressed records were excluded from every
business denominator where applicable.

This proves the system can report truthfully. It does not prove consumer
demand, conversion performance, response speed, channel economics, or campaign
effectiveness. The first genuine public submission must never be fabricated.

## Provider-health observation

At the same review, Neon showed the Production compute active and the account at
93% of its monthly compute allowance. Public liveness and readiness both
returned HTTP 200 and canonical database readiness was true. The allowance is a
time-bound operator risk, not an application KPI, so it is documented rather
than copied into a stale hard-coded dashboard value. Read-only database queries
were kept to the minimum required for this baseline.

## Reused system

- Existing `/admin/growth` server component and `report:view` authorization.
- Existing canonical Neon Growth view; no second query service or analytics
  store.
- Existing deterministic lead, response, outcome, spend, delivery, and Web
  Vitals aggregates.
- Existing `/admin/distribution` activation command and native publication-proof
  workflow.
- Existing black, gold, burgundy, teal, and restrained Lead Center visual
  language.
- Existing 30-, 90-, and 365-day reporting windows.

## State model

Every metric has a fixed definition, unit, preferred direction, evidence
threshold, sample count, and one truthful state:

| State | Meaning | Numeric value shown | Owner-review ready |
|---|---|---:|---:|
| `measured` | Canonical evidence meets the documented threshold | Yes | Only for target-candidate metrics |
| `directional` | A real but immature sample exists | Yes | No |
| `insufficient_sample` | Denominator or required evidence is absent or too small | No | No |
| `not_instrumented` | The exact canonical evidence contract does not exist | No | No |
| `unavailable` | The required canonical aggregate cannot be read | No | No |

When the selected window has zero eligible live leads, every demand-dependent
metric remains `insufficient_sample` even if an arithmetic implementation could
produce zero. That prevents `$0`, `0%`, and zero-count QA artifacts from being
misrepresented as an operating baseline. Independent field-experience metrics
may mature from genuine Production traffic, but they do not unlock conversion
or economics targets.

## Current operator experience

The existing Growth Command Center now shows:

1. one prominent evidence gate and the next bounded action;
2. eligible live lead count;
3. measured, directional, collecting, and not-instrumented totals;
4. an explicit **Target entry: Locked** control state;
5. a direct handoff to the existing Distribution Command; and
6. one collapsed audit of all 42 metric contracts, including sample,
   threshold, reason, definition, direction, and formatted value.

There is no form, server action, write API, target value, approval reference,
provider call, or AI target recommendation. The page remains ordinary escaped
React output and inherits the existing private/no-store admin boundary.

## Activation path

The immediate controlled sequence is:

1. select one already-approved owned-demand placement in the existing
   Distribution Command;
2. complete the separately approval-gated external publication or WordPress
   action;
3. record exact native publication proof;
4. wait for a genuine public submission through the canonical funnel;
5. verify durable storage, attribution, consent, delivery, assignment, and
   first-response evidence; and
6. allow samples to mature before an owner reviews any numeric target.

At five qualifying observations, selected metrics may become directional. Most
business rates require 20 observations; close economics require at least three
closes with complete revenue, spend, and applicable referral-fee evidence.
These are evidence thresholds, not performance goals.

## Security and compliance boundary

- Test and communication-suppressed records remain excluded upstream.
- The new layer consumes aggregate objects already in server memory and adds no
  database query.
- Raw lead identity, contact data, message content, recipient details, IP data,
  query strings, and user-agent values are not accepted or rendered.
- Protected-class data and proxies are not metric inputs.
- AI does not select, approve, or write a target.
- The page cannot publish, spend, send, assign, migrate, or mutate Production.
- NellySelly repositories, domains, projects, data, and environment variables
  remain outside scope and untouched.

## Local acceptance

- Exact Node 24.18.0 release gate: PASS.
- Vitest: 264 files / 3,296 tests passed.
- TypeScript strict check, full ESLint, and optimized Next.js 15.5.21 build:
  PASS.
- Route contract: 95 active routes / 17 acknowledged root-`src` duplicates.
- Release safety: 14/14; deployable-source NellySelly isolation: PASS.
- Focused Growth regression: 6 files / 38 tests passed.
- Authenticated Chromium at 390×844 and 1,440×1,000: HTTP 200, correct protected
  heading, target lock visible, all 42 contracts rendered after disclosure,
  exact viewport containment, no Next/browser overlay, no console or page
  error, and zero non-read request.
- Local screenshot evidence was written only to the gitignored `artifacts/`
  directory. The local page used a synthetic local-only Basic credential and an
  unconfigured database state; it did not connect to or mutate Production.

## Rollback

Revert the application commit or promote the immediately preceding verified
artifact. No database rollback, data repair, provider rollback, or target-row
cleanup exists because this candidate adds no migration and performs no write.

## Release boundary

This candidate is stacked on exact Draft PR #224 head
`01658f164752de88faefbcf27fcbe98921e6870d`. It cannot release before the
established PR train and does not create a new authorization shortcut. The
existing first Production gate remains:

```text
APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT
```

That gate does not authorize a target record, external publication, consumer
message, spend, WordPress/DNS action, Production data change, or NellySelly
action.
