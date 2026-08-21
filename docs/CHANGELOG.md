# Changelog

## 2026-08-21 — Evidence-first KPI target register candidate

- Added one protected, append-only KPI target register to the existing Growth
  intelligence and Lead Center rather than introducing a second dashboard or
  analytics store.
- Defined 32 canonical acquisition, response, conversion, database, economics,
  portfolio, operations, experimentation, and trust/delivery KPIs with explicit
  units, direction, denominator language, and minimum sample sizes.
- Separated measured, directional, insufficient-sample, uninstrumented, and
  unavailable baselines. Unsupported values display as `Not measured`; zero
  live demand does not become a fabricated 0% or $0 baseline.
- Added server-resolved baseline evidence, SHA-256 evidence identity, strict
  PII/secret rejection, draft/approved/retired lifecycle rules, and a measured-
  baseline requirement for every numeric target.
- Added an RLS-enabled immutable version table and idempotent security-invoker
  RPC that creates exactly one audit event per new version. The migration seeds
  no targets and grants browser roles no access.
- Protected mutations with server-side `growth:manage`, Preview fail-closed
  controls, parameterized SQL, and a per-operator 30/hour rate limit.
- Added a hash-pinned, backup-first, canonical-Neon cutover runner. Its exact
  future gate does not authorize recording a target, publishing content,
  messaging a consumer, or spending money.
- The full local release gate passes 206 test files / 2,874 tests, system
  isolation, 14/14 safety checks, strict typecheck, ESLint, optimized Next.js
  15.5.21 build, and the 81-route manifest. The disposable PostgreSQL 17.6
  contract and 12/12 desktop/mobile rendered checks also pass. Production
  dependencies have no known vulnerability, and a redacted 474-commit scan
  found no secret leak. Exact Node 24 CI and canonical Preview evidence remain
  to be recorded on the Draft PR.
- No Production deployment, Neon migration/write, target record, lead,
  provider call, external send/publication, WordPress/DNS change, spend, or
  NellySelly action occurred.
- Draft PR #187 is stacked on PR #186 and remains behind the exact PR #183–#186
  release sequence.

## 2026-08-21 — Protected owned-demand asset studio candidate

- Extended the existing Distribution Command with protected 1080×1350 PNG,
  1080×1920 PNG, and raw QR SVG downloads for all 24 canonical owned-demand
  placements: 72 deterministic combinations with no second campaign catalog.
- Added 24 public allowlisted `/go/[code]` 307 redirects so scan-reliable QR
  codes retain the exact full canonical UTM destination without accepting an
  arbitrary redirect target.
- Reused approved Mike Eatmon imagery and the current black/gold/cream/cyan
  visual system. Kept efficient WebP page assets and added one small JPEG export
  derivative of the same approved renter portrait after executable renderer QA
  rejected the PNG/WebP encodings.
- Kept asset generation server-authorized with `report:view`, private/no-store,
  CSP-sandboxed, noindex responses, strict channel/placement/format allowlists,
  and no database, provider, publication, or consumer-data input.
- Applied the same private/no-store/noindex policy to failed authorization
  responses after real Preview evidence exposed a cacheable generic 409.
- Closed real QA defects involving unsupported renderer CSS, dense full-UTM QR
  modules, story footer/quiet-zone overlap, and image-decoder compatibility.
- Passed the final local Node 24 release gate: 203 test files / 2,846 tests,
  strict typecheck, ESLint, optimized Next.js 15.5.21 build, 80-route manifest,
  14/14 release-safety checks, system isolation, zero known Production
  dependency vulnerabilities, and a clean redacted 471-commit secret scan.
- Independent OpenCV scans resolved both compressed feed/story QR codes and a
  Chromium render of the raw SVG to their exact approved shortlinks.
- Runtime hardening head `bce07766ae40d8035ddac8be853dfed89248f427`
  passed exact GitHub Node 24 run `32520888862` and Ready canonical Preview
  `dpl_6i4VqGrQUFaWdgoKznLYGwkgPvtq`. Public and health routes passed; the exact
  shortlink/404/robots contracts passed; anonymous admin and asset access failed
  closed with private headers; and the render contained zero NellySelly markers.
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
