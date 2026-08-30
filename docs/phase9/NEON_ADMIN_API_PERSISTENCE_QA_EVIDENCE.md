# Neon Lead Center API persistence QA evidence

Date: 2026-08-30 ET

Environment: local isolated worktree

Parent: `e30b91fb102a478438df0cda9ca5d0e67bf287ad`

Application commit exercised in Preview:
`382ebe32d41a23eeb0e4a969c733be78930ba87a`

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

## Isolated Neon Preview execution

The candidate migration was applied only to the attested Ask Magic Mike
Preview branch:

- project: `bitter-star-20214385`;
- branch: `br-morning-paper-aun3378r`;
- endpoint: `ep-billowing-paper-au4tdhz8`;
- database: `neondb`;
- migration SHA-256:
  `f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35`.

Preflight proved the parsed connection endpoint matched Preview and did not
match Production endpoint `ep-proud-bonus-autwv60g`. The migration installed
four functions in one transaction. All four are `SECURITY INVOKER`, pin
`search_path=public, pg_temp`, and expose zero `EXECUTE` grants to `PUBLIC`,
`anon`, or `authenticated`.

Read-only Preview QA passed 18 checks plus browser E2E with zero failures:

- run: `https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33293166886`;
- exact application commit: `382ebe32d41a23eeb0e4a969c733be78930ba87a`;
- verdict: `PREVIEW_READY` before controlled mutation.

## Controlled mutation proof

The branch-only gates were enabled only after health reported exact Preview
identity, disabled provider delivery, and zero safety blockers. One synthetic
`INTERNAL QA — DO NOT CONTACT` lead was submitted through `/api/leads` with
`is_test=true`, then replayed with the same idempotency key.

Durable evidence:

- lead ID: `a2be5788-4b10-44ed-a46a-9e4a2e6eaeb0`;
- note/message ID: `3c88f05f-379f-49d6-961e-cd4f13466c4f`;
- task ID: `f33a0a23-dc2d-4580-9280-0afdd856f92b`;
- patch audit ID: `17684b13-6337-4a1e-bc2f-c0592103c75c`;
- assignment audit ID: `951c49b9-acbe-49dc-a239-010ff6917696`.

Authenticated detail readback found those exact lead, message, and task IDs.
Direct SQL confirmed one lead for the idempotency key, one attribution row,
three consent rows, and the expected audit actions. Both notification rows
were `skipped`, with zero provider message IDs and zero attempts.

The first cleanup attempt used one transaction and correctly rolled back in
full when the append-only consent trigger rejected deletion. No immutable
control was weakened. The QA row was instead closed out as `dead`, unassigned,
`is_test=true`, and communication/email/SMS suppressed. Consent and
privacy-minimized audit evidence remain durable while the row is excluded from
live handling and production KPIs.

The branch-only Vercel flags were then restored to
`PREVIEW_DATA_MODE=disabled` and `ALLOW_PREVIEW_DB_MUTATION=false`; the final
read-only deployment
`https://ask-magic-mike-6yyxbj3k4-eyes-up-industries.vercel.app` reported both
flags disabled, email/SMS disabled, and `safe_for_preview_mutation=false`. An
authenticated PATCH was refused with HTTP 503 and
`error=preview_data_disabled` before persistence.

## Holds

- No Production migration, merge, deployment, or environment change.
- No WordPress save/publication.
- No email, SMS, consumer acknowledgment, or provider send.
- No live or synthetic Production lead mutation.
- No NellySelly access or change.
