# Phase 9 organic-search ingress release gate

Date: 2026-08-24

Draft PR: [#219](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/219)

Branch: `codex/phase9-organic-search-ingress-20260824`

Exact base: sealed Draft PR #218 head `f065d8801bec295c99185d846ff4bc38de2a0a6f`

Latest code-bearing commit: `5552a1a77f17f94656952126c69fb003e11fbf95`

Pre-refresh PR #219 head `5486bed20272d2a661bc28a0e3a4a4576b2cb11f`
is preserved at
`rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`. Exact PR #218 was
merged without force push at reconciliation head
`f2754d0e1858c1afcf639977051f3488ab591f89`. The prior CI, Preview, browser,
PostgreSQL, visual, and runtime evidence below remains historical until the
resulting exact GitHub PR head repeats the complete proof.

## Decision

Extend the existing Growth Command Center, `market_signals`,
`market_opportunities`, Neon identity attestation, `growth:manage` RBAC, and
immutable audit ledger. Do not create another analytics product, database,
dashboard, content scheduler, Search Console OAuth client, or provider adapter.

Repository and full-history inspection found the canonical growth read model
and spend/provider ingress controls, but no bounded way to turn an operator-
reviewed Search Console **Pages** report into durable, privacy-minimized organic
demand evidence. PR #219 closes that gap without changing the public funnel.

## Candidate scope

### Protected operator surface

`/admin/growth/search-ingress`

- requires `growth:manage` on the server;
- accepts paste or local `.csv` selection;
- validates without writing and displays normalized page identity, metrics,
  signal score, confidence, opportunity score, and factor points;
- shows minimized immutable receipts after a later authorized import; and
- keeps synthetic validation visibly separate from Production authority.

### Bounded APIs

- `POST /api/admin/growth/search-ingress/preview`
- `POST /api/admin/growth/search-ingress/commit`

Both routes require exact same-origin browser context, authenticated
`growth:manage`, bounded streamed JSON, exact request keys, and private
`no-store` / `noindex` response headers. Preview has no database mutation path.
Commit revalidates the original CSV and exact reviewed fingerprint server-side.

### Canonical page CSV v1

```text
start_date,end_date,site_property,search_type,data_state,country,device,page,clicks,impressions,ctr,position,source_system
```

The contract allows one exact Search Console page report per batch and enforces:

- 512 KiB, 1,000 rows, and 2,048 characters per cell;
- one property, date window, search type, data state, country, device, and
  source system per report;
- approved AskMagicMike.com or OurTownProperties.com domain or URL-prefix
  properties only;
- HTTPS owned-page URLs without user info, ports, query strings, fragments,
  controls, spreadsheet formulas, or email-like paths;
- non-negative clicks, positive impressions, clicks no greater than
  impressions, and CTR reconciliation within `0.0001`;
- one row per canonical page and stable SHA-256 row/batch identities; and
- an explicit `synthetic_template` source that may Preview but can never commit.

The request body is memory-only. Neither raw CSV nor Search Console query text
is sent to Neon, placed in logs, committed, or returned in a receipt.

## Deterministic opportunity policy

AI does not score, prioritize, or publish. Each owned page receives a signal
score and confidence from report demand, data finality, and aggregation scope.
An advisory opportunity exists only when a deterministic threshold fires:

- `organic_click_capture_gap`: at least 100 impressions, position 1–10, and CTR
  below the documented visibility-band threshold;
- `organic_page_one_gap`: at least 100 impressions and position above 10 through
  20; or
- `organic_visibility_gap`: at least 250 impressions and position above 20
  through 40.

Opportunity score is the displayed sum of demand points (0–45), accessibility
points (0–30), and click-gap points (0–25). Database validation recomputes the
sum and policy category. Import may create or revise the evidence and
recommendation, but it preserves an operator's existing status and action
class. The only default action class is `recommend`.

## Additive database contract

Migration:

`supabase/migrations/20260824220000_organic_search_ingress.sql`

It adds:

- append-only `organic_search_import_batches` minimized receipts;
- owner-only `import_organic_search_batch_v1(text,jsonb,text,text,text)`;
- transaction-scoped serialization and exact replay idempotency;
- strict application-plus-database row validation;
- atomic signal/opportunity insert, revise, or unchanged reconciliation;
- immutable before/after audit evidence for every changed record; and
- one immutable aggregate audit and receipt per accepted report.

The function is `SECURITY INVOKER`; table and function authority is revoked from
public, `anon`, `authenticated`, and legacy `service_role` roles. It performs no
network call and cannot publish content.

## Search Console evidence limitations

This importer intentionally does not claim report completeness. Google states
that Search Analytics results can be bounded by internal limitations, some
queries are omitted for privacy, and page/query aggregation can differ. Every
receipt therefore records
`source_coverage=operator_export_not_guaranteed_exhaustive`.

Primary guidance used:

- [Search Analytics API query contract](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [Performance report aggregation](https://support.google.com/webmasters/answer/17011364)
- [Performance report tasks](https://support.google.com/webmasters/answer/17010961)
- [Exporting Search Console data](https://support.google.com/webmasters/answer/12919797)
- [Exporting through the API](https://support.google.com/webmasters/answer/12919192)
- [Query and privacy limitations](https://support.google.com/webmasters/answer/17011259)
- [Clicks, impressions, CTR, and position](https://support.google.com/webmasters/answer/7042828)

## Authority boundary

The candidate cannot:

- authenticate to, call, or configure Google Search Console;
- retain query text, raw CSV, provider payloads, or Google credentials;
- publish, edit, index, or unpublish a page;
- alter WordPress, DNS, Search Console properties, campaigns, or budgets;
- create or modify a lead;
- send email, SMS/MMS, Push, or a consumer acknowledgment;
- infer contact identity, consent, conversion, revenue, or ROI; or
- cross into the separately isolated NellySelly system.

`GROWTH_SEARCH_IMPORT_ENABLED=false` is the safe default. A real commit also
requires the established mutation guard and an exact server-side match between
the active `DATABASE_URL` endpoint and the distinct Ask Magic Mike Production
Neon endpoint. Preview, unknown, absent, or cross-project database identity
fails closed before any write.

## Release order and exact gates

PR #209 is accepted and its durability gate is consumed and exhausted. PR #219
is stacked after PR #218 and its full ordered predecessor chain. It may not
move ahead of the current first pending candidate, PR #210, whose separate gate
is:

```text
APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT
```

After every predecessor is released, PR #219 is refreshed onto exact `main`,
re-proven, and the exact head is reviewed, the owner may use:

```text
APPROVE PHASE 9 ORGANIC SEARCH INGRESS MIGRATION, PR 219 MERGE, AND PRODUCTION DEPLOYMENT
```

That future phrase authorizes only the reviewed additive migration, exact PR
merge, and same-head deployment with `GROWTH_SEARCH_IMPORT_ENABLED=false`. It
does not authorize a Search Console import, Google access, or publication.

After deployment, a specific real page report must first pass Preview and owner
review. The separate operation gate is:

```text
APPROVE PHASE 9 ORGANIC SEARCH IMPORT GATE ENABLEMENT AND IMPORT OF [EXACT REPORT REFERENCE]
```

That later gate must name one exact reviewed report and fingerprint. It does not
authorize a provider connection, page change, campaign, message, lead action,
or spend.

## Rollback

Before any import:

1. keep or restore `GROWTH_SEARCH_IMPORT_ENABLED=false`;
2. restore the immediately prior verified Vercel deployment if application
   rollback is needed; and
3. leave the empty additive table/function installed and dormant.

After an authorized import:

1. disable the feature gate;
2. restore the prior application if necessary; and
3. preserve signals, opportunities, immutable receipts, and audit evidence.

Historical evidence deletion or rewriting is not part of rollback and requires
a separate destructive-data decision.

## Current release decision

**Refreshed Draft stacked candidate only.** The historical code head
`5552a1a77f17f94656952126c69fb003e11fbf95` passed its earlier Release Gate,
immutable Preview, protected no-write browser, visual, PostgreSQL, and runtime
checks. Those results do not authorize or prove the refreshed exact head. Fresh
Node 24 CI, immutable Preview, protected no-write browser/visual QA, and exact-
window runtime logs are mandatory before the PR #219 gate can be requested.

No Production migration, environment change, merge, deployment, Search Console
access, import, publication, lead action, message, WordPress/DNS change,
purchase, deletion, or NellySelly action has been performed by PR #219.
