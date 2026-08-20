# Phase 9 Outcome Ledger QA Evidence

Updated 2026-08-20, America/New_York.

## Scope and safety

All database execution used disposable PostgreSQL 17 Docker containers with
synthetic `INTERNAL QA OUTCOME` records. Containers were removed immediately
after each run. No Production/Preview database, live lead, email, SMS, push,
WordPress page, DNS record, or Vercel deployment was changed.

## Verified database behavior

The complete migration chain, including
`20260819223000_admin_outcome_ledger.sql`, applied successfully to PostgreSQL
17. The executable contract at
`supabase/tests/admin_outcome_ledger_pg17.sql` passed and rolled back its
transaction.

Observed synthetic contract:

```json
{
  "status": "converted",
  "audit_count": 2,
  "outcome_types": ["appointment", "closed"],
  "closed_revenue": 12345.67,
  "test_rows_suppressed": true
}
```

A separate pre-migration terminal lead proved historical reconciliation and
same-state replay:

```json
{
  "rows": 1,
  "type": "closed",
  "revenue": 500.25,
  "backfilled": true,
  "live_unsuppressed": true
}
```

No synthetic identity represents a real consumer. No provider delivery was
attempted.

## Canonical-Neon-shape release rehearsal

A second database-first rehearsal reproduced the canonical Neon role boundary
before Production execution:

- all 30 prerequisite migrations applied to disposable PostgreSQL 17;
- the canonical server-only `service_role` had `BYPASSRLS` and table access;
- optional Supabase browser roles `anon` and `authenticated` were removed;
- one synthetic converted/test/suppressed lead existed before the outcome
  migration; and
- no live credential, lead, or provider was used.

That rehearsal caught and corrected two release blockers:

1. the original function privilege statement required absent `anon` and
   `authenticated` roles, while canonical Neon intentionally has neither; and
2. same-state revenue replay could overwrite the original transition actor and
   audit ID with replay metadata.

The revised migration conditionally revokes optional browser roles and records
replay provenance under separate keys while preserving the original transition
evidence. It then passed with both optional roles absent. The executable
contract invoked v2 as `service_role`, not as the database owner, and proved:

```json
{
  "base_migrations": 30,
  "optional_browser_roles": 0,
  "service_role_execute": true,
  "public_execute": false,
  "lead_status_unchanged_by_backfill": true,
  "backfilled_outcomes": 1,
  "duplicate_outcomes_after_migration_replay": 0,
  "original_actor_and_audit_preserved_after_revenue_replay": true,
  "v1_application_rollback_compatible": true
}
```

The migration applied successfully twice; the second reconciliation inserted
zero rows and the synthetic lead retained exactly one closed outcome. The prior
v1 lifecycle function also executed successfully as `service_role` inside a
rolled-back transaction after v2 was installed.

The linked Vercel CLI correctly withheld encrypted Production values during a
read-only environment pull. Its mode-600 temporary file was deleted
immediately. Direct live-schema SQL therefore remains part of the approved
database execution gate rather than being inferred from an exposed credential.

## Fail-closed cutover runner rehearsal

The candidate now includes
`scripts/phase9-outcome-production-cutover.mjs` and the package command
`phase9:outcome:cutover`. The runner accepts no connection value on a command
argument and never prints one. Execute mode checks the exact database-specific
approval before reading credentials.

Static and pure contract result:

```text
tests/scripts/phase9-outcome-production-cutover.test.ts
11 tests passed
```

The earlier PostgreSQL 18 rehearsal caught and fixed a malformed
migration-ledger statement; that attempt rolled back with v2 absent and the
ledger unchanged. The final hardened rehearsal then exercised the real runner
with six synthetic/test/suppressed leads. A competing transaction held the
cutover advisory lock, and the runner rejected the concurrent execution before
backup or mutation. Removing `service_role` outcome-update privilege also made
preflight fail closed; the final pass independently removed audit-read
privilege and failed closed for that exact missing grant. After restoring the
expected canonical role grants, the complete path passed:

```json
{
  "postgres_major": 18,
  "synthetic_leads": 6,
  "lead_count_unchanged": true,
  "lead_status_unchanged": true,
  "target_outcomes": 2,
  "target_migration_rows": 1,
  "v1_retained": true,
  "v2_owner": "neondb_owner",
  "v2_security_invoker": true,
  "v2_search_path_locked": true,
  "service_role_v1_execute": true,
  "service_role_execute": true,
  "public_execute": false,
  "browser_role_execute_count": 0,
  "backfill_metadata_mismatches": 0,
  "invented_revenue_rows": 0,
  "service_role_transition_status": "qualified",
  "service_role_transition_audit_rows": 1,
  "service_role_transition_outcome_rows": 1,
  "service_role_transition_rolled_back": true,
  "backup_bytes": 8573,
  "backup_restore_entries": 19
}
```

The lower 15-entry backup threshold existed only on the minimal injected test
target. The production parser hard-codes a minimum of 100 entries. All
disposable containers, SQL fixtures, connection values, and synthetic backups
were removed after verification. Production remained untouched.

## Application verification

Targeted tests:

```text
tests/adminops/admin-lead-actions.test.ts
tests/adminops/admin-outcome-ledger-migration.test.ts
tests/adminops/admin-lead-view.test.ts
tests/adminops/admin-lead-timeline.test.ts
```

Result: 4 files / 30 tests passed after the final timeline privacy assertion.

Full local release gate:

```text
pnpm run release:gate
```

Final result after cutover-runner hardening:

- system isolation: PASS;
- release safety: 14/14 PASS;
- Vitest: 193 files / 2,764 tests PASS;
- strict typecheck: PASS;
- ESLint: PASS;
- Next.js production build: PASS;
- route manifest: 78 active routes / 17 acknowledged root-`src` duplicates.

The local shell used Node `26.5.1` and emitted the expected engine warning.
Prior-head GitHub Actions run `32321701327` supplied independent Node 24 proof.
The final hardened head requires a fresh exact-head Node 24 run after push.

Additional release checks:

- `pnpm audit --prod`: no known vulnerabilities;
- `gitleaks git --redact`: 452 commits scanned, no leaks;
- every changed or new file scanned separately: no leaks; and
- `git diff --check`: PASS.

## Preview deployment evidence

- PR: `#180`
- prior candidate commit: `13da6bc6e21e2e74a1805d75c6648150db33bb18`
- deployment: `dpl_2xFEZDKGiCWn1YUsABmRfE5ZNQUM`
- URL: `https://ask-magic-mike-6og0pgmu0-eyes-up-industries.vercel.app`
- state: Ready; target Preview; Node runtime 24.x
- public checks: `/`, `/sell`, `/buy`, `/home-value`, `/api/health/live`, and
  `/api/health/ready` returned 200
- anonymous check: `/admin/growth` returned 401
- identity isolation: correct Ask Magic Mike title; no NellySelly marker in
  homepage HTML

This is intentionally labeled prior-head evidence. The final hardened commit
must receive a fresh exact-head Node 24 check and Preview receipt; those
immutable receipts belong on PR #180 rather than in another evidence-only
commit.

No form was submitted and no Preview database mutation or external delivery was
performed during these checks.

## Visual and authorization checks still required before Production

- administrator/primary-owner sees the optional actual-revenue field;
- approved agent does not see revenue input or amount;
- closed-won transition renders one outcome milestone;
- same-state revenue update does not duplicate the outcome or lifecycle audit;
- anonymous `/admin/leads/<id>` remains denied;
- `/admin/growth` reflects the synthetic Preview outcome while excluding test
  records from production KPIs;
- public funnel and health routes remain unchanged.
