# Phase 9 Autonomous Notification Retry

## Decision

Use the existing canonical `lead_notifications` outbox and protected retry
route. Do not introduce another queue, webhook relay, database, worker vendor,
or provider adapter.

The prior implementation already persisted the lead before delivery, created
idempotent notification rows, claimed rows atomically, stored provider message
IDs and safe failure state, calculated bounded retry timestamps, and exposed
retry health in the Lead Center. The missing operating link was a Production
schedule: due rows required a manual administrator POST.

## Candidate behavior

- Vercel schedules `GET /api/admin/notifications/retry` every minute.
- Only an exact `Authorization: Bearer $CRON_SECRET` request can process a GET.
- Administrator `GET` remains a read-only readiness response.
- Administrator `POST` remains a bounded manual processor and accepts 1–100;
  the canonical Neon repository retains its 50-row safety cap.
- A scheduled run requests at most 25 due rows and processes them sequentially.
- `lead_alert` and `consumer_ack` use the established lead-alert service.
- `agent_assignment` uses the established assignment-notification service.
- An unknown queued type becomes `permanently_failed` with a safe visible code.
- One thrown row produces an unavailable count but does not stop later rows.
- Cron output contains only processed/unavailable counts and status totals.
- In Production, the worker first verifies the existing notification mode,
  global delivery gate, email enablement, and selected provider configuration.
  A disabled or incomplete provider returns a no-store 503 without reading or
  consuming a due outbox row.

Vercel runs project crons only on Production deployments. Preview also enforces
the existing mutation/provider guard before the repository is opened, so a
manually authenticated Preview request returns `preview_data_disabled` without
reading or sending due records.

The root middleware matches browser pages under `/admin` and the exact Lead
Center host; it does not match `/api/admin`. Vercel's server-to-server bearer
request therefore reaches the route-level timing-safe `CRON_SECRET` check,
while an anonymous request still fails closed.

## Permission and QA rules

The canonical Neon due-row query joins only the lead's `is_test` scope marker;
it does not select contact data. Every automated test row is changed to
`skipped` with `automated_test_retry_suppressed` before a provider processor can
run. A controlled QA retry therefore remains a deliberate administrator action,
not an unattended cron side effect.

Consumer acknowledgment retries reload the current lead. They require all of:

1. the independently enabled consumer-ack release gate;
2. a current valid email destination;
3. recorded email consent;
4. `is_test=false`;
5. `communication_suppressed=false`; and
6. `email_suppressed=false`.

A bounce, complaint, unsubscribe, suppression, or QA transition that occurs
after initial enqueue therefore prevents the later consumer send. Internal
alerts remain operational records and do not contact the consumer.

## Duplicate and failure boundary

The worker does not create a second notification row. Existing outbox
idempotency, atomic claim-before-send, template-version pinning, maximum attempt
count, and provider classification remain authoritative. Retryable outcomes
return to `retry_scheduled`; exhaustion and unsupported types become visible
terminal failures. Stale `processing` rows remain an operator reconciliation
case because blindly replaying a request whose provider result is unknown could
duplicate a delivery.

## Rollback

Application rollback is exact and non-destructive:

1. remove the notification-retry entry from `vercel.json` or restore the prior
   accepted application deployment;
2. retain the outbox and all delivery history;
3. use the existing authenticated administrator readiness/manual-retry path;
4. reconcile any due, processing, or terminal records in Lead Center; and
5. do not delete or rewrite lead or notification data.

No schema migration or new environment variable is required. The candidate
does not authorize a merge, Production deployment, provider send, environment
edit, WordPress change, or data mutation. Production remains accepted PR #247
until the ordered release train reaches a separately approved exact gate.
