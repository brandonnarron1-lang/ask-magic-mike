# Phase 9 First-Human-Response Intelligence

Updated 2026-08-20.

## Decision

Reuse the canonical Lead Center, lifecycle RPC, audit log, Neon database, and
Growth command center. Do not infer first response from a mutable
`last_contacted_at` field, an internal qualification step, an appointment
request, notification delivery, or an AI/provider event.

The verified gap was measurement integrity: the product could identify an
uncontacted lead, but it could not truthfully report median, 75th-percentile, or
90th-percentile first-human-response time because later contacts overwrite
`last_contacted_at`.

## Canonical contract

`lead_response_milestones` stores exactly one first-human-response event per
lead. The row includes:

- the canonical lead ID;
- the server-validated first response timestamp;
- source system and authenticated actor;
- the immutable audit-event ID;
- copied `is_test` and `communication_suppressed` state; and
- privacy-safe version metadata.

The table is server-only, RLS-enabled, denied to public/browser roles, and
rejects timestamp updates. Approved lead-level retention or deletion workflows
remain possible through the lead relationship.

## Write paths

`mutate_admin_lead_status_v3` wraps the complete v2 lifecycle/outcome
transaction. When the explicit next lifecycle state is `contacted`, it records
the milestone in the same database transaction. A milestone failure rolls back
the lifecycle call rather than reporting partial success.

`record_admin_first_response_v1` supports the protected Lead Center action for
an operator who completes a real one-to-one follow-up after the lead has already
advanced to a later stage. It:

- uses current server time;
- rejects pre-creation or materially future timestamps;
- records only the first event;
- preserves any later lifecycle stage;
- advances an early-stage lead to `contacted`;
- updates `last_contacted_at` without overwriting the first milestone;
- writes `lead.first_human_response_recorded` audit evidence; and
- never sends email, SMS, push, or any consumer message.

The UI requires an explicit operator confirmation and is protected by
`lead:update_assigned` object-level authorization.

## Historical boundary

The migration backfills only the earliest immutable
`lead.lifecycle_changed -> contacted` audit event for a UUID lead. It does not
promote a legacy `last_contacted_at` value to first-response evidence. Missing
historical evidence remains missing rather than becoming an invented KPI.

## Reporting

The protected Growth command center reports:

- immutable milestone coverage rate and sample size;
- P50, P75, and P90 first-human-response minutes;
- channel-level P50 and P90 with visible sample size; and
- a deterministic measurement-gap recommendation when coverage is below 90%.

Only live leads and live milestones with both `is_test=false` and
`communication_suppressed=false` enter business KPIs. Invalid or pre-creation
timestamps are ignored by the calculation even if malformed test data is
supplied directly to the pure intelligence function.

Percentiles use deterministic linear interpolation over elapsed minutes from
canonical lead creation to the immutable response milestone. No statistical
significance claim is made.

## Release order

This candidate is stacked behind PR #180 and its outcome-ledger migration.

1. apply and verify `20260819223000_admin_outcome_ledger.sql`;
2. merge and verify PR #180 in Production;
3. refresh this branch on the resulting `main` and re-establish exact-head CI
   and Preview evidence;
4. take a minimized read-only Production snapshot;
5. apply `20260820013000_first_response_intelligence.sql`;
6. verify table/RLS/grants/trigger/functions/backfill and zero unintended lead
   state changes;
7. deploy the exact application commit; and
8. verify anonymous denial, authenticated role behavior, public/health routes,
   Growth rendering, and rollback readiness.

No Production step is authorized by this document.

## Rollback

Rollback the application to the preceding Ready deployment, which calls
`mutate_admin_lead_status_v2`. Preserve response milestones and audits. The v3
and dedicated response functions can remain dormant. Do not drop evidence or
alter Production rows as part of an application rollback.
