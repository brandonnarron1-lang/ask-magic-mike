# QA Evidence

Status: production funnel, Neon persistence, routing, suppression, outbox, and
provider delivery are verified. No synthetic record is represented as a live
prospect.
All timestamps are America/New_York unless noted.

## Production cutover evidence — 2026-08-11

- Canonical commit: `008bbc8` on
  `rescue/amm-pre-consolidation-20260810-162915`.
- Production deployment: `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt`, Ready and
  aliased to `https://www.askmagicmike.com`.
- Public routes `/`, `/sell`, `/buy`, `/ask`, `/widget/v1`,
  `/api/health/live`, and `/api/health/ready` return HTTP 200.
- `https://askmagicmike.com/` returns HTTP 308 to the selected `www` canonical
  hostname. `/admin/leads` returns HTTP 401 without authentication.
- Production health reports PostgreSQL configured, Neon capture ready, email
  enabled, notification mode `production`, and the canonical lead and outbox
  tables available.
- The production Neon branch received the complete migration chain. The former
  Supabase project and any historic data were not changed.
- Public-form QA lead `a1a7e899-9b2e-4ffe-968f-1e10728d60e8` was durably
  stored and immediately quarantined as `is_test=true` after an early UI marker
  omission was detected. It is score 83, communication/email/SMS suppressed,
  has three consent rows, first/last-touch attribution, click-ID fields, audit
  rows, and notification history.
- A second public-form QA lead `8609b5e2-da81-49b0-8db9-c113af6894a3`
  proved the server-side marker fix: it was born `is_test=true`, suppressed,
  linked to the first QA master as a duplicate, and excluded from live KPIs.
- The two provider attempts produced no outbound email and no provider message
  ID. The latest outbox record truthfully reports `permanently_failed` with
  `resend_http_400` / `API key is invalid`.
- The invalid key was replaced securely with a sending-only production key.
  `notify.askmagicmike.com` has matching DKIM, SPF, return-path MX, and DMARC
  monitoring records in Vercel DNS. Google Public DNS returns each expected
  value and Resend reports the domain `verified`.
- Final local gates after the Neon enrichment correction: 130 test files / 2,473
  tests pass; typecheck and ESLint pass; the 43-route manifest passes; 14/14
  release-safety checks pass; production build passes.

### Final controlled end-to-end QA — 2026-08-11 12:31 America/New_York

- Submitted through the public production `/sell` form with the campaign
  `production_launch_qa_verified_sender` and explicit `INTERNAL QA — DO NOT
  CONTACT` markers.
- Canonical lead ID: `59bba7cf-fe27-42c3-adb6-27b27727e5c7`.
- The lead was born `is_test=true`, score 83, grade A, assigned to active primary
  recipient Mike Eatmon, and communication/email/SMS suppressed. It is excluded
  from production KPIs and is not a live prospect.
- Request idempotency is stored. Replaying the same public API request returned
  HTTP 200 with `X-AMM-Idempotent-Replay: 1`, the same lead ID, one lead row, one
  internal-alert row, three consent rows, and no duplicate send.
- First/last touch, source URL, referrer, UTMs, click-ID object, consent version,
  consent timestamp/source, deterministic score version, five score factors,
  routing reason, and audit records are present.
- Internal alert status: `sent`; provider: Resend; message ID
  `fdf79d0e-7cf8-44d1-a1e1-d39dafb675c1`; provider event: `delivered`.
- Sender: `Ask Magic Mike <leads@notify.askmagicmike.com>`.
- Exact subject:
  `[TEST] SELLER LEAD | internal_qa | Seller | INTERNAL QA — DO NOT CONTACT — 999 Verification Way, Wilson, NC | INTERNAL QA — DO NOT CONTACT | Score 83`.
- Provider record contains one direct recipient and one hidden BCC. Gmail search
  in the approved audit mailbox found exactly one matching received message; the
  private BCC value is intentionally not reproduced.
- Authenticated Lead Center list/detail and notification routes returned HTTP
  200; the final lead ID and sent notification are present. The same routes
  return HTTP 401 without authentication.
- Consumer acknowledgment and SMS were intentionally not sent for this QA lead.
- Temporary full-access Resend DNS and one-hour Vercel maintenance credentials
  were revoked after verification. Only the restricted production sending key
  remains in Vercel Sensitive environment storage.

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
- Templates keep transactional SMS text-only and render live lead facts as
  accessible HTML/text over a non-PII decorative frame. The final production
  email used the QA variant; SMS/MMS and consumer acknowledgment stayed off.

## Historical baseline evidence (superseded by production proof above)

- `pnpm routes:assert`: PASS, 42 active routes with 12 acknowledged root/src
  duplicates after the same-day additions.
