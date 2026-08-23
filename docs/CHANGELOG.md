# Changelog

## 2026-08-22 — Conversion identity and public-navigation polish candidate

- Reused the canonical home-value funnel and added required consumer name
  capture to its existing Contact step without increasing funnel length.
- Added invalid-field focus and field-specific error association for address,
  name, email, and phone.
- Removed internal preview/integration links from the shared consumer footer
  and replaced them with canonical buyer, seller, home-value, Ask Mike, planner,
  contact, legal, and accessibility paths.
- Made the historical screenshot helper intercept `/api/leads`, preventing
  visual QA from creating a lead even when database configuration is present.
- No Production mutation, migration, lead, notification, provider call,
  WordPress edit, publication, spend, DNS, or NellySelly action occurred.

## 2026-08-22 — iOS phone install handoff consolidation candidate

- Audited historical PR #179 and refreshed only its unique iPhone Home Screen
  Web Push handoff on the verified PR #193 stack. Reused the canonical Web
  Push/VAPID/Neon/outbox/service-worker system; no carrier SMS, second provider,
  second PWA, second data store, or device takeover path was created.
- Added a private token-scoped install page and manifest so the installed app
  performs the claim exchange in its own cookie context, then continues on a
  token-free setup URL.
- Added a durable, HMAC-pseudonymized, one-time canonical Neon nonce guard,
  cross-browser replay denial, safe matching-cookie reopen, and Production
  fail-closed behavior when durability is unavailable. No migration is needed.
- Closed a post-refresh replay bypass by separating the bearer invite from the
  server-minted HttpOnly session credential. Registration now rejects an invite
  pasted directly into the setup cookie, and the PWA manifest is restricted to
  the `/phone-alerts/` route family.
- Narrowed privileged phone origins to exact Ask Magic Mike Production,
  configured Preview, and local-development origins; Our Town and NellySelly
  remain outside this setup boundary.
- Prevented the copy-scoped enrollment session from relabeling an existing
  Mike/primary Push endpoint, disabled the legacy secret-header invite path
  whenever Lead Center RBAC is enabled, and made the optional QA Push a durable
  one-shot action per setup session and copy subscription in Production.
- Made Production fail-closed detection portable: Vercel Production remains
  authoritative when its metadata is present, while owned/self-hosted
  `NODE_ENV=production` also requires durable claim and one-shot Push guards.
- Added private/no-store, no-referrer, noindex, robots, CSP, and frame controls;
  expanded Preview QA to validate the deployed invalid-token install/manifest
  failure contract without token minting/redemption, limiter persistence, phone
  registration, lead creation, or Push delivery.
- Post-refresh focused verification passes 9 files / 61 tests and the full
  local gate passes 213 files / 2,929 tests. Fresh exact-head Node 24, canonical
  Preview, strict launch authority, and rendered visual evidence remain before
  the candidate's separate future Production gate.

## 2026-08-22 — Privacy/KPI-trust final-head hardening

- Refreshed PR #193 onto released PR #185 merge
  `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` after preserving both the
  pre-refresh and post-refresh/pre-hardening states as remote rescue branches.
- Made both public analytics routes await the canonical Neon write. They now
  return HTTP 202 only after durable persistence succeeds and fail truthfully
  with HTTP 503 when the ledger is unavailable; a serverless invocation can no
  longer acknowledge an event and terminate before its write completes.
- Restricted public UTM and placement dimensions to a registered operational
  vocabulary. A syntactically valid slug is no longer presumed anonymous;
  unregistered single-token names/address slugs are discarded, and open-house
  identifiers collapse to a non-identifying placement class before the final
  repository-level privacy pass.
- Consolidated all JSON-LD script rendering onto one serializer that escapes
  script-closing input, with source-level and executable regression coverage.
- The focused final-diff matrix passes 12 files / 103 tests. The complete local
  gate passes system isolation, 14/14 release-safety checks, 210 test files /
  2,901 tests, strict typecheck, ESLint, optimized Next.js 15.5.21 build, and 80
  active routes. Production dependency audit reports no known vulnerability;
  a redacted 511-commit history scan reports no leak; whitespace and migration
  scans are clean. Exact-head Node 24 CI and canonical Preview acceptance remain
  required after push because the local shell runs Node 26.5.1.
