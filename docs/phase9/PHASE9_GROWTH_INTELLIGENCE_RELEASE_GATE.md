# Phase 9 Growth Intelligence release gate

Date: 2026-08-18  
Branch: `codex/phase9-growth-intelligence-competitive-moat-2026-08-18`  
Base: `ad8ab6e06affd1d50625c81fc82556716c544a29`

## Release purpose

Phase 9 adds a protected, read-only Growth Command Center and the data structures required to measure real-estate lead generation from source spend through closed revenue. It also adds deterministic experiment and opportunity logic plus a vendor-neutral normalization contract.

It does **not** activate:

- consumer email or SMS;
- consumer sequences;
- paid media;
- portal or CRM production webhooks;
- ad-platform conversion uploads;
- public autonomous publishing;
- AI lead assignment, scoring, permission, scheduling, sending, spending, migration, merge, or deployment authority;
- Mike activation.

## Change set

### Database migration prepared

`supabase/migrations/20260818190000_phase9_growth_intelligence.sql`

Adds server-only, row-level-security-enabled tables for:

- marketing channels;
- marketing campaigns;
- daily spend;
- lead outcomes and revenue;
- growth experiments;
- deterministic experiment assignments;
- experiment events;
- market signals;
- market opportunities;
- growth recommendations;
- vendor ingest idempotency events.

The migration is additive. It does not alter consumer delivery or existing lead capture behavior.

### Canonical read model

- `app/lib/persistence/neonGrowthIntelligenceView.ts`
- `app/lib/growthIntelligenceView.ts`

Behavior:

- uses canonical `DATABASE_URL`;
- excludes `is_test = true` records;
- excludes `communication_suppressed = true` records;
- bounds lead and outcome reads;
- detects whether Phase 9 tables exist through `to_regclass`;
- gracefully analyzes existing leads before the migration;
- exposes no mutation path;
- returns a generic error instead of database details.

### Deterministic intelligence

- `app/lib/growth/intelligence.ts`

Calculates:

- lead, qualified, appointment, and close counts;
- spend and attributed revenue;
- CPL;
- cost per qualified lead;
- cost per appointment;
- cost per close;
- ROAS;
- attribution coverage;
- paid-lead spend coverage;
- stale nurture candidates;
- speed-to-lead risk;
- portal concentration;
- scale, repair, attribution, reactivation, and experiment opportunities.

Experiment functions provide deterministic variant assignment and a practical-uplift decision helper. They do not claim statistical significance or grant rollout authority.

### Vendor normalization contract

- `app/lib/growth/vendor-ingress.ts`

Supports normalized source identities for major portal, CRM, advertising, predictive, and nurture vendors. It:

- creates stable payload hashes;
- extracts external IDs;
- normalizes contact, property, attribution, click-ID, consent, and intent facts;
- preserves only a minimized safe metadata allowlist;
- refuses to infer consent;
- returns explicit review reasons;
- does not retain a raw payload field.

No live ingress endpoint is activated in this phase.

### Protected UI

- `app/admin/growth/page.tsx`
- `app/admin/layout.tsx`
- `config/active-route-manifest.json`

The Growth Command Center:

- remains under the existing `/admin/:path*` middleware;
- requires `report:view`;
- contains no form, server action, mutation fetch, or provider call;
- shows current canonical lead analysis immediately;
- shows a schema-pending state before migration;
- shows spend, outcome, experiment, and persistent queues only after migration and data import;
- communicates the AI action boundary in the interface.

## Required checks before merge

