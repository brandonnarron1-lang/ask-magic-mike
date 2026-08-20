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

## Exact-head CI and Preview evidence

- Candidate commit before this evidence-only update:
  `53ee69c457a265599d7573bc04cb55fd424a8392`.
- GitHub Actions Node 24 release gate:
  [run 32318743751](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32318743751),
  completed successfully in 2m44s.
- Vercel Preview:
  - deployment: `dpl_GwA2sUdQkuCdwh9v7Yz7mtbY6VNC`;
  - URL:
    `https://ask-magic-mike-cc96gxm1b-eyes-up-industries.vercel.app`;
  - target/status: Preview / Ready;
  - `/api/health/live`: 200, Ask Magic Mike, Neon configured, notifications
    disabled, email disabled;
  - `/api/health/ready`: 200;
  - `/`, `/sell`, `/buy`, and `/home-value`: 200;
  - `/admin/growth` without an authenticated Lead Center session: 401; and
  - public HTML contained the Ask Magic Mike identity marker and no NellySelly
    marker.
- Preview verification was read-only. No lead was submitted, no message was
  sent, and no database migration was applied.

## Isolation

All database rows used `INTERNAL QA` identities, `.example.test` addresses,
`is_test=true`, and `communication_suppressed=true`. No Production or Preview
database was queried or changed. No lead, notification, provider send,
consumer acknowledgment, WordPress page, DNS record, Vercel environment value,
or deployment was created by this verification.

## Remaining evidence

Before this stacked candidate can be promoted:

1. refreshed exact-head checks after this evidence-only commit; and
2. refreshed cumulative proof after PR #180 reaches Production.