- This application-only hardening contains no migration and performed no
  Production deployment, lead/event write, email/BCC, SMS, Push, WordPress
  change, publication, DNS change, spend, provider mutation, or NellySelly
  action.

## 2026-08-22 — Consolidated owned-demand command candidate

- Consolidated the useful application work from PRs #185, #186, #188, and #189
  into PR #185 on top of the released PR #184 Production baseline. No third
  application, lead store, CRM, campaign catalog, publisher, or analytics
  system was created.
- Added Buyer discovery to the active Black Diamond interface, exact Vercel
  Preview origins, protected deterministic feed/story/QR exports, allowlisted
  shortlinks, seven named Our Town WordPress placements, and one deterministic
  native-proof/first-party-attribution lifecycle in the existing Distribution
  Command.
- Made the lifecycle fail closed when either Growth measurement or native
  publication evidence is unavailable. An unavailable measurement stream can
  no longer produce a recommended first channel or display lead-dependent
  totals as if they were measured.
- Hardened the read-only WordPress audit to accept only HTTPS on the apex and
  `www` Our Town hosts, revalidate every redirect, and stop after five hops.
  The latest audit fetched all 42 public sitemap pages without a form
  submission or WordPress mutation.
- Reused approved real Mike Eatmon imagery and deterministic rendering. No
  generated identity, lead PII, hidden consumer targeting, or per-lead image
  generation was introduced.
- Closed a pre-release Preview-integrity defect in the renter export. The
  renderer intentionally resolves approved source art from the released
  canonical host, but the renter definition referenced a branch-only JPEG.
  It now reuses the equivalent retained Production PNG, and the executable
  renderer test declares the correct PNG MIME type. The redundant derivative
  was removed; no Production asset was deleted.
- Final UI-to-Neon tracing found a pre-release contract mismatch: the server
  accepted `ourtown_wordpress` and its reviewed placements while the released
  append-only ledger constraints did not. Added one constraint-only migration
  that extends the existing ledger, preserves prior rows/RLS/grants/trigger/RPC,
  and validates all replacement constraints in the same transaction.
- Added an executable PostgreSQL 17 contract covering all 11 WordPress tuples,
  state semantics, idempotency, immutable audit, browser-role denial, foreign
  host rejection, and rollback, plus a pinned backup-first Production cutover
  runner with exact legacy-schema and postflight drift checks.
- PR #187's KPI-target migration and PRs #190–#192 remain outside this
  candidate. The repair performs no lead, proof, publication, email, SMS, Push,
  DNS, spend, WordPress, provider, or NellySelly mutation. Earlier application-
  only test totals remain regression history; fresh exact-head Node 24 CI,
  Preview, protected acceptance, dependency, secret, and migration evidence is
  required for the migration-bearing head before its new Production gate.

## 2026-08-21 — Exact owned-demand activation control-loop candidate

- Extended the existing protected Distribution Command with one deterministic
  per-placement lifecycle join; no new route, dashboard, CRM, database,
  campaign catalog, provider, publisher, or autonomous agent was created.
- Joined the existing append-only native publication-proof ledger to exact
  eligible first-party lead attribution across all 35 canonical general,
  seller, buyer, renter, and named WordPress placements.
- Added explicit evidence-unavailable, prepared/unobserved, native-pending,
  native-inactive, observed/unmeasured, proof-attribution-mismatch,
  signal-without-active-proof, and measured-signal states. Attribution never
  becomes publication proof, and proof never becomes a lead or outcome claim.
- Applied channel-specific active semantics: public `live`, approved passive
  email-signature `configured`, and QR/print `distributed`. A configured but
  unpublished WordPress placement remains pending.
- Made latest-proof resolution stable for out-of-order history and ranked the
  next operator decision by evidence integrity before activation or scale.
- Fresh Production aggregate evidence remains six test/suppressed records and
  zero genuine leads, outcomes, spend, or response samples. No Production or
  external mutation occurred.
