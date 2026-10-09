# Conversion completion — 2026-10-06

## Readability continuation — 2026-10-09 (local candidate, NOT deployed)

Owner-supplied iPhone screenshots show the web page reached from Mail, not just
an email rendering defect: the entire stored intake text/tracking JSON became
the large page heading and was repeated inside the card. Expanded permissions,
AI and lifecycle panels obscured follow-up. The inspected existing MIME is valid
UTF-8; the template, not character encoding, inserted the diagnostic detail.

### Current release and narrow correction

Authenticated `pnpm release:authority:resolve` at `2026-10-09T15:17:39Z` passed
25/25 checks for accepted PR292: merge `d071c17a25453614bcf1c95fc5ddca24e11cefd4`,
tree `75b24b02dd42bbee984622ed99e7d046f10283bb`, Ready Production
`dpl_8vSxG9ByEh3nKRHwqNHXAH5GXAcF`. This candidate is on
`codex/lead-alert-readability-20261009`; exact frozen identity belongs in the
existing ignored execution record, not a self-referential source receipt.
Accepted release approval remains consumed. Migration/environment changes: zero.

- Email v4: short readable subject, single-column facts, early main-record link,
  Eastern receipt time and three plain walkthrough steps. No raw tracking JSON,
  diagnostic identifiers or contact addresses in the visible body/subject.
  Version-pinned v1/v2/v3 remain unchanged for their old queued intents.
- Lead detail: name or **Test lead** heading; compact request/area/timeframe/
  readable source/assignment before permission-aware contact actions. Duplicate
  navigation is removed. Tasks, appointments, history and advanced controls use
  native expandable sections; optional original text and score factors remain.
  Stored intake, scoring, attribution, consent and audit evidence are not rewritten.
- Manual contact opens the operator's dialer/composer only after explicit review
  and a fresh scoped server permission read. It sends nothing and does not record
  completed contact. Tests, suppressed/terminal records, opt-outs, unknown/held
  permission, unassigned-role access and Preview contact tools stay blocked.
  A reproduced phone opt-out/legacy-consent conflict is fixed fail-closed.
  Closed-record contact holds do not remove authorized maintenance of existing
  internal appointments/tasks. New appointment/contact controls stay held; QA
  remains read-only. A real-session regression checks this distinction.
- Prepared one-copy operation uses the existing outbox/provider, configured primary
  and private BCC, stable copy key and one atomic claim. It preserves the original
  sent row/provider ID; parallel calls send once. Failure/ambiguous state is retained,
  not implicitly resent. There is no public route, automatic trigger or new provider.

### Verification and external effects

Final application-source `pnpm release:gate`: PASS — 3,792 unit passes/99 explicit
skips, strict typecheck, lint, isolation, safety14/14, optimized build and active
routes114/114 (22 acknowledged duplicates). Focused readability/messaging checks
passed; the isolated PostgreSQL notification suite passed19/19, including parallel
review-copy, failure, callback ordering/replay and durable lead tests. Provider
results in that suite are mocked isolated evidence, not live delivery.

Built-app real-session readability browser suite:9/9 PASS in8.3s at320/390/768/1440,
200% root text, keyboard navigation, current-permission/role/QA fail-closed checks
and actual compiled email HTML. Conversion real-session regression:8/8 PASS in18.5s,
including genuine atomic task/appointment saves, replay, stale versions and reporting.
Both use fresh local PostgreSQL, genuine generated Better Auth sessions and synthetic
records with all providers off; no credential, customer record or runtime RBAC bypass.
The earlier nine-case development diagnostic pass is not substituted for this rebuilt
evidence. Preparation failures (transport log path, sign-in suffix matching returnTo,
optional score field type and presentation selectors) were fixed. An earlier compiled
hydration error was not reproduced on the final rebuilt source; final pageerror
assertions pass. Reference real-session regression:9/9 PASS in23.2s, including real
four-role boundaries, session revocation, concurrent/replayed allocation, local
signed HTTP/STOP controls, held pilot, timeline pagination and cross-channel
rendering. Those signed requests were localhost fixtures, not carrier activation.
Its bounded300-lead/1,500-audit-row loopback check is not a hosted scale/SLA claim;
the prior50k latency hold remains unchanged. All26 built-app browser cases pass.
The final test adapter opens closed disclosures only when needed, preserving
actual pagination and action assertions rather than removing hidden-field checks.

Commands actually executed (Node24.18.0/pnpm10.30.3, native PostgreSQL17):

```bash
pnpm install --frozen-lockfile --offline
pnpm release:authority:resolve
pnpm release:gate
pnpm typecheck
pnpm lint
AMM_RENDER_READABLE_EMAIL=1 pnpm exec vitest run tests/leadops/lead-alert-readability.test.ts
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm exec vitest run tests/persistence/notification-reliability-postgres.test.ts
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 AMM_LEAD_READABILITY_ACCEPTANCE=1 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/amm/reference-session-acceptance.mjs
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 AMM_CONVERSION_SESSION_ACCEPTANCE=1 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/amm/reference-session-acceptance.mjs
AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm test:reference:sessions
git diff --check
```

Frozen-lockfile offline install was already up to date; no dependency or lockfile
change. Typecheck/lint/diff checks were repeated after final browser-selector edits
and passed. All disposable PostgreSQL servers were stopped by their owned runner.

Fresh bounded Production GETs returned 200 for `/`, `/ask`, `/home-value`, `/buy`,
`/rent`, `/open-house/ask-magic-mike`, `/widget/v1`,
`/integrations/ourtownproperties`, `/api/health/live`, `/api/health/ready`.
Apex redirects 308 to the canonical www hostname. No form submission was made.
These checks do not establish queue or inbox health, which was not newly measured.
Previous 3,774-unit/98-PostgreSQL/hosted acceptance results remain inherited.

