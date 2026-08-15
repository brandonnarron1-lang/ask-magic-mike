# Implementation Status

Updated 2026-08-14.

## Full-access continuation — 2026-08-14

- Isolated Preview RBAC acceptance is complete on Vercel deployment
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct` and Neon branch
  `br-morning-paper-aun3378r`.
- A real path mismatch between the Better Auth server and browser client was
  found by live acceptance and fixed at commit `9c6ed47`.
- Administrator, primary-owner, approved-agent, analyst, disabled-user,
  object-level assignment isolation, logout/revocation, and Production-denial
  probes passed. Outbound notifications remained disabled.
- Cleanup verified five banned `example.test` users and zero active Preview
  sessions. The one-use bootstrap token and temporary bootstrap code were
  removed.
- Production RBAC is active after the additive migration, two-user provisioning,
  and administrator acceptance. Brandon passed the complete session matrix;
  Mike is linked to the canonical primary routing row but remains dormant.
- Added a secure per-user account activation/reset path at
  `/lead-center-password-help` and `/lead-center-set-password`. It uses the
  existing authenticated Resend adapter behind a dedicated server-only gate,
  validates the exact auth origin, issues one-use 60-minute links, avoids
  account enumeration and BCC, and revokes existing sessions after reset. No
  activation messages are delivery-verified; the newest unused owner link is
  reserved for Brandon's permanent password choice.

## Phase 3 staged operations release - 2026-08-14

- PR 143 closes active Production reporting and Lead Center mutations to Neon
  only and adds audited actor propagation, exact-host Lead Center subdomain
  handling, durable SLA-cron persistence, and human-readable Web Push device
  labels.
- The RBAC and Push device-label migrations passed on Preview, were applied in
  order on Production, and were followed by a verified deployment and rollback
  checkpoint.
- Form 7 entry 1550 is preserved as `GENUINE - CONSENT RESTRICTED OR UNCLEAR`;
  it was not contacted, marketed, marked test, or forwarded to Neon.
- Form 1 and Form 6 audits stopped before activation because neither stores an
  approved consent choice/version or attribution. Form 3 remains the only
  canonical WordPress form.
- Production read-only evidence remains healthy: 0 live leads, 6 suppressed
  tests, 0 unsuppressed tests, 0 queue/failures, public funnel 15/15, monitor
  9/9, and no error-level Vercel logs in the inspected hour.
- Final staged validation passes 155 test files / 2,566 tests, strict typecheck,
  lint, 41-page build, 60-route manifest, 14/14 safety checks, 13/13 Chromium
  tests, dependency audit, 326-commit secret scan, and isolation.
- Seven redacted operations PDFs are complete. Compliant refreshed `.pptx` and
  `.xlsx` artifacts remain blocked because the required bundled artifact
  dependency loader is unavailable; stale workbooks were not relabeled.

## Brandon phone-registration repair — 2026-08-12

- Production logs isolated the failure to repeated HTTP 401 responses on the
  Basic Auth-protected phone setup route. The former manifest also reopened that
  same admin route from the iPhone Home Screen app.
- A reuse-first repair preserves the existing Web Push provider, VAPID keys,
  Neon subscription table, lead outbox, routing, and admin screen. It adds only
  a short-lived Brandon copy-registration session and does not create a second
  notification system.
- The signed setup session is role-fixed to `copy`, expires in 5–30 minutes,
  uses an HttpOnly Secure SameSite=Strict cookie, and cannot view leads, access
  admin APIs, register Mike's primary role, or change routing.
- Registration and test routes enforce exact same-origin requests, a dedicated
  CSRF header, durable rate limiting, strict runtime validation, and server-side
  role enforcement. The QA push is user-triggered, labeled `[TEST]`, and creates
  no lead or KPI event.
- Browser readiness is now computed independently of the admin device-list API,
  so a list failure no longer leaves the enable button incorrectly disabled.
- The protected admin screen now includes the missing operator workflow: generate,
  replace, copy, or invoke the native share sheet for a 20-minute Brandon-only
  setup link. The browser never reads or stores `ADMIN_SECRET`; the new admin
  route revalidates Basic Auth server-side in addition to middleware protection.
- Setup pages and claim redirects are no-index, no-referrer, and no-store. The
  former tokenless "copy setup link" dead-end was removed; Safari handoff points
  back to the original secure message so the claim token is preserved.
- Local verification: 144 test files / 2,525 tests pass; strict typecheck, lint,
  production build, 54-route manifest, 14/14 release-safety checks, and
  production dependency audit pass. The full development audit still reports
  18 advisories in test/lint tooling and is tracked separately from this repair.
- Preview deployment `dpl_8aKsdtP1zi3tS1J9C1uprRvNbW9P` is Ready and its
  branch-scoped Sensitive signing key is configured. The invite, claim, cookie,
  Brandon-only page, CSRF guard, malformed-payload guard, and readiness endpoint
  pass without creating a subscription or sending a notification.
- Enhanced operator-flow Preview `dpl_Bo8ojFMzf27bjqWX9Q2Qas11XxVy` is Ready.
  Protected invite, signed claim, scoped cookie/session, privacy headers, and
  fail-closed subscription validation pass without a write or external send.
- Authenticated Vercel project-domain inspection confirms the canonical project
  exclusively owns both Ask Magic Mike custom hostnames. Legacy Ask projects and
  NellySelly projects have no Ask Magic Mike custom-domain attachment.
- Production activation remains gated. Production needs a separately generated
  `PHONE_SETUP_SIGNING_SECRET` before this version can report ready.

## Complete locally or evidenced

- Canonical repo and Vercel project identified; rescue branch created.
- Both Ask hostnames serve the correct Ask Magic Mike project; no NellySelly marker
  found in live HTML.
- Our Town remains live WordPress/SEO surface; live phone evidence preserved.
- Canonical Neon lead capture, attribution, dedupe/fingerprint, routing, audit,
  AdminOps inbox/detail, and notification outbox exist in the production codebase.
- Existing release-rehearsal work is preserved.
- Production is deployed on Neon Free PostgreSQL. Public capture, durable rate
  limiting, attribution, scoring, routing, audit, consent, notification outbox,
  and the protected Admin Lead Center are live.
- The canonical `www` hostname is live and the apex redirects permanently.
- Production sender DNS and a restricted Resend sending key are configured and
  verified. The final public-form QA alert reached provider `delivered` state and
  the approved audit mailbox contains the hidden copy.
- Runtime declarations, CI, and Vercel are aligned on Node 24. Production
  readiness includes the enabled Web Push schema and provider configuration,
  without exposing VAPID key values.
- Canonical Vercel automatic Git deployments are restored. The stale
  `exit 0` Ignored Build Step was cleared after a forced, verified production
  release; rollback is the immediately preceding READY deployment.

## Same-day changes in this worktree

- Add required route aliases and public buyer/renter/open-house/general/widget surfaces.
- Add local privacy, terms, accessibility, and contact routes linked from the public footer.
- Add consent/test/attribution/click-ID fields and additive migration contract.
- Add internal Mike+BCC outbox delivery and consent-gated consumer acknowledgment
  using the existing provider/retry boundary.
- Add safe event capture, source-preserving widget origin checks, health script, and
  required operating documentation.
- Add deterministic internal visual-email template selection: `hot_priority`
  (80–100), `active_assignment` (60–79), `new_lead` (<60), and `qa_test`.
  The supplied cards are creative references only; their fictional sample lead
  details are never sent. The generated asset is decorative, and all lead facts
  remain accessible HTML/text.
- Wire internal live-lead SMS through the canonical outbox for primary and copy
  recipients, with separate idempotency/retry records and hard QA suppression.
  Twilio credentials and a registered sender remain required before production
  activation. Optional MMS uses static, PII-free urgency art. Video remains
  outside transactional notifications because it adds latency without routing
  value.
- Add the read-only `pnpm amm:health:lead-pipe` monitor and protected retry endpoint
  for `lead_alert` / `consumer_ack` outbox records.

## Neon preview recovery — 2026-08-11

- An isolated Neon Free preview branch, `amm-lead-pipe-preview`, was created in
  the owner-controlled project and received the full canonical migration chain.
  The production Neon branch remains untouched.
- The application now selects a direct, server-only Neon Postgres adapter when
  `DATABASE_URL` is configured. Public capture, appointment requests, the
  protected AdminOps read/mutation functions, reporting reads, and the lead
  notification outbox use that one adapter/database; no browser receives a
  database credential.
- The notification outbox has a Neon repository with idempotency-key conflict
  handling, claim-before-send status updates, bounded retries, provider message
  IDs, and protected recipient references. Email/SMS remain disabled.
- `DATABASE_URL` is stored as a Sensitive, Preview-only Vercel variable. The
  database role credential was rotated and transferred without being printed,
  committed, or written to a local artifact.
- Preview readiness, durable test capture, consent persistence, deterministic
  score/routing, skipped notification outbox records, test suppression, and
  UUID idempotent replay are proven on deployment
  `dpl_EwjyYzJmKCiq1LjzyiJX24zFS3dX`.

## Combined-system audit — 2026-08-11

- Authenticated WordPress inspection found seven active Gravity Forms with durable
  local entry history and one admin notification each. None has a native Consent
  field. Exact field mappings and entry counts are recorded in
  `COMBINED_SYSTEM_AUDIT_2026-08-11.md`.
- The live AMM Connector is configured for the canonical Ask Magic Mike app; tracked
  CTAs are present on the homepage, home-value page, and seller page. Existing
  forms and legacy plugin records remain unchanged.
- The legacy WordPress AMM plugin remains a competing local lead/`wp_mail` silo and
  must be reconciled, not expanded.
- The hourly SLA cron and protected admin health route now use Neon directly.
  Preview mutation safety requires both `VERCEL_ENV=preview` and an explicit
  `DATABASE_ENV=preview`; stale Supabase project-ref variables no longer control
  this boundary. A live persisted cron breach remains a production QA gate.
- The server analytics ledger and public event endpoint now write through one
  privacy-minimized Neon repository. PII-shaped property keys and non-scalar
  payloads are dropped before insertion, and raw IP is not written.
- A signed Gravity Forms bridge package exists in disabled shadow-safe mode. It
  maps only approved form IDs 1–7, signs exact request bodies, uses deterministic
  idempotency, retries three times, and does not send a second WordPress email.
- Current `/admin` remains shared Basic Auth; per-user role-based Hub authentication
  is still required.
- No WordPress form/notification/plugin/page, DNS, database, environment, deployment,
  or external message was changed during this audit.

## Reuse-first hardening candidate — 2026-08-11

- Branch: `codex/amm-reuse-first-hardening-20260811`.
- Existing black-diamond public visuals were retained after rendered inspection of
  `/`, `/home-value`, and `/buy`; no redesign or synthetic replacement imagery was
  warranted. Evidence is under `output/product-design-audit/2026-08-11/`.
- Next.js was patched within 15.5, Node is pinned to 20.x, vulnerable transitive
  packages are overridden, and `pnpm audit --prod` reports zero known issues.
- Public chat now has exact-origin validation, bounded input/body size, a durable
  Neon limiter, provider timeout, no-store response policy, and safe correlation
  handling.
- Admin health no longer accepts query-string secrets; middleware Basic comparison
  is Edge-safe and digest-based. Shared Basic Auth remains the only unresolved
  high-traffic identity/RBAC limitation.
- Verification: 137 Vitest files / 2,488 tests pass; 13/13 browser E2E tests pass;
  lint, strict typecheck, production build, 43-route manifest, 14/14 release-safety
  checks, dependency audit, whitespace check, and 319-commit gitleaks scan pass.
- Non-production Vercel preview `dpl_C5Rt9Wssh4jGaqo3GHQyTs7a9R34` is READY at
  `ask-magic-mike-il5455ptk-eyes-up-industries.vercel.app`; core public routes and
  both health endpoints return 200 with delivery channels disabled.

## Database recovery decision

The owner reported that the Supabase project has outstanding invoices and no
funds are available to restore it. `FREE_DATABASE_RECOVERY_PLAN.md` selected
Neon Free PostgreSQL. Both preview and production Neon branches now have the
canonical schema; production health and public durable capture pass. No Supabase
historic-data mutation or copy was performed.

The current production deployment serves all required public routes, robots,
sitemap, health endpoints, widget, and legal pages. Prior WordPress inspection
identified the relevant form area, but the current connector configuration and
duplicate-notification behavior still require authenticated confirmation before
any bridge activation or shadow-mode test.

## Production cutover — 2026-08-11

- The reuse-first candidate was merged through PR `#122` and promoted as Vercel
  deployment `dpl_4yacS3NeepmZNp4AnamDF6oPA5GW` after production-environment
  route, authorization, database, migration, and health checks passed.
