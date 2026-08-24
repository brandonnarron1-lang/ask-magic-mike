# Changelog

## 2026-08-24 — Funnel-event identity-integrity candidate

- Reused each form's existing submission/idempotency UUID to connect Home
  Value, seller, buyer/renter/open-house, Ask, and appointment funnel events to
  the eventual canonical lead without adding another tracker or store.
- Rejected an early-session design after source proof showed it would collide
  with atomic lead capture; no migration or database row was created.
- Kept the UUID out of browser analytics properties and stored it only as
  validated protected Neon event context.
- Made server post-storage `lead_created` the sole canonical lead conversion;
  browser-authored lead/widget creation, qualification, appointment-request,
  and notification outcomes now fail closed while approved browser
  integrations retain their success events.
- Added linked privacy-safe failure telemetry, chat idempotency, buyer thank-you
  telemetry, and channel-specific buyer/seller permission evidence.
- Closed a first-interaction identity edge in Home Value by creating or reusing
  the submission UUID synchronously before its first address event. If secure
  browser UUID generation is unavailable, the funnel now fails truthfully
  instead of emitting an unlinked event.
- Aligned Ask's fresh browser conversion signal with the other stored funnels
  while suppressing idempotent replay, and expanded the existing no-write
  Preview runner across Home Value, seller, buyer, and Ask at desktop/mobile
  sizes plus one recoverable failure path. Every first-party POST is
  intercepted and unexpected writes fail the run.
- Refreshed code-bearing head `0c45a33b706d7e8a02501ccf83baf24a83ec107d`
  passes 10 focused files / 72 tests, all 237 files / 3,123 tests, strict
  typecheck, full ESLint, optimized build/84-route proof, 14/14 release safety,
  isolation, Production dependency audit, and a 615-commit redacted history
  scan. GitHub Release Gate run `32760061703` passed.
- Immutable Preview deployment `dpl_A3oZ7CvoAGe8mu6aUmp3r9ivMUXb` is READY at
  `ask-magic-mike-avruwnthn-eyes-up-industries.vercel.app`. Branch-owned
  protected run `32760498269` passed 6/6 browser tests with every first-party
  POST intercepted, provider delivery disabled, and database mutation false.
  Production remains unchanged.

## 2026-08-24 — Home-value completion-integrity candidate

- Reused the current Home Value form and canonical lead command, moving the
  durable write from a separate required-phone screen to the first valid
  contact submission.
- Combined name, required email, optional phone, timeline, and existing consent
  evidence into one Contact step; API callers may provide email or phone.
- Preserved the idempotency, attribution, scoring, routing, outbox, widget, and
  truthful success contracts while preventing call consent without a phone.
- Aligned browser and API contact validation so malformed email, short phone,
  and overlong phone values fail before persistence; the phone-only API path
  now requires 10–15 digits.
- Added bounded aggregate evidence, an executed reproducibility notebook, and
  privacy-allowlisted durable-failure telemetry with no error text or PII.
- Refreshed Node 24 proof passes 234 files / 3,095 tests, strict typecheck,
  ESLint, optimized build/84-route proof, 14/14 safety, isolation, dependency
  audit, a 614-commit redacted secret scan, and whitespace verification.
  Production remains unchanged.

## 2026-08-24 — Lead-alert brand identity v3 candidate

- Reused the existing urgency selector, notification outbox, approved Our Town
  logo, approved Mike portrait, and privacy-safe urgency backgrounds instead of
  creating another lead or notification system.
- Upgraded new internal email alerts to `lead_alert_email_v3`, keeping every
  lead fact as accessible HTML/plain text and adding recognizable Mike / Our
  Town identity only in the decorative header.
- Added version-pinned v1/v2 retry rendering and a fail-closed result for an
  unsupported stored template version.
- Added a three-band synthetic no-send review gallery to the protected Message
  Review Studio and a Preview/local-only acceptance route that returns 404 on
  Production.
- Full local Node 24 proof passes 234 files / 3,088 tests, strict typecheck,
  full ESLint, optimized Next.js build, 84-route proof, 14/14 release safety,
  and Ask Magic Mike / NellySelly isolation.
- Screenshot comparison caught and corrected narrow-email overflow; exact
  Preview proof now measures equal client/scroll widths at 390 × 844, preserves
  all three urgency states at 1280 × 720, and reports no browser/runtime errors.
- No Production, environment, database, lead/event, email/BCC, SMS/MMS, Push,
  WordPress, DNS, publication, spend, deletion, or NellySelly action occurred.