Private synthetic previews and local identity/test receipts are under the existing
ignored `.amm-run/lead-alert-readability-20261009/` (outer mode0700).
Screenshots are in ignored `output/playwright/`, not live email/device acceptance.
No Production/remote data writes, PR push, deploy, notification resend, WordPress
or provider/account change, QA branch wake or spending occurred. NellySelly and
PropertyLens were untouched. Preserve the two historical permanent failures,
ticket29850012, completed QA and original sealed release/closeout artifacts.

### Next exact boundary

Authorize pushing the frozen readability candidate and opening ONE protected
review PR, including existing hosted CI/Preview build effects only. This does
not authorize merge, Production, remote schema/seed/secret changes, delivery,
pilot, paid provider or unsafe Preview data access. The prior unsafe Preview stays
held and the retired schema-only QA venue is not reopened. After protected review,
bind the usual new exact-source Production approval; no new migration is needed.

The owner's one cleaner QA review email request to Mike and the approved private
audit recipient is retained, not requested again. Execute only after the reviewed
release is accepted and current recipient/source/send preconditions are verified.
Use the existing rental QA intent and canonical main-record link, not a new lead
or replay of the old sent row. Primary provider delivery, Mike mailbox receipt and
audit-BCC receipt must be checked independently; no receipt is fabricated here.
Brandon can use his own account for the guide's read-only walkthrough without
Mike's inbox. Neither engineering navigation nor Brandon's acceptance impersonates
Mike's own human acceptance. Roll back a released candidate to accepted292; do not
undo older migrations or delete evidence.

## Current continuation receipt — 2026-10-08 (local reporting candidate)

This section supersedes the dated readiness statements below, without rewriting
their historical evidence. It is NOT a Production acceptance receipt.

### Retained release and acquisition

- Authenticated authority resolver at18:27:55Z:25/25 accepted checks. Main
  `a0cc89457459a584c3e3b2a1bf7a035a6a556217`, tree
  `dc0b4480847baff27a2be3ef86a2d74c48334980`, accepted PR291/deployment
  `dpl_GbjB6VYfCn4bAKT9JBd4afEJUuWT`. No repeated migration/release.
- Page226 rental activation is COMPLETE. Its originating private cache receipt
  was accessible and read. Exactly two previously invalidated HTML/gzip files
  remain recoverable; no page, builder, cache, form, plugin or public QA action
  was repeated. Existing newsletter-dismissal/cookie-script issues remain separate.
- Page3952, Form7, ordinary capture/Mike-first/internal email, two historical
  permanent failures, ticket29850012, other worktrees and inactive projects
  were not changed. No hosted customer rows were read for this work.

### Measured failure attribution and bounded correction

The previous2GiB abort occurred in the combined Vitest process, not a separately
measured hosted application. Fixture/expected arrays, retained summaries and
`vi.fn` query-result history inflated that process. Removing only the outer
fixture arrays was insufficient: retained mock results still inflated memory.
Those intermediate measurements are preserved, not substituted for final evidence.

The corrected experiment incrementally seeds synthetic PostgreSQL17 and runs
accepted/candidate code in separate standalone Node24 processes, with a plain
loopback transport and no test framework/result history. The unchanged accepted
application still reaches981MiB RSS and44.6MB serialized output at50,000leads.
Therefore BOTH harness retention and actual all-row application materialization
contributed. No evidence establishes a Production outage or a DB memory failure.

Local branch `codex/reporting-bounds-20261008` starts from accepted291. The repair:

- Computes all existing metrics in ONE parameterized SELECT/MVCC snapshot.
- Aggregates manual evidence once per eligible lead; distinct appointments,
  tasks, attribution fallbacks, outcome provenance, role/date/exclusion/null
  semantics and operational-trust widgets remain present.
- Returns50 lead detail rows,12 hot rows and up to50 named groups/dimension;
  all remaining groups are explicitly combined as Other with exact counts.
  Top Pages remains top10, not a complete page-dimension listing.
- Preserves the existing100-row maximum microsecond/UUID keyset drill-through,
  rechecking current role/ownership on every request. A cohort cutoff does not
  freeze later edits; the UI now says so. No browser-spanning transaction.
- Leaves analyst projections private-value-free; denied roles never query.
  A failed/cancelled statement yields unavailable/null, never fake zero totals.
- Removes three irrelevant cohort-wide sorts; the bounded details/hot records
  still have explicit deterministic ordering. No schema/index/grant/lockfile/
  environment/provider change, cache, export, warehouse or backfill.

All widget fields are compared against an independent copy of accepted291 on
synthetic records, including mixed first/last-touch JSON, blank strings, missing
evidence, states, hot/stalled signals, due tasks and7/30/90-day role scopes.
High-cardinality totals, actual concurrent snapshot consistency, permission
changes, unavailable/cancelled SQL and existing stable paging are tested separately.

### Final standalone before/after measurements

Same deterministic workload/anchor, one warmup, five serial reads and three
concurrent reads. Each lead has2appointments plus a repeated completed event
every tenth lead,3tasks and3audits; four exclusion fixtures plus old/future
records. Exact independent expected totals passed for EVERY cohort below.

