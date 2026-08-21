# QA Evidence

Status: production funnel, Neon persistence, routing, suppression, outbox, and
provider delivery are verified. No synthetic record is represented as a live
prospect.
All timestamps are America/New_York unless noted.

## Phase 7 completion gap closure — 2026-08-16

### Authenticated Production Copilot acceptance

- PR `#166` repaired payload-era lead-column references in the synchronous and asynchronous Copilot paths and added a canonical-schema regression test. It merged as `275f06e5857aceab2c79d499a3d29766c2c59c19` after the release gate passed 175 test files / 2,647 tests, strict typecheck, ESLint, optimized Production build, the 72-route manifest, 14/14 release-safety controls, and Ask Magic Mike/NellySelly isolation.
- Final Production deployment `dpl_7uQC5a9xudCNAN1HEAiBWdBZ7iC9` is Ready and owns both canonical Ask Magic Mike aliases. `AI_TIMEOUT_MS=20000` is encrypted and Production-only; the existing `OPENAI_API_KEY` was reused unchanged and never exposed or rotated.
- An authenticated Lead Center administrator generated an advisory for suppressed QA lead `59bba7cf-fe27-42c3-adb6-27b27727e5c7`. The provider-backed result reported mode `openai_responses`, model `gpt-5.6-luna`, 835 input tokens, 964 output tokens, estimated cost `$0.006619`, 7,624 ms latency, and no fallback reason.
- The advisory correctly treated `is_test=true` and `communication_suppressed=true` as controlling constraints, explicitly prohibited call/email/text contact, and left all controlled tools behind human approval. AI sending and AI assignment remained disabled.
- Neon Production durably contains one intelligence row and two Copilot usage rows: the earlier fail-closed provider attempt plus the final provider success. The latest usage row is the successful result above. The lead remained `assigned`, score `83`, with the same assignee and null `last_contacted_at` / `next_follow_up_at`; no assignment, score, stage, task, appointment, message, notification, email, BCC, SMS, Push notification, or consumer action changed.
- Post-deployment checks passed: production smoke 19/19 with two intentional auth/write skips, conversion funnel 15/15, synthetic monitor 6/6 with one intentional authenticated-health skip. Vercel returned no error-level logs from the final deployment timestamp onward. The earlier schema errors at 9:09–9:10 PM predate this deployment and are retained as truthful root-cause evidence.
- Final redacted repository scan passed with 376 commits and no detected secret leak.

### Signed Resend webhook Production acceptance

- Resend webhook `d466d4d9-6837-49ae-9343-86c54c2bd720` is enabled for the canonical `https://www.askmagicmike.com/api/webhooks/email/events` route and the documented eight-event allowlist.
- The provider-issued signing secret is stored only as the Sensitive, Production-scoped Vercel variable `RESEND_WEBHOOK_SECRET`; it was not printed, committed, copied into Preview, or written into evidence.
- Vercel deployment `dpl_5g43rkAatsVi3FHyarZf7Km1jZfG` rejected an invalid signature with HTTP 400 and `invalid_signature`.
- One correctly signed no-PII synthetic `email.sent` payload returned HTTP 200 with `duplicate=false`; exact replay returned HTTP 200 with `duplicate=true`.
- Neon Production contains exactly one row for event ID `msg_phase7_live_acceptance_1786914537362`, with `signature_verified=true`, payload hash `b3e5af1b0f0861316d70c77da0f04db6fac5d9830b3135d33ca00c18b114cd32`, and `processing_status=ignored` because the synthetic provider message ID matched no notification.
- This acceptance proves deployed signature alignment, minimized durable event storage, and replay idempotency. It is not evidence of an actual provider-delivered email. No lead, notification, email, BCC, SMS, Push notification, consumer acknowledgment, or Mike message was created.

- `pnpm release:gate` — PASS: Ask Magic Mike/NellySelly isolation, 14/14
  release-safety checks, 174 test files, 2,643 tests, strict typecheck, ESLint,
  optimized Next.js Production build, and the active-route manifest all pass.
