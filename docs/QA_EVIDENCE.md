# QA Evidence

Status: local candidate and isolated Vercel/Neon preview verified; no production
QA lead submitted and no email sent.
All timestamps are America/New_York unless noted.

## Neon preview adapter verification — 2026-08-11

- Owner-controlled Neon Free preview branch was created and all canonical
  PostgreSQL migrations completed in the isolated preview database. No Neon
  production migration was run.
- `pnpm typecheck` — PASS after the direct Neon Postgres and notification-outbox
  adapters were added.
- `pnpm lint` — PASS.
- `pnpm test` — PASS: 130 files / 2,469 tests.
- `pnpm build` — PASS: 38 routes generated/verified by Next.js.
- `git diff --check` — PASS.
- Preview deployment and database write testing are complete. The Neon connection
  URL is stored as a Sensitive, Preview-only Vercel variable and was never logged
  or committed. Email/SMS remains disabled.

### Preview runtime proof — 2026-08-11 11:16 America/New_York

- Vercel Preview `DATABASE_URL` is Sensitive and Preview-only; the service-role
  credential was rotated without being printed, committed, or stored locally.
- `/api/health/live`: database configured, provider `postgres`, notifications
  disabled, email disabled.
- `/api/health/ready`: HTTP 200; capture function, leads table, and notification
  table all present.
- Public `POST /api/leads`: HTTP 200 for a seller QA record marked
  `INTERNAL QA — DO NOT CONTACT`; resulting lead ID
  `cf0e067d-287b-4ab9-90af-e429629b4eee`, score 83, `is_test=true`.
- Three immutable consent records exist (email/call/SMS, all denied). Two
  expected disabled-mode outbox records exist: the legacy assignment audit
  projection and canonical internal alert; both are `skipped`, and no provider
  delivery occurred.
- Replaying the same UUID session/idempotency key returned HTTP 200 with
  `X-AMM-Idempotent-Replay: 1`, the same lead ID, one distinct lead record, and
  no additional notification record.
- Two preview QA records created during recovery were explicitly marked
  `is_test=true` and communication/email/SMS suppressed. They are not live
  prospects and must remain excluded from KPIs.

### Final candidate replay — 2026-08-11 11:20

- Deployment: `https://ask-magic-mike-icl0ir5e7-eyes-up-industries.vercel.app`
  (Vercel deployment `dpl_EwjyYzJmKCiq1LjzyiJX24zFS3dX`).
- Final QA lead ID: `81183196-cf68-45a0-a8dc-e1641cc43477`; UUID session and
  idempotency key: `b3b0f6d4-1bd7-4af8-8fc9-8f30aac82c55`.
- Score 83; `is_test=true`; communication, email, and SMS suppression are all
  true; three denied-consent records and two expected `skipped` outbox records.
- Replay returned HTTP 200 with `X-AMM-Idempotent-Replay: 1`; no email, SMS, or
  consumer acknowledgment was delivered.
- `/api/health/ready` returned HTTP 200 with the capture function, leads table,
  and notification table ready.
- Final local gates: 130 test files / 2,469 tests pass; typecheck, ESLint,
  43-route manifest, 14/14 release-safety checks, production build, and
  `git diff --check` pass.

## Internal visual-alert templates

- Added the generated non-PII decorative asset at
  `public/images/ask-magic-mike/notifications/lead-alert-frame-v1.png`.
- `pnpm typecheck` — pass.
- `pnpm vitest run tests/leadops/lead-alert-visual-templates.test.ts tests/leadops/lead-engine-consolidation.test.ts` — 2 files / 9 tests pass.
- `pnpm lint` and `git diff --check` — pass.
- No email, SMS/MMS, consumer acknowledgment, deployment, or database mutation was performed. Production remains fail-closed while the service-role credential is unavailable.

## Baseline evidence

- `pnpm routes:assert`: PASS, 42 active routes with 12 acknowledged root/src
  duplicates after the same-day additions.
- Git rescue branch: created before edits.
- Live route triage: documented in `LIVE_TRIAGE_2026-08-10.md`; the current public
  deployment is reachable but missing `/buy`, `/widget/v1`, robots, sitemap, and
  the new health route.
- Vercel: production deployment is Ready; no deployment mutation performed.

## Local candidate results

| Check | Result | Evidence |
|---|---|---|
| `pnpm typecheck` | PASS | strict TypeScript compiler, final local run |
| `pnpm lint` | PASS | ESLint, final local run |
| `pnpm test` | PASS | 128 files / 2,466 tests, final local run |
| `pnpm build` | PASS | Next.js production build, final local run |
| `pnpm routes:assert` | PASS | 42 active / 12 acknowledged duplicates |
| `pnpm routes:verify` | PASS | production build plus 42 active / 12 acknowledged routes |
| `pnpm release:safety` | PASS | 14 checks / 0 failures |
| `git diff --check` | PASS | no whitespace errors |
| `pnpm amm:health:lead-pipe` against live | EXPECTED FAIL | 200 for existing routes; 404 for new routes |
| banned product-copy scan | PASS | no forbidden product-copy matches in `app`, `public`, or `docs` |
| `pnpm amm:verify:funnel` against live | PASS | 15/15 read-only legacy conversion checks |
| `pnpm amm:public:cta-check` | PASS | 16/16 source/route/doc checks |
| `pnpm amm:smoke:prod` against live | EXPECTED FAIL | old deployment lacks canonical/OG, health, robots, sitemap, and one protected admin route |
| `pnpm amm:verify:health` against live | EXPECTED FAIL | `/api/health/live` and `/api/health/ready` are 404 until candidate deploy |
| Playwright local `/buy` + open-house mobile smoke | PASS | 390×844 snapshots; accessible labels/consent/footer; 0 browser errors after local-origin fix |
| `tests/leadops/lead-engine-consolidation.test.ts` | PASS | scoring, subject, BCC, privacy filters |
| migration application | NOT RUN | production approval gate |
| public QA lead/email/BCC | NOT RUN | explicit approval gate |

The test suite deliberately does not call external providers. The Resend contract
test uses a synthetic transport and verifies that BCC is passed without logging or
rendering its value.

## Required local gates

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm routes:verify
python -m compileall <not applicable: canonical backend is TypeScript>
```

Also run the source-level banned-copy/secret scans, widget origin tests, API
contract/idempotency tests, notification console/retry tests, accessibility smoke,
and local production route matrix. Record exit codes and timestamps here.

## Production QA gate (not executed)

Requires explicit approval before: production deployment, live migration, public
form submission, internal email, consumer acknowledgment, or WP publication. The
QA lead must be `is_test=true` and contain `INTERNAL QA — DO NOT CONTACT`, then be
verified end-to-end and suppressed/excluded from KPIs.
