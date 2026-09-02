# Atomic Public Lead Delivery Intent — QA Evidence

Date: 2026-09-02

Scope: stacked successor to PR #263

Production baseline: accepted PR #247 / `a2f3de834830f600df106dbf5836ae4bbde4eb4a`

## Decision

Keep the existing canonical Neon lead model, v1 contact/dedupe/routing logic,
`lead_notifications` table, provider adapters, rendering, and retry worker.
Add only `capture_public_lead_v2`, an additive transaction wrapper that closes
the partial-write window between lead capture, enrichment, consent evidence,
and the required internal alert intent.

The database stores only a minimized delivery intent. Recipient and hidden BCC
addresses, rendered content, and provider secrets remain secure runtime
configuration. Provider sending remains after commit and continues to use the
outbox claim/idempotency controls.

## Real PostgreSQL proof

A disposable PostgreSQL 17 cluster was initialized locally. Every migration in
`supabase/migrations` applied with `ON_ERROR_STOP=1`, including
`20260902012000_atomic_public_lead_delivery_intent.sql`.

Privilege results, in order:

```text
capture_public_lead_v2 exists: true
anon EXECUTE: false
authenticated EXECUTE: false
service_role EXECUTE: true
```

The functional contract used only synthetic `.test` contact data and disabled
all local agents. Eleven assertions returned true: capture version, complete
lead enrichment, attribution, three consent rows, one pending internal alert,
idempotent replay, one-lead cardinality, one-alert cardinality, and zero lead,
session, and contact rows after a trigger-forced outbox failure.

## Application proof

```bash
pnpm exec vitest run \
  tests/leadops/atomic-seeded-lead-alert-delivery.test.ts \
  tests/persistence/atomic-public-lead-delivery-intent.test.ts \
  tests/persistence/neon-postgres-adapter.test.ts \
  tests/persistence/supabase-postgrest-adapter.test.ts \
  tests/leadops/api-leads-route.test.ts
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:gate
```

Results:

- focused: 5 files / 52 tests;
- complete: 300 files / 3,566 tests;
- strict TypeScript: pass;
- full ESLint: pass;
- system isolation: pass;
- release safety: 14/14 pass;
- Next.js 15.5.21 optimized build: pass, 60 static pages;
- route manifest: 102 active / 22 acknowledged duplicates.

The first build attempt encountered local disk `ENOSPC`. Only generated `.next`
directories and stale worktree dependency caches were removed. The same source
tree then built successfully.

## Release and rollback

This candidate is not applied to Neon or Production. Release order is mandatory:

1. apply the additive migration;
2. verify v2 presence and server-only privileges;
3. deploy the exact verified application tree;
4. check `/api/health/ready`, public no-write smoke, protected AdminOps, and
   outbox operations before any separately approved QA submission.

Before application promotion, rollback may drop only the v2 function. After
promotion, restore the prior Ready application first; preserve every lead,
consent, attribution, audit, and notification record.

## Non-mutation attestation

No remote database query or write, deployment, Vercel configuration change,
email/SMS/Push send, live lead, WordPress action, DNS/publication/spend action,
business-data deletion, or NellySelly action occurred.
