# Phase 9 cumulative Production preflight evidence

Date: 2026-08-30

Target: Ask Magic Mike canonical Neon Production only

Decision: **Production mutation remains on hold.**

## Read-only identity proof

The authenticated Neon console identified the intended target without exposing
the credential:

- project: `bitter-star-20214385`;
- branch: `production` / `br-round-base-auh6h2wd`;
- endpoint: `ep-proud-bonus-autwv60g`;
- database: `neondb`;
- owner: `neondb_owner`;
- unpooled connection;
- TLS required; and
- channel binding required.

Vercel listed the sensitive Production `DATABASE_URL`, but its value was
intentionally non-exportable. A temporary pull contained no credential and was
deleted immediately. The connection used for the read-only check was obtained
from Neon's authenticated connection dialog, held only in process memory,
re-masked immediately, and never printed, committed, or written to a report.

## Preflight finding

The first read-only runner invocation connected successfully and stopped on
`roles_present`. A narrower read-only catalog query proved the actual role
state:

- `service_role`: present;
- `anon`: absent; and
- `authenticated`: absent.

This is the same intentional Neon-only state recorded by the accepted Phase 9
Production migration evidence on 2026-08-19. The five cumulative migrations
already revoke optional browser roles only when those roles exist. The runner,
however, incorrectly required all three roles and its postflight query used
name-based privilege calls that would fail when an optional role was absent.

## Correction

The guarded runner now:

1. requires `service_role` because the application uses it server-side;
2. accepts `anon` and `authenticated` as optional;
3. treats an absent browser role as having no privilege;
4. checks privilege by joining only roles that actually exist; and
5. preserves fail-closed public and service-role allowlist checks.

Regression coverage exercises both canonical Neon role absence and the
Supabase-compatible case where the optional roles are present.

## Corrected Production preflight

The corrected runner was then executed again in `--preflight` mode against the
same authenticated, unpooled Production endpoint. It returned `ok: true` with
every bounded check passing:

- PostgreSQL `18.4`;
- exact database and owner;
- `service_role` present;
- optional browser-role state observed as `false` / `false`;
- all 12 required tables present;
- the prerequisite assignment function present;
- every required Lead Center column present;
- immutable guard present;
- all three target receipt tables absent;
- all eight target functions absent;
- all four target triggers absent; and
- all five migration-ledger versions at zero.

The bounded baseline counts were 9 audit rows and zero rows in each of the five
existing growth tables. No row contents were read or printed.

## Disposable postflight proof

A clean PostgreSQL `17.11` disposable cluster restored the validated canonical
pre-cutover backup. Only `service_role` was created; `anon` and
`authenticated` remained absent. The real `migrationSources`, `execute`, and
`verify` paths then ran against that disposable database.

Results:

- all five migrations committed once;
- all five ledger rows were singular;
- three receipt tables, eight functions, and four triggers passed hardening;
- all existing bounded row counts remained unchanged;
- receipt rows remained zero;
- both execution postflight and read-only verify passed every check; and
- the pre-cutover backup contained 616 restore entries, 330,650 bytes, with
  SHA-256
  `cc96886ef1eef436946513cb9722ee225f5c88972828edc0fee1ae5278685fe4`.

The disposable server was stopped and its cluster, backup, socket, and logs
were deleted immediately after verification.

## Authority boundary

No SQL migration, DDL, DML, migration-ledger write, lead mutation, Vercel
Production change, merge, deployment, WordPress save, notification send, DNS
change, purchase, or NellySelly action occurred. Production execution still
requires the exact approval phrase documented in the cumulative cutover
runbook.
