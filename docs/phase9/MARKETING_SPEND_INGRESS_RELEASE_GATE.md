# Phase 9 marketing-spend ingress release gate

Date: 2026-08-24
Branch: `codex/phase9-spend-ledger-ingress-20260824`
Exact base: sealed Draft PR #217 head `d04984b4d162f13c79af261beb55a82f15a86b80`

## Decision

Extend the existing Growth Command Center and canonical Neon growth schema. Do
not create another database, dashboard, campaign manager, provider adapter, or
analytics ledger.

The repository already had `marketing_channels`, `marketing_campaigns`,
`marketing_spend_daily`, the Growth Intelligence read model, channel-economics
calculations, `growth:manage` RBAC, and immutable `audit_logs`. Repository and
full-history searches found no prior spend importer. The missing capability was
safe operational ingestion into those existing tables.

## Candidate scope

### Protected operator surface

`/admin/growth/spend-ingress`

- requires `growth:manage`;
- accepts paste or local `.csv` selection;
- validates before any write;
- shows normalized identity, dates, totals, row fingerprints, and batch
  fingerprint;
- displays durable minimized receipts after a real import; and
- clearly separates synthetic validation from Production authority.

### Bounded APIs

- `POST /api/admin/growth/spend-ingress/preview`
- `POST /api/admin/growth/spend-ingress/commit`

Both routes require exact same-origin browser context, authenticated
`growth:manage`, bounded streamed JSON, private no-store/noindex headers, and
an exact request shape. Preview contains no database mutation path. Commit
revalidates the original CSV server-side and verifies the reviewed batch
fingerprint.

### Canonical CSV v1

The contract uses exact columns rather than guessing vendor exports:

```text
spend_date,channel_key,channel_name,vendor,channel_type,buying_model,campaign_key,campaign_name,campaign_status,external_campaign_id,utm_source,utm_medium,utm_campaign,spend_usd,impressions,clicks,platform_leads,booked_appointments,source_system
```

Limits:

- 128 KiB and 250 data rows;
- exact known headers only;
- one row per campaign/day;
- real dates from the prior ten years through today;
- non-negative bounded money and integer metrics;
- explicit canonical channel, campaign, UTM, and source-system identities;
- no spreadsheet formulas or control characters;
- no duplicate or conflicting identities; and
- no synthetic/test/QA/demo marker in any channel, campaign, UTM, external, or
  source-system identity may commit.

The raw CSV exists only in request memory. Neon receives normalized rows and
SHA-256 row/batch fingerprints, never the source file.

### Additive database contract

Migration:

`supabase/migrations/20260824193000_marketing_spend_ingress.sql`

It adds:

- append-only `marketing_spend_import_batches` receipts;
- `import_marketing_spend_batch_v1(text,jsonb,text,text,text)`;
- transaction-scoped serialization for import races;
- exact replay idempotency;
- fail-closed channel/campaign identity checks;
- insert, revise, or unchanged campaign-day reconciliation;
- immutable before/after audit evidence for every changed daily row;
- immutable creation evidence for channels and campaigns introduced by the
  batch; and
- one immutable aggregate audit plus minimized durable receipt per batch.

The database function is owner-only. Public, `anon`, `authenticated`, and the
legacy `service_role` receive no table or function authority.

## Authority boundary

The candidate cannot:

- call Google, Meta, Zillow, Follow Up Boss, or another provider;
- launch, pause, target, or edit a campaign;
- create or increase a media budget;
- create or modify a lead;
- send email, SMS/MMS, Push, or a consumer acknowledgment;
- infer campaign identity, consent, conversion, revenue, or ROI;
- retain a raw CSV or vendor payload;
- modify WordPress, DNS, domains, or NellySelly; or
- mutate Preview while its canonical read-only boundary is active.

`GROWTH_SPEND_IMPORT_ENABLED=false` is the safe default. Merge and deployment
therefore remain inert even after the additive migration.

A real commit also requires explicit Production runtime/database labels and a
distinct exact match between `DATABASE_URL` and the configured Ask Magic Mike
Production Neon endpoint. A Preview endpoint, unknown endpoint, absent
attestation, or cross-project connection fails closed before even protected
receipt reads, CSV parsing, or database work. A read-only Preview may inspect
receipts only when its own explicit labels and exact distinct Preview endpoint
match.

## Release order and exact gates

This candidate is stacked after PR #217 and its entire ordered predecessor
chain. It cannot move ahead of the current first gate:

```text
APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT
```

Only after every predecessor is released and this candidate has fresh exact-
head evidence may the owner use:

```text
APPROVE PHASE 9 MARKETING SPEND INGRESS MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT
```

That phrase authorizes only the reviewed additive migration, exact merge, and
exact-commit deployment with `GROWTH_SPEND_IMPORT_ENABLED=false`. It does not
authorize a spend import or media action.

After the deployed tool validates a specific real report and the owner reviews
its exact fingerprint, totals, dates, identities, and rollback, the separate
operation gate is:

```text
APPROVE PHASE 9 MARKETING SPEND IMPORT GATE ENABLEMENT AND IMPORT OF [EXACT REPORT REFERENCE]
```

That later gate must name one exact reviewed report. It does not authorize any
provider, budget, campaign, message, lead, or unrelated data action.

## Rollback

Before import:

1. keep or restore `GROWTH_SPEND_IMPORT_ENABLED=false`;
2. restore the prior Vercel Production deployment if application rollback is
   needed; and
3. leave the empty additive table/function in place.

After import:

1. disable the feature gate;
2. revert application code if necessary; and
3. preserve spend rows, import receipts, and immutable audit evidence.

Deleting or rewriting historical financial/audit evidence is intentionally not
part of rollback and requires a separate destructive-data decision.

## Current release decision

**Preview candidate only.** No Production migration, environment change,
merge, deployment, spend import, provider action, lead action, message,
WordPress change, DNS change, purchase, deletion, or NellySelly action has been
performed by this candidate.
