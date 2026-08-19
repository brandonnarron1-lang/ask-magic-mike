# Phase 9 production database migration evidence

Date: 2026-08-19 07:47 EDT  
Owner approval: `APPROVE PHASE 9 GROWTH INTELLIGENCE DATABASE MIGRATION`  
Migration: `supabase/migrations/20260818190000_phase9_growth_intelligence.sql`  
Migration SHA-256: `8b40a9e39e26566465aafec534b9af706e2247dfb4ac7ee9dce37a1e0b8d1ab2`  
Decision: **Gate B passed; Gate C remains closed.**

## Canonical target

- Neon project: `bitter-star-20214385`
- Organization: `org-royal-tooth-46065082`
- Branch: `production` / `br-round-base-auh6h2wd`
- Compute: `ep-proud-bonus-autwv60g`
- Database: `neondb`
- Migration role: `neondb_owner`
- Application role verified after migration: `service_role`
- PostgreSQL: `18.4`
- Vercel project sourcing the canonical application connection: `eyes-up-industries/ask-magic-mike`

The Vercel CLI account could list the encrypted Production variables but returned blank placeholders when pulling their values. The canonical credential was therefore obtained from Neon's signed-in secure connection dialog, written only to a mode-600 ephemeral file, immediately re-masked in the console, and never printed or committed.

## Pre-migration checks

All required checks passed immediately before DDL:

- all 11 target tables were absent;
- all 16 explicitly named target indexes were absent;
- `public.leads(id)` existed as a unique `uuid` key;
- `gen_random_uuid()` was available;
- `neondb_owner` could create in `public`;
- `anon` and `authenticated` roles were absent on this Neon deployment;
- `service_role` remained the server-only application role;
- Phase 9 migration version `20260818190000` was absent from the migration ledger;
- the existing lead count was 6, with all 6 marked test and communication-suppressed.

## Recovery checkpoints

Two recovery checkpoints were established before migration:

1. Neon child branch `phase9-pre-migration-20260819` / `br-gentle-glade-audadahb`, created from Production at 2026-08-19 07:45:28 EDT and scheduled to expire on 2026-08-20 at 07:45 EDT.
2. A validated PostgreSQL custom-format dump containing 563 restore-list entries, 286,793 bytes, SHA-256 `b7d20925d8120af0901e1b1d2cbfa55d33ad8a3f88285265c2a3752a5c138c94`.

The Neon recovery branch was queried successfully and contained the same 6 leads and zero Phase 9 tables. The local dump and temporary connection files were retained only through verification and then securely removed to minimize local PII and credential retention. Neon also reported six hours of branch history at execution time.

## Execution

The first command against Neon's pooled endpoint was rejected during connection startup because pooled connections do not accept the requested `lock_timeout` option. No migration statement ran and the target-table count remained zero.

The migration was then applied once against the verified unpooled Production compute with:

- `ON_ERROR_STOP=1`;
- one transaction;
- 5-second lock timeout;
- 120-second statement timeout;
- the reviewed migration file without alteration.

The transaction completed with exit code 0. Migration history was then recorded as applied through Supabase CLI 2.90.0:

```text
20260818190000 => applied
```

The current Supabase breaking-change review found no change affecting these PostgreSQL table, index, grant, or RLS statements. The migration does not pin an extension version and is therefore unaffected by the August 2026 extension-version change.

## Post-migration proof

| Check | Result |
| --- | --- |
| Phase 9 tables | 11 / 11 present |
| Explicit Phase 9 indexes | 16 / 16 present and valid |
| RLS | enabled on all 11 tables |
| `PUBLIC` SELECT access | 0 tables |
| `service_role` SELECT access | 11 tables |
| Phase 9 rows | 0 |
| Phase 9 foreign keys | 5 / 5 valid |
| Unvalidated Phase 9 foreign keys | 0 |
| Migration ledger records | exactly 1 |
| Existing leads | unchanged at 6 |
| Existing test leads | unchanged at 6 |
| Existing suppressed leads | unchanged at 6 |

The actual `service_role` connection successfully queried `marketing_channels`, `lead_outcomes`, and `growth_recommendations` through its server-only `BYPASSRLS` role. No public or browser role received access.

Production remained healthy after the migration:

- `/` returned 200;
- `/ask` returned 200;
- `/api/health/live` reported `ok: true`, Production, Neon configured;
- `/api/health/ready` reported `ok: true`, database ready, capture function present, lead/notification/RBAC/push prerequisites ready.

## Authority boundary

This gate changed only the canonical Production database schema and migration ledger. It did not:

- merge PR #169;
- deploy application code to Production;
- import growth, spend, outcome, experiment, market, or vendor data;
- activate any provider, webhook, media spend, conversion upload, email, SMS, consumer sequence, or Mike notification;
- change WordPress, DNS, domains, Vercel Production configuration, existing leads, assignments, consent, or suppression;
- access or modify NellySelly.

The additive tables are currently empty and unused by Production application code. Functional rollback is to leave them in place and keep Phase 9 code undeployed. Dropping tables is not required and remains outside this approval.

## Next controlled gate

The only next Phase 9 release authority is:

```text
APPROVE PHASE 9 MERGE AND PRODUCTION DEPLOYMENT
```