- Git rescue branch: created before edits.
- Live route triage: documented in `LIVE_TRIAGE_2026-08-10.md`; the current public
  deployment is reachable but missing `/buy`, `/widget/v1`, robots, sitemap, and
  the new health route.
- Vercel baseline was captured before production mutation and remains useful for
  rollback comparison.

## Local candidate results

| Check | Result | Evidence |
|---|---|---|
| `pnpm typecheck` | PASS | strict TypeScript compiler, final local run |
| `pnpm lint` | PASS | ESLint, final local run |
| `pnpm test` | PASS | 130 files / 2,473 tests, final local run |
| `pnpm build` | PASS | Next.js production build, final local run |
| `pnpm routes:assert` | PASS | 42 active / 12 acknowledged duplicates |
| `pnpm routes:verify` | PASS | production build plus 43 active / 13 acknowledged routes |
| `pnpm release:safety` | PASS | 14 checks / 0 failures |
| `git diff --check` | PASS | no whitespace errors |
| production route/health matrix | PASS | required public routes and both health endpoints return 200 |
| banned product-copy scan | PASS | no forbidden product-copy matches in `app`, `public`, or `docs` |
| `pnpm amm:verify:funnel` against live | PASS | 15/15 read-only legacy conversion checks |
| `pnpm amm:public:cta-check` | PASS | 16/16 source/route/doc checks |
| production canonical/admin boundary | PASS | apex 308 to `www`; unauthenticated Admin returns 401 |
| Playwright local `/buy` + open-house mobile smoke | PASS | 390×844 snapshots; accessible labels/consent/footer; 0 browser errors after local-origin fix |
| `tests/leadops/lead-engine-consolidation.test.ts` | PASS | scoring, subject, BCC, privacy filters |
| migration application | PASS | production Neon branch ready; Supabase untouched |
| public QA lead/email/BCC | PASS | test lead stored; one alert; provider delivered; hidden copy confirmed |

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

## Production QA gate (executed)

The approved QA lead was submitted through the public form, stored as
`is_test=true`, delivered to the internal recipient plus hidden audit BCC, and
replayed idempotently. Consumer acknowledgment, SMS, and WordPress publication
were not executed.

## Reuse-first hardening verification — 2026-08-11 16:05 America/New_York

This candidate did not submit another lead, send another email/SMS, mutate the
live database, deploy production, or publish WordPress. Prior controlled
production QA proof above remains the only delivery proof.

| Check | Result |
|---|---|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS; 38 generated pages, 43 active routes |
| `pnpm vitest run --reporter=dot` | PASS; 137 files / 2,488 tests |
| `pnpm exec playwright test` | PASS; 13/13 browser E2E tests |
| `pnpm routes:assert` | PASS; 43 active / 13 acknowledged duplicates |
| `pnpm release:safety` | PASS; 14/14 |
| `pnpm audit --prod` | PASS; zero known vulnerabilities |
| `gitleaks detect --source . --redact` | PASS; 319 commits, no leaks |
| `git diff --check` | PASS |
| `pnpm amm:verify:funnel` | PASS; 15/15 live read-only checks |
| `pnpm amm:public:cta-check` | PASS; 16/16 |
| `pnpm amm:verify:social-preview` | 40/42; Facebook crawler receives 403 on two Our Town WordPress URLs |

Rendered evidence for the retained visual system:

- `output/product-design-audit/2026-08-11/01-home-desktop.png`
- `output/product-design-audit/2026-08-11/02-home-value-desktop.png`
- `output/product-design-audit/2026-08-11/03-buy-desktop.png`

Known verification limitations: local shell Node is 26.5.1 while the project and
Vercel target are pinned to Node 20.x; the build passes locally but preview remains
the Node-20 deployment proof. PHP CLI is unavailable locally, so staging must run
`php -l` before the disabled bridge package is uploaded.

### Non-production preview proof — 2026-08-11 16:12 America/New_York

- Deployment: `dpl_C5Rt9Wssh4jGaqo3GHQyTs7a9R34`.
- URL: `https://ask-magic-mike-il5455ptk-eyes-up-industries.vercel.app`.
- Vercel state: `READY`; target: preview; production was not promoted.
- Authenticated preview requests returned HTTP 200 for `/`, `/home-value`, `/buy`,
  `/ask`, `/api/health/live`, and `/api/health/ready`.
- Public health reports environment `preview`, canonical PostgreSQL configured,
  email disabled, and notification mode disabled. No lead or external message was
  created during this smoke test.
- Vercel warns that Node 20 becomes unsupported for deployments created on or
  after 2026-10-01. A deliberate Node 24 compatibility upgrade is a follow-up,
  not an untested runtime change inside this hardening candidate.
