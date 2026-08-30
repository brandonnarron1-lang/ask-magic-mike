# Neon Lead Center API persistence QA evidence

Date: 2026-08-30 ET

Environment: local isolated worktree

Parent: `e30b91fb102a478438df0cda9ca5d0e67bf287ad`

Runtime: Node.js `24.18.0`, pnpm `10.30.3`

## Verified outcome

- The authoritative root Next.js router builds five documented Lead Center
  API routes that were previously present only under the ignored `src/app`
  router.
- A successful patch, note, task, or assignment response now requires the
  canonical persistence adapter to return durable identifiers.
- Missing persistence and Preview-disabled mutation fail closed; no
  `mock_mode` success remains on the activated handlers.
- Spam clearing uses atomic audit-backed status restoration.
- Controlled mutation QA requires exact note/task ID readback.
- Deployable-source isolation from NellySelly passes.

## Commands and results

```text
PATH=<Node-24-bin> pnpm run release:gate
PASS
```

The gate includes:

```text
pnpm run amm:verify:isolation     PASS
pnpm run release:safety          PASS — 14/14 checks
pnpm run test                    PASS — 278 files, 3,422 tests
pnpm run typecheck               PASS
pnpm run lint                    PASS
pnpm run routes:verify           PASS
pnpm run build                   PASS — Next.js 15.5.21, 60 static pages
route-manifest                   PASS — 100 active, 22 acknowledged duplicates
```

Additional checks:

```text
pnpm audit --prod --audit-level=high
No known vulnerabilities found

git diff --check
PASS
```

## Route evidence

The production build manifest contains:

- `GET /api/admin/leads`
- `GET|PATCH /api/admin/leads/[id]`
- `POST /api/admin/leads/[id]/assign`
- `POST /api/admin/leads/[id]/notes`
- `POST /api/admin/leads/[id]/tasks`

All five routes use the existing header-only admin-secret check inside the
handler. The secret is never accepted through a query string. Mutation paths
also pass through the Preview database-mutation gate before selecting a
persistence adapter.

## SQL execution status

The migration has not been applied to Production. Local PostgreSQL server
execution was unavailable in this worktree, so SQL execution acceptance must
occur first on the already-attested isolated Neon Preview branch
`br-morning-paper-aun3378r`. That proof must record function presence,
privileges, exact endpoint identity, synthetic ID readback, disabled outbound
channels, deterministic cleanup, and restored read-only flags.

## Holds

- No Production migration, merge, deployment, or environment change.
- No WordPress save/publication.
- No email, SMS, consumer acknowledgment, or provider send.
- No live or synthetic Production lead mutation.
- No NellySelly access or change.