| Leads | Accepted p50/p95 ms | Candidate p50/p95 ms | Accepted/candidate peak app RSS MiB | Accepted/candidate JSON bytes |
| ---: | ---: | ---: | ---: | ---: |
| 1,270 | 870.28 /902.25 | 84.90 /87.37 | 185.48 /102.14 | 1,137,506 /51,406 |
| 10,000 | 601.20 /623.25 | 442.82 /465.33 | 367.16 /103.52 | 8,918,354 /51,466 |
| 50,000 | 3,822.66 /3,844.80 | 2,421.40 /2,542.48 | 981.16 /100.94 | 44,609,080 /51,693 |

SQL requests/report:6 ->1. Three-concurrent wall times at50k:10,228.51 ->3,121.05ms.
At50k, accepted/candidate baseline RSS93.64/90.98MiB; incremental peak887.52/9.95MiB;
peak heap682.69/12.03MiB; incremental heap671.90/1.04MiB. Parent measurement-window
peak94.72/92.00MiB. DB process summed RSS528.44/412.77MiB (shared pages are double
counted; this is NOT unique resident RAM). Seed time13.13/14.69s is separate from
report timing. Driver query timings and per-query ANALYZE/BUFFERS JSON are retained
privately; the latter runs outside the measurement window.

Targets were declared before tuning: p95<=2s, app RSS<=512MiB, response<=1MiB,
<=6queries. Abort guards remained2GiB/process,8GiB free disk,600s and15s SQL timeout.
These are small-sample nearest-rank p95 values, not statistical/hosted SLAs.
The final candidate meets all declared targets THROUGH10,000leads. At50,000 it
preserves exact counts and bounded application output/memory but FAILS the2s
latency target. Do not market50k as accepted hosted capacity. Remaining DB work
includes materialized CTEs and temporary I/O; do not hide that cost behind app
memory improvement. Bounded row/group counts do not guarantee a fixed byte size
for arbitrarily long historical strings. High-cardinality grouping correctness
is covered separately, not represented as the five-source throughput workload.

Two attempted audit-join/projection optimizations regressed PostgreSQL's planner
to repeated scans and were rejected. Their plans/measurements remain private.
A newly added fixture tried duplicate active appointments; the actual unique
index rejected it. The fixture now repeats completed appointments instead;
the production constraint was NOT changed. An accidental Docker invocation was
stopped before benchmark setup completed; final evidence uses native PostgreSQL.

Reproduce only with clean local Node24/pnpm10.30.3 and existing native PostgreSQL17:

```bash
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/amm/reporting-scale.mjs --large --accepted
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/amm/reporting-scale.mjs --large
```

The diagnostic exits after finishing a cohort; exit0 is NOT a budget-pass seal.
Compare recorded metrics to `limits`;50k is explicitly latency-held above.
It refuses configured app URLs/hosted environments, never inherits provider
credentials into workers, and cleans up only its UUID-owned disposable database.
The accepted test reference is not imported by application code.

### Operator, Preview, review and effects

The current five-minute read-only walkthrough is in `docs/OPERATOR_GUIDE.md`.
HUMAN ACCEPTANCE PENDING: no actual staff member completed it in their own
account/device during this engineering run. Automated synthetic Better Auth
sessions, even successful ones, do not imply human acceptance. No live task,
appointment, assignment, consent or communication action was taken.

Preview remains UNVERIFIED/UNSAFE for private-row acceptance: previously copied
Production provenance, physical current binding and synthetic-only data scope
remain unresolved. No Preview private rows, canary writes, credentials, schema,
remote branch or seed operation was used. Retain the existing clean-venue setup
scope; runtime no-send flags do not establish safe data provenance.

Verification executed this continuation (not inherited PR291 counts):

