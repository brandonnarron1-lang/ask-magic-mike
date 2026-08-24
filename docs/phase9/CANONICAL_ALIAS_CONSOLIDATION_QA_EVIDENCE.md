# Phase 9 — Canonical Alias Consolidation QA Evidence

Date: 2026-08-23 (America/New_York)

Candidate base: `2ccc654cb131d1a448234225fc18670893f84251`

Environment: isolated local worktree; no Production mutation

## Pre-change live evidence

Read-only `curl` requests to Production returned `HTTP 200` for both duplicate compatibility documents:

- `https://www.askmagicmike.com/value?...` → `200`, matched path `/value`;
- `https://www.askmagicmike.com/we-buy-houses?...` → `200`, matched path `/we-buy-houses`.

No form was submitted and the read-only query values were unmistakable audit labels.

## Focused contract

Command:

```bash
pnpm exec vitest run tests/public/canonical-alias-redirects.test.ts tests/public/search-authority-metadata.test.ts tests/public/search-authority-routes.test.ts
```

Result: PASS — 3 files, 12 tests.

The redirect test executes the real `next.config.ts` configuration through Next.js' server testing utility. Both aliases returned `308`; canonical path, origin, UTMs, and `gclid` matched exactly.

## Full local verification

| Command | Result |
|---|---|
| `pnpm run test` | PASS — 230 files, 3,062 tests |
| `pnpm run typecheck` | PASS — strict TypeScript, no diagnostics |
| `pnpm run lint` | PASS — ESLint, no diagnostics |
| `pnpm run build` | PASS — Next.js 15.5.21 optimized build, 52 generated pages |
| `pnpm run routes:verify` | PASS — 83 active routes, 17 acknowledged root/src duplicates |
| `pnpm run release:safety` | PASS — 14/14 controls |
| `pnpm run amm:verify:isolation` | PASS — deployable code contains no NellySelly project identifiers |
| `pnpm audit --prod --audit-level high` | PASS — no known Production dependency vulnerabilities |
| `gitleaks git --redact --no-banner --log-opts='--all'` | PASS — 573 commits, no leaks |
| `git diff --check` | PASS |
| migration-diff check | PASS — no migration changed |

Local Node was `v26.5.1` while the repository declares Node `24.x`; exact Node 24 CI remains required before review authority.

## Optimized-server redirect smoke

The optimized build was started locally and queried without following redirects.

```text
GET /value?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&gclid=TEST_CLICK_ID
308 Location: /home-value?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&gclid=TEST_CLICK_ID

GET /we-buy-houses?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&fbclid=TEST_CLICK_ID
308 Location: /sell?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&fbclid=TEST_CLICK_ID
```

The local server was stopped after proof.

## Safety record

- no database read requiring secrets and no database write;
- no form or test lead;
- no email, SMS, Push, or consumer acknowledgment;
- no Production environment, merge, deployment, alias, or domain change;
- no WordPress edit/publication;
- no DNS, Search Console, Business Profile, social, paid traffic, purchase, or cache action;
- no NellySelly access or change; and
- no branch, worktree, deployment, lead, or historical artifact deleted.

## Remaining acceptance

Before any Production proposal:

1. commit and push the exact candidate;
2. obtain exact-head Node 24 CI;
3. create an immutable Vercel Preview only;
4. verify both Preview redirects and canonical destination pages; and
5. keep merge/deploy behind a new exact approval gate.
