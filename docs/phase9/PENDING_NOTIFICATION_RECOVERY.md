# Phase 9 Pending Notification Recovery

Date: 2026-09-02
Status: stacked Draft PR #263; Production unchanged

## Decision

Extend the existing canonical `lead_notifications` outbox worker to recover a
durably stored notification that was never claimed for its first delivery
attempt. Do not create a second queue, worker, provider, route, table, or
database.

The operations dashboard already identifies `pending` rows older than five
minutes, but the scheduled worker previously selected only due `failed` and
`retry_scheduled` rows. A serverless interruption between outbox insertion and
the atomic provider claim could therefore leave a valid internal alert pending
forever even though the lead itself was safe in Neon.

## Recovery contract

- Due `failed` and `retry_scheduled` rows retain their current behavior.
- An unclaimed `pending` row becomes recoverable only when its `created_at` is
  at least five minutes old.
- `attempt_count < max_attempts` is enforced by the canonical Neon selection.
- Recovery uses the existing conditional `claimForProcessing` update, current
  renderer, provider adapter, idempotency key, consent/suppression checks,
  recipient/routing checks, and bounded attempt counter.
- Automated QA rows remain skipped before any provider processor can send.
- The protected one-record Lead Center action still refuses `pending`; the
  grace-period decision belongs only to the scheduled repository query.
- `processing` rows are never selected. Their provider result may be ambiguous,
  so an operator must verify provider history and message ID before changing
  state.

The dormant Supabase rollback adapter mirrors the same five-minute selection
boundary, but Production remains Neon-only.

## Safety and failure behavior

The five-minute delay prevents the scheduled worker from racing the normal
same-request delivery path. Once selected, the conditional claim guarantees
that only one worker can move a row from `pending`, `failed`, or
`retry_scheduled` into `processing`. If another worker wins, no provider call is
made by the loser.

This candidate does not reset stale `processing`, infer delivery from an HTTP
response, change a provider, weaken Preview protections, or expose recipient
data in cron output. Preview still refuses before repository access. Production
provider readiness still fails closed before any due row is read.

## Verification

The Node 24 focused pass is green: 5 files / 49 tests plus targeted ESLint. It
covers the exact Neon query, shared five-minute cutoff, dormant fallback query,
pending lead-alert and assignment dispatch, one-record manual refusal, QA
suppression, atomic assignment processing, operations truth, and operator-copy
safeguards. The complete release gate also passes 298 files / 3,562 tests,
strict typecheck, full lint, optimized Next.js 15.5.21 build, 60 static pages,
the 102-route/22-duplicate manifest, 14/14 safety controls, and Ask/NellySelly
isolation. The production dependency audit reports no known vulnerability, and
redacted Gitleaks passes 764 history
commits / approximately 19.56 MB plus the staged 21.55 KB candidate delta with
no leak. Hosted CI and immutable Preview evidence remain pending.

No cron was invoked and no database row, lead, notification, provider, email,
SMS, Push, environment variable, WordPress surface, DNS record, publication,
spend, deletion, or NellySelly system was read or changed by this candidate.

## Release order and rollback

The branch starts from exact sealed PR #262 head
`0a255a7988d761577eb11c702b2e00e8cdaac3ce` and is preserved at
`rescue/amm-pr263-base-pr262-20260902`. It is downstream of every PR from #248
through #262 and has no independent release authority. PR #248 remains the only
requestable application gate.

Draft PR #263 is
`https://github.com/brandonnarron1-lang/ask-magic-mike/pull/263`. Its verified
code-bearing commit is `9ec39422e59063c7964c59f3e4701425cec877d8`
with tree `03462e612ac5217454262d315044b08003419022`; the final evidence-only
head is recorded in the authoritative PR seal after hosted verification.

Rollback is application-only: restore the immediately preceding accepted Ready
deployment or remove this selection change while retaining every outbox row and
delivery record. Do not delete, rewrite, or blindly replay a notification to
roll back this code.

Only after every predecessor is accepted, this candidate is refreshed onto the
then-current `main`, and exact-head proof is repeated may it request:

`APPROVE PHASE 9 PENDING NOTIFICATION RECOVERY MERGE AND PRODUCTION DEPLOYMENT`