| Command / check | Actual result |
| --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts` | PASS; Node24.18.0/pnpm10.30.3, package/lockfile unchanged |
| `pnpm release:authority:resolve` | PASS25/25 at18:27:55Z |
| Standalone before/after benchmark commands above | Exact counts PASS at1,270/10k/50k;50k latency target FAIL, not an accepted capacity seal |
| Focused PostgreSQL reporting + reconciliation unit files | PASS30/30, including15real PostgreSQL reporting cases |
| `pnpm release:gate` | PASS:3,770unit passes/97explicit skips;309files pass/6skip; typecheck/lint/build/isolation,14safety checks,114active routes |
| Existing seven-file serial PostgreSQL gate (command below) | PASS98/98 in79.13s; real local SQL, no provider/network substitution labeled live |
| `AMM_QA_NATIVE_POSTGRES_TEST=1 AMM_CONVERSION_SESSION_ACCEPTANCE=1 pnpm test:reference:sessions` | PASS8/8 in23.0s; full source-to-task/appointment/report journey, role gates,320/390/768/1440,200%zoom/root text |
| `AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm test:reference:sessions` | PASS9/9 in23.2s; actual synthetic sessions, revocation/directAPI/signed inbound/STOP/held-pilot/report checks |
| `env -u ADMIN_SECRET pnpm smoke:prod` | PASS19/2intentional skips/0fail; read-only public/unauthenticated checks, no session-create POST |
| Reference integrity | Accepted291 file matches after only2import relocations and2export names; no SQL or aggregation change |
| `git diff --check`; outgoing-pattern scan | PASS;13candidate files,0matched secret patterns; not a full-history credential audit |

The seven-file PostgreSQL invocation is the exact command retained in the
historical execution section below, freshly executed with native opt-in and
serial workers. Its current98pass count supersedes the historical91 only for
this candidate. Unit97skips include these opt-in SQL cases; they were run
separately, not silently counted as unit passes.

Browser evidence uses genuine Better Auth sessions on synthetic disposable
PostgreSQL. Conversion fixture:7leads/14intents; reference fixture:306leads/
16intents. BOTH receipts:0providerIDs/0send reservations/0provider calls/
0Production writes, then fixture teardown. Screenshots were captured and the
390px Source-to-outcome panel was visually inspected. This is not full WCAG
certification, carrier acceptance or human operator use. Current-head hosted
CI/Preview, production private-row checks, migration/deployment and live
lead/mailbox/device actions were NOT RUN.

Private evidence:
`.amm-run/reporting-bounds/` in this local worktree (0700 directory/0600 files),
plus synthetic browser artifacts under `output/playwright/`. They are not public
uploads or durable off-machine backups. Existing WordPress backups stay in their
original secured locations. No push, PR, remote migration, deployment, send,
pilot/cron/provider/WP/cache/billing or other-project mutation was performed.

Rollback: this additive local app-only candidate can be discarded/reverted in
its own branch without any schema reversal or customer-data deletion. Accepted291
remains running. Any future review publication must bind this successor's exact
head/tree and expected CI/Vercel Preview effects; prior approvals are consumed.
The next owner gate is review publication ONLY, not merge/Production permission.

---

## Historical October6 candidate record (retained)

Independent conversion-reliability candidate, NOT a Production acceptance receipt.
Canonical root app/Neon remain unchanged in architecture. No new CRM, store,
provider, plugin, calendar connection or messaging activation. This dated delta
supplements the existing completion register; historical receipts remain intact.

## Reconciliation and scope

- Authenticated resolver at 18:47:37Z: 25/25 checks passed. Accepted main
  `03958774db57cf6553fdbc75809ebac3473617ed`, tree
  `28002086757f9d298201579b6e0578c5cdbe0ab8`, PR290, Production
  `dpl_DN4whSpSceS2Gt12hVrsSST3ytRC`. No newer successor at initial check.
- Branch: `codex/conversion-completion-20261006`; separate clean worktree from
  accepted main. The dirty staff-disclosure branch and inactive projects were
  not edited. No credential/session copying or shared service shutdown.
- M4 arm64, macOS27.0.1,16GiB; 14GiB free. One heavy pipeline at a time.
  Existing Docker service was unavailable; disposable PostgreSQL17 fixtures
  used native binaries with private directory/Unix socket or loopback-only TCP.

| Workflow | Reused source / proof | Demonstrated gap | Smallest chosen fix |
| --- | --- | --- | --- |
| Appointment/task writes | `neonAdminAppointmentFollowupOps.ts`; actual isolated SQL | Four downstream audit failures left mutations committed despite failed response | Single `mutate_admin_conversion_v1` transaction on existing tables |
| Human follow-through / Today | Existing detail/actions/Today/timeline; real sessions | Interaction evidence and accountable next task needed one commit and clear provenance | Explicit manual channel/result + next task + audit; task completion never implies contact |
| Scheduling | Existing appointment model/public request | Exact-version conflicts, native overlaps, declared-zone/DST handling and retained drafts | Lead/actor/dependent locks; microsecond versions; explicit confirmation; no external availability claim |
| Source/outcome reporting | Existing reporting repositories/page; 1,270-row actual SQL fixture | Capped totals, inferred states and real-driver Date decoding could misstate results | Full scoped cohort reconciliation, canonical distinct-lead states, aggregate-only analyst view, stable SQL pages |
| Authenticated shell | Existing admin layout/aliases; built browser | Five background Action Queue prefetches returned500 with runtime-only auth configuration | Shared layout explicitly dynamic; browser fails on500/RSC dynamic errors |
| Dependency safety | Existing override policy/lockfile | Production audit identified two new high advisories | Sharp0.35.5 and source-map-js1.2.2 patch floors, no framework/auth upgrade |
| Long/source-tagged lead mobile layout | Actual Home Value walkthrough screenshot | Manual form expanded to1,258px in a390px viewport despite the shorter fixture fitting | Grid child minimum widths and scoped anywhere wrapping; actual intake lead overflow regression |
| Read-model defense in depth | Accepted permission policy + actual repositories | Analyst with agentId could receive private lower-level projections; approved-agent direct report call ignored report:view | Deny before SQL, with actual PostgreSQL and unit denial checks; page/API auth remains intact |

## Transaction contract

One additive migration: `20261006190000_atomic_conversion_followthrough.sql`.
Reviewed file SHA-256: `c8b87c064b38dfb2411ee025db20d25379194ad7672f64d92780bd026a3df688`.
No new tables, historical backfill, dispatch, consumer contact or policy enablement.
Current server-derived actor/role/ban/assignment is rechecked inside the SQL
transaction. Lock order: lead, current user, dependent row, assigned-agent conflict
lock where needed. Required lifecycle and audit failures abort the statement.
Exact replay (same actor/lead/key/fingerprint) returns the original logical result;
changed payload with the same key conflicts. Authorization is rechecked before replay.
Distinct confirmed actions receive distinct keys. Lost response is uncertain, not
failure; the UI offers only captured-payload replay, never a blind new action.

The four partial commits were reproduced against baseline application methods
BEFORE the repair in the disposable venue. This is not a Production incident
claim. `AMM_CONVERSION_BASELINE=1` describes that pre-repair reproduction, not a
command to run against the repaired methods and pretend they are old source.
Final repair evidence uses actual methods, actual PostgreSQL, state assertions,
forced audit/lifecycle failure, concurrent replay/conflicting transitions,
role/ban/ownership races, terminal lifecycle, microsecond tokens and ACL checks.

Forms preserve unsaved notes only in memory, disable double-submit, retain drafts
on definitive failure/conflict, and require latest-record review/reconfirmation.
No localStorage/sessionStorage note drafts, automatic outreach or provider receipt
inference. Manual evidence retains actor/time/provenance. Scheduled is not confirmed;
public requested appointment is not an external booked calendar event.

## Built-app walkthroughs and reporting meaning

The conversion browser suite starts the production build with five genuine Better
Auth identities, real sessions/RBAC, and actual SQL via isolated loopback transport.
All nonlocal fetches are refused; provider credentials are not inherited.
Synthetic fixtures are not consumers, prospects, production KPI data or personal
operator acceptance. Local eligible flags only exercise reporting inclusion rules.

Walkthrough1: source-tagged Home Value UI -> actual `/api/leads` -> consent/source
rows/Mike-first fixture owner -> public appointment request + confirmation task ->
owner records confirmed manual interaction + next task -> persisted timeline/report.
The two local public POST requests use the owned Origin header with unchanged actual
handler/payload/database; this is not deployed DNS/TLS or cross-domain browser proof.

Walkthrough2: agent handles Today/manual outcomes/appointment/conflicting tab; analyst
opens aggregate-only source report. Admin/primary owner have only permitted record
drill-through; approved-agent/analyst role limits and revocation remain enforced.

Reporting uses captured-lead UTC `[start,end)` cohorts, not event-date funnels.
Distinct-lead appointment/current-state, actual supported outcome and manual-evidence
counts are independent, not a forced ordered conversion funnel. Multiple events and
appointments do not inflate lead counts. Unknown history is unknown; failed query is
unavailable, not zero. QA/suppressed/duplicate aliases are excluded before joins.
Totals reconcile the full scoped cohort in memory, NOT bounded SQL aggregates; a
larger-production performance limit is not yet established. Drill-through uses a
fixed cohort anchor and microsecond+ID cursor, separate from authoritative totals.
No export/tracking system was added; existing exports remain outside this change.

## Execution receipt

Current execution (all this session, not inherited PR counts):

| Command / venue | Result |
| --- | --- |
| Node24.18.0/pnpm10.30.3; frozen offline install | PASS; patch-floor lockfile regenerated then frozen install repeated |
| `pnpm release:authority:resolve` | 25/25 accepted baseline checks at18:47:37Z |
| Focused workflow/time/report/security unit tests | 63/63 before later four read-permission regressions |
| Native PostgreSQL gate (exact command below) | 91/91 in66.69s; conversion14, report8 plus existing QA/notification/allocation/scheduler/pilot |
| `AMM_QA_NATIVE_POSTGRES_TEST=1 AMM_CONVERSION_SESSION_ACCEPTANCE=1 pnpm test:reference:sessions` | 8/8 in18.1s on repaired build; private `conversion-session-receipt.json` |
| `AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm test:reference:sessions` | 9/9 in17.8s on same build; private `reference-session-receipt.json` |
| `pnpm release:gate` | PASS after final CI wiring: 3,770 tests passed / 90 skipped; 309 files passed / 6 skipped; typecheck, lint, system isolation, all 14 release-safety checks and production build passed; 114 active routes verified. Private `release-gate-final.log` preserves the run |
| `pnpm audit --prod --audit-level=high` | No known vulnerabilities after two patch floors; Sharp0.35.5 native M4 PNG render passed |
| Existing workflow YAML parse | PASS;26steps,contents:read; no hosted workflow dispatched |
| `pnpm smoke:prod` | Production read-only19pass/2skip/0fail; authenticated health and session writes NOT RUN |
| Additional eight major public GETs + apex | Eight200s/no NellySelly body match; apex308 to canonical www. First five pages have expected canonicals; open-house/widget/integration canonical element absent (unchanged, not claimed fixed) |
| `pnpm release:intent:validate` | Correctly HELD: `release_intent_github_event_missing`; no fake event or PR |
| `pnpm release:doctor` | Initial57pass/1nonblocking dirty-tree fail/1current-receipt-input skip; repeat on locally committed source, without pretending hosted authority |

```bash
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm exec vitest run \
  tests/persistence/conversion-transaction-postgres.test.ts \
  tests/persistence/conversion-reporting-postgres.test.ts \
  tests/persistence/automatic-qa-audit-evidence.test.ts \
  tests/persistence/notification-reliability-postgres.test.ts \
  tests/persistence/reference-allocation-postgres.test.ts \
  tests/persistence/allocation-scheduler-postgres.test.ts \
  tests/persistence/staff-allocation-pilot-postgres.test.ts \
  --maxWorkers=1 --no-file-parallelism