- Focused verification passes 3 files / 39 tests. The full local release gate
  passes system isolation, 14/14 release-safety checks, 209 test files / 2,909
  tests, strict typecheck, ESLint, the optimized Next.js 15.5.21 build, and the
  81-route manifest. Production dependencies have no known vulnerability, and
  a redacted 478-commit history scan found no secret leak.
- Local protected visual QA passes 12/12 desktop/mobile checks across the reused
  public funnels, widget surfaces, Distribution Command, and KPI target register
  with no overflow, missing required copy, forbidden copy, or console error.
  Exact Node 24 CI and canonical Vercel Preview evidence remain to be attached
  to the Draft PR.

## 2026-08-21 — WordPress owned-traffic consolidation candidate

- Audited all 42 URLs in the live Our Town Properties page sitemap without
  submitting a form or changing WordPress. All 42 responded successfully.
- Confirmed the existing signed Canonical Lead Bridge 1.1.0 and Gravity Form 3
  remain the proven WordPress-to-Neon path. The candidate does not widen the
  allowlist for the sitewide Form 7, create another lead store, or add another
  notification engine.
- Added a reusable, secret-minimizing public-surface audit for canonicals,
  robots state, Gravity Form IDs, public plugin assets, safe field names,
  consent copy, canonical-app links, placement UTMs, embeds, capture overlap,
  and public telephone targets. It intentionally excludes nonces, cookies,
  field values, leads, credentials, and private configuration.
- Recorded three self-canonical seller-value pages, two direct-purchase pages,
  two Ask Mike pages, four legacy native-capture pages, five pages with more
  than one capture system, and five existing canonical-app link/embed
  placements missing placement-specific `utm_content`.
- Reused the existing protected Distribution Command to add one
  `ourtown_wordpress` channel and seven named page placements. Their exact
  canonical links use `ourtownproperties / owned_media /
  amm_owned_demand_2026`, flow through the existing UTM and publication-proof
  contracts, and do not publish or send anything.
- Extended the existing protected QR/creative catalog from 24 to 28 general
  and offer assets for the WordPress channel; no second media system or
  campaign dashboard was created.
- Preserved the audited public telephone targets exactly as published and did
  not introduce the unverified conflicting number into new assets.
- Focused verification passes 5 files / 85 tests. The full release gate passes
  system isolation, 14/14 release-safety checks, 208 test files / 2,901 tests,
  strict typecheck, ESLint, the optimized Next.js 15.5.21 build, and the
  81-route manifest. Production dependencies have no known vulnerability, and
  a redacted 477-commit scan found no secret leak.
- No Production deployment, WordPress edit/publication, form or notification
  change, Neon read/write, lead, email, SMS, Push, DNS change, redirect,
  provider call, spend, or NellySelly action occurred.

## 2026-08-21 — Protected owned-demand asset studio candidate

- Extended the existing Distribution Command with protected 1080×1350 PNG,
  1080×1920 PNG, and raw QR SVG downloads for all 24 canonical owned-demand
  placements: 72 deterministic combinations with no second campaign catalog.
- Added 24 public allowlisted `/go/[code]` 307 redirects so scan-reliable QR
  codes retain the exact full canonical UTM destination without accepting an
  arbitrary redirect target.
- Reused approved Mike Eatmon imagery and the current black/gold/cream/cyan
  visual system. Efficient WebP assets remain on ordinary pages; protected
  exports use retained canonical JPEG/PNG sources that already exist on the
  released host.
- Kept asset generation server-authorized with `report:view`, private/no-store,
  CSP-sandboxed, noindex responses, strict channel/placement/format allowlists,
  and no database, provider, publication, or consumer-data input.
- Closed real QA defects involving unsupported renderer CSS, dense full-UTM QR
  modules, story footer/quiet-zone overlap, and image-decoder compatibility.
- Passed the final local Node 24 release gate: 203 test files / 2,846 tests,
  strict typecheck, ESLint, optimized Next.js 15.5.21 build, 80-route manifest,
  14/14 release-safety checks, system isolation, zero known Production
  dependency vulnerabilities, and a clean redacted 471-commit secret scan.