## 2026-08-24 — Responsive conversion-identity navigation candidate

- Reused the shared Black Diamond public header instead of adding a navigation
  or visual system.
- Added a compact mobile Home Value / Sell / Buy / Plan / Ask menu while
  retaining the visible Ask CTA and PR #211 skip link.
- Added current-route semantics and visual treatment to desktop and mobile,
  Escape/focus-return behavior, outside-pointer dismissal, and 320-pixel-safe
  sizing.
- Declared the existing smooth-scroll behavior for clean Next.js route
  transitions without changing motion behavior.
- Added 5 navigation regression tests; the combined focused suite passes 2
  files / 8 tests and focused ESLint passes.
- Created Draft PR #213 after exact PR #211. No Production, environment,
  database, lead/event, notification, WordPress, DNS, publication, spend,
  deletion, or NellySelly action occurred.

## 2026-08-24 — PR #211 refresh onto release-ledger-sealed PR #210

- Preserved the former PR #211 head at remote rescue branch
  `rescue/amm-pr211-pre-pr210-ledger-sync-20260824-0632`.
- Merged exact clean PR #210 head
  `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`, including its exact sealed
  PR #209 parent and completed-release authority repair.
- Retained the shared skip-link/Ask semantics, canonical redirects, monitor
  contracts, and release-authority regression coverage without duplicating any
  application system.
- Invalidated former PR #211 evidence pending fresh exact-head Node 24,
  protected no-write Preview, and real-browser keyboard verification.
- Changed no Production deployment, environment, database row, lead, event,
  message, WordPress surface, DNS, spend, deletion, or NellySelly system.

## 2026-08-24 — PR #211 runtime skip-link focus hardening

- Preserved the refreshed PR #211 head at remote rescue branch
  `rescue/amm-pr211-pre-runtime-skip-focus-20260824-0418`.
- Signed-browser locator/CUA acceptance of the protected exact-head Preview
  could not prove that focus remained on the content target after activation.
  That ambiguity was treated as release-blocking rather than accepted as a
  browser-tool artifact.
- Reused the existing skip link and content target, adding one bounded deferred
  refocus instead of another navigation or accessibility system.
- Added regression coverage that simulates post-handler anchor refocus and
  proves the content target is restored after the activation cycle.
- Added a no-write Playwright Tab/Enter contract to the already executed
  Preview browser suite; local Chromium proves the skip link is first and
  transfers focus to `#page-content` without submitting data.
- Submitted no form and changed no Production deployment, database, lead,
  message, WordPress surface, DNS, spend, deletion, or NellySelly system.

## 2026-08-24 — PR #211 stack refresh onto refreshed PR #210

- Preserved PR #211's pre-refresh head at remote rescue branch
  `rescue/amm-pr211-pre-pr210-refresh-20260824-0405`.
- Merged exact refreshed PR #210 head
  `5b884d5eca43fb4dcd1111c59c78a85c54698db1`, carrying the sealed PR #209
  security candidate and the canonical redirect work once.
- Resolved the sole additive changelog conflict while preserving every release
  record; accessibility application files did not overlap the refreshed stack.
- Invalidated older PR #211 exact-head evidence pending fresh Node 24, Preview,
  keyboard, mobile-geometry, and protected no-write proof.
- Changed no Production deployment, database, lead, message, WordPress surface,
  DNS, spend, deletion, or NellySelly system.

## 2026-08-24 — PR #210 refresh onto release-ledger-sealed PR #209

- Preserved the former PR #210 head at remote rescue branch
  `rescue/amm-pr210-pre-release-ledger-integrity-sync-20260824-0617`.
- Merged exact sealed PR #209 head
  `1d1d8d4f8e0970f3f6a1b80ab9ff2bebcd40216d` into the canonical-alias branch.
- Retained both PR #210's redirect/monitor authority and PR #209's corrected
  completed-release ledger plus regression contract.
- Invalidated the former PR #210 CI and Preview proof pending a fresh exact-head
  Node 24 gate and protected no-write Preview run.
- Changed no Production deployment, environment, database row, lead, event,
  message, WordPress surface, DNS, spend, deletion, or NellySelly system.

## 2026-08-24 — PR #210 stack refresh onto the sealed PR #209 candidate

- Preserved PR #210's pre-refresh head at remote rescue branch
  `rescue/amm-pr210-pre-pr209-security-sync-20260824-0401`.
- Merged exact PR #209 candidate
  `6eb89264d59c8d25a711a1ffa178828343772f75` into the stacked alias branch.