- Route manifest — PASS: 72 active routes and 16 acknowledged root/source
  duplicates. The new routes are the authenticated mock-only sequence processor
  and the canonical signed inbound-SMS webhook.
- `pnpm audit --prod --audit-level high` — PASS: no known Production dependency
  vulnerabilities.
- `gitleaks detect --source . --redact --no-banner` — PASS after final merge:
  372 commits and approximately 11.71 MB scanned; no leaks found.
- The existing encrypted Production `OPENAI_API_KEY` is reused unchanged on the
  canonical Ask Magic Mike Vercel project. It is read only in server code and is
  not copied, rotated, downloaded, logged, committed, or exposed through a
  `NEXT_PUBLIC_*` variable.
- Consumer email, carrier SMS, Mike activation, automatic AI actions, and the
  sequence scheduler remain disabled. No external notification or production
  data mutation was performed by this gate.
- PR `#163` GitHub release gate and Vercel checks passed. Preview deployment
  `dpl_2uuhZkUMuu4qZTQBfw7rMdNd5eG6` is Ready. Authenticated Vercel CLI probes
  returned live 200, ready 200, and home-value 200; the cron processor rejected
  an unauthenticated request with 401; the inbound-SMS webhook rejected an
  unsigned request with 401; and the Copilot mutation remained unavailable in
  the disabled Preview RBAC environment with a truthful 409. No write or
  external provider action occurred.
- PR `#163` merged as `8e328fe9d26efcdba923489b37126c67e89bd62a`.
  Production deployment `dpl_5zYcSWtGquNvi8UTpVTkc6brAtGA` is Ready and owns
  the apex and `www` aliases. Read-only Production verification passed: smoke
  19/19 with two intentional write/auth skips, conversion funnel 15/15,
  synthetic monitor 6/6 with one intentional authenticated-health skip, and no
  error-level Vercel logs for the deployment. No test lead, email, SMS, Push,
  sequence step, database mutation, WordPress change, or NellySelly change was
  made.

## Preview RBAC and secure activation acceptance — 2026-08-14