- Independent OpenCV scans resolved both compressed feed/story QR codes and a
  Chromium render of the raw SVG to their exact approved shortlinks.
- No Production deployment, database migration/write, lead creation, provider
  call, external send/publication, QR distribution, WordPress/DNS change,
  spend, or NellySelly change was performed.

## 2026-08-21 — Campaign safety and three-offer owned-demand candidate

- Consolidated the existing distribution command, seller/buyer/renter funnels,
  canonical UTM builder, Neon attribution, and retained visual library into one
  protected, read-only owned-demand flight.
- Prepared 18 exact seller, buyer, and renter placements across six existing
  owned channels, with accessible copy controls and no automatic publication or
  messaging path.
- Rewrote retained campaign copy to remove unsupported performance, valuation,
  demand, school-proxy, response-time, superlative, and conflicting public-phone
  claims; added dedicated regression coverage.
- Updated the reusable visual-smoke contract so rendered QA requires the factual
  broker-review credential instead of the removed tenure claim, matches visible
  copy case-insensitively, and keeps authenticated admin proof separate from
  public Preview proof.
- Hardened the active `/ask` route and prompt set against neighborhood,
  school-proxy, and unverified buyer-demand guidance. The public interface now
  frames comparisons around objective criteria supplied by the consumer.
- Replaced two undersized legacy offer portraits with existing approved 1024 px
  and 515×720 local Mike assets; no synthetic identity or parallel visual pack
  was introduced.
- Extended the UTM allowlist only for the existing canonical `/home-value`,
  `/buy`, and `/rent` routes; arbitrary and cross-system destinations remain
  blocked.
- Added a measured-bottleneck-to-channel jump and deterministic local-only
  full-flight packets so an operator can move the general placement plus all
  three offer variants into native review without four separate copy actions.
- Captured and inspected the remediated operator path at desktop and mobile;
  the anchor lands on the intended channel, copy state is visible, document
  width remains contained, and no browser warning/error was observed.
- Passed the full local release gate: 196 test files / 2,795 tests, strict
  typecheck, ESLint, optimized Production build, 78-route manifest, 14/14
  release-safety controls, system isolation, zero known Production dependency
  vulnerabilities, and a clean redacted 464-commit secret scan.
- Passed 10/10 local Production-render visual checks across five active routes
  at desktop and mobile sizes with no overflow, missing required copy,
  prohibited claims, bare appraisal language, or console errors.
- Produced exact code-bearing Preview deployment
  `dpl_5UQL8LDfMvFvvi4YZ8UhLdyDFbWF` from commit
  `a0c80eaa9b429ed48871fc221d93af5e7d6fdfa1`; GitHub release and Vercel
  checks passed. Ten read-only route/health/listing checks and eight protected
  Preview desktop/mobile renders passed, while anonymous protected-admin access
  failed closed with 401, `no-store`, and `SAMEORIGIN`.
- No Production deployment, database migration, lead creation, external send,
  WordPress change, social publication, DNS change, or NellySelly change was
  performed.

## 2026-08-16 — Phase 7 messaging and advisory AI release candidate

- Added a centralized communication-permission engine, immutable template/version registry, governed sequence state machine, signed Resend event handler, hardened Brandon-only QA email boundary, durable advisory AI jobs, and operator-visible controls.
- Reused the existing Vercel Sensitive Production `OPENAI_API_KEY`; no key value was copied, exposed, or duplicated.
- Passed 2,620 tests, lint, strict typecheck, Production build, route verification, release safety, dependency audit, and NellySelly isolation.
- Applied additive migration `20260816143000` once to isolated Preview and once to canonical Neon Production; all three new server-only tables are empty and Production lead-contactability counts are unchanged.
- Kept consumer email, nurture, carrier SMS, sequence scheduling, AI automatic actions, and unsigned provider webhook ingestion disabled.
- Produced Ready PR 156 Preview deployment `dpl_GXf3kT2543T565Me7bUowo1WYGL7`; Production application deployment and Brandon-only inbox acceptance remain the next controlled checks.
- Merged PR 156 at `4b4caefcd2aea2944a06df71a8cf3e3e569b969d` and released Ready Production deployment `dpl_31FNiQF1TcRw7cHZkmb8eFnRFmKc`; Production smoke, funnel, monitoring, health, and isolation checks passed.
- Completed a deployed OpenAI Responses acceptance with the existing Sensitive Production key on synthetic suppressed data; no key value was exposed and no automatic action ran.
- Sent one controlled Brandon-only QA email. Resend accepted provider message `871e5b96-a10b-492a-bb23-9898824f0cd3`; no Mike, consumer, BCC, or SMS delivery was requested. Recipient-inbox receipt remains owner-verified because the connected Gmail profile is a different mailbox and the Resend key is send-scoped.

