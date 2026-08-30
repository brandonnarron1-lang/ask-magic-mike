# Phase 9 cumulative growth Production cutover

Date: 2026-08-29

Candidate: Draft PR [#238](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/238)

Production authority: **HOLD until the exact approval phrase in this runbook is supplied.**

## Purpose

This is the single executable cutover for the four additive growth migrations
plus the canonical Neon Lead Center persistence migration already present in
the consolidated Phase 9 stack. It replaces ad hoc SQL and five separate
operator paths. It does not create another database,
dashboard, provider connector, campaign engine, CRM, or lead system.

The runner is:

`scripts/phase9-cumulative-growth-production-cutover.mjs`

The package command is:

```text
pnpm run phase9:cumulative-growth:cutover -- --plan
```

`--plan` is the default, works offline, prints no credential, and verifies all
five reviewed migration hashes before any database connection is considered.

## Exact migration set

The runner refuses any byte drift from these files and applies them in this
order:

1. `20260824193000_marketing_spend_ingress.sql`
   - SHA-256: `9640e5807622d88c0ca3b1074ea3a0f4d304ca493dbe9ab1d573243e858ee6a1`
2. `20260824220000_organic_search_ingress.sql`
   - SHA-256: `4d1ec2947134145a75a8b82e2edef71fcd7d8b0974ebfb909d838d1378e81626`
3. `20260825033000_local_profile_performance_ingress.sql`
   - SHA-256: `68f292f8e1773c9d2b999c61311362576848020176c5dbdeaf0550ba4795047c`
4. `20260825060000_local_demand_metric_truth_guard.sql`
   - SHA-256: `705fa33d1516451e721cd30d9991084ff3dae987849a2f47981eaeff762a561a`
5. `20260830190000_admin_lead_api_persistence.sql`
   - SHA-256: `f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35`

The fourth reviewed file contains its own `BEGIN` / `COMMIT` envelope. Only
after its complete file hash matches does the runner remove that exact outer
envelope so all five files and all five migration-ledger rows can commit or
roll back together. Any additional, missing, nested, or moved transaction
control fails closed.

## Target identity

The connection parser inherited from the already-proven outcome-ledger cutover
requires all of the following:

- Neon project: `bitter-star-20214385`
- branch: `production / br-round-base-auh6h2wd`
- endpoint: `ep-proud-bonus-autwv60g`
- database: `neondb`
- owner: `neondb_owner`
- unpooled connection;
- TLS required; and
- channel binding required.

Preview, pooled, differently named, non-Neon, parameter-extended, or ambiguous
connections are rejected before a query runs. The connection string must never
be placed in chat, source, a command argument, a report, or shell history.

## Modes

### Offline plan

```text
pnpm run phase9:cumulative-growth:cutover -- --plan
```

Proves the four source hashes and prints the non-secret target and safety plan.

### Read-only Production preflight

Enter `AMM_PRODUCTION_DATABASE_URL` through a secure hidden environment
interface, then run:

```text
pnpm run phase9:cumulative-growth:cutover -- --preflight
```

Preflight requires:

- canonical database, owner, endpoint, TLS, and channel binding;
- PostgreSQL 17 or 18;
- the compatible `supabase_migrations.schema_migrations` ledger;
- the server-only `service_role` role;
- bounded observation of the optional Supabase browser roles `anon` and
  `authenticated`; either role may be absent on canonical Neon, and absence is
  treated as a stronger denial state rather than a failed prerequisite;
- the existing audit, channel, campaign, spend, signal, and opportunity tables;
- the existing lead, agent, message, task, routing, and assignment tables plus
  every column consumed by the Lead Center persistence functions;
- the existing `mutate_admin_assignment_v1` prerequisite;
- the existing immutable-row guard;
- all three new receipt tables absent;
- all eight new functions absent;
- all four new triggers absent; and
- all five migration-ledger versions absent.

It returns only bounded schema state and row counts. It prints no connection
string or credential.

### Authorized execution

Execution requires this exact, separately supplied owner phrase:

```text
APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
```

After that phrase is received and the exact PR head is revalidated, set the
non-secret approval value in `AMM_PRODUCTION_APPROVAL`, keep all three growth
import gates absent or false in the execution environment, and run:

```text
pnpm run phase9:cumulative-growth:cutover -- --execute
```

Execution:

1. verifies all five migration hashes again;
2. re-attests the exact unpooled Production identity;
3. refuses if any growth import gate is true;
4. starts one database transaction;
5. applies bounded lock, statement, and idle-in-transaction timeouts;
6. takes one transaction-scoped advisory lock;
7. locks the migration ledger and affected existing growth/audit tables;
8. repeats preflight under lock;
9. creates a mode-600 custom-format `pg_dump` backup and validates its
   `pg_restore --list` inventory;
10. applies all five reviewed migrations in order;
11. inserts one compatible migration-ledger row after each source;
12. verifies owner, RLS, public/browser-role denial, including safe handling
    when optional browser roles do not exist, the exact service-role execution
    allowlist for Lead Center functions, append-only triggers, truth guard,
    ledger singularity, zero receipt rows, and unchanged existing growth table
    counts; and
13. commits only when every postcondition passes.

Any error rolls back the transaction. If a validated backup exists, the safe
error output includes only its path, size, digest, and restore-entry count.

### Read-only postflight

```text
pnpm run phase9:cumulative-growth:cutover -- --verify
```

This may run after deployment and after later imports. It verifies object,
ownership, RLS, execution-denial, trigger, and migration-ledger integrity. It
does not require receipt tables to remain empty after separately approved real
imports.

## Application release order

Database first, application second:

1. pass the exact-head hosted Release Gate and protected no-write Preview QA;
2. run the read-only Production preflight;
3. confirm all three Vercel Production variables are explicitly `false`:
   - `GROWTH_SPEND_IMPORT_ENABLED`
   - `GROWTH_SEARCH_IMPORT_ENABLED`
   - `GROWTH_LOCAL_PROFILE_IMPORT_ENABLED`
4. execute and verify the guarded database cutover;
5. merge only the refreshed exact PR #238 payload head containing the complete
   stacked application and all five reviewed migrations, without rewriting
   history;
6. deploy or promote only that exact commit;
7. verify `/api/health/ready`, public routes, authenticated boundaries, exact
   deployment metadata, and the deployment log window; and
8. retain the validated backup until application acceptance is complete.

The cumulative gate does not authorize a spend, Search Console, or Business
Profile import; a provider login or call; a campaign change; a lead mutation;
an email/SMS/Push send; WordPress publication; or any NellySelly operation.

## Rollback

Before any real import:

- keep all three growth gates false;
- restore the immediately preceding verified Vercel Production deployment if
  application rollback is required; and
- leave the empty additive tables, functions, triggers, and ledger rows in
  place while a forward fix is reviewed.

After a separately approved import, immutable receipt and audit evidence must
be preserved. Deleting migrations, receipts, signals, opportunities, spend,
audits, or leads is not part of rollback.

## Local executable proof

A disposable PostgreSQL 17.11 cluster built from the complete pre-cutover
migration history ran the actual `execute` and `verify` functions. The proof
created and validated a 330,638-byte custom backup with 616 restore entries,
applied all five migrations in one transaction, recorded exactly five ledger
rows, created all three hardened receipt tables, all four growth
functions/triggers, and all four Neon Lead Center persistence functions,
retained zero growth and receipt rows, and passed every postcondition.

A second cluster restored that exact pre-cutover backup and injected a division
by zero after the fifth migration body. The complete transaction rolled back:
all eight target functions, all three target tables, all four target triggers,
and all five ledger rows were absent, while every prerequisite check still
passed. The validated failure-path backup also contained 616 restore entries.

No Neon, Vercel, WordPress, provider, lead, notification, Production data, or
NellySelly state was used or changed by that proof.
