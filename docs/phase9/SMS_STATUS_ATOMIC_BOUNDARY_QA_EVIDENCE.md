# Phase 9 SMS Status Atomic Boundary QA Evidence

Date: 2026-09-02
Status: complete local and real-PostgreSQL verification passed; exact-commit hosted evidence pending

## Focused application verification

```bash
pnpm exec vitest run \
  tests/leadops/sms-status-callback.test.ts \
  tests/api/webhook-sms-reliability.test.ts \
  tests/adapters/twilio-signature.test.ts
pnpm exec tsc --noEmit
pnpm exec eslint \
  app/api/webhooks/sms/status/route.ts \
  tests/leadops/sms-status-callback.test.ts
```

Result: 3 files / 34 tests pass; strict TypeScript and targeted ESLint pass.
Coverage includes exact canonical callback URL, private correlation, signed
matched/unmatched events, deterministic replay, `SM`/`MM` identity, normalized
provider error codes, Preview refusal, missing configuration, exact media type,
declared and streamed body ceilings, duplicate/conflicting form fields, forged
signatures, schema rejection, and safe retryable database failures.

## Real PostgreSQL proof

The verifier extracts the exact SQL statement from the application route,
rewrites only the schema qualifier into a process-unique test schema, and
refuses a non-local database hostname.

```bash
AMM_LOCAL_POSTGRES_URL=postgresql://127.0.0.1:55439/amm_twilio_status_contract \
  pnpm run test:postgres:twilio-status
```

Result on an isolated temporary PostgreSQL 17 cluster:

```text
Twilio status atomic SQL contract: PASS (processed, replay, out-of-order, correction, non-regression, rollback, retry, unmatched, late-match healing)
```

The test proves one matched atomic receipt/update/timeline write, replay no-op,
stale `sent` rejection after failure, later delivery correction, late-failure
non-regression after delivery, forced downstream-failure rollback, reclaim of a
prior `failed` receipt, and safe unmatched receipt. The complete test executes
inside a rolled-back transaction and its temporary cluster is removed. It also
proves an unmatched receipt remains a no-op until a canonical Message SID match
exists, then heals that provider/outbox race exactly once.

No Neon connection, Twilio credential, phone number, message, or remote
provider callback was used.

## Complete local release gate

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH CI=1 pnpm run release:gate
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm audit --prod --audit-level high
git diff --check
```

Result on Node 24.18.0:

- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Release safety: 14 pass / 0 fail.
- Vitest: 303 files / 3,671 tests passed.
- Strict TypeScript and repository-wide ESLint: PASS.
- Next.js 15.5.21 optimized Production build: PASS; 60 static pages.
- Route manifest: PASS; 102 active routes and 22 acknowledged root/source
  duplicates.
- Production dependency audit: no known vulnerabilities.
- Whitespace validation: PASS.

On the final-source full-gate invocation, isolation, safety, all tests,
typecheck, and full lint passed before webpack stopped on local `ENOSPC` while
writing its disposable cache. Generated `.next` output plus ignored `.next`
and `node_modules` artifacts from the already sealed PR #272 worktree were
removed. The exact same source then passed the optimized build, all 60 static
pages, build traces, and 102/22 route-manifest verification. No source,
credential, lead, database, or other business data was removed.

## Remaining exact-commit evidence

Before this Draft is sealed:

- run candidate and full-history secret scans;
- push one exact commit and wait for GitHub/Vercel checks;
- probe the protected Preview route and confirm `preview_data_disabled` before
  signature or persistence; and
- inspect deployment runtime logs and reconfirm Production identity/health.

No Production merge/deployment, remote database action, SMS/email/Push,
WordPress change, lead submission, analytics write, environment/DNS change,
publication, spend, deletion, or NellySelly action is authorized by this Draft.