## 2026-08-15 — Phase 6 Production schema acceptance

- Applied the Preview-accepted Phase 6 communication-permission, sequence,
  provider-event, AI-intelligence, and AI-usage migration to canonical Neon
  Production in one transaction.
- Verified seven tables, RLS on all seven, zero public/anonymous grants, zero
  new rows, and unchanged lead/notification/session aggregates.
- Re-ran public smoke, funnel, monitoring, lead-pipe, and system-isolation
  checks after migration; all passed and the observed Production log window
  contained no errors or warnings.
- Kept consumer email, nurture, auto-send, carrier SMS, Mike activation, and
  held Gravity Forms outside this release.

## 2026-08-14 — Free-first reconciliation and release hardening

- Completed isolated Preview RBAC acceptance, removed the temporary bootstrap
  surface, aligned the Better Auth server/client path, and added a gated,
  exact-origin, one-time password activation/reset flow using the existing
  authenticated Resend transport.
- Applied the accepted additive RBAC and Push device-label migrations to Neon
  Production, merged PR 143, activated the approved Brandon administrator and
  dormant Mike primary-owner identities, and passed Production session/logout
  acceptance without changing lead or notification data.
- Normalized auth-database SSL aliases to explicit `verify-full`, preserving
  strong certificate/hostname verification and removing the `pg` v9 migration
  warning from Production auth routes.

- Reconfirmed the existing Vercel + Neon deployment as canonical; no parallel
  repository, database, notification engine, or visual system was introduced.
- Updated health/startup/launch checks for the active Neon runtime and active
  root `app/` tree.
- Added an approved public analytics event allowlist and admin no-store/frame
  headers.
- Reconciled architecture, security, privacy, QA, environment, WordPress,
  widget, phone enrollment, deployment, rollback, and owner-gate documentation.
- Kept carrier SMS deferred and reused free Web Push for staff phone alerts.
- No production deployment, migration, WordPress publication, DNS change,
  external send, or production data mutation was performed.
- Added route-level Basic Auth to all admin Web Push handlers behind the existing
  middleware boundary and retained exact-origin checks for mutations.
- Added a dedicated durable rate-limit bucket to public appointment follow-up
  requests before body parsing or persistence.
- Added regression coverage for unauthorized push operations, sensitive endpoint
  omission, same-origin enforcement, and appointment throttling; the final local
  matrix passes 2,538 tests, 13 browser tests, build, lint, typecheck, dependency
  audit, release safety, isolation, route manifest, and secret scan.

## 2026-08-10 — Same-day lead-engine consolidation (local preparation)

- Selected the mature `Projects/ask-magic-mike` repository as canonical.
- Preserved dirty work on `rescue/amm-pre-consolidation-20260810-162915`.
- Recorded live/DNS/Vercel/WordPress evidence and non-mutating blockers.
- Prepared canonical route, consent, attribution, notification, widget, analytics,
  security, QA, go-live, and rollback documentation.
- No production deployment, database migration, WordPress publication, DNS change,
  marketing send, or real email was performed.
- Added buyer/renter intake, explicit consent evidence, deterministic score/routing,
  canonical internal alert/consumer-ack outbox, origin-safe widget messaging,
  server analytics ledger, retry endpoint, and read-only lead-pipe health check.
- Added explicit renter, open-house, privacy, terms, accessibility, and contact
  routes so the local candidate has no required public intake/compliance 404s.
