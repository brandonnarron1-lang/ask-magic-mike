# Phase 9 Outcome Ledger Production Cutover

Updated 2026-08-20, America/New_York.

## Scope

This runbook applies only migration
`20260819223000_admin_outcome_ledger.sql` to the canonical Ask Magic Mike Neon
Production database before PR #180 is merged. It does not authorize PR #181,
email, SMS, push, lead creation, WordPress publication, DNS, paid traffic, or
any NellySelly system.

Canonical identity:

- project: `bitter-star-20214385`;
- branch: `production` / `br-round-base-auh6h2wd`;
- unpooled endpoint: `ep-proud-bonus-autwv60g`;
- database: `neondb`;
- migration owner: `neondb_owner`; and
- application role: `service_role`.

The runner rejects any other endpoint or hostname, owner, database, pooled
connection, weak TLS mode, missing channel binding, duplicate connection
options, or unreviewed connection-string parameters.

## Approval boundary

Execution requires this exact approved value in the secure local environment:

```text
APPROVE OUTCOME LEDGER PRODUCTION MIGRATION, PR 180 MERGE, AND PRODUCTION DEPLOYMENT
```

The value is an execution interlock, not a database secret. The unpooled Neon
connection string is a secret and must be entered only through the signed-in
Neon secure connection dialog or a secure terminal environment. Never put it
in chat, a command argument, a commit, a screenshot, or an evidence file.

## Runner

The reviewed entry point is:

```text
pnpm run phase9:outcome:cutover -- --plan
pnpm run phase9:outcome:cutover -- --preflight
pnpm run phase9:outcome:cutover -- --verify
pnpm run phase9:outcome:cutover -- --execute
```

Modes are fail closed:

- `plan` is offline and verifies the immutable migration SHA-256;
- `preflight` is database read-only;
- `verify` is database read-only and fails unless all current security and
  backfill postconditions hold; and
- `execute` requires the exact approval plus the secure connection value.

The connection value is read from `AMM_PRODUCTION_DATABASE_URL`. The approval
is read from `AMM_PRODUCTION_APPROVAL`. `AMM_PHASE9_BACKUP_DIR` may select a
mode-700 backup directory; if omitted, a dedicated mode-700 temporary directory
is created. Values are never printed. Backup subprocesses receive only a small
operational environment allowlist plus explicit `PG*` connection variables;
unrelated application, email, AI, deployment, and approval secrets do not cross
that process boundary.

## Preflight assertions

The runner refuses execution unless all of these are true:

1. PostgreSQL 18, `neondb`, and `neondb_owner` match the canonical target;
2. the owner can create in `public`;
3. `leads`, `audit_logs`, `lead_outcomes`, the valid/ready unique outcome index,
   and the migration ledger exist;
4. every column read or written by the migration exists;
5. `service_role` exists with `BYPASSRLS`, public-schema usage, v1 execution,
   and the exact required table privileges;
6. lifecycle v1 exists and lifecycle v2 does not;
7. migration version `20260819223000` is absent; and
8. no lifecycle-derived outcome row already exists.

It records only aggregate evidence: lead count, deterministic lead-status
digest, eligible backfill count, migration count, and target outcome count. It
does not print contact data.

## Guarded execution

`execute` performs these operations in order:

1. checks the exact approval before reading the secure database value;
2. verifies the reviewed migration hash and performs read-only preflight;
3. begins one transaction with lock, statement, and idle-transaction timeouts;
4. acquires a transaction advisory lock so a second cutover runner fails closed;
5. takes a `SHARE ROW EXCLUSIVE` migration-ledger lock and brief `SHARE` locks
   on `leads` and `lead_outcomes`, allowing reads while preventing a concurrent
   migration or lifecycle write from crossing the backup boundary;
6. repeats preflight under lock and refuses stale lead state;
7. creates a mode-600 PostgreSQL custom-format backup, validates at least 100
   restore-list entries, and hashes the archive before DDL;
8. applies the migration and migration-ledger row in the same transaction;
9. proves v1 retention, expected v2 owner, v2 `SECURITY INVOKER`, locked search
   path, service-only execution, one ledger row, unchanged lead count/status
   digest, complete flag/metadata-preserving backfill, and zero invented
   revenue; and
10. commits only when every assertion passes. Any error rolls back.

An invalid or incomplete backup is deleted before the runner exits. Once a
backup validates, its path, byte count, SHA-256, and restore-entry count are
reported without exposing its contents—even if a later migration assertion
rolls back. Retain that exact archive until application verification passes,
then remove it securely to minimize local PII retention.

## Application release and proof

After the database transaction passes:

1. merge PR #180 only;
2. let the canonical Git integration deploy the resulting `main` commit to
   `eyes-up-industries/ask-magic-mike`;
3. require a Ready Node 24 deployment and correct custom-domain aliases;
4. verify public funnel, health, anonymous Admin denial, and Ask Magic Mike-only
   brand identity;
5. verify an authenticated owner can view the Growth and Lead detail surfaces;
6. use only a separately approved synthetic/test/suppressed lifecycle mutation
   for functional v2 proof; and
7. inspect the Vercel error window before deleting the local backup.

PR #181 remains stacked. Refresh it from the verified PR #180 Production merge,
rerun cumulative proof, and obtain a separate first-response migration gate.

## Rollback

- Before commit: every runner failure issues `ROLLBACK`; Production application
  remains on lifecycle v1.
- After database commit but before deployment: leave v2 and backfilled outcomes
  dormant; do not merge until the issue is resolved.
- After deployment: restore the recorded prior Ready Vercel deployment. The v1
  application remains compatible; preserve outcome and audit rows.
- Database restore is a last resort. Prefer a forward fix. Never drop canonical
  lead, consent, notification, identity, audit, or outcome data as an
  application rollback.