- Isolated Preview role acceptance passed for administrator, primary lead
  owner, assigned agent, read-only analyst, disabled user, object-level lead
  isolation, logout, and stale-session denial on Vercel deployment
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`.
- The browser/server auth-path mismatch found during live acceptance was fixed;
  all Better Auth surfaces now use `/api/lead-center-auth`.
- Five fictional `example.test` acceptance users are banned and all sessions
  revoked. Neon verification returned five QA users, five banned users, and
  zero active sessions. All fixtures are test-marked and suppressed.
- The one-use Preview bootstrap token and all bootstrap source files were
  removed; the Production bootstrap path remained HTTP 404 throughout.
- Secure password activation/reset now uses an independently gated Resend path,
  exact-origin link validation, one-use 60-minute tokens, non-enumerating UI,
  no BCC, opaque idempotency, and post-reset session revocation.
- Final release gate: 155 test files / 2,566 tests pass; strict typecheck,
  ESLint, 41-page Production build, 60-route manifest, 14/14 safety checks,
  isolation, dependency audit, and whitespace checks pass. No activation email
  or other external notification was sent.
- Final code-bearing Preview `dpl_FE63usgk8JmTYRS4aPyyGPA2euJa` is Ready.
  Authenticated Vercel probes returned live 200, ready 200 with RBAC schema
  ready, all three staff auth/password pages 200, and the removed bootstrap
  route 404. GitHub Node 24 run `31855717441` passed.

## Production RBAC cutover — 2026-08-14

- Additive Push device-label and RBAC migrations were applied in order on Neon
  Production. The Push constraint is present; all six auth tables reported
  ready before users were provisioned.
- PR 143 merged as `10eefde`. Production deployment
  `dpl_46R7PQfBPH8N5BPymTQPmeenfYd5` is Ready and canonical with per-user RBAC
  enabled; the preceding Ready deployment remains the environment rollback.
- Two approved users exist: one administrator and Mike as the linked primary
  lead owner. Mike has no credential/session and received no activation email.
- Brandon activation delivery was confirmed in Gmail from the verified sender
  with no BCC. Acceptance passed: sign-in 200, cookie issued, lead inbox 200,
  reporting 200, user-management 200, sign-out 200, stale session 307.
- The temporary password/cookie were cleared from process memory. A fresh,
  unused 60-minute owner reset link remains in Brandon's inbox for permanent
  password selection.
- Final database state: 2 users, 1 verified user, 1 credential account, 0
  sessions, 1 active reset link, 3 auth audit rows, 0 live leads, 6 suppressed
  test leads, and 0 notification backlog.
- Post-cutover public checks pass: smoke 19/19 (2 intentional protected/write
  skips), funnel 15/15, monitor 9/9, and health ready. No lead, consumer email,
  SMS, Push, social post, DNS, WordPress, or NellySelly change was made.
- A successful auth request exposed a `pg` future-compatibility warning for
  `sslmode=require`; the follow-up hotfix normalizes it to explicit
  `sslmode=verify-full`, preserving the current strong verification behavior.

## WordPress Form 3 production acceptance — 2026-08-14

- Bridge 1.1.0 is active with Form 3 as the only allowlisted form.
- Gravity entry `1549` produced canonical test lead
  `70f63f35-2478-4738-b84c-bc1a89b8482c`, one Resend internal alert, and no
  consumer email or SMS. Gmail confirmed Mike and the hidden audit receipt.
- Provider message ID: `bf31a582-e4a3-45cb-a7f1-5cb89121626f`; outbox status
  `sent`, attempt 1 of 3. Transport authentication passed SPF, DKIM, and DMARC.
- PR #139 fixed non-UUID idempotency replay. PR #140 deployed nested bridge
  click-ID compatibility and active-router listing-safety routes.
- The one incomplete pre-fix replay row was found on the actual production Neon
  branch, marked test/suppressed in a guarded transaction, and given one audit
  record. It has zero notifications and zero analytics events. Nothing was
  deleted and no additional message was sent.
- Complete local verification: 149 test files / 2,547 tests, strict typecheck,
  ESLint, production build, 56-route manifest, release safety 14/14, production
  dependency audit, and 320-commit secret scan all pass.
- Post-deploy public smoke, funnel, health, NellySelly isolation, and synthetic
  listing-safety monitoring pass.

## Brandon phone-registration repair — 2026-08-12

- Vercel production logs for deployment
  `dpl_5cDj7c7QcCPassZvww9mGZzAfeVm` showed repeated HTTP 401 responses at
  `/admin/notifications/phone`; production had no error-level function logs.
  This separated an authentication/session failure from VAPID, Neon, or push
  provider failure.
- The installed web-app manifest previously used that Basic Auth route as its
  `start_url`. The repair uses `/phone-alerts/setup` and a short-lived signed
  HttpOnly cookie specifically limited to Brandon's `copy` role.
- `pnpm run test` — PASS: 144 files, 2,521 tests.
- `pnpm run typecheck` — PASS.
- `pnpm run lint` — PASS.
- `pnpm run build` — PASS; all new setup/API routes compiled as dynamic routes.
- `pnpm run routes:assert` — PASS: 53 active routes and 13 acknowledged
  root/source duplicates.
- `pnpm run release:safety` — PASS: 14 checks, 0 failures.
- `pnpm audit --prod --audit-level high` — PASS: no known production
  vulnerabilities.
- Full `pnpm audit --audit-level high` — FAIL: 18 existing development-only
  advisories (4 moderate, 13 high, 1 critical), led by the Vitest 2.x toolchain.
  No automatic major-version dependency rewrite was mixed into the phone repair.
- Preview deployment `dpl_8aKsdtP1zi3tS1J9C1uprRvNbW9P` — READY. GitHub's
  local release gate and all required Vercel deployment checks pass.
- Non-mutating Preview route proof: invite 200; claim redirect 303; HttpOnly,
  Secure, SameSite=Strict cookie flags present; authenticated Brandon-only setup
  200; missing-CSRF request 403; malformed UUID 400; readiness 200 with
  `phone_setup_configured=true`. No valid subscription payload or test-send
  request was submitted.
- No production environment, deployment, database row, lead, email, push, or SMS
  was changed or sent during this repair and Preview verification phase.

### Operator-flow hardening

- Added an authenticated admin control for generating/copying/sharing the scoped
  setup link; no secret is passed to client code or persisted in Web Storage.
- Added route-level Basic Auth verification under `/admin/api/phone-alerts/invite`
  as defense in depth against a future middleware matcher regression.
- Client response validation rejects a returned invite unless it is same-origin,
  uses the exact claim path, contains a token, and has a future expiry.
- Claim responses now apply `no-store`, `no-referrer`, and `X-Robots-Tag:
  noindex, nofollow, noarchive` on both success and failure paths. Setup metadata
  is also no-index and no-referrer.
- Removed the post-claim clean-URL copy action because it could not transfer the
  signed session into Safari. Instructions now preserve the original secure link
  for Safari handoff.
- Verification after hardening: 144 test files / 2,525 tests pass; strict
  typecheck, lint, production build, 54-route manifest, 14/14 release-safety
  checks, production dependency audit, and whitespace checks pass.
- Enhanced operator-flow Preview `dpl_Bo8ojFMzf27bjqWX9Q2Qas11XxVy` is Ready.
  The branch-scoped Sensitive signing key was replaced through Vercel and the
  deployment proved: unauthenticated invite 401; authenticated invite 200;
  signed claim 303; scoped setup page 200; missing-session subscription request
  401; and a valid-session malformed payload 400 before persistence. Cookie
  flags and the no-store/no-referrer/no-index headers passed. No subscription,
  notification, lead, external message, or database mutation was created.
- Authenticated Vercel project-domain inspection confirms `ask-magic-mike`
  exclusively owns `askmagicmike.com` and `www.askmagicmike.com`; the bridge and
  legacy Ask projects have only `.vercel.app` domains, while NellySelly owns
  only its distinct NellySelly hostnames.

## Production notification health recheck — 2026-08-12

- Production Neon project `bitter-star-20214385`, branch
  `br-round-base-auh6h2wd` (`production`), was inspected using read-only,
  aggregate queries. No lead, notification, or subscription row was changed.
- Four lead records exist and all four are `is_test=true`; live-prospect count
  is zero. The records remain excluded from production KPIs.
- Notification history is test-only: two delivered/sent records, two historic
  permanent failures from the superseded invalid Resend key, and two intentional
  disabled-mode skips. There is no pending or retry backlog.
- Production health reports PostgreSQL ready, email enabled, Web Push enabled,
  the subscription table present, and complete VAPID configuration. No staff
  device is registered yet, so phone delivery cannot begin until each owner
  grants browser notification permission on the physical device.
- Public lead-pipe health passed all nine checked routes. Protected phone setup,
  push-subscription API, and Lead Center routes each returned HTTP 401 without
  credentials, confirming the server-side admin boundary.
- The phone setup now distinguishes missing server configuration from browser
  incompatibility and does not request permission on unsupported clients.
- The stale Vercel Preview database credential was traced to a deleted Neon
  branch. A new persistent Neon branch named `preview`
  (`br-morning-paper-aun3378r`) was forked from production, and only Vercel's
  Preview-scoped `DATABASE_URL` was replaced through the secure environment
  variable interface. No credential value was logged or committed.
- Preview deployment `dpl_8em8uYm1JxA7oSbCiMknf7vrew5W` is Ready at
  `https://ask-magic-mike-7c5ejyz5k-eyes-up-industries.vercel.app`.
  `/api/health/live` and `/api/health/ready` report healthy PostgreSQL capture;
  outbound preview email and push remain disabled, and the protected phone page
  returns HTTP 401 without admin credentials.

