# Local Routing Migration Postgres 17 Decision

## Problem

A clean local Supabase replay on the current runtime fails at
`supabase/migrations/00005_routing.sql` with SQLSTATE `42P17`:
`generation expression is not immutable`.

The failing expressions are the `lead_routing` stored generated columns:

```sql
accept_deadline  TIMESTAMPTZ GENERATED ALWAYS AS (assigned_at + INTERVAL '2 minutes') STORED
contact_deadline TIMESTAMPTZ GENERATED ALWAYS AS (assigned_at + INTERVAL '5 minutes') STORED
```

On Postgres 17, `assigned_at + INTERVAL '2 minutes'` resolves to
`timestamptz_pl_interval(timestamp with time zone, interval)`. The function is
cataloged as `STABLE`, not `IMMUTABLE`, so it is not valid in a stored
generated column. The equivalent `timestamp without time zone + interval`
operator is immutable, but changing `assigned_at` away from `TIMESTAMPTZ` would
weaken the stored absolute-time contract.

## Intended Semantics

Repository evidence defines `lead_routing` as the current/latest routing record
for a lead. The SLA fields are read by the Admin Routing Command Center and SLA
documentation, and assignment tests expect these fixed windows:

- `assigned_at`: absolute assignment timestamp, stored as `TIMESTAMPTZ`.
- `accept_deadline`: absolute timestamp exactly 2 elapsed minutes after
  `assigned_at`.
- `contact_deadline`: absolute timestamp exactly 5 elapsed minutes after
  `assigned_at`.
- Deadlines are derived from `assigned_at`; callers should not supply a
  different value.
- On insert, deadlines are populated from the inserted/default `assigned_at`.
- If `assigned_at` changes, deadlines recompute from the new value.
- Unrelated updates preserve the existing stored deadlines.
- Timezone display must not alter the stored absolute deadlines.
- Daylight-saving boundaries must still preserve exact elapsed duration.

These semantics match the old generated-column intent without relying on an
invalid generated expression.

## Options Considered

### A. Immutable generated column

Rejected. The required operation is on `TIMESTAMPTZ`, and Postgres 17 correctly
classifies the underlying operator as stable. Casting to `timestamp` would make
the expression syntactically acceptable but would introduce session-timezone
semantics and no longer preserve the absolute-time model.

### B. Trigger-maintained ordinary columns

Chosen. Ordinary `TIMESTAMPTZ` columns maintained by a narrow `BEFORE INSERT OR
UPDATE` trigger preserve the public column names, types, indexes, and elapsed
deadline behavior while avoiding generated-column immutability restrictions.
The trigger recomputes only when `assigned_at` or a deadline column is part of
the write, which preserves unrelated updates and prevents caller overrides.

### C. Application-maintained columns

Rejected. The schema supports SQL and fixture writes, and the original migration
put deadline consistency in the database. Moving the calculation entirely to
application code would weaken database-side consistency.

### D. Baseline/squash migration

Rejected. The intended schema can be reconstructed directly and safely in the
historical migration, so a broader baseline strategy would add unnecessary
schema-history complexity.

## Historical Migration Strategy

This is a clean-replay compatibility correction to a historical migration.
Supabase migration history records applied migration versions; editing an
already-applied historical file does not automatically mutate an existing remote
database. No production or remote database was inspected for this decision.

Editing `00005_routing.sql` is appropriate because:

- The current repository cannot initialize a fresh local Postgres 17 database.
- The resulting clean-replay schema preserves the intended column names, types,
  indexes, and SLA behavior.
- Later migrations can operate against the same public schema shape.
- Already-applied environments are not changed by this repository edit.

No forward production migration is required for this clean-replay fix. If a
future environment needs to convert an already-created generated-column schema
to trigger-maintained columns, that should be handled by a separate, explicitly
approved parity migration after inspecting that environment.

## Rollback

For local clean replay, rollback is `git revert` of the migration correction and
test/doc changes. For an already-created local database, reset the disposable
local Supabase database and replay migrations from the repository state under
test. No production rollback is involved because this mission does not touch
production.