- A canonical-hostname QA form submission created one test lead, one internal
  alert, and no consumer acknowledgment. The Resend outbox row is sent on the
  first attempt; the hidden audit BCC remains configured and undisclosed.
- The Lead Center now selects Neon for inbox and detail reads when `DATABASE_URL`
  is present. Supabase remains a compatibility fallback only.
- The notification dashboard now displays the provider message ID needed for
  delivery reconciliation without exposing recipient addresses.

## Production follow-up — PR #123

- PR `#123` merged as `55dec0c95bf18cc056cb09955c44e8180a450466`.
- Production deployment `dpl_BGkVcCMFgeZQgnteRxRUomeJoyRv` is canonical and
  serves all required public, legal, widget, sitemap, and health routes.
- Authenticated Lead Center inbox and detail reads now show canonical Neon data;
  an anonymous request receives HTTP 401.
- Production health reports Neon reachable, lead schema ready, Resend enabled,
  provider delivery enabled, and hidden BCC configuration present.
- The approved audit mailbox contains the controlled QA lead ID and `[TEST]`
  alert. Provider message ID: `fe5ab262-6dd4-405b-839b-0da71ab996fa`.
- The Vercel automation bypass credential was rotated, the repository Actions
  secret was updated, and superseded bypass values were revoked.