## Dual internal SMS/MMS upgrade — 2026-08-11

- Focused Vitest covers urgency selection, QA suppression, minimal SMS content,
  Twilio form encoding, the same-origin MMS allowlist, status callback URL, and
  provider message ID parsing.
- TypeScript strict checking passed after implementation.
- No live SMS was sent. Production had no Twilio credentials at audit time, so
  carrier delivery remains an explicit activation blocker.
- Three AI-generated urgency assets were normalized to 1120x350 PNG and contain
  no consumer PII or synthetic lead facts.

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

## 2026-08-14 privileged-route hardening evidence

No lead, email, SMS, push notification, WordPress update, database mutation, or
production deployment was performed for this verification.

- Focused admin push, passwordless phone setup, and appointment security tests:
  PASS — 4 files / 18 tests.
- Full Vitest suite: PASS — 148 files / 2,538 tests.
- Strict typecheck and ESLint: PASS.
- Production build and route manifest: PASS — 54 active routes and 13 reviewed
  root/`src` duplicates.
- Release safety and Ask Magic Mike isolation: PASS — 14/14 and PASS.
- Browser E2E: PASS — 13/13 Chromium tests; admin fails closed anonymously.
- Production dependency audit: PASS — no known vulnerabilities.
- Gitleaks: PASS — 315 commits scanned with redaction, no leaks.
- `git diff --check`: PASS.

