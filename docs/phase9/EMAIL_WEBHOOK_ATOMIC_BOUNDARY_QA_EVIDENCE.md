# Phase 9 Email Webhook Atomic Boundary QA Evidence

Date: 2026-09-02
Status: complete local and real-PostgreSQL verification passed; exact-commit hosted evidence pending

## Focused application verification

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec vitest run \
    tests/api/phase7-resend-webhook.test.ts \
    tests/api/webhook-email-reliability.test.ts \
    tests/adapters/email-webhook-normalizer.test.ts
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm run typecheck
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
  pnpm exec eslint \
    app/api/webhooks/email/events/route.ts \
    tests/api/phase7-resend-webhook.test.ts \
    tests/api/webhook-email-reliability.test.ts
git diff --check
```

Result: 3 files / 27 tests pass; strict TypeScript, targeted ESLint, and
whitespace validation pass. Tests cover missing/invalid signatures, JSON media
type, declared and streamed size limits, Preview refusal, supported-event
allowlist, exact replay, provider-ID collision, delayed delivery, bounce
suppression, private correlation, safe retryable database failure, and absence
of recipient email from SQL parameters.

## Real PostgreSQL atomicity proof

The checked-in verifier extracts the exact parameterized statement used by the
route, rewrites only its schema qualifier into a process-unique test schema,
and refuses any non-local database hostname.

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
AMM_LOCAL_POSTGRES_URL=postgresql://postgres@127.0.0.1:55439/postgres \
  pnpm run test:postgres:resend-webhook
```

Result on an isolated temporary PostgreSQL 17 cluster:

```text
Resend webhook atomic SQL contract: PASS (processed, replay, rollback, retry, suppression, unmatched)
```

The verifier proves:

- a matched delivered event atomically records receipt, notification metadata,
  and one communication event;
- exact replay creates no second communication event;
- an intentionally forced communication-event constraint failure rolls back
  both the receipt and notification update;
- a pre-existing `failed` receipt is reclaimable and becomes `processed`;
- a bounce atomically marks the notification terminal and suppresses email;
- an unmatched signed event is recorded as `ignored`; and
- the full test transaction is rolled back and the temporary cluster removed.

No Neon connection or provider credential was used.

## Complete local release gate

```bash
PATH=/opt/homebrew/opt/node@24/bin:$PATH CI=1 pnpm run release:gate
PATH=/opt/homebrew/opt/node@24/bin:$PATH pnpm audit --prod --audit-level high
git diff --check
```

Result on Node 24.18.0:

- Ask Magic Mike/NellySelly deployable-source isolation: PASS.
- Release safety: 14 pass / 0 fail.
- Vitest: 303 files / 3,655 tests passed.
- Strict TypeScript and repository-wide ESLint: PASS.
- Next.js 15.5.21 optimized Production build: PASS; 60 static pages.
- Route manifest: PASS; 102 active routes and 22 acknowledged root/source
  duplicates.
- Production dependency audit: no known vulnerabilities.
- Whitespace validation: PASS.
- Redacted staged-candidate scan: approximately 50 KB; no leak.
- Redacted full-history scan: 774 commits / approximately 19.84 MB; no leak.

The first release-gate invocation used an older dependency cache while local
disk was being reclaimed. It failed before typecheck/build because that cache
ran Vitest 2.1.9 and lacked packages present in the current lockfile. No source
change was made in response. A frozen-lockfile install restored the exact
dependency graph (Vitest 3.2.6), and the complete gate above passed.

## Exact-commit hosted plan

After pushing the exact commit, hosted verification is intentionally no-write:

- confirm public and health routes remain available;
- call the Preview callback without a provider secret and confirm a private,
  correlated refusal;
- inspect Vercel runtime logs for unexpected exceptions; and
- confirm the Preview build adds no migration or environment change.

No signed Production callback, synthetic email, lead submission, database
write, Resend configuration change, WordPress action, DNS change, publication,
spend, deletion, or NellySelly action is authorized by this candidate.
