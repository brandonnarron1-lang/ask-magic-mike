# Inbound SMS consent atomic boundary QA evidence

Date: 2026-09-02
Candidate: `codex/sms-inbound-consent-boundary-20260902`
Base: exact PR #273 head `dca35b2fcd245c0ce3220378719fc350d4e0895a`

## Focused contract

```bash
pnpm exec vitest run \
  tests/api/webhook-sms-reliability.test.ts \
  tests/messaging/sms-policy.test.ts \
  tests/adapters/twilio-signature.test.ts
pnpm run typecheck
pnpm exec eslint \
  app/api/webhooks/sms/inbound/route.ts \
  tests/api/webhook-sms-reliability.test.ts
git diff --check
```

Result so far: 3 files / 27 tests passed; strict TypeScript, targeted ESLint,
and whitespace validation passed. Coverage includes Preview zero-write,
Production mock refusal, Twilio authentication independent of outbound flags,
canonical URL binding, `SM`/`MM` IDs, strict media/schema/phone/body validation,
declared and streamed limits, duplicate fields, replay, payload conflict,
multi-lead response counts, private correlation, and safe database failure.

## Exact PostgreSQL statement

```bash
AMM_LOCAL_POSTGRES_URL=postgresql://localhost:<isolated-port>/postgres \
  pnpm run test:postgres:sms-inbound
```

The verifier refuses non-local hosts, extracts the exact SQL from the route,
and executes it in a temporary PostgreSQL 17 schema inside a rolled-back
transaction. It passed:

- STOP across three matching root/duplicate/sibling leads;
- 18 purpose-specific permission upserts;
- all-record sequence cancellation;
- deterministic canonical timeline attachment;
- exact replay with zero second-order writes;
- immutable provider-event payload conflict;
- normal-reply cancellation and HELP no-cancellation;
- ignored unmatched receipt and later same-payload healing;
- reclaim of an explicitly failed receipt;
- forced downstream failure with complete receipt/suppression rollback; and
- no raw phone value in receipt or communication metadata.

The generated local cluster was stopped and removed. No Neon connection was
loaded and no remote database was contacted.

## Full release gate

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:gate
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm audit --prod --audit-level high
```

Result: Node 24.18.0; Ask Magic Mike/NellySelly isolation passed; release safety
passed 14/14; Vitest passed 303 files / 3,678 tests; strict TypeScript and
repository-wide ESLint passed; the optimized Next.js 15.5.21 build generated
60 static pages; route verification passed 102 active routes with 22
acknowledged root/source duplicates. The Production dependency audit found no
known vulnerability.

Redacted Gitleaks found no leak in the 54.96 KB staged candidate or across 776
commits / 19.94 MB of repository history.

## Hosted and immutable evidence

Pending on the sealed final source tree:

- exact-commit GitHub CI;
- Vercel-authenticated Preview probes proving expected read-only `503` before
  signature/database work; and
- a final Production identity/readiness invariant check.

No carrier request, inbound message, outbound message, lead, notification,
remote database write, environment change, WordPress action, Production
deployment, DNS/publication/spend/deletion, or NellySelly action is part of this
candidate.
