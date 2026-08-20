# Phase 9 First-Response Intelligence QA Evidence

Updated 2026-08-20. Candidate branch:
`codex/phase9-first-response-intelligence-20260820`.

## Evidence completed before commit

- Complete migration chain applied to disposable `postgres:17-alpine` after
  local `anon`, `authenticated`, and `service_role` role bootstrap.
- Existing outcome-ledger PostgreSQL contract passed before the new contract.
- New PostgreSQL contract passed for:
  - atomic `contacted` lifecycle and response milestone;
  - exact seven-minute elapsed response duration;
  - copied test/suppression state;
  - timestamp update rejection;
  - same-state idempotent replay without overwrite or duplicate audit;
  - later-stage response recording without lifecycle regression; and
  - rejection of response evidence before lead creation.
- Disposable container was removed automatically after each run.
- Targeted Vitest result: 7 files, 60 tests passed.
- Strict TypeScript check passed.
- Changed-file ESLint check passed.
- `git diff --check` passed.
- Full `pnpm run release:gate` passed locally on 2026-08-20:
  - system-isolation verification: passed;
  - release-safety scan: 14/14 checks passed;
  - Vitest: 193 files, 2,763 tests passed;
  - strict TypeScript check: passed;
  - full ESLint check: passed;
  - Next.js 15.5.21 production build: passed; and
  - route manifest: 78 active routes passed, with 17 acknowledged root/source
    duplicates.
- `pnpm audit --prod`: no known vulnerabilities.
- `gitleaks git . --redact --log-opts="--all"`: 447 commits scanned; no
  leaks found.
- Local runtime was Node 26.5.1 and emitted the expected engine warning; the
  repository requires Node 24.x, so exact-head Node 24 CI remains the runtime
  authority.

## Isolation

All database rows used `INTERNAL QA` identities, `.example.test` addresses,
`is_test=true`, and `communication_suppressed=true`. No Production or Preview
database was queried or changed. No lead, notification, provider send,
consumer acknowledgment, WordPress page, DNS record, Vercel environment value,
or deployment was created by this verification.

## Remaining evidence

Before this stacked candidate can be promoted:

1. exact-head Node 24 CI;
2. Vercel Preview readiness and route/security verification; and
3. refreshed cumulative proof after PR #180 reaches Production.
