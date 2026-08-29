# Phase 9 local-profile performance ingress QA evidence

Original evidence date: 2026-08-25

Downstream reconciliation date: 2026-08-29

Candidate branch: `codex/phase9-local-profile-performance-ingress-20260824`

Current base: exact sealed PR #219 head
`b628fc00fc6b03d89871c65d884fe649db025968`

Preserved former head:
`rescue/amm-pr220-pre-pr219-exact-seal-20260829-012049`

Status: exact-parent reconciliation in local verification; former CI, Preview,
browser, visual, and runtime-log evidence is historical until repeated on the
current GitHub PR head; Production unchanged

## Executive result

The existing Growth Intelligence system now has one bounded, authenticated
Google Business Profile performance-report ingress candidate. It validates a
reviewed aggregate CSV without writing, minimizes accepted data into the
existing canonical market-signal and opportunity ledgers, and can reconcile a
real report only behind the existing Production endpoint, database identity,
runtime write, feature, fingerprint, and exact-confirmation gates.

This is an extension of the existing Lead Center and Neon ledgers. It is not a
parallel CRM, dashboard, database, provider connector, campaign system, or
publication tool.

The former PR #220 head `5e605ca8bd8b313f7a4c29b2d1220c7c40a477a3`
was preserved before change. Exact sealed PR #219 was merged normally, without
force push, at exact-parent merge commit
`61c162143cb9892f88a2318d32888ba2d644f329`. The product, API, migration,
route, and focused test files merged without conflict; only release-governance
documentation is being reconciled to the accepted PR #209 baseline and the
current sealed stack.

## Historical measured Production reason

A read-only aggregate query against canonical Neon Production at
`2026-08-25T03:16:33.786264Z` returned:

| Measure | Result |
| --- | ---: |
| Total canonical leads | 6 |
| Test or communication-suppressed leads | 6 |
| Live leads | 0 |
| Contactable live leads | 0 |
| Live outcomes | 0 |
| Live responses | 0 |
| Spend rows / recorded spend | 0 / $0 |
| Live market signals / opportunities | 0 / 0 |
| Publication proofs | 0 |

The public seller, buyer, home-value, Ask, widget, liveness, and readiness
routes returned HTTP 200. The existing ordered release train already contains
the durable-rate-limit readiness and canonical-alias corrections. The measured
gap is attributable owned/local demand evidence, not another lead form or lead
store.

No row-level lead data or PII was read for this measurement.

## Official source basis

The accepted aggregate metric classes follow Google's current documentation:

