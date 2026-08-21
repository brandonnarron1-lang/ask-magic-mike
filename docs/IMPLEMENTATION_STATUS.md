# Implementation Status

Updated 2026-08-21.

## Phase 9 first-human-response intelligence — Production 2026-08-21

- PR #181 is merged at
  `5335697edf31eed0b8a38cd0295a4f5e7d501a3e` and is live on Vercel deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM` (`READY`). The exact Git commit has a
  successful Vercel status.
- Canonical Neon migration `20260820013000` is applied exactly once on
  Production branch `br-round-base-auh6h2wd`. Its immutable source SHA is
  `c364c8cc33428a187bcbcf2bdfcc142f3bc0422410911076abf04307bf28459e`.
- Database postflight reverified table, RLS, functions, roles, privileges, and
  migration ledger. Lead/audit counts remain 6/9, all six leads are suppressed
  QA records, and zero historical response backfills were expected or created.
- Canonical monitor passed 9/9; apex redirects 308 to `www`; public funnel and
  health routes return 200; anonymous Lead Center routes remain closed; no
  Vercel error events were found in the inspected post-release window.
- The pre-cutover custom backup remains retained with mode 600, validated
  restore contents, and SHA-256
  `3627b72108d59a56fc937a6b1306706df14a08ae3439a5c52e8b13141e9bc05f`.
- No lead, email, SMS, push, WordPress publication, or consumer acknowledgment
  was created by the release. Authenticated visual acceptance of `/admin/growth`
  remains pending a fresh operator login; authentication will not be bypassed.

### Candidate history retained below

- Reuse-first audit proved that mutable `last_contacted_at` cannot support the
  required median/P75/P90 first-human-response KPI.
- Candidate branch `codex/phase9-first-response-intelligence-20260820`
  adds one server-only, one-row-per-lead response milestone, immutable audit
  evidence, lifecycle v3 wrapper, and protected operator “record now” action.
- Growth reporting adds milestone coverage/sample size and P50/P75/P90 by
  source/campaign, lead type, and response owner. Response-owner attribution
  uses the server-resolved responder first, then the response-time assignment
  snapshot; it never credits today's mutable owner. Small samples are visibly
  labeled, and test/suppressed rows remain excluded.
- Historical backfill accepts only explicit `lead.lifecycle_changed` contact
  audits; mutable legacy contact timestamps are not promoted to evidence, and
  unavailable historical assignment is left unattributed rather than invented.
- PR #180 is complete in Production at merge commit
  `42f80b209d5d5adc984c1d8b439c7fa830d015e6`, Vercel deployment
  `dpl_2PQoDZLHc562SBEY7px91CAEUrin`, with its outcome migration, validated
  backup, postflight, canonical-host, health, and identity-isolation checks
  passed.
- PR #181 was refreshed on that exact `main` baseline at
  `99fac18df16237ada26f65384be390e331df9f59`. Node 24 CI run `32422016242`
  passed in 2m15s and Vercel Preview `dpl_kEtBPF8LS52kgG1LWE2ooaYZhJgT` is
  Ready. Its refreshed local gate passed 193 files / 2,764 tests, strict
  typecheck, lint, build, and the 78-route manifest before the additional
  cutover hardening.
- A canonical-Neon role-shape replay then applied both stacked migrations twice
  with `anon` and `authenticated` absent. All three protected functions ran as
  `service_role`, public function/table access remained denied, both PostgreSQL
  contracts passed, and no synthetic rows escaped their rollback transactions.
- Added a dedicated fail-closed PR #181 cutover runner with immutable migration
  hash, exact approval interlock, canonical owner/endpoint checks, TLS/channel
  binding, required-schema and role checks, advisory and write-boundary locks,
  validated mode-600 backup, one transaction, migration-ledger insertion, and
  source/backfill/privilege postconditions. Focused runner/migration suites pass
  3 files / 23 tests.
- A real PostgreSQL 18.3 rehearsal applied all 30 prerequisites, removed the
  optional browser roles, applied PR #180 first, and then executed the new
  runner. One suppressed synthetic contact audit produced one exact milestone;
  every postcondition passed, the custom backup validated at 584 restore
  entries, the service-role contract passed, and disposable state was removed.
- The final hardened local release gate passes system isolation, 14/14 release
  safety checks, 195 test files / 2,783 tests, strict typecheck, full lint,
  the Next.js 15.5.21 production build, and the 78-route manifest. Production
  dependencies report no known vulnerabilities, and the full 454-commit Git
  history reports no secret leaks.
- Hardened implementation commit
  `21f0d127064393daf4029240fb45398c1f84b2fc` passes exact-head Node 24 CI run
  `32426414466`. Vercel Preview `dpl_F8u75ymqEJzpFVPfBvvyktWCRiDL` is Ready
  on Node 24 and passes health, public-route, anonymous-admin-denial,
  desktop/mobile rendering, console, and Ask Magic Mike/NellySelly isolation
  checks without a database write or external send.
- The fail-closed read-only Production preflight passes against canonical Neon
  project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, unpooled owner endpoint
  `ep-proud-bonus-autwv60g`. All prerequisite, schema, role, privilege, source
  baseline, and target-absence checks are true; 6 leads and 9 audit rows remain
  untouched, with 0 eligible historical response backfills.
- The statements below describe pre-release candidate evidence. They are
  retained for traceability and are superseded by the Production result above.

## Phase 9 operating-intelligence outcome seam — 2026-08-19

- Canonical Production is `main` commit
  `42f80b209d5d5adc984c1d8b439c7fa830d015e6`, Vercel deployment
  `dpl_2PQoDZLHc562SBEY7px91CAEUrin`; public, health, canonical-domain,
  anonymous-admin-denial, and system-isolation checks pass.
- Reuse-first audit found that the existing Growth command center reads
  `lead_outcomes`, but ordinary Lead Center lifecycle actions did not write
  canonical outcomes.
- Candidate branch `codex/phase9-operating-intelligence-20260819` adds one
  additive v2 lifecycle RPC that commits lead state, audit, and deterministic
  outcome together. Existing v1 remains the application rollback boundary.
- Optional closed revenue is restricted by the existing
  `lead:record_revenue` permission and explicitly means actual brokerage
  revenue—not sale price, list price, estimated value, or projected commission.
- The complete migration chain and executable outcome contract pass on
  disposable PostgreSQL 17. The final local release gate passes 193 test files
  / 2,763 tests, strict typecheck, lint, build, 14/14 safety checks, and
  78-route manifest verification. The prior candidate also has independent
  Node 24 CI proof at run `32321701327`; the hardened head requires a fresh run
  after push.
- A canonical-Neon-shape rehearsal found and fixed two pre-Production defects:
  optional `anon`/`authenticated` roles no longer gate migration success, and
  same-state revenue replay now preserves the original actor/audit evidence.
  The revised migration applied twice with those roles absent, executed v2 as
  `service_role`, kept backfill status invariant, prevented duplicates, and
  preserved v1 application rollback compatibility.
- Added a fail-closed Production cutover runner with immutable migration hash,
  exact approval interlock, canonical unpooled Neon identity, TLS/channel
  binding enforcement, required-schema and least-privilege checks, advisory
  and write-boundary locks, validated mode-600 custom backup, one transaction,
  migration-ledger write, and fail-closed postcondition verification. Eleven unit
  contracts and a real PostgreSQL 18 synthetic rehearsal pass. The rehearsal
  proved concurrent-run rejection, weakened-role rejection, complete rollback,
  deterministic backfill, and a rolled-back non-idempotent `service_role`
  transition that returned both audit and outcome IDs. Production was not
  contacted.
- PR #180 merged after exact-head CI and Preview proof. Its pinned migration ran
  against canonical Neon with a validated custom backup, one guarded
  transaction, and fail-closed postflight checks. The exact merge commit then
  deployed successfully, both Ask Magic Mike hostnames served only the correct
  identity, and the anonymous Growth boundary remained closed.

## Phase 9 Production operating checkpoint — 2026-08-19 (superseded)

- At this historical checkpoint, Production was `main` commit
  `f2aff2b802cda3fd9c49ab80b9e379eb9c152913` on Vercel deployment
  `dpl_FG54FQtKQqP8pqMmpe79BCUmdWJT`. It is superseded by the verified PR #180
  Production release documented above.
- Read-only Production smoke and funnel verification remain green. No email,
  SMS, push, call, database write, lead creation, or public publication was
  triggered by this checkpoint.
- PR `#177` is first in the remaining cumulative sequence. It contains the
  commercial-email compliance renderer hardening and retains its own exact
  Production approval gate.
