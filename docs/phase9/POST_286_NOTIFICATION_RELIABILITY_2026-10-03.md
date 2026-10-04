# Post-286 acceptance and PR #279 notification reliability successor

Review candidate only. Resolve accepted Production with `pnpm release:authority:resolve`;
this document does not authorize migration, merge, deployment, QA or sends.
Exact frozen head/tree and newly executed evidence belong in the PR seal and
private `.amm-run/notification-reliability-20261003/` receipt, not a self-predicting release record.

## Reconciled checkpoint

Authenticated resolver passed 25/25 checks at 2026-10-04 01:30 UTC: main
`4e7d818d9405e3ef5f31f0feb9ffb19bdfa22c82` (accepted PR #286), tree
`a78737b701d8da78d0539419e87ac813b8cb9c91`, Production
`dpl_6emNTgVrMq1Qc64xxYVg7GAHRC1m`. No newer successor was open.
Fresh `codex/notification-reliability-20261003` starts from that main. Existing
worktrees, private evidence and the prior dirty screenshot are untouched.

Read-only Neon catalog/backlog at 01:31:52 UTC: repaired v1 definition SHA-256
`df6ff62de38467617eaf2c0e8a39f0d7cbdb527d0066ae370587b3003fa78130`,
v2 absent, accepted `20261003203000` ledger entry once. Outbox: 18 records,
7 sent, 9 skipped, 2 permanent failures; total attempts 9; 7 provider IDs.
Zero due/no-provider-ID, stale pending or ambiguous processing at that instant.
The two permanent failures are untouched, not recovered, and excluded from retries.
No recipient values or payloads were retrieved. A zero backlog is not send authority.

Production page 3952 still has one Connector 1.1.0 Home Value CTA, the brokerage
canonical and reviewed owned UTMs. No WordPress publication or cache action is needed.
Readiness remains healthy. This is not a fresh QA capture/delivery receipt.

## PR #279 provenance (head 131072e619eff72882c91931b60b8e93080d1280)

| Component | Decision |
| --- | --- |
| Atomic v2 wrapper/enrichment/internal intent | Unique; ported additively after repaired v1 with stronger replay/invariant guards |
| Pending claim, type-correct manual retry, bounded batch | Unique; ported onto canonical repository, strengthened for current holds and provider ambiguity |
| Provider readiness preserving due work during outage | Unique; reused, no new provider/configuration |
| Atomic ordered Resend callback | Already accepted in current main; preserve and fix row-lock/hash-conflict/transient recovery gaps only |
| First-response/Today work | Current ACC already supersedes older action queue; keep existing queue, expose stale/ambiguous risk and fix nonexistent `l.name` query |
| Older ingress/consent, legacy action queue and release state | Conflicting; not imported |
| Every-minute retry / changed SLA cron | Deferred, NOT activated; `vercel.json` unchanged |
| Dependencies, new UI/provider/CRM/AI work | Deferred; no package upgrades, extra store, dashboard, paid call or model switch |

## Atomicity and compatibility

The active root public handler uses the server-normalized payload and repaired
v1 through `capture_public_lead_v2`. The wrapper commits lead/contact, canonical
attribution, score/routing, three consent records, assignment/audit and one
canonical internal `lead_alert` intent together. The existing v1 skipped
`agent_assignment` disposition remains historical compatibility, not a second
sendable internal intent. Provider dispatch remains outside the committed transaction.

No second QA classifier/marker exists. v1 alone owns the four QA flags and one
`system/public_lead_capture` / `lead.qa_suppressed` audit. v2 cannot overwrite them.
Exact replay is read-only, uses the original intent/template and does not enrich,
queue, send or backfill a pre-cutover v1 lead. Conflicting fingerprints fail closed.

The adapter keeps the original v1 call for callers omitting the new optional
internal-notification envelope. No legacy/Supabase cutover is performed.

Retry eligibility: failed/retry-scheduled due rows, or pending at least five
minutes old with zero attempts. Provider ID, any processing/claimed-pending
ambiguity, permanent/exhausted rows, QA and current communication/channel holds
are excluded. Atomic claims preserve one worker per eligible intent. Maximum
attempts and exponential delays are unchanged; repository batch is capped at 50.
Provider-accepted/local-write failure stays processing for reconciliation, never
blind stale-age resend. This is not an exactly-once network-delivery guarantee.

Administrator GET is readiness-only; cron bearer GET is explicitly held.
Authorized manual POST and per-record server actions remain separate, Preview
fails before writes/providers, and Production retry outages preserve intents.
No schedule, environment or activation setting changes are included.

Callbacks serialize the matching notification, reclaim only same-hash failed
receipts, keep state monotonic by provider time and preserve conservative bounce/
complaint suppression. Later valid delivery can recover `resend_failed`, never
erase a bounce/complaint/suppression hold. Receipt/state/timeline/hold writes are
one statement and roll back together on downstream failure.

## One additive migration / distinct rollback boundaries

`supabase/migrations/20261004020000_public_lead_notification_reliability.sql`
source SHA-256: `13542e4e4d4f5e2710b5a81983b051bbc8dbc8eb207336ee53e98a6fae5190e5`.
It requires the actual accepted repaired-v1 definition hash above; it does not
replace v1, alter tables, backfill records, create roles, or replay old migrations.
Security remains INVOKER with `public, pg_temp` search path, PUBLIC denial,
conditional denial for browser roles when present, server-role EXECUTE.
Fresh/accepted-schema upgrade and Neon-style absent-browser-role grants are
rehearsed only in isolated PostgreSQL.

Future live migration must verify exact endpoint/schema/grants, source checksum,
backup and predecessor, then apply this ONE migration under separate approval.
Freeze reviewed app source and run no-write Preview before requesting release.
Automatic migration or scheduled retry activation is not part of review.

Application rollback for this successor means the currently accepted **PR #286**
deployment, not its pre-286 application rollback. Leave additive v2 in place until
the application no longer calls it. Optional separately approved DB rollback is
`DROP FUNCTION public.capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb);` ONLY
after caller rollback; preserve repaired v1, all rows, intents, receipts and audits.
Reconcile in-flight provider outcomes before approved processing changes. Rollback
cannot unsend. Do not restore a pre-286 v1 backup.

## Live public acceptance — prepared, NOT RUN

Path: existing Our Town page 3952 CTA -> `/home-value` -> root `POST /api/leads`,
on accepted PR #286, NOT this undeployed v2 candidate. Form 3 bridge is independent
and unchanged; Form 7 remains held. Do not replay the consumed Phase E approval.

New bounded approval scope: exactly one operator-controlled QA identity with
both INTERNAL QA / DO NOT CONTACT markers; one canonical test capture/contact
linkage, actual form consent/owned UTMs, expected assignment, automatic audit
marker and existing internal notification intent/one internal test email plus
configured private audit BCC. Permit necessary protected provider/read-model
evidence reads. No consumer acknowledgment/nurture, SMS, push, phone outreach,
replay, resend, deletion, WordPress edit or historical-QA change. Keep all four
suppression flags and ordinary KPI exclusion. Provider acceptance/delivery and
each mailbox receipt must be reported separately; missing evidence stays UNVERIFIED.

Fresh gate proposed for this scope, not a historical approval:
`APPROVE POST-286 ONE HOME VALUE QA ACCEPTANCE AND INTERNAL TEST EMAIL/BCC`.
If an ambiguous result occurs, inspect canonical request/outbox state; never
generate another idempotency key to make the test look successful.

## Verification and human acceptance

Supported isolated commands: `pnpm test:postgres:qa-audit` and
`pnpm test:postgres:notification-reliability`. The successor suite deliberately
uses `NODE_ENV=development` with real changed SQL/root adapter/orchestration,
network-none UUID PostgreSQL 17, no exposed port and no-send providers. No
Production endpoint or provider credentials are used. Required audit/enrichment/
attribution/consent/outbox failure, concurrency, callbacks, permission/suppression,
actual ACC read models, ACL/upgrade/caller rollback are asserted. The existing P0
suite remains supplementary; its compatibility case no longer mistakes a v2
disabled-mode row for a fresh v1 post-commit intent. CI runs both suites separately.

Run frozen install, `pnpm release:gate`, full `pnpm test:e2e`, strict release intent,
exact-head hosted Release Gate, immutable Preview and protected `SAFE_DB_WRITE=false`
QA. Actual timestamps/results/limitations are sealed outside tracked source and
in the review PR; inherited Production checks are not new candidate proof.

Existing Today/detail/timeline/reporting retain premium styling, keyboard/mobile,
empty/error states and actual administrator/primary_lead_owner/approved_agent/
read_only_analyst roles. Automated fixtures are not Mike/account/device acceptance.
Human checklist after approved cutover: open Today, inspect one assigned lead and
paged timeline, inspect notification evidence without resending, confirm held vs
actionable next steps, verify assigned-only denial and QA-excluded source reporting.
No live task/assignment edit or send is part of that read-only acceptance.

Next boundary remains existing Agent Command Center operator acceptance and
review-only next-action/AI follow-up/source-to-appointment refinement. Do not
build a replacement CRM or activate messaging to complete this candidate.
