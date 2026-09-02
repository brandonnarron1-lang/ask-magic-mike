# Phase 9 Public Chat-Session Boundary QA Evidence

Date: 2026-09-02
Status: complete local verification passed; exact-tree and hosted evidence pending

## Scope proof

The candidate reuses:

- the required existing `POST /api/chat/session` route;
- the current public-origin allowlist;
- the shared `sessionCreate` limiter bucket and exact emergency-memory control;
- the current Preview-runtime detector; and
- the atomic lead-capture transaction as the only canonical session owner.

It adds no route, table, migration, provider, cookie, session store, queue,
scheduler, notification, analytics writer, or public component.

## Focused verification

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec vitest run \
    tests/api/chat-session-route-security.test.ts \
    tests/api/chat-route-security.test.ts \
    tests/lib/rate-limit-store.test.ts
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec eslint \
    app/api/chat/session/route.ts \
    tests/api/chat-session-route-security.test.ts
git diff --check
```

Result: 3 files / 48 tests passed; strict TypeScript, targeted ESLint, and
whitespace validation passed. Coverage proves foreign-origin refusal before
limiting, side-effect-free Preview issuance, durable Production ordering,
non-durable refusal, the exact existing break-glass exception, opaque UUID
shape, private/no-store correlation responses, and bounded retry guidance.

## Complete local release gate

Run at `2026-09-02 12:12–12:17 EDT` with Node 24:

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run amm:verify:isolation
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run release:safety
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm exec vitest run --reporter=dot
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run lint
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run routes:verify
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm audit --prod --audit-level high
git diff --check
```

Results:

- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Release safety: 14 pass / 0 fail.
- Vitest: 301 files / 3,593 tests passed.
- Strict TypeScript: PASS.
- Repository-wide ESLint: PASS.
- Next.js 15.5.21 optimized Production build: PASS; 60 static pages generated.
- Route manifest: PASS; 102 active routes and 22 acknowledged root/src
  duplicates.
- Production dependency audit: no known vulnerabilities.
- Whitespace validation: PASS.
- Redacted staged-candidate scan: no leaks found.
- Redacted full-history scan: 770 commits / 19.68 MB; no leaks found.

The first full-suite rerun encountered host `ENOSPC` during Vitest transforms,
before application tests could be evaluated. Four reproducible caches belonging
to superseded temporary Ask Magic Mike worktrees were removed, the exact frozen
dependencies were restored, and the unchanged candidate passed the complete
suite. No source file, branch, worktree, evidence, secret, database, provider,
or Production state was deleted or changed.

## Remaining seal

The exact candidate commit/tree, hosted exact-head Release Gate, immutable
Preview contract probes, protected no-write QA, and runtime logs remain to be
sealed. No visual QA is required because the exact diff contains no rendered
UI change.

## External-state proof

Focused tests use only synthetic IPs and mocked limiter results. They perform no
network request, remote database query/write, provider call, lead submission,
analytics event, appointment, notification, email/SMS/Push, WordPress action,
Vercel configuration change, deployment, DNS change, publication, spend,
deletion, or NellySelly action.