## WordPress reuse-first status

- The existing Ask Magic Mike Connector is active, points to
  `https://www.askmagicmike.com`, uses `/value` and `/widget/v1`, and keeps the
  site-wide floating launcher disabled.
- The existing WordPress Ask Magic Mike system has six historical records, four
  marked uncontacted. They remain in place pending a reviewed dedupe/import plan.
- Ask Magic Mike Canonical Lead Bridge `1.1.0` is installed with matching HMAC
  configuration and only Home Value Form 3 allowlisted. Forms 1, 2, and 4–7
  remain blocked. Form 3 entry 1549 forwarded to canonical lead
  `70f63f35-2478-4738-b84c-bc1a89b8482c`; one canonical `[TEST]` alert reached
  Mike and the hidden audit inbox while consumer email and SMS were suppressed.
- The exact duplicate Form 3 Gravity `Admin Notification` is Inactive. Other
  forms and notifications were not changed.
- PR #139 / merge `2a9ee23` corrected Neon idempotency for WordPress-style keys;
  production replay returns the original lead without a second canonical email.
  Additional form activation remains held for final Neon QA-row reconciliation.
- The follow-up release candidate normalizes nested WordPress click IDs and
  restores `/api/listings/search` plus `/api/listings/[id]` in the active App
  Router as public-safe degraded compatibility surfaces. Our Town
  Properties/FlexMLS remains the authoritative live listing source.
