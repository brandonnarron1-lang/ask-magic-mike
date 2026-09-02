# Phase 9 Public Analytics Ingress Boundary QA Evidence

Date: 2026-09-02
Status: complete local verification passed; exact-commit and hosted evidence pending

## Scope proof

The candidate reuses:

- the current `POST /api/events` snake-case handler;
- its exact `POST /api/widget/events` re-export;
- the dormant `src/app/api/analytics/event` camel-case adapter without adding
  it to the canonical route manifest;
- the shared `analyticsEvent` limiter and exact emergency-memory control;
- the existing endpoint-aware Preview mutation guard;
- the public event/property privacy registries; and
- the canonical server-side Neon analytics repository.

It adds no active route, event, property, request shape, table, migration,
provider, queue, scheduler, environment variable, visual component, or
parallel ledger.

## Expanded focused verification

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec vitest run \
    tests/api/public-events-route.test.ts \
    tests/api/analytics-event-route.test.ts \
    tests/analytics/client-analytics-privacy.test.ts \
    tests/analytics/funnel-event-identity-contract.test.ts \
    tests/lib/rate-limit-store.test.ts \
    tests/scripts/widget-preview-no-write-contract.test.ts \
    tests/security/foundation-integrity.test.ts
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec eslint \
    app/api/events/route.ts \
    src/app/api/analytics/event/route.ts \
    tests/api/public-events-route.test.ts \
    tests/api/analytics-event-route.test.ts
git diff --check
```

Result: 28 project-file suites / 115 tests passed; strict TypeScript, targeted
ESLint, and whitespace validation passed. Coverage proves:

- `/api/widget/events` remains the exact active `/api/events` handler;
- the dormant camel-case adapter still targets the existing canonical
  repository and remains absent from the active route manifest;
- missing or foreign origins fail before limiting and persistence;
- automation is excluded before Preview, limiter, or repository access;
- ordinary read-only Preview refuses before shared limiter writes;
- Production persistence requires an allowed durable limiter result;
- the exact existing emergency-memory setting remains the only break-glass;
- throttled requests persist nothing and receive bounded retry guidance;
- all responses use private/no-store matching correlation IDs;
- validation does not expose schema internals; and
- unavailable persistence remains a truthful HTTP 503.

## Complete local release gate

Run with Node 24 on the unchanged candidate working tree:

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run amm:verify:isolation
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:safety
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm exec vitest run
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run lint
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run routes:verify
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm audit --prod --audit-level high
git diff --check
```

Results:

- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Release safety: 14 pass / 0 fail.
- Vitest: 301 files / 3,603 tests passed.
- Strict TypeScript: PASS.
- Repository-wide ESLint: PASS.
- Next.js 15.5.21 optimized Production build: PASS; 60 static pages generated.
- Route manifest: PASS; 102 active routes and 22 acknowledged root/src
  duplicates.
- Production dependency audit: no known vulnerabilities.
- Whitespace validation: PASS.
- Redacted staged-candidate scan: PASS; approximately 32.5 KB and no leak.
- Redacted full-history scan: PASS; 771 commits / 19.70 MB and no leak.

## Remaining seal

The exact candidate commit/tree, hosted exact-head Release Gate, immutable
Preview contract probes, protected no-write QA, and runtime logs remain to be
sealed. No visual QA is required because the exact diff contains no rendered
UI change.

## External-state proof

Tests use only synthetic payloads, IPs, origins, user agents, and mocked
limiter/repository results. They perform no network request, remote database
query/write, lead submission, analytics mutation, provider call, notification,
email/SMS/Push, WordPress action, Vercel configuration change, Production
deployment, DNS change, publication, spend, deletion, or NellySelly action.
