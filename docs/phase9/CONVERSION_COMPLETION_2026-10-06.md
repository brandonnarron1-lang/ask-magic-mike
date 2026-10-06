# Conversion completion — 2026-10-06

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