- PR #140 merged as `178bdefd` and deployed Ready as
  `dpl_3AVXKtKCuiqytNqNQXvSKF4YBPCL`. Production reconciliation on Neon branch
  `br-round-base-auh6h2wd` found the one incomplete pre-fix QA replay row,
  marked it test/suppressed, and recorded a `lead.qa_suppressed` audit event.
  The row has no notification or analytics side effects; no data was deleted.
  Form 3 is accepted as the only allowlisted WordPress form.

## 2026-08-14 security polish

- Admin Web Push subscription list/register/remove and test-delivery handlers
  now enforce route-level Basic Auth as defense in depth behind middleware.
- Public appointment follow-up requests now use a dedicated canonical Neon rate
  limiter before parsing or persistence.
- The complete privileged route inventory found no unprotected `/api/admin`
  handler and no remaining middleware-only `/admin/api` handler.
- Full local release verification is green: 2,539 tests, strict typecheck, lint,
  production build/54-route manifest, 14/14 safety checks, 13/13 browser tests,
  zero known dependency vulnerabilities, and no gitleaks findings.
- PR #137 merged and is production on deployment
  `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp`; post-release smoke, funnel, health,
  authorization, isolation, and error-log checks passed.
- Vitest/coverage upgraded to 3.2.6, Vite to 6.4.3, and vulnerable development
  dependency paths pinned to compatible patched versions.
