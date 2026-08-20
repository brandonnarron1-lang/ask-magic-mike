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
  - server-resolved Lead Center user and linked responding-agent snapshots;
  - assigned-agent snapshot captured at the response moment;
  - copied test/suppression state;
  - full-row update rejection;
  - same-state idempotent replay without overwrite or duplicate audit;
  - later-stage response recording without lifecycle regression; and
  - rejection of response evidence before lead creation;
  - user/agent deletion without milestone mutation or deletion; and
  - historical backfill that never substitutes today's mutable assignee for an
    unavailable response-time assignment snapshot.
- Disposable container was removed automatically after each run.
- Latest response-dimension targeted Vitest result: 3 files, 24 tests passed.
- Strict TypeScript check passed.
- Changed-file ESLint check passed.
- `git diff --check` passed.
- Full `pnpm run release:gate` passed locally on 2026-08-20:
  - system-isolation verification: passed;
  - release-safety scan: 14/14 checks passed;
  - Vitest: 193 files, 2,765 tests passed;
  - strict TypeScript check: passed;
  - full ESLint check: passed;
  - Next.js 15.5.21 production build: passed; and
  - route manifest: 78 active routes passed, with 17 acknowledged root/source
    duplicates.
- `pnpm audit --prod`: no known vulnerabilities.
- `gitleaks git . --redact --log-opts="--all"`: 449 commits scanned; no
  leaks found.
- Local runtime was Node 26.5.1 and emitted the expected engine warning; the
  repository requires Node 24.x, so exact-head Node 24 CI remains the runtime
  authority.

## Canonical-Neon role-shape rehearsal

After PR #180's production preflight identified that canonical Neon does not
define Supabase's optional `anon` and `authenticated` roles, both stacked
migrations were rehearsed again against disposable PostgreSQL 17 with those
roles absent before either candidate migration ran.

Evidence:

- 30 prerequisite migrations applied before the stacked pair;
- `service_role` retained `BYPASSRLS` and canonical table privileges;
- `20260819223000_admin_outcome_ledger.sql` applied successfully;
- `20260820013000_first_response_intelligence.sql` applied successfully;
- both executable PostgreSQL contracts ran the protected functions as
  `service_role` and rolled back all synthetic rows;
- v2, v3, and the dedicated response recorder were executable by
  `service_role`;
- v3 and the recorder were not executable by `PUBLIC`;
- `PUBLIC` could not select the milestone table;
- the optional browser-role count remained zero; and
- both stacked migrations applied a second time without duplicate rows or
  privilege errors.

The migrations now revoke optional roles conditionally. Neither optional role
is created merely to satisfy a migration, and the public/server authorization
boundary remains unchanged.

## Exact-head CI and Preview evidence

- Response-dimension implementation commit before this evidence-only update:
  `627d2860bb01d86009d273614b33fc6b01b13901`.
- GitHub Actions Node 24 release gate:
  [run 32320555687](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32320555687),
  completed successfully in 2m52s.
- Vercel Preview:
  - deployment: `dpl_D9FepMPCUZCC6v6wRsPnV93oCAk4`;
  - URL:
    `https://ask-magic-mike-bro2vmlo5-eyes-up-industries.vercel.app`;
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
- The protected dimension cards cannot read response-owner columns in Preview
  until the stacked migration reaches that environment. Anonymous denial,
  public rendering, and health were verified without weakening that boundary.

## Isolation

All database rows used `INTERNAL QA` identities, `.example.test` addresses,
`is_test=true`, and `communication_suppressed=true`. No Production or Preview
database was queried or changed. No lead, notification, provider send,
consumer acknowledgment, WordPress page, DNS record, Vercel environment value,
or deployment was created by this verification.

## Remaining evidence

Before this stacked candidate can be promoted:

1. refreshed exact-head checks after the PR #180 hardening merge and Neon-role
   compatibility update; and
2. cumulative migration/production proof after PR #180 reaches Production.