```

Browser checks include desktop320/390/768/1440,200% browser zoom and200% root text,
keyboard actions, actual public intake, stale draft/latest-version recovery, lost
response identical replay, real role sessions/revocation, denied detail/report
routes and zero provider dispatch. Final source-tagged manual form is316px within
390px viewport, versus1,258px before the wrapping fix. Actual component screenshots:
`conversion-owner-manual-action-390.png`, `conversion-source-outcome-panel-390.png`,
`conversion-appointment-conflict-panel-390.png`; full walkthrough/width/text shots
are in `output/playwright/`. These are synthetic implementation evidence, not
personal operator acceptance or a full WCAG certification.

SQL reconciliation:1,270 included leads;53 in owner scope;1QA/1suppressed/2duplicate
aliases excluded;9distinct appointment leads;2actual closed outcomes;2manual
attempts/1two-way/1first-response;1,257unknown first/last source. Thirteen100-row SQL
pages reconcile exactly1,270unique IDs. No private analyst detail/drill-through.
Five sequential complete-report reads on1,270eligible leads:30SQL round trips,
p50=41.04ms/p95=44.01ms. Built HTTP test adds300synthetic leads/1,500audit rows,
12measured reads per route at concurrency3 after warmup,0errors,predeclared p95<2s:

| Route / genuine role | p50ms | p95ms |
| --- | ---: | ---: |
| Today / admin | 599 | 632 |
| Inbox / agent | 224 | 261 |
| Paged detail / agent | 89 | 97 |
| Allocation / admin | 117 | 159 |
| Report / analyst | 111 | 125 |

Recorded EXPLAIN:planning1.081ms/execution0.04ms,Limit node,small isolated fixture;
no new index justified. These loopback results are NOT a Production SLA, Neon/Vercel
network acceptance or carrier throughput. Final fixture counts: conversion7leads/
14intents, reference306leads/16intents; both0providerIDs/0reservations, then removed.

Earlier development failures remain distinct: stale source/test floor assertions,
one invalid test-only source argument to retained first-response function, incorrect
legacy test assumption that every role can read a report, and reproduced browser
prefetch500s. Corrected assertions strengthen actual supported contracts; no branch
protection, session auth, grants, Origin, dispatch or reporting policy was weakened.
Hosted CI, immutable Preview, deployment/migration and real mailbox/device/operator
acceptance are NOT executed by this local-only task. The local release-intent
validator refuses missing GitHub event context; no fabricated event or PR seal.
Both new SQL suites and conversion browser suite are wired into the EXISTING hosted
Release Gate; separate conversion/default receipt filenames prevent overwriting.
Private evidence lives in `.amm-run/conversion-completion-20261006/` (mode0700),
not public Git. No cookies/secrets/private backups or live customer records uploaded.

## Acquisition: verify, do not duplicate or publish

Existing rental-to-homeownership change-set is reused, not copied. Read-only public
checks: WordPress page226 `/rentals/` published, modifiedGMT2025-06-16T19:09:52,
HTTP200/canonical preserved; no visible Ask Mike CTA or connector marker. Canonical
`/rent` responds200. Existing `wordpress-activation-change-set.ts` target is:

```text
[ask_magic_mike_cta route="/rent" source="rental_to_homeownership" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_rental_to_homeownership" headline="Renting now and planning your next move?" text="Ask Magic Mike for a broker-reviewed rental-to-homeownership readiness conversation. No financing or eligibility decision is promised." button="Review My Next Steps"]
```

Packet is `authenticated_source_required`, not publication-ready: obtain fresh raw
page/builder source, exact visible insertion anchor, matching revision, outside-web-root
page backup and rehearsed narrow rollback before binding the existing rental gate.
Preserve all rental inventory/forms/SEO; only one reviewed placement. Page3952 is
already published and was not republished. Page149's hidden CTA remains unresolved;
Form7 and page4120/Form6 stay held. No new QR/image packet, tag, cache purge or publication.

## External holds and rollback

Twilio ticket29850012: once-only authenticated read at start found **New**, original
inquiry only, no human answer. D1 contact is completed, not unsent. No repeated poll,
reminder or second ticket. A1–A4/B1–B6/C1–C2/D2 remain pending; sender restricted,
trial custom-body eligibility unknown, staff pilot/enrollment absent, budgets0 and
no allocation cron. Conditional $1.1644/$2 estimate is not funding approval.
Existing approved capture/Mike-first/internal email was not disabled. Two historical
permanent failures were not touched. No email/push substitute for the held pilot.

Rollout order after local sealing: authorized PR/hosted CI/immutable no-write Preview,
then exact source/scope owner gate for ONE migration + same-tree application deploy,
ZERO environment changes/sends/activation. Neither old PR290 nor messaging approvals
authorize this successor. App code requires the additive migration before promotion.

Rollback keeps accepted v3/v1 functions and every audit/lead/task/appointment row.
Isolated rehearsal checks ACLs and actual retained calls after revoking only the new
entrypoint. No down-migration or evidence deletion. For actual app rollback use current
accepted290 deployment under the separate release gate; preceding accepted289 remains
`dpl_81e1MY7Y79dQcYYcoTq1U72ED1ZZ`. Do not revoke the new function while running the new
app; any Production rollback/privilege change requires its own scope. Full old-app
redeployment/restore was not performed by this task.

Security references: [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
[Sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

## 2026-10-09 authorized synthetic Preview acceptance delta

The current owner instruction authorizes one schema-only expiring QA venue,
reporting-branch-only Preview configuration, protected canonical/operator QA,
necessary QA integration corrections on PR292, and conditional protected merge
plus an app-only Production release. Earlier review-only holds are historical;
neither they nor PR291's consumed approval authorize unrelated operations.

New QA provenance was verified independently through Neon infrastructure and
database-side branch/endpoint identity: all90 application tables contained zero
rows before seeding. No external-job extensions or foreign servers were present.
The two URL-pattern function matches were owned-domain validation allowlists,
not embedded secrets or external calls. The venue uses fixed0.25CU, five-minute
auto-suspend and24-hour expiry; it does not fork or sanitize customer records.
The existing uncertain Preview remains untouched. QA-only fresh credentials
and a restricted runtime role have no superuser/DDL/replication/RLS-bypass flags.
Its explicit RLS/table/function grants are confined to the new disposable venue,
not source migrations or Production changes.

Minimal fixtures: five fresh Better Auth identities, three synthetic agents,
25 unmistakably labeled test/suppressed leads, zero initial tasks/notifications.
All44 settings apply only to the reporting Preview branch. All inherited
connection/admin/cron/phone-signing values are overridden with QA-only values;
delivery, consumer channels, AI/live adapters, allocation/pilot and async work
remain off. Merely passing the shared database/provider Preview guard is not
treated as no-send evidence. Private metadata, fixture manifest, empty-state
receipt and configuration journal are in the existing ignored execution record.

QA integration defects were corrected without weakening application protections:
exact same-origin login redirects count as anonymous denial; real private
synthetic Better Auth sessions replace the legacy-only page probe; canonical
intake uses a stable replay key and reserved example.test identity with no
channel consent; suppressed QA task creation must remain409; Preview SMS and
disabled email callbacks must remain refused. Cron-auth GET is a write and is
not executed in the read-only pass. Private credentials/cookies are never
written to the canonical report or process arguments.

Initial actual protected read-only run:22PASS/8explicit mutation skips/0FAIL.
Initial controlled synthetic run:30PASS/0SKIP/0FAIL, including durable lead/note
readback, task suppression, SLA writes and callback refusals. These runs use the
first new QA build of the prior reviewed source and the corrected local harness;
they are not yet the final frozen-source release seal. Final source/deployment,
operator results and release disposition belong to the later sanitized PR
receipt and generated Production acceptance, not a predicted source assertion.

The inherited measured10k passing envelope and50k FAIL/LATENCY HELD remain
unchanged. No50k benchmark was repeated or relabeled. Genuine human operator
acceptance, carrier/disclosure/enrollment decisions and mailbox delivery proof
remain separate. Production schema/env, pages226/3952 and caches, historical
failures, Twilio ticket29850012, NellySelly and PropertyLens remain untouched.

Hosted successor run37926140721 remains recorded FAILED: its fresh-schema,
ACL and rollback installation case reached Vitest's default five-second
timeout. It did not report a failed business assertion. Only that full-schema
case now has a bounded30-second setup timeout; no test, protection or reporting
latency target is removed or relaxed. The focused actual native PostgreSQL
conversion transaction suite then passed all14 cases (10.47seconds total).
The succeeding exact-source hosted run must still pass independently before
merge; a local pass does not replace that required check.

## 2026-10-09 final acceptance and bounded Production validation

The preceding pending statements are historical. Final reviewed head90abd9904d111eba5a0c62041bee9e843693916e
passed the protected canonical QA30/30, five-role operator27/27 and browser15/15.
The exact-source hosted run37928097287 passed3,774unit tests/97explicit skips,
98isolated PostgreSQL checks and the separate real-session/conversion/reflow suites.
All13pre-merge evidence-file checksums remain unchanged. The frozen-source integration
changes did not weaken RBAC, assertion semantics, branch protection or latency targets.

PR292 merged normally asd071c17a25453614bcf1c95fc5ddca24e11cefd4.
Accepted Production deploymentdpl_8vSxG9ByEh3nKRHwqNHXAH5GXAcF uses exactly reviewed
tree75b24b02dd42bbee984622ed99e7d046f10283bb and existing Production configuration,
not a promoted synthetic Preview build. Production migrations0/environment changes0.
[Official acceptance](https://github.com/brandonnarron1-lang/ask-magic-mike/releases/tag/amm-production-acceptance/dpl_8vSxG9ByEh3nKRHwqNHXAH5GXAcF)
was downloaded with its matching file checksum; final authority resolution25/25,
monitor11/11 and read-only smoke19PASS/2intentional skips independently passed.
Runtime log counts were not collected; that is not a zero-errors assertion.

The separate owner-authorized Production acceptance test followed the unchanged
page226rentals CTA exactly once at12:49:40Z. Test referencef51dab09,
correlation12d89ab7: one durable suppressed intake/contact linkage, four correct UTMs,
first/last touch, actualamm_contact_v2 consent, deterministic score23 and atomic QA audit.
The approved test contact deduplicated to the retained Mike-owned QA record27cdd1a9;
no fresh assignment/business conversion was fabricated. One outbox intent/attempt/
Resend dispatch01a120b6 has signed sent/delivered events. The exact audit BCC copy was
verified in the approved audit mailbox with hidden-copy headers. Mike's own inbox
receipt and actual Production Lead Center UI remain UNVERIFIED. No second submission
or resend; no consumer acknowledgment/nurture/SMS/Push; test/duplicate KPI exclusions
remain set. Production pending queue0; historical permanent failures2unchanged.

Bounded READ ONLY SQL validated2live-eligible Production records, not invented demand
or staff conversations. Protected Production UI/API comparison remains unverified:
there was no legitimately available Production operator session. Sensitive CLI
exports being unavailable was not treated as evidence that live configuration is off.

The one disposable schema-only QA target retains its fixed0.25CU/300-second
auto-suspend/2026-10-10T11:31:02Zexpiry. Final26leads are alltest/suppressed; one skipped
notification has zero attempts/provider IDs; no due tasks/appointments.45settings are
reporting-branch-only (the final additional setting suppresses Preview toolbar JS).
Temporary mutation ability is now closed both in configuration and database ACLs:
runtime writable tables0, executable application/security-definer functions0.
Ten independently inspected provider-owned UUID value functions remain, not a write
bypass. The final immutable closure build is protected/read-only with all transports off.
Exact metered cost is unverified; no new plan/recharge/recurring commitment was made.

The complete private operational receipt and checksum index are retained under the
existing ignored execution record, not temporary screenshot paths. This appended
register entry is a local documentation-only continuation; it was not part of the
accepted release tree and does not require another application deployment or PR.
Rollback remains the READY accepted PR291 app without schema reversal. Page226/page3952,
caches, connector, disclosure candidate, old Preview, ticket29850012 and unrelated
projects remain untouched.10k measured passing envelope/50k2542ms vs2000ms
FAIL/LATENCY HELD are preserved. Next boundary is genuine own-session operator
acceptance of the released Today/timeline/next-action/reporting workflow, not a new CRM.

## 2026-10-09 post-292 operator acceptance and QA lifecycle closeout

Fresh authority resolution at13:47Z passed25/25; remote main remains
`d071c17a25453614bcf1c95fc5ddca24e11cefd4`, accepted deployment
`dpl_8vSxG9ByEh3nKRHwqNHXAH5GXAcF`, reviewed tree
`75b24b02dd42bbee984622ed99e7d046f10283bb`. No merge, deployment, migration,
new inquiry, resend or Production business-data mutation was repeated.

The bounded repeatable-read READ ONLY check was restricted to the two existing
approved QA references plus notification status aggregates. Canonical27cdd1a9
was created/assigned at`2026-10-02T01:56:00.040Z` (October1,21:56EDT), Home Value
score60; assignment history remains pending. Rental duplicate intakef51dab09 at
`2026-10-09T12:49:40.101Z` retains score23, its four exact rental UTMs, own consent
and atomic creation/QA-suppression evidence; it points to the existing canonical
record without a new assignment. Both records remain test/suppressed/KPI-excluded.
The rental intent remains one sent attempt with Resend01a120b6 and delivered
metadata at`12:49:51.365Z`. No waiting notification statuses were present; two
historical permanent failures are unchanged. This is storage/provider evidence,
not a new delivery test or proof of Mike's mailbox.

Actual Production browser navigation to the canonical detail redirected to
`/lead-center-login?error=session`. A legitimate Mike session is unavailable;
Today/inbox/detail/timeline/report UI and personal acceptance remain unverified
or not run. The connected mailbox is not Mike's and was not searched as his inbox.
The previously verified hidden audit-BCC receipt remains VERIFIED. Mike's own
receipt/folder is UNVERIFIED. The existing operator guide now supplies the exact
subject, time, canonical link and own-account read-only handoff.

Current lead-detail timeline source queries select exactlead_id; the canonical
Home Value source must not be represented as the rental intake's source. Visible
cross-intake association has not been established. Expected test filtering and
missing human login are not demonstrated application defects; no application
code or permission changes were made. No staff participation is inferred from
the inherited27-role or15-browser checks.

Fresh QA runtime ACL reads confirmed26synthetic suppressed leads, zero unsafe
leads/external dispatches/inherited roles, zero writable tables and executable
application/security-definer functions. Ten provider-owned pure UUID functions
remain. Protected closure-build GET confirmed all12runtime checks, including
no-write/no-email/no-SMS/no-consumer delivery/no-AI.45current settings remain
branch-only, including an explicit QA DATABASE_URL; no inherited provider key
was present. No mutation probe or grant reset was executed.

After final reads, the existing exact disposable compute was suspended once
under its approved lifecycle; fresh provider metadata confirmed`idle`, no pending
transition, at`2026-10-09T14:00:19.400Z`. Fixed0.25CU and300-second auto-suspend
remain. Provider-configured expiry is still`2026-10-10T11:31:02Z`; expiry/deletion
has NOT yet happened. No extension, replacement, new automation or background
promise was created. No matching owned proxy/browser/monitor wake process remained.
Production is on its distinct existing branch/endpoint. Preview keeps its explicit
QA binding and disabled legacy fallback; expiration can make QA reads unavailable,
not redirect them to Production or the old uncertain Preview.

The final browser inventory had no matching disposable-QA tab. Exact-resource
references were absent from local Codex automations and user LaunchAgents;
user crontab was absent or unavailable. No unrelated tab/job was stopped and no
schedule changed. This bounded inventory is not a claim about inaccessible
third-party probes.

Resource-level hourly usage API returned1,128compute-unit-seconds (0.313333CU-hours)
and1,308,234public-network bytes for11:00–13:00Z ONLY. Later/unfinalized usage,
storage and final billing are not established; exact charge remains UNVERIFIED.
The original20final-evidence and13premerge checksums were independently rechecked
unchanged. Fixtures remain`reporting-remote-qa-v1`, schema-only PostgreSQL18.6;
source/provenance/ACL/report associations are preserved in the existing private
execution record, with a supplemental closeout checksum index. Original seals and
the original operational receipt were not rewritten.

New session checks: authority25/25; four bounded public HTTP GETs200
(`/api/health/live`, `/api/health/ready`, `/`, `/plan`), both health routes attest
accepted source; bounded Production/QA reads; protected QA runtime12/12; exact
compute idle/expiry postflight. No full test/build/benchmark was repeated; prior
3,774unit/97skips/98PostgreSQL results remain inherited. Two preparation-only
diagnostic errors (checksum-field selection; UUID/text comparison) were corrected
locally; the failed READ ONLY transaction rolled back and is not a product defect.

Files changed are this existing completion register and`docs/OPERATOR_GUIDE.md`
plus ignored private diagnostics/receipts. Documentation-only changes are local,
not part of the accepted Production tree; no new PR/release is warranted. App
rollback remains accepted291; pages226/3952/caches/forms, old Preview, disclosure
candidate, ticket29850012, NellySelly, PropertyLens and permanent failures remain
unchanged.50k2,542ms vs2,000ms remains FAIL/LATENCY HELD; no rebenchmark was performed.

Next human boundary: Mike locates the existing October9,08:49EDT rental TEST
message and reports its actual folder, then signs into his own Production account
and completes the guide's read-only canonical-lead/Today/report walkthrough.
Reply`TAKEOVER DONE` when his session is ready; no credentials in chat. QA closeout
does not wait on that participation or extend the branch.