- Resolved the sole conflict in `docs/CHANGELOG.md` by preserving both release
  records; the redirect implementation and monitor contract had no overlap with
  PR #209's limiter hardening.
- Invalidated the older PR #210 exact-head evidence pending fresh Node 24,
  Preview, and protected no-write verification.
- Changed no Production deployment, environment, database row, lead, message,
  WordPress surface, DNS, spend, deletion, or NellySelly system.

## 2026-08-24 — Completed-release ledger integrity

- Reconciled every completed Phase 9 release in the owner queue against
  authenticated GitHub PR heads/merge commits and Vercel READY Production
  deployments.
- Corrected the recorded PR #195 reviewed head and filled the missing exact
  head/merge/deployment chains for PRs #183 through #185.
- Added a regression contract covering all seven completed release chains so
  historical approval evidence cannot silently drift.
- Preserved the pre-change PR #209 head at
  `rescue/amm-pr209-pre-release-ledger-integrity-20260824-0605`. No Production,
  environment, database, lead, event, message, WordPress, DNS, publication,
  spend, deletion, or NellySelly action occurred.

## 2026-08-24 — PR #209 emergency-limiter security hardening

- Preserved the exact reviewed candidate at remote rescue branch
  `rescue/amm-pr209-pre-memory-fallback-hardening-20260824-0333`.
- Bounded the Preview/emergency in-memory limiter to 10,000 active identifiers,
  reclaimed expired entries, and made unseen identifiers fail closed at
  capacity instead of allowing unbounded process-memory growth.
- Partitioned fallback counters by the same typed route prefix used by Neon so
  analytics, chat, lead, appointment, and staff-setup traffic cannot consume
  one another's degraded-mode allowance.
- Added dedicated capacity, expiry-reclamation, and route-isolation regression
  tests plus a structured security review.
- Changed no Production environment, deployment, database row, lead, event,
  message, WordPress surface, DNS, NellySelly system, or external provider.

## 2026-08-23 — Field-experience trust fast-track candidate

- Preserved PR #199 and its exact head, then transplanted only its unique
  privacy-safe field-performance capability onto canonical PR #205.
- Added Production-only LCP/INP/CLS reporting for exact public routes through
  the existing durable event boundary and protected Growth Command Center.
- Removed lead, session, attribution, query, raw URL, raw user-agent, and raw
  metric-ID identity from the stored contract; metric IDs are reduced to
  domain-separated SHA-256 digests before persistence.
- Added component-level proof for canonical emission and QA, automation,
  private-route, and noncanonical-host suppression.
- Passed 5 focused files / 29 tests, all 226 files / 3,031 tests, strict
  typecheck, ESLint, optimized build, route proof, release safety, system
  isolation, and the Production dependency audit.
- No migration, Production action, field event, lead, message, WordPress edit,
  publication, spend, DNS change, deletion, or NellySelly action occurred.

## 2026-08-23 — Conversion-journey integrity fast-track candidate

- Reused the already-reviewed PR #200 application and test changes on top of
  exact PR #202 head instead of rebuilding the buyer/renter/open-house flow.
- Current mobile Production no-write audit reconfirmed that blank Buyer submit
  shows the either-or contact error while focus remains on the submit button.
- The isolated candidate preserves first touch, refreshes truthful last touch,
  separates renter source identity, suppresses replay KPI inflation, and makes
  contact recovery accessible.
- Every application and test file applied cleanly; only cumulative operating
  documents required reconciliation. No migration, Production action, lead,
  message, WordPress edit, publication, spend, DNS change, deletion, or
  NellySelly action occurred.

## 2026-08-22 — Conversion identity polish

- Added required seller identity to the existing four-stage home-value funnel.
- Improved invalid-field focus and precise accessible error association.
- Kept internal preview routes out of consumer footer navigation.
- Hard-intercepted lead creation, durable analytics, and public experiment
  events in screenshot QA so visual capture performs no application writes.
- No Production, database, notification, provider, WordPress, or publication
  action was performed.
## 2026-08-22 — WordPress owned-demand activation change set

- Stacked the candidate behind PR #197 after preserving its released-main state
  at `rescue/amm-pr198-pre-pr197-stack-refresh-20260822-2247`; application code
  composed without conflict and only cumulative release evidence required
  reconciliation.
- Reused the protected Distribution Command and canonical owned-demand UTM
  registry to generate live, placement-specific WordPress readiness manifests.
- Added exact-host public page and page-index inspection, redirect and size
  limits, one-target classification, rollback hrefs, page-ID checks, and
  deterministic SHA-256 preconditions.