- PR `#170` has been refreshed on the canonical Production baseline. It adds the
  protected, read-only `/admin/distribution` Owned Demand Command and counts only
  exact latest-touch source, medium, campaign, and placement matches. It does not
  authorize publication, messaging, spend, or a database mutation.
- PR `#179` remains a separate iOS phone-alert installation handoff. Physical
  enrollment and a test alert remain separate state changes.
- PR `#173` remains separately staged for the device-private `/plan` Review
  Planner; PR `#172` must be refreshed later as a read-only Database Revival
  candidate.
- The approval phrase recorded at that checkpoint was:
  `APPROVE PHASE 9 COMMERCIAL EMAIL COMPLIANCE MERGE AND PRODUCTION DEPLOYMENT`.
  PR `#170` separately requires
  `APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT` after
  the preceding Production release is verified.

## Phase 6 Production schema acceptance — 2026-08-15

- Applied `20260815193000_phase6_ai_messaging.sql` to canonical Neon Production
  branch `br-round-base-auh6h2wd` in one transaction after isolated Preview
  acceptance and PR 154 merge.
- Verified 7/7 new tables, 7/7 RLS, no grants to
  `PUBLIC`/`anon`/`authenticated`, and zero rows across the new structures.
- Pre/post aggregates matched: 6 suppressed QA leads, 0 live prospects, 0
  unsuppressed tests, 7 notifications, 0 pending notifications, and 0 live
  notification failures. No existing production row changed.
- Post-migration public smoke, 15-check funnel, 9-check monitor, 9-route
  lead-pipe health, and NellySelly isolation all pass; no Production Vercel
  errors or warnings were returned for the observed 30-minute window.
- Consumer acknowledgment, nurture, auto-send, carrier SMS, held WordPress
  forms, and Mike activation remain disabled and require their own gates.

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
