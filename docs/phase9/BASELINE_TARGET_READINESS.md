# Phase 9 Baseline and Target Readiness

Date: 2026-08-29
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
may mature from genuine Production traffic, and reconciled spend remains visible
even when it produced no eligible lead. Neither can unlock conversion or
economics targets without a genuine lead denominator.

## Post-stack data-quality hardening

Reconciliation onto sealed PR #224 added a definition-to-source quality audit
across all 42 contracts. The audit preserved the catalog but closed four
decision risks:

- reconciled spend is independent operational context and no longer disappears
  merely because eligible lead volume is zero;
- attributed revenue and recorded referral-fee totals remain unmeasured until
  every applicable close has explicit evidence, including an explicit zero fee
  when no fee was incurred;
- blended cost metrics remain unmeasured while any paid lead channel lacks spend
  or any spend channel lacks matching conversion attribution; and
- the agent first-follow-up rate is explicitly `not_instrumented` until an
  immutable assigned-lead denominator exists at agent grain. The existing
  system-wide first-response rate is not duplicated under an agent label.

These rules prevent partial dollar totals, decorative zeroes, and duplicate
system metrics from increasing the measured-baseline count or unlocking owner
review. They add no target, query, migration, or write path.

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

## Former-head local acceptance — historical

- Exact Node 24.18.0 release gate: PASS.
- Vitest: 264 files / 3,299 tests passed.
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

## Current post-stack acceptance

- Original PR #225 head `a65cde03c0d8505ad00732f862c37841ccca9a04`
  is preserved at
  `rescue/amm-pr225-pre-pr224-exact-seal-20260829-050048`.
- Exact sealed PR #224 head
  `5c75b8f919442c05b607eb666c5595023057d94d` was merged without rebase or
  force push at `0bb1a6d77d4daf830a4dc7681e3a3d5650332286`.
- Code-bearing hardening head is
  `1289244c44d0c336b4ed242293febe15d5b75914`.
- Exact Node 24.18.0 passes deployable-source Ask/Nelly isolation, release
  safety 14/14, all 264 Vitest files / 3,324 tests, strict TypeScript, full
  ESLint, optimized Next.js 15.5.21 build with 59 generated static pages, and
  95 active routes / 17 acknowledged duplicates. Focused acceptance passes 8
  files / 117 tests.
- Release doctor passes 43/43 and the Production dependency audit reports no
  known vulnerability. Redacted gitleaks reports no finding across all 667
  commits or the exact four-commit sealed-parent delta. Sealed-parent ancestry,
  whitespace, clean tracked tree, and focused security review pass.
- Immutable Preview, protected hosted browser/visual QA, exact-deployment
  runtime-log proof, and GitHub CI remain required on the final pushed head
  before the candidate can be sealed.

## Hosted Preview safety correction

Direct verification of the first immutable Preview exposed a pre-existing
exception to its read-only banner: ordinary browser page-view telemetry could
reach the canonical event repository before the Preview mutation guard. One
privacy-minimized `/ask` page-view was accepted at
`2026-08-28T20:11:40.295751Z` on the Neon `preview` branch. An identical
aggregate-only query against Production branch `br-round-base-auh6h2wd`
returned zero rows. No lead, identity, contact, outcome, message, recipient,
credential, or raw payload was queried.

The candidate now applies the existing endpoint-attested
`assertDatabaseMutationAllowed` guard before durable rate limiting or
persistence in all browser-facing analytics/experiment routes:

- `POST /api/events` and its `/api/widget/events` alias;
- `POST /api/analytics/event`; and
- `POST /api/experiments/event`.

Read-only Preview responses fail closed with HTTP 503, `persisted: false`, and
`preview_data_disabled` before durable rate limiting or repository access.
Automated-browser suppression remains earlier than the guard. The Preview-only
evidence row was not deleted; Production data remained unchanged. Fresh
exact-head release and hosted suppression proof supersede the first Preview's
evidence.

## Rollback

Revert the application commit or promote the immediately preceding verified
artifact. No database rollback, data repair, provider rollback, or target-row
cleanup exists because this candidate adds no migration and performs no write.

## Release boundary

This candidate is stacked on exact sealed Draft PR #224 head
`5c75b8f919442c05b607eb666c5595023057d94d`. It cannot bypass PR #210 or any
predecessor and does not create a new authorization shortcut. Production
remains exact commit `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`.

The eventual PR #225 gate is:

```text
APPROVE PHASE 9 BASELINE AND TARGET READINESS MERGE AND PRODUCTION DEPLOYMENT
```

That gate does not authorize a target record, external publication, consumer
message, spend, WordPress/DNS action, Production data change, or NellySelly
action.