Run from the repository root:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test -- --run tests/adminops/growth-intelligence.test.ts tests/adminops/admin-growth-route-guards.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm routes:verify
corepack pnpm release:safety
```

Inspect:

- `/admin/growth?window=30`
- `/admin/growth?window=90`
- `/admin/growth?window=365`
- `/admin/leads`
- `/admin/reporting`
- Preview read-only banner behavior;
- 390 × 844 mobile viewport;
- 1440 × 1000 desktop viewport;
- keyboard focus and navigation;
- horizontal overflow;
- browser console;
- network activity to confirm no mutation or external provider call.

## Database review before application

Confirm:

1. every table is additive and absent in production;
2. `gen_random_uuid()` is available;
3. referenced `public.leads(id)` exists;
4. role and RLS strategy matches the canonical Neon deployment;
5. no public, anonymous, or authenticated client role receives access;
6. no table or index conflicts with pending work;
7. migration transaction and rollback approach are approved;
8. backup and recovery evidence are current;
9. migration is applied once and recorded;
10. post-migration read-only queries return without changing lead data.

## Exact owner gates

### Gate A: Preview

Approval phrase:

```text
APPROVE PHASE 9 PREVIEW DEPLOYMENT AND VISUAL QA
```

Allows:

- Preview deployment;
- protected route QA;
- test-mode database connectivity if Preview has an isolated or approved database;
- screenshots and evidence.

Does not allow production migration, merge, production deployment, provider activation, spend, or consumer sending.

### Gate B: production database migration

Approval phrase:

```text
APPROVE PHASE 9 GROWTH INTELLIGENCE DATABASE MIGRATION
```

Allows only the reviewed additive Phase 9 migration against the canonical production database under the documented runbook.

Does not allow merge, production deployment, consumer messaging, provider activation, spend, or external conversion uploads.

### Gate C: merge and production deployment

Approval phrase:

```text
APPROVE PHASE 9 MERGE AND PRODUCTION DEPLOYMENT
```

Requires passing CI, Preview QA, migration decision, and rollback review.

Does not imply consumer sending, paid media, provider contracts, public publishing automation, or Mike activation.

### Gate D: provider test integration

Approval phrase:

```text
APPROVE [PROVIDER] TEST-MODE INTEGRATION USING PROVIDED CREDENTIALS
```

Requires:

- provider contract and terms;
- credentials and secret-storage path;
- signature and idempotency specification;
- test account or approved test event;
- normalized field map;
- privacy and retention review;
- no consumer delivery unless separately approved.

### Gate E: consumer pilot

The existing exact gate remains:

```text
APPROVE FORM 3 CONSUMER ACKNOWLEDGMENT EMAIL PILOT
```

No Phase 9 implementation broadens that approval.

## Operational blockers

### Resend billing warning

The unpaid-invoice warning must be resolved before uninterrupted future email delivery can be treated as reliable. Phase 9 does not change or conceal that risk.

### Live provider credentials

Portal, CRM, Meta, Google, TikTok, predictive-data, and communication-provider integrations require contracts, credentials, field maps, test facilities, and policy review. None are assumed.

### MLS and market data

Market-signal ingestion must respect MLS licensing, confidential fields, display rules, data retention, attribution, and permitted uses. The Phase 9 schema stores only a generic evidence record until a permitted source is selected.

## Rollback

### Before migration

Rollback is a code-only revert of the Phase 9 branch or merge commit. Existing production lead capture and data are untouched.

### After migration but before data import

The new tables are isolated and unused by existing capture paths. The application can be reverted while leaving empty additive tables in place. Dropping tables is not required for functional rollback and should not be done without a separate destructive-action approval.

### After data import

Revert application code first. Preserve imported growth records for audit. Do not delete tables or outcomes merely to simulate a clean rollback. Any destructive cleanup requires a reviewed retention and recovery plan.

## Release decision

Current decision as of 2026-08-19: **Gate A Preview QA and Gate B Production database migration passed. HOLD FOR GATE C MERGE AND PRODUCTION DEPLOYMENT APPROVAL.**

Completed with recorded evidence:

- CI and release gate;
- Preview deployment and visual QA;
- additive Production database migration `20260818190000`;
- post-migration RLS, privilege, schema, lead-count, and health verification.

Safe now:

- branch review;
- pull request;
- CI;
- code and migration inspection;
- Preview deployment under the completed Gate A authority.

Not approved by this document:

- merge;
- production deployment;
- provider activation;
- consumer delivery;
- paid media;
- public autonomous publishing;
- Mike activation.
