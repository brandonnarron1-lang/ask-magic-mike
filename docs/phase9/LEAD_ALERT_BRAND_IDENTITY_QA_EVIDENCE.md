# Lead-alert brand identity v3 QA evidence

Date: 2026-08-24

Candidate: Draft PR #214 on
`codex/phase9-lead-alert-brand-identity-20260824`

Parent: exact Draft PR #213 head
`d666289f91962cd836e87aec6cb3d809e93e72a7`

## Scope and no-send boundary

The candidate changes only the canonical internal lead-alert renderer and its
protected review surface. It reuses the existing deterministic score bands,
outbox, provider adapter, recipients, BCC behavior, retry ledger, approved Our
Town logo, approved Mike portrait, and urgency backgrounds.

The three acceptance renders are fixed synthetic records. Every subject begins
`[TEST]`; every body says `INTERNAL DESIGN PREVIEW — NO LEAD EXISTS`; no email
or phone is present; no form, button, mutation route, recipient, provider,
queue, or send action exists. The acceptance route is executable only in local
or Vercel Preview runtime and returns 404 when `VERCEL_ENV=production`.

## Automated local evidence

Executed with Node 24.18.0:

```bash
pnpm run test -- --reporter=dot
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run routes:assert
pnpm run amm:verify:isolation
pnpm run release:safety
git diff --check
```

Results:

- Vitest: 234 files / 3,088 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 generated pages;
- route manifest: passed, 84 active routes / 17 acknowledged root-`src`
  duplicates;
- release safety: 14/14 passed;
- Ask Magic Mike / NellySelly deployable-source isolation: passed; and
- whitespace validation: passed.

Focused lead-alert/notification proof passed 5 files / 48 tests before the full
suite. The contract proves approved asset paths and alt text, zero embedded
raster PII, all three urgency bands, no synthetic contact details, v1/v2 retry
pinning, unknown-version fail-closed behavior, visuals-disabled fallback, a
read-only review gallery, and the Production-disabled acceptance boundary.

The first route-manifest invocation correctly refused to assert against missing
`.next` output. After the required fresh optimized build, the same route proof
passed 84/17. A TypeScript check then caught an overly narrow helper parameter;
the helper was corrected to accept the exact optional Vercel environment value,
and strict typecheck plus focused regression tests passed before this evidence
was recorded.

## Immutable Preview and browser evidence

Pending final exact-head Vercel Preview and in-app-browser acceptance. Record
the immutable URL/deployment, exact Git SHA, desktop/mobile screenshots, DOM
facts, no-overflow geometry, console/runtime-log result, Production 404 proof,
remote release gate, dependency audit, and secret scan here before sealing the
candidate.

## Release boundary

No Production, environment, database, lead/event, notification, email/BCC,
consumer acknowledgment, SMS/MMS, Push, provider test, WordPress/GTM/GA4/DNS,
publication, spend, deletion, or NellySelly action occurred.

After every ordered predecessor releases and this branch is refreshed onto
exact accepted `main`, the later application-only gate is:

`APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT`

That gate does not authorize a message send or any separately gated external
action.