The tests prove route-level Basic Auth for push subscription list/register/remove
and push test delivery, exact-origin protection for mutation, omission of push
endpoint secrets from list responses, and pre-persistence appointment throttling.
Read-only Preview is rejected before the durable limiter can write a bucket.

Canonical Node 24 Preview `dpl_BZNVfpM6yFxMsNgve9mu2aKSSVm2` reached Ready.
Authenticated probes returned 200 for the root and both public health endpoints;
anonymous Admin and push API probes returned 401. A synthetic appointment POST
returned 503 in read-only Preview before persistence or rate-limit storage.
GitHub's independent release gate and all Vercel checks passed.

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

### Approved production cutover and controlled QA — 2026-08-11 16:33 America/New_York

- PR `#122` merged to `main` as `38639bc873dda5bd51c261d6f340a84dd9ecef03`.
- Production-target deployment `dpl_4yacS3NeepmZNp4AnamDF6oPA5GW` was built
  with public domain assignment held back. Fifteen public/legal/health routes
  returned HTTP 200, `/admin/leads` returned 401 without authentication, and
  protected health reported production Neon reachable with the complete lead
  schema and notification delivery enabled.
- The first isolated-hostname form attempt failed closed with `origin not
  approved`; it created no lead and sent no message. The candidate was then
  promoted to the canonical domains with prior deployment
  `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt` retained as rollback.
- A controlled public home-value submission used the exact marker
  `INTERNAL QA — DO NOT CONTACT`, synthetic contact data, `is_test=true`, and
  `internal_qa / qa / production_cutover` attribution. Lead ID:
  `bbed9a2d-4619-4c18-9298-5167a9694f73`.
- The deterministic score is 90. Exact subject:
  `[TEST] HOME VALUE LEAD | internal_qa | Home Value | INTERNAL QA — DO NOT CONTACT — 999 Verification Way, Wilson, NC | INTERNAL QA | Score 90`.
- The canonical notification record is `sent`, provider `resend`, attempt `1/3`.
  The configured hidden BCC is passed through the provider request without
  rendering its value. Consumer acknowledgment and SMS were suppressed for the
  test record.
- Post-cutover inspection found the protected notification view correctly used
  Neon while the Lead Center inbox still selected the retired Supabase read
  adapter. The follow-up patch makes inbox/detail reads provider-neutral and
  exposes provider message IDs in the protected notification view.

### Lead Center follow-up deployment — 2026-08-11

- PR `#123` passed the Node 20 release gate, including 2,489 unit tests,
  typecheck, lint, build, route-manifest verification, release report, and
  launch-authority report.
- Local verification passed: production build; 13/13 Playwright tests; 14/14
  release safety checks; route manifest; dependency audit; and staged
  high-confidence secret scan.
- Isolated production-target deployment `dpl_BGkVcCMFgeZQgnteRxRUomeJoyRv`
  passed before promotion: Neon reachable and schema ready; Resend, provider
  delivery, and hidden BCC configured; QA lead present in inbox/detail; provider
  message ID rendered without recipient references; anonymous admin returned 401.
