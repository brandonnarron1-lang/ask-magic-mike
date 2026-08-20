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
- the server-resolved Lead Center user and linked responding agent when present;
- the lead's assigned-agent snapshot at the response moment;
- the immutable audit-event ID;
- copied `is_test` and `communication_suppressed` state; and
- privacy-safe version metadata.

The table is server-only, RLS-enabled, denied to public/browser roles, and
rejects updates. Responder and assignment identifiers are opaque immutable
snapshots rather than foreign keys, so a later approved user or agent removal
does not rewrite response history or fail against the immutability trigger.
Approved lead-level retention or deletion workflows remain possible through the
lead relationship and remove the milestone by cascade.

Function grants target the canonical `service_role`. Optional Supabase browser
roles are revoked only when present, so their absence in canonical Neon never
becomes a migration prerequisite or weakens the `PUBLIC` denial.

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
- source/campaign P50, P75, and P90 with visible sample size;
- lead-type P50, P75, and P90 with coverage and sample maturity;
- response-owner P50, P75, and P90 using the server-resolved responder first,
  then the immutable assignment snapshot, never today's mutable owner;
- response-owner attribution coverage and an explicit unattributed bucket; and
- a deterministic measurement-gap recommendation when coverage is below 90%.

Only live leads and live milestones with both `is_test=false` and
`communication_suppressed=false` enter business KPIs. Invalid or pre-creation
timestamps are ignored by the calculation even if malformed test data is
supplied directly to the pure intelligence function.

Percentiles use deterministic linear interpolation over elapsed minutes from
canonical lead creation to the immutable response milestone. No statistical
significance claim is made. Samples below 5 are labeled `collecting`, samples
from 5–19 are `directional`, and samples of 20 or more are `operational`; those
labels describe evidence maturity and do not imply causation.

## Release order

The prerequisite release is complete. PR #180 was merged as
`42f80b209d5d5adc984c1d8b439c7fa830d015e6`, its outcome-ledger migration was
verified on canonical Neon Production, and Vercel deployment
`dpl_2PQoDZLHc562SBEY7px91CAEUrin` is the healthy rollback baseline.

PR #181 was refreshed on that exact `main` baseline at
`99fac18df16237ada26f65384be390e331df9f59`. Node 24 run `32422016242` and
Preview deployment `dpl_kEtBPF8LS52kgG1LWE2ooaYZhJgT` passed before the
cutover-runner hardening described below.

The remaining order is:

1. run `pnpm run phase9:first-response:cutover -- --plan` and verify the pinned
   migration hash;
2. run the fail-closed read-only Production preflight with an unpooled
   `neondb_owner` connection entered only through the secure environment;
3. receive the exact migration/merge/deployment approval phrase;
4. run `--execute`, which acquires advisory and write-boundary locks, creates
   and validates a mode-600 custom backup, rechecks the locked baseline, applies
   the migration and ledger row in one transaction, and verifies every
   postcondition before commit;
5. merge the resulting exact PR #181 head and deploy it;
6. verify anonymous denial, authenticated role behavior, public/health routes,
   Growth rendering, and rollback readiness; and
7. retain the Production backup until all application checks pass.

The execute interlock is intentionally different from the completed PR #180
approval:

`APPROVE PHASE 9 FIRST RESPONSE PRODUCTION MIGRATION, PR 181 MERGE, AND PRODUCTION DEPLOYMENT`

No Production step is authorized by this document.

## Rollback

Rollback the application to the preceding Ready deployment, which calls
`mutate_admin_lead_status_v2`. Preserve response milestones and audits. The v3
and dedicated response functions can remain dormant. Do not drop evidence or
alter Production rows as part of an application rollback.