- [Business Profile performance help](https://support.google.com/business/answer/9918094?hl=en)
- [Business Profile Performance API REST reference](https://developers.google.com/my-business/reference/performance/rest)
- [Business Profile Performance API metric reference](https://developers.google.com/my-business/reference/performance/rpc/google.mybusiness.performance.v1)

The candidate deliberately does not authorize OAuth, call the API, retain
search-keyword text, or retain provider location IDs. A reviewed aggregate
report is the bounded first implementation.

## Implemented contract

### Protected operator surfaces

- `GET /admin/growth/local-profile-ingress`
- `POST /api/admin/growth/local-profile-ingress/preview`
- `POST /api/admin/growth/local-profile-ingress/commit`

All three require server-side `growth:manage`. Cookie-authenticated POSTs also
require exact same-origin validation. Responses are private and `no-store`.

### Input boundary

The only accepted columns are:

```text
start_date,end_date,profile_key,data_state,metric,value,source_system
```

The only initial profile key is `ourtown_properties_primary`. Approved metrics
are desktop/mobile Search/Maps impressions, website clicks, call clicks,
direction requests, conversations, and bookings. The parser rejects foreign
profiles, mixed report identities, duplicate metrics, formulas, unknown or
sensitive columns, malformed/future dates, negative or oversized values,
control characters, oversized bodies, and more than 32 rows.

`synthetic_template` is valid for preview and categorically non-committable.
Only `google_business_profile_report` can represent a real reviewed report.

### Durable boundary

Migration `20260825033000_local_profile_performance_ingress.sql` adds:

- immutable receipt table `local_profile_performance_import_batches`; and
- owner-connected `SECURITY INVOKER` function
  `import_local_profile_performance_batch_v1`.

The function is revoked from `PUBLIC`, `anon`, `authenticated`, and
`service_role`. It validates structures before casts, recomputes every row
score and fingerprint, recomputes totals/opportunity components/batch
fingerprint, takes an advisory lock, reconciles atomically, preserves existing
operator opportunity state, records immutable audits, and returns an
idempotent replay receipt for the exact same batch.

No raw CSV, search terms, provider location ID, provider payload, credential,
consumer identity, contact value, IP, or user agent is retained.

### Explainable recommendation

One deterministic `local_profile_interaction_gap` opportunity can be created
only when:

- report state is final;
- impressions are at least 250;
- website, call, and direction metrics are all supplied; and
- reported interaction rate is below 1.00%.

Its demand, interaction-gap, and completeness points are visible. It is
advisory only and cannot edit or publish a Business Profile.

## Database proof

The complete migration sequence and the new executable contract were run in an
isolated PostgreSQL 17 container with explicit owner, `anon`, `authenticated`,
and `service_role` roles plus the required `pgcrypto` extension schema.

PASS cases:

- first atomic insert;
- exact idempotent replay;
- forged summary rejection;
- forged row/batch fingerprint rejection;
- malformed summary rejection;
- impossible date rejection before cast;
- mixed report identity rejection;
- synthetic source rejection;
- immutable receipt update/delete denial;
- `anon`, `authenticated`, and `service_role` execution denial; and
- transaction rollback without partial signals, opportunities, receipts, or
  audits.

A temporary JS-to-PostgreSQL parity test passed the exact normalized payload
from the TypeScript parser through the PostgreSQL 17 function. The temporary
container and parity test were removed after proof.

The normal local Supabase port was occupied by an unrelated project. That
project was not stopped, altered, or reused. A temporary alternate-port full
migration run reached the new migration successfully; its Studio service later
became unhealthy. The isolated PostgreSQL 17 contract above is the
authoritative database proof for this candidate.

## Historical pre-refresh application verification

Exact-engine verification used Node `v24.18.0`.

| Check | Result |
| --- | --- |
| Focused ingress tests | PASS — 5 files / 27 tests |
| Full Vitest suite | PASS — 257 files / 3,234 tests |
| Strict TypeScript | PASS |
| ESLint | PASS |
| Optimized Next.js build | PASS — Next.js 15.5.21 / 59 static pages |
| Active route manifest | PASS — 95 routes / 17 acknowledged root-`src` duplicates |
| Release safety | PASS — 14/14 |
| Deployable-source system isolation | PASS |
| Production dependency audit | PASS — no known vulnerabilities |
| Full-history secret scan | PASS — 634 commits / approximately 15.77 MB / no leaks |
| `git diff --check` | PASS |
| Release doctor before commit | HEALTHY — 42 pass / one expected non-blocking dirty-tree finding |

The protected page adds 4.69 kB route code and reports 110 kB first-load JS in
the optimized build.

## Visual and interaction QA

Playwright rendered the protected workbench at 1280×720 and 390×844 using the
synthetic report and an intercepted read-only preview response.

- PASS — 2/2 browser scenarios;
- zero commit requests;
- commit control remained disabled;
- synthetic report remained visibly non-committable;
- zero console errors and zero page errors;
- zero unlabeled input/textarea controls;
- keyboard progression from CSV textarea to file selector passed;
- document width stayed within viewport; and
- the mobile metric cards visibly retained complete multi-digit values, class,
  signal/confidence, and date window after correcting the first visual pass.

Generated local evidence:

- `artifacts/local-profile-performance-ingress-desktop.png`
- `artifacts/local-profile-performance-ingress-mobile.png`

Artifacts are intentionally ignored by Git and will be regenerated against the
immutable Preview URL.

## Historical immutable Preview evidence

Draft PR [#220](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/220)
was originally opened directly on the former PR #219 head
`5486bed20272d2a661bc28a0e3a4a4576b2cb11f`. The evidence in this section is
preserved for provenance but cannot authorize the refreshed PR head.

The first code-bearing candidate is:

- commit: `814c2df4c17dac48edb2580db97447c2d63a515f`;
- Vercel deployment: `dpl_EFb7Vzs65KoNWDXJLNr59caV92fS`;
- immutable URL:
  `https://ask-magic-mike-6c4elo41l-eyes-up-industries.vercel.app`;
- Vercel state: `READY`; and
- GitHub Release Gate run:
  [32808025256](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32808025256),
  PASS in 3m15s.

Protected, mutation-free Preview QA run
[32808693945](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32808693945)
checked out that exact commit and passed:

- 17 HTTP/auth/privacy checks;
- six intentional `SAFE_DB_WRITE=false` mutation skips;
- zero failures;
- all 12 Playwright scenarios across the funnel identity, widget, spend,
  organic-search, and local-profile suites;
- zero unexpected, skipped, or flaky browser results; and
- `PREVIEW_READY` release authority assertion.

The immutable screenshots were downloaded and visually inspected. Desktop
renders the complete table and sealed Production authority. Mobile renders
every metric as a contained card with complete multi-digit values, class,
signal/confidence, and date window. Preview identity is explicit, receipt reads
are sealed because the Preview database endpoint is not attested for this
branch, and no commit request was made.

A first secure dispatcher run
[32808315095](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32808315095)
also passed 17/6/0, but its default-branch workflow definition contained only
the three legacy widget browser cases. That limited artifact was not treated as
full visual evidence; the branch-native 12/12 run above is authoritative.

## No-action ledger

This candidate performed no:

- Production or Preview database mutation;
- real report import;
- Google OAuth authorization or provider API call;
- Business Profile edit, post, message, or publication;
- lead creation, assignment, merge, or deletion;
- consumer/internal email, SMS, Push, or acknowledgment;
- WordPress, Gravity Forms, DNS, domain, mailbox, or sender change;
- purchase, ad launch, or spend;
- Production merge, deployment, or environment-variable change; or
- NellySelly operation.

## Ordered release authority

PR #209 is accepted and its durability gate is exhausted. PR #210 remains the
first pending application candidate. This candidate is stacked after exact
sealed PR #219 head `b628fc00fc6b03d89871c65d884fe649db025968`
and cannot leapfrog PRs #210 through #219. After the prior train is accepted
and the current PR #220 head has fresh immutable Preview evidence, its safe-off
application/schema gate will be:

```text
APPROVE PHASE 9 LOCAL PROFILE PERFORMANCE INGRESS PRODUCTION MIGRATION, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT
```

Enabling real report commits remains a separate gate:

```text
APPROVE LOCAL PROFILE PERFORMANCE IMPORT GATE ENABLEMENT AND SAME-COMMIT PRODUCTION REDEPLOYMENT
```

Each real report still requires its exact reviewed report reference, computed
batch fingerprint, and the operator phrase
`IMPORT REVIEWED LOCAL PROFILE PERFORMANCE` in the authenticated UI.

## Rollback

- Before release: close or leave the Draft PR unmerged.
- Application: revert the merge or promote the previously accepted Ready
  Vercel deployment.
- Commit authority: set `GROWTH_LOCAL_PROFILE_IMPORT_ENABLED=false` and
  redeploy the same accepted application commit.
- Database: retain additive immutable receipts/audits; use a reviewed forward
  migration for schema corrections instead of deleting evidence.
