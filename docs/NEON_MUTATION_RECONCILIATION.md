# Neon Mutation and Reporting Reconciliation

Date: 2026-08-14

## Result

The active root application now selects Neon for every canonical Lead Center read, report, allocation view, lifecycle mutation, appointment/follow-up operation, assignment audit operation, and notification context/outbox operation. Production fails closed when `DATABASE_URL` is absent and cannot silently use Supabase/PostgREST.

## Reconciled paths

| Path | Previous state | Phase 3 state |
| --- | --- | --- |
| Default lifecycle persistence | Neon-first with implicit test/legacy branch | Neon in Production; explicit nonproduction-only compatibility flag |
| Lead inbox/detail | Neon when configured, Supabase otherwise | Neon in Production; safe empty response without `DATABASE_URL` |
| Reporting | Supabase REST | bounded Neon SQL with test/suppression exclusion |
| Allocation view | Supabase REST | bounded Neon SQL with test/suppression exclusion |
| Assignment audit | Supabase REST | Neon `audit_logs` reads/writes |
| Appointments/follow-ups/action queue | Supabase REST | Neon SQL; durable audit; lifecycle synchronization |
| Assignment notification context | Supabase REST lead/agent lookup | Neon lead/agent lookup |
| Notification outbox | Neon-first then Supabase | Neon in Production; no Production fallback |
| Health provider label | PostgreSQL or Supabase | `neon_postgres` or `none` |

## Preserved compatibility code

The `app/lib/persistence/supabase/` modules remain checked in because they provide pure row normalization, existing test fixtures, and an explicit local rollback rehearsal. They are not selected in Vercel Production. The older `src/app/` route tree is preserved but inactive under the checked-in route manifest.

## Audit identity

Lead status, assignment, agent operations, appointment, and task mutations now accept an optional actor. Server actions pass `lead_center:<user-id>` from the authenticated RBAC principal. While RBAC remains disabled, the existing audited fallback label remains `system/admin_basic_auth`.

## Proof

```text
pnpm run typecheck
  PASS

pnpm vitest run \
  tests/persistence/production-neon-only-boundary.test.ts \
  tests/adminops/admin-reporting-view.test.ts \
  tests/adminops/admin-agent-allocation-view.test.ts \
  tests/adminops/admin-assignment-audit.test.ts \
  tests/adminops/admin-appointment-followup-ops.test.ts \
  tests/adminops/lead-notification-service.test.ts \
  tests/persistence/neon-postgres-adapter.test.ts
  PASS — 7 files, 61 tests
```

The production-only regression sets legacy Supabase variables and the fallback flag while withholding `DATABASE_URL`; canonical factories return unavailable/null, Lead Center reads stay safely empty, and no network request is made.

## Promotion gate

No Production environment change, migration, or deployment was performed by this reconciliation. The next mutation-capable environment must be a Neon child branch connected to a Vercel Preview deployment. Production RBAC remains blocked until Preview acceptance and verified staff identities exist.

