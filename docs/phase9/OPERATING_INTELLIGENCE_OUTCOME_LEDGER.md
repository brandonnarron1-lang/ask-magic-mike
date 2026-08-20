# Phase 9 Operating Intelligence — Canonical Outcome Ledger

Updated 2026-08-19.

## Decision

Reuse the existing Lead Center lifecycle, RBAC, `lead_outcomes` table, audit log,
Neon persistence boundary, and Growth command center. Do not add a second CRM,
outcome store, reporting database, or AI classifier.

The verified gap was a missing write seam: `/admin/growth` reads canonical
outcomes, but the ordinary lifecycle action used by staff previously updated
only `leads` and `audit_logs`. A qualified, appointment-set, or terminal lead
could therefore be operationally correct while the growth ledger remained
empty.

## Implemented contract

`public.mutate_admin_lead_status_v2` commits, in one PostgreSQL transaction:

1. the validated lifecycle projection on `leads`;
2. the immutable `lead.lifecycle_changed` audit event; and
3. one deterministic `lead_outcomes` record when the stage proves a business
   outcome.

Mappings are deliberately deterministic:

| Lead Center lifecycle | Canonical outcome |
|---|---|
| `qualified` | `qualified` |
| `appointment_set` | `appointment` |
| `converted` | `closed` |
| `dead` | `lost` |
| `spam` | `disqualified` |

Other lifecycle states do not invent an outcome. `is_test` and
`communication_suppressed` are copied from the lead so QA records remain
excluded from production economics.

## Idempotency and historical reconciliation

The idempotency key is the unique `(source_system, external_id)` pair:

```text
admin_lead_lifecycle / admin_lifecycle:<lead_id>:<outcome_type>
```

Same-state replay repairs a missing outcome or updates actual closed revenue
without duplicating the lifecycle event or outcome. The additive migration
backfills one evidence-derived row for leads already in one of the mapped
states. It does not invent revenue and does not change any lead status.

## Revenue boundary

Closed revenue is optional and means actual brokerage revenue only. It must not
contain sale price, list price, estimated property value, projected commission,
or an AI estimate. It is bounded to `0..99,999,999.99` with two decimal places.

The existing `lead:record_revenue` permission controls both entry and display.
Administrators and approved primary lead owners have this permission; approved
agents and read-only analysts do not. Outcome milestones remain visible without
the revenue amount.

## Release order

The migration must be applied before deploying application code that calls the
v2 function:

1. take a read-only aggregate production snapshot;
2. apply `20260819223000_admin_outcome_ledger.sql` to the canonical Neon
   Production branch;
3. verify the v2 function, grants, backfill counts, test/suppression parity, and
   no lead-status change;
4. deploy the application candidate;
5. verify anonymous denial, authenticated Lead Center rendering, Growth command
   center reads, public routes, and both health endpoints.

No Production step is authorized by this document alone.

The fail-closed execution entry point is
`pnpm run phase9:outcome:cutover`. Its offline plan verifies the reviewed
migration hash. Its live modes require the canonical unpooled Neon endpoint,
PostgreSQL/database/owner identity, secure environment entry, a validated
custom-format backup, transaction timeouts, unchanged lead-status digest,
service-only execution privilege, migration-ledger singularity, and exact
database-specific approval. See `OUTCOME_LEDGER_PRODUCTION_CUTOVER.md`.

## Rollback

Rollback the application to the immediately prior Ready deployment, which calls
`mutate_admin_lead_status_v1`. Preserve `lead_outcomes` and audit rows. The v2
function is additive and can remain dormant. Dropping it is optional and requires
a separately reviewed database change after application rollback is proven.