- Hardened public reads with an explicit published-row requirement, a 3 MB
  streaming cap, and precondition hashes that include every ambiguity and
  rejected-link signal.
- Added protected private/no-store JSON downloads for the existing homepage,
  home-value, and We Buy Homes placements plus fail-closed security coverage.
- Expanded the brokerage placement card across the desktop command grid while
  preserving the existing mobile stack, eliminating an avoidable blank column.
- Verified all three live public placements as `legacy_match_ready`; selected
  only the homepage CTA as the recommended first separately approved edit.
- Performed no WordPress edit, publication, form submission, message send,
  database migration, Production deployment, DNS change, cache purge, or spend.
## 2026-08-22 — Privacy and KPI-trust consolidation

- Consolidated the independent privacy/security/KPI evidence from PRs #190-#192
  onto the single PR #185 owned-demand command candidate.
- Pseudonymized durable rate-limit buckets with versioned HMAC identifiers and
  bounded stale-row retention.
- Minimized public analytics to approved events and scalar dimensions, removed
  public lead/agent binding, restricted public attribution to a registered
  operational vocabulary, and repeated sanitization at the Neon write layer.
- Added aggregate-only live outcome and notification-delivery evidence to the
  protected Growth Command Center with honest unavailable states.
- Excluded the deferred KPI target migration and made no Production, provider,
  external publication, or live-data change.

## 2026-08-21 — Owned-demand measurement truth hardening

- Distinguished healthy zero-demand measurement from missing configuration,
  pending schema, and query failure in the existing Owned Demand Command.
- Kept prepared campaign assets available during degraded measurement while
  suppressing false numeric counts, bottleneck inference, and data-backed
  channel recommendations.
- Added unit, static-route, desktop, and mobile regression proof without a
  database migration, external publication, provider send, or Production
  mutation.

## 2026-08-14 — Admin push and appointment boundary polish

- Added route-level Basic Auth to every `/admin/api` push handler as defense in
  depth behind middleware.
- Added durable throttling to public appointment follow-up requests before body
  parsing or persistence.
- Added security regression tests and completed the full release gate without a
  production deployment, external message, data mutation, or WordPress change.

## 2026-08-11 — Node 24 and phone-alert readiness

- Aligned local development, package runtime declarations, all CI workflows,
  and Vercel production builds on Node 24 before the Node 20 deployment cutoff.
- Extended production readiness checks to require the Web Push table and safe
  VAPID configuration whenever agent push notifications are enabled, using the
  same canonical environment-variable contract as the delivery provider.
- Added explicit loading, retry, failure, and duplicate-action protection to
  the authenticated phone-registration interface.

## 2026-08-11 — Reuse-first Neon hardening candidate

- Preserved the existing public funnel, black-diamond visual system, canonical
  capture function, scoring/routing engine, notification outbox, and Lead Center.
- Moved SLA sweep, rate limiting, health safety, and server analytics off stale
  Supabase/Upstash assumptions and onto canonical Neon PostgreSQL.
- Added exact-origin, body-size, message-size, rate-limit, and timeout controls to
  public AI chat without changing the visible Ask Mike workflow.
- Added a disabled signed Gravity Forms bridge for exact form IDs 1–7 with HMAC,
  idempotency, bounded retry, and no duplicate WordPress email engine.
- Patched production dependencies and pinned the supported Node 20 runtime.
- Added full-history secret scanning, provider-neutral preview mutation guards,
  Edge-safe admin secret comparison, regression tests, browser E2E corrections,
  and rendered visual evidence.

## 2026-08-11 — Production cutover follow-up

- Promoted the verified Neon-backed candidate to the canonical Ask Magic Mike
  production domains after an isolated production-environment smoke test.
- Verified a controlled public `[TEST]` lead, deterministic score/routing,
  first-attempt Resend delivery, test suppression, and canonical attribution.
- Routed protected Lead Center inbox/detail reads to Neon and surfaced provider
  message IDs in the notification dashboard.
- Corrected protected health reporting to recognize the active email enablement
  variable and report BCC presence as a boolean only.
- Merged PR `#123` and promoted production deployment
  `dpl_BGkVcCMFgeZQgnteRxRUomeJoyRv` after authenticated Neon Lead Center checks.
- Rotated the Vercel automation bypass credential, updated the GitHub Actions
  secret, and revoked both superseded bypasses.
- Installed and activated the reviewed WordPress canonical bridge in inert
  shadow mode. Existing forms, notifications, and historical lead records were
  not modified or imported.
