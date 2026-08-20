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
  - Vitest: 195 files, 2,783 tests passed;
  - strict TypeScript check: passed;
  - full ESLint check: passed;
  - Next.js 15.5.21 production build: passed; and
  - route manifest: 78 active routes passed, with 17 acknowledged root/source
    duplicates.
- `pnpm audit --prod`: no known vulnerabilities.
- `gitleaks git . --redact --log-opts="--all"`: 454 commits scanned; no
  leaks found.
- `gitleaks git --staged --redact --no-banner`: approximately 55 KB of exact candidate
  changes scanned; no leaks found.
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

## Refreshed post-PR-180 evidence

- PR #180 merged to `main` as
  `42f80b209d5d5adc984c1d8b439c7fa830d015e6` after its Production migration,
  backup, postflight verification, and public deployment checks passed.
- PR #181 was refreshed on that exact `main` baseline at
  `99fac18df16237ada26f65384be390e331df9f59`.
- GitHub Actions Node 24 release gate run
  [32422016242](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32422016242)
  passed in 2m15s for that refreshed head.
- Refreshed Vercel Preview deployment
  `dpl_kEtBPF8LS52kgG1LWE2ooaYZhJgT` was Ready at
  `https://ask-magic-mike-l1hmapsvr-eyes-up-industries.vercel.app`.
- The refreshed local gate passed 193 files / 2,764 tests, strict typecheck,
  lint, the Next.js production build, and the 78-route manifest before the
  cutover-runner hardening below.

## Fail-closed Production cutover rehearsal

The candidate now includes
`scripts/phase9-first-response-production-cutover.mjs` and
`pnpm run phase9:first-response:cutover`. It reuses the already-proven PR #180
connection parser, error redaction, migration-ledger adapter, PostgreSQL child
environment allowlist, backup validation, and connection discipline while
keeping a separate migration hash and exact PR #181 approval phrase.

The runner enforces:

- canonical `neondb_owner`, database, branch endpoint, and unpooled Neon host;
- TLS and channel binding for the real target;
- immutable SHA-256
  `c364c8cc33428a187bcbcf2bdfcc142f3bc0422410911076abf04307bf28459e`;
- exact PR #180/v2 prerequisite state and target absence;
- required source columns and `service_role` runtime privileges;
- advisory and table locks plus a second locked preflight;
- a mode-600 custom backup with `pg_restore --list` validation;
- one transaction for migration, migration-ledger write, postflight, and
  commit;
- unchanged lead and audit source-state digests;
- exact backfill cardinality, timestamp, evidence, responder, suppression, and
  metadata parity; and
- RLS, immutable trigger, owner, `SECURITY INVOKER`, locked search paths, and
  denial of public/browser table and function access.

Local proof on 2026-08-20:

- focused runner/migration suites: 3 files / 23 tests passed;
- offline plan verified the reviewed migration hash;
- complete 30-migration prerequisite chain applied to disposable PostgreSQL
  18.3;
- optional `anon` and `authenticated` roles were removed before the PR #180
  and PR #181 pair to match canonical Neon;
- the completed PR #180 migration and service-role compatibility boundary were
  applied first;
- one `INTERNAL QA`, `.example.test`, `is_test=true`, suppressed lead and one
  explicit contact audit produced exactly one backfilled milestone;
- all postflight checks passed, including zero source-row drift and zero public
  access;
- backup validation returned 296,704 bytes and 584 restore entries;
- the executable first-response PostgreSQL contract passed as `service_role`
  and rolled back every synthetic contract row; and
- read-only verify mode passed after migration.

The disposable database container and synthetic backup were removed. The
retained real Production rollback backup from PR #180 was not modified.

## Isolation

All rehearsal rows used `INTERNAL QA` identities, `.example.test` addresses,
`is_test=true`, and `communication_suppressed=true`. No PR #181 Production or
Preview database mutation was performed. No lead, notification, provider send,
consumer acknowledgment, WordPress page, DNS record, Production environment
value, or PR #181 Production deployment was created by this verification.

## Hardened cutover exact-head evidence

- Hardened implementation commit:
  `21f0d127064393daf4029240fb45398c1f84b2fc`.
- GitHub Actions Node 24 release gate
  [run 32426414466](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32426414466)
  completed successfully in 2m54s. Setup, dependency installation, release
  doctor, release safety, unit tests, strict typecheck, lint, production build,
  route manifest, release report, launch-authority report, and artifact upload
  all passed.
- Exact-commit Vercel Preview:
  - deployment: `dpl_F8u75ymqEJzpFVPfBvvyktWCRiDL`;
  - URL:
    `https://ask-magic-mike-3wymra2pd-eyes-up-industries.vercel.app`;
  - target/status/runtime: Preview / Ready / Node 24;
  - Vercel metadata linked the deployment to PR #181 and the exact hardened
    implementation commit above;
  - `/api/health/live` and `/api/health/ready`: 200;
  - `/`, `/sell`, `/buy`, and `/home-value`: 200;
  - anonymous `/admin/growth`: 401;
  - health reported Ask Magic Mike on configured Neon with notifications and
    email disabled in Preview;
  - desktop and 390x844 mobile browser checks found meaningful content, no
    framework error overlay, no console warnings/errors, no horizontal mobile
    overflow, and a visible primary home-value CTA; and
  - rendered public content contained the Ask Magic Mike identity marker and
    no NellySelly marker.
- The Preview verification was read-only. It created no lead, message,
  notification, database write, migration, or external publication.

## Canonical-Neon Production preflight

The fail-closed read-only preflight passed on 2026-08-20 using a securely
copied, masked connection value that was never printed or committed.

- project: `bitter-star-20214385`;
- branch: `production / br-round-base-auh6h2wd`;
- endpoint: `ep-proud-bonus-autwv60g`;
- database/owner: `neondb` / `neondb_owner`;
- connection shape: unpooled with TLS and channel binding;
- PostgreSQL: 18.4;
- source baseline: 6 leads, 9 audit rows, and 0 eligible historical
  first-response backfills;
- PR #180/v2 prerequisite: present, expected owner, `SECURITY INVOKER`, locked
  search path, and executable by `service_role`;
- PR #181 target table, unique index, recorder, v3 function, and migration-ledger
  entry: all absent as required;
- `service_role`: present, `BYPASSRLS`, required schema/table privileges intact;
- optional browser roles with protected execute/table access: 0; and
- every preflight check returned true.

The command executed only catalog/source-state reads. It created no backup,
lock, migration, ledger entry, lead, audit event, response milestone, message,
notification, or deployment.

## Remaining evidence

Before this candidate can be promoted:

1. separately approved Production backup/migration, PR #181 merge, and exact
   deployment; and
2. authenticated administrator and assigned-agent visual/authorization checks
   plus public, health, identity-isolation, and rollback verification.