- Post-promotion, fifteen required public/legal/health routes returned HTTP 200.
- Audit mailbox search matched the controlled QA lead ID and `[TEST] HOME VALUE
  LEAD` subject. Provider message ID is
  `fe5ab262-6dd4-405b-839b-0da71ab996fa`; canonical outbox status remains sent,
  provider Resend, attempt 1/3.
- WordPress canonical bridge installation succeeded and the health page reports
  `Shadow only — no forwarding` with secrets hidden. A 2026-08-14 re-audit found
  shadow-only observations for forms 6 and 7 and no forwarding attempts.
- Our Town homepage, `/ask-mike/`, and Mike's agent profile remained HTTP 200
  after activation.

## Phase 9 launch-authority and buyer-discovery candidate — 2026-08-21

- Branch: `codex/phase9-launch-authority-neon-20260821`; base production merge:
  `5335697edf31eed0b8a38cd0295a4f5e7d501a3e` (PR `#181`).
- Scope is reuse-first: the existing `/buy` funnel is surfaced in the active
  Black Diamond desktop navigation and homepage path grid. The canonical app,
  lead API, Neon database, Better Auth Lead Center, WordPress bridge, and
  notification systems were not duplicated or replaced.
- Validation ran with Node `24.18.0`, matching the repository runtime contract:
  - Vitest: `197` files / `2,797` tests passed.
  - strict TypeScript: PASS.
  - ESLint: PASS.
  - Next.js `15.5.21` production build: PASS; `52` static pages generated.
  - release-safety scan: `14/14` PASS across `531` deployable files.
  - route-aware launch doctor: `27` PASS / `0` FAIL / `12` local env skips.
  - launch-authority report: `26` PASS / `0` FAIL / `12` local owner-env skips.
  - public CTA check: `24/24` PASS.
  - Ask Magic Mike / NellySelly isolation: PASS.
- Desktop and 390×844 mobile visual inspection confirmed the retained homepage,
  five-path grid, buyer discovery surface, form controls, exact consent version,
  and legal copy render without clipping or horizontal overflow:
  - `output/phase9/visual-qa/home-desktop-1440.png`
  - `output/phase9/visual-qa/buyer-desktop-1440.png`
  - `output/phase9/visual-qa/home-mobile-390.png`
  - `output/phase9/visual-qa/home-paths-mobile-390.png`
  - `output/phase9/visual-qa/buyer-mobile-390-top.png`
  - `output/phase9/visual-qa/buyer-mobile-390-consent.png`
- A production build served on unapproved `localhost` correctly refused the
  analytics event with HTTP `403`; that is the expected origin-allowlist
  boundary, not a rendering failure. The first exact Preview probe then exposed
  that Vercel Preview also sets `NODE_ENV=production`. The boundary now admits
  only the exact server-provided `VERCEL_URL` and `VERCEL_BRANCH_URL` when
  `VERCEL_ENV=preview`; arbitrary `vercel.app` origins and every Production
  metadata override remain denied. Six focused origin-boundary tests cover the
  behavior.
- Replacement Preview `dpl_HWa3HhxKPvatzqaGS3148PfdC5AV` was `READY` on Node
  24 for exact code head `5c35a047418d912f166d4c029168a7211c1c1c2d`.
  Protected GETs returned 200 for `/`, `/buy`, `/sell`, `/home-value`, `/plan`,
  `/widget/v1`, liveness/readiness, robots, and sitemap; anonymous `/admin`,
  `/admin/leads`, and `/admin/growth` returned 401. Preview health reported
  Neon ready with notification delivery and email disabled. A malformed JSON
  request from the exact branch origin reached event validation and returned
  400 `Invalid event` instead of the prior origin 403; no valid event or
  persistence call was issued. Signed-in browser inspection found the expected
  homepage/buyer DOM, consent version `amm_contact_v2`, legal copy, and zero
  console messages.
- No production deployment, database mutation, WordPress edit, form submission,
  lead creation, or email/SMS/push delivery occurred during this candidate QA.
