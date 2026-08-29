# Implementation Status

Updated 2026-08-29.

## Phase 9 WordPress seller-intent truth — 2026-08-29

- **Reuse decision:** the canonical Ask Magic Mike `/sell` funnel, existing
  protected Distribution Command, WordPress manifest route, lead backend,
  attribution contract, and notification system remain authoritative. No
  second funnel, form engine, database, publisher, dashboard, or CRM was added.
- **Observed conflict:** both `/we-buy-homes/` (page 3631) and
  `/we-buy-houses/` (page 4364) remain self-canonical/index candidates. The
  latter exposes a page-specific native intake plus global Gravity Form 7 and
  no canonical Ask Magic Mike link; the former has an existing legacy tracked
  link. Search, backlink, Regency, consent, and capture-owner evidence is still
  required before choosing or redirecting either page.
- **Candidate result:** one protected, `report:view`, no-store JSON packet now
  records only bounded structural evidence for those exact two pages and
  renders a clear publication hold in the existing admin surface. It always
  returns no tracked publication href and all mutation, submission, messaging,
  and authorization flags false.
- **Acceptance:** code-bearing head
  `750dacc52a16082edcb1ba95ffb34cd543a1221f` passed 3 focused files / 19
  tests, 271 files / 3,372 full tests, strict TypeScript, full ESLint, optimized
  Next.js 15.5.21 build, 95-route proof, 14/14 release safety, deployable-source
  isolation, exact-head Release Gate run `33278194658`, immutable Preview
  `dpl_D5x8eKHfbUijo2nDyGCQcrd14B9C`, and protected Preview run
  `33278568998` with 18 checks, six intentional mutation skips, 15/15 browser
  scenarios, and `PREVIEW_READY`. Anonymous admin access returned 401; the
  generic Preview decision API failed closed with `rbac_not_enabled` because
  Preview RBAC is intentionally disabled.
- **Authority boundary:** Draft PR #235 is stacked on exact sealed PR #234 head
  `5ff3d1079f50e5f05c7000edda75aacefa4a31c5`. Production remains PR #209
  merge `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` on deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; PR #210 remains first in release order.
  No Production, WordPress, Vercel environment, Neon, DNS, provider, lead,
  message, publication, spend, deletion, or NellySelly mutation occurred.
- Decision packet:
  [`phase9/WORDPRESS_SELLER_INTENT_DECISION_PACKET.md`](./phase9/WORDPRESS_SELLER_INTENT_DECISION_PACKET.md).

## Phase 9 notification operations truth — 2026-08-29

- **Reuse decision:** canonical Neon outbox, Lead Center, provider lifecycle
  metadata, and one-record retry remain authoritative. No second queue,
  notification database, provider, dashboard, CRM, or migration was added.
- **Observed gap:** the protected page's cards counted only its latest 50 rows
  and mixed QA history with live operations. Exact queue depth, due retries,
  stuck work, provider confirmation, orphan integrity, and last success were
  not available to the operator or protected health monitor.
- **Candidate result:** one read-only aggregate query now reports exact
  live-only totals, separate QA exclusion, stale thresholds, provider accepted
  versus confirmed state, provider terminal failures, and bounded timestamps.
  Recent QA records are labeled; fallback counts are explicitly sample-only.
- **Initial acceptance:** 4 focused files / 42 tests, strict TypeScript, and
  targeted ESLint pass. Complete local release gate, exact-head CI, immutable
  Preview, protected visual/contract QA, and log proof remain pending.
- **Authority boundary:** exact parent is sealed PR #233 head
  `ff67874eacdb44d7653c964ce395ae7bafd54910`, preserved at
  `rescue/amm-pr234-base-pr233-20260829-171619`. Draft PR #234 implementation
  head is `ba56f7b3ac98912c206eeb56fde4b004be78ea64`. Production remains PR #209
  merge `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` on deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; PR #210 remains first in release order.
- Decision/evidence:
  `docs/phase9/NOTIFICATION_OPERATIONS_TRUTH.md` and
  `docs/phase9/NOTIFICATION_OPERATIONS_TRUTH_QA_EVIDENCE.md`.

## Phase 9 review planner social identity — 2026-08-29

- **Observed defect:** the indexable `/plan` route declared the correct
  canonical URL but inherited the homepage Open Graph URL because it was the
  lone public route still using a partial route-local metadata object.
- **Reuse decision:** the route now uses the established
  `publicPageMetadata` helper with `path: "/plan"`; no route, component, visual
  system, social card, analytics contract, lead path, or planner behavior was
  rebuilt.
- **Result:** canonical and `og:url` now both resolve to
  `https://www.askmagicmike.com/plan`; title, description, robots, Twitter
  metadata, and the canonical Ask Magic Mike card remain aligned.
- **Lineage:** exact parent is sealed PR #232 head
  `2687f98a26cb05c309136cacc136890f16d15ea8`. Runtime-fix head
  `90534b548244ce9aae38cc7f16dea3745d0cc5ee` is preserved at
  `rescue/amm-pr233-pre-authority-reconciliation-20260829-2105` before the
  release-authority documentation reconciliation.
- **Acceptance:** the first sealed head passed 269 files / 3,362 tests, strict
  typecheck, full ESLint, optimized 59-page build, 14/14 release safety, and
  protected Preview HTTP/metadata proof on deployment
  `dpl_6kWfXipnQBEcmxa9vrP9ndnvesQc`. Final exact-head CI and protected Preview
  evidence must be repeated and pinned in PR #233 after this documentation
  reconciliation.
- **Authority boundary:** Production remains
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` on deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. PR #210 remains the first ordered
  application candidate. This tail cannot leapfrog any predecessor and adds no
  migration, provider, WordPress, publication, lead/message, spend, deletion,
  or NellySelly action.
- Decision and evidence:
  `docs/phase9/PLAN_SOCIAL_IDENTITY.md` and
  `docs/phase9/PLAN_SOCIAL_IDENTITY_QA_EVIDENCE.md`.

## Phase 9 Google Business Profile square asset — 2026-08-29

- **Reuse decision:** this candidate extends the existing Distribution Command,
  approved creative catalog, private renderer, tracked shortlinks, native share
  handoff, and publication-proof ledger. It adds no second visual system,
  publisher, campaign manager, attribution store, lead path, or CRM.
- **Channel-fidelity correction:** the Google Business Profile handoff now
  resolves a dedicated 720x720 PNG instead of the social 4:5 feed format.
  `square` resolves only for the exact Google Business Profile channel.
- **Exact lineage:** the prior PR #232 head is preserved at
  `rescue/amm-pr232-pre-pr231-parent-refresh-20260829-153626`; exact sealed PR
  #231 head `16a633fc5d77ed7c911e9a276f6a1f561ad63fda` was reconciled
  through normal merge `8e5cfa7` without history rewriting.
- **Handoff integrity:** client validation now binds channel, placement,
  channel-native format, canonical filename, proof target, UTM source, and UTM
  medium as one identity. Mixed identities fail before image fetch or Web Share.
- **Identity and compliance:** all four placements reuse untouched approved
  Mike imagery, canonical copy, QR destinations, Black Diamond palette,
  broker-review guardrails, and Equal Housing identification. No generated or
  edited likeness is used.
- **Current acceptance:** exact Node 24.18.0 passes the refreshed focused 2-file
  / 24-test matrix, strict TypeScript, targeted ESLint, Production dependency
  audit, and whitespace proof. The original feature head passed the complete
  local release gate: deployable-source isolation, 14/14 release safety, 268
  files / 3,354 tests, strict TypeScript, full ESLint,
  optimized 59-page Next.js build, and 95/17 route proof. Diff-level redacted
  Gitleaks and the Production dependency audit are clean. Original-pixel QA
  passes the reference/square comparison and four-placement matrix after
  correcting the first render's buyer collision and renter crop. The refreshed
  four-file set is byte-for-byte and pixel-for-pixel identical. Original
  feature head `d0e058da82c852e609d92d737d88aa5d5b6dbf48`
  passed Release Gate run `33255361223`. Immutable Preview
  `dpl_BJjuZsmDVeU9kVHnnrm9ZQm6eJkN` is `READY`; protected run
  `33255500962` passed 18 checks / six intentional mutation skips / zero
  failures plus 4/4 browser cases and returned `PREVIEW_READY`. The log window
  contained zero errors and only the expected no-write SLA 503. The final
  documentation seal and refreshed release acceptance remain conditioned on
  exact-head repetition recorded on PR #232 without a self-invalidating
  content-only follow-up commit.
- **Authority boundary:** Production remains
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`. No Production/Preview
  data write, canonical environment/configuration, lead/event,
  email/SMS/Push, provider, publication/proof, WordPress/DNS, spend, business
  data deletion, or NellySelly mutation occurred. A CLI-created empty Vercel
  worktree project was verified to have no deployment or Production URL,
  removed immediately, and the worktree was relinked to canonical
  `ask-magic-mike`; exact evidence is in the QA record.
- Detailed design and evidence:
  `docs/phase9/GOOGLE_BUSINESS_PROFILE_SQUARE_ASSET.md` and
  `docs/phase9/GOOGLE_BUSINESS_PROFILE_SQUARE_ASSET_QA_EVIDENCE.md`.

## Phase 9 identity-safe wide social preview — 2026-08-29

- **Reuse decision:** the candidate keeps the approved Black Diamond hero,
  exact Our Town logo, existing 4:5/9:16 campaign exports, shared metadata
  registry, and `/social-preview` review surface. It adds no second visual
  system, lead path, database, provider, or publishing tool.
- **Identity and format correction:** metadata now references one 1200x630
  crawler card composed deterministically from the untouched approved Mike
  photograph and logo. The committed JPEG is 160,316 bytes with SHA-256
  `68dea02d8b4beb24eb864363c2c0d30adc1c98f4d5f37872a32848dad037c713`.
  The reviewed AI concept was rejected for facial drift and is not used by the
  application.
- **Crawler truth:** a fresh live 42-check matrix passed 40 checks. Every tested
  AskMagicMike.com browser/social profile returned HTTP 200. Our Town returned
  HTTP 403 only to user agents containing `facebookexternalhit`, including on
  public pages, images, robots, login, admin, and REST paths; `Facebot` and
  `meta-externalagent/1.1` returned 200. This is an upstream host rule, not a
  page or WordPress-content defect, and the candidate does not weaken it.
- **Refreshed-parent local acceptance:** exact Node 24.18.0 passes focused
  metadata/image/release-authority coverage (4 files / 144 tests), strict
  TypeScript, targeted ESLint including the normally ignored generator,
  14/14 release safety, deployable-source isolation, zero known Production
  dependency vulnerabilities, deterministic byte-for-byte asset regeneration,
  ancestry, and whitespace proof. Source/candidate comparison reconfirms the
  exact approved Mike portrait, logo, crop, safe zones, visual hierarchy, and
  claim-safe copy. Final branch-bound CI, immutable Preview, protected no-write
  browser QA, and runtime-log proof remain mandatory on the final pushed head.
- **History-preserving parent refresh:** former PR #227 head
  `cf92b9cb64a7cc5b70c98d629cc86d2289fbfedb` is preserved at
  `rescue/amm-pr227-pre-pr226-parent-refresh-20260829-131437`. Final sealed PR
  #226 head `1a912d29e608d872a84d70c7563e91134d369741` was reconciled through normal
  merge `89b57a7d16beb4f1c157d2f7fca6e49982623f10`; conflicts were limited to
  additive implementation-status and QA ledgers. The earlier source rescue
  `rescue/amm-pr227-pre-pr226-exact-seal-20260829-0611` also remains intact.
- **Authority boundary:** Production remains on
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`. This Draft is stacked after
  sealed PR #226 and has no independent Production authority. No
  Production/Preview data mutation, deployment, lead/message, provider call,
  WordPress/DNS edit, publication, spend, deletion, or NellySelly action
  occurred.
- Detailed evidence: `docs/phase9/SOCIAL_PREVIEW_WIDE_CARD.md` and
  `design-qa.md`.

## Phase 9 release-authority deduplication — 2026-08-29

- **Authenticated disposition:** GitHub reports PRs #187 and #212 closed and
  unmerged with their source branches intact. Their final owner comments record
  supersession by PRs #225 and #221 respectively; no branch or evidence was
  deleted.
- **Ancestry proof:** exact PR #212 head
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a` is an ancestor of current PR
  #221 head `61e152cb7ce03fd1904a06f30435dbe7ef36c4e1`, which is an ancestor of
  exact PR #225 head `f33c87f27bfcbbcad3b5566aefd80909d25303bb`.
- **History-preserving refresh:** former PR #226 head
  `ae666aa6c31ed3726155e110f065b64d4b445040` is preserved at
  `rescue/amm-pr226-pre-pr225-parent-refresh-20260829-1249`. Exact PR #225 was
  reconciled through normal merge
  `954d66cfe629a9d14a73cd1d405ff9535b9de28b`; conflicts were limited to
  additive implementation-status and QA ledgers.
- **Authority boundary:** this Draft changes only seven documentation/test
  files. It adds no application route, dashboard, writer, migration, provider,
  CRM, publisher, consumer workflow, lead/message path, Production authority,
  or NellySelly dependency. PR #210 remains the first ordered Production
  candidate.
- **Refreshed-parent local acceptance:** exact Node 24.18.0 passes the focused
  release-authority contract 22/22, strict TypeScript, targeted ESLint, release
  safety 14/14, deployable-source Ask/NellySelly isolation, Production
  dependency audit, ancestry, and whitespace checks. Final branch-bound CI,
  immutable Preview, protected no-write/browser QA, and runtime-log evidence
  remain mandatory on the final pushed head.

## Phase 9 baseline and target readiness — 2026-08-29

- **Production truth:** a read-only canonical Neon aggregate at
  `2026-08-28T19:45:52.419594+00:00` confirms 6 total lead rows, all 6
  test/suppressed, with 0 eligible live/contactable leads, outcomes,
  first-response milestones, spend rows/dollars, market signals,
  opportunities, or non-test publication proofs. No PII was returned.
- **Reuse decision:** the candidate extends the existing protected Growth
  Command Center and current lead/response/outcome/spend/delivery/Web-Vitals
  aggregates. It reuses and updates PR #187's vetted metric vocabulary while
  excluding that stale candidate's migration, target writer, separate target
  page, and numeric target lifecycle. PR #187 is now closed as superseded with
  its branch, commits, migration, tests, and evidence preserved.
- **Truth control:** 42 fixed evidence contracts now distinguish measured,
  directional, insufficient, not-instrumented, and unavailable states. Zero
  eligible live demand locks every demand-dependent baseline and target; QA
  rows cannot become a denominator. Unknown is never rendered as measured zero.
- **Operator path:** the existing `/admin/growth` page now exposes one compact
  readiness gate, sample-state totals, `Target entry: Locked`, a collapsed
  evidence audit, and a direct handoff to the existing
  `/admin/distribution` command. No parallel dashboard or lead system exists.
- **Provider risk:** canonical Production health is HTTP 200/ready, while Neon
  showed 93% of monthly compute allowance consumed at the check time. The
  changing provider value is documented rather than hard-coded into the app.
- **Authority boundary:** the feature is aggregate-only, server-rendered,
  `report:view` protected, and read-only. It has no form, server action, target
  value, additional database query, database write, migration, message,
  provider call, publication, spend, WordPress/DNS, deployment, deletion, or
  NellySelly action.
- **Hosted safety correction:** exact Preview QA found one inherited ordinary-
  browser telemetry path that bypassed the Preview write guard. One
  privacy-minimized `/ask` page-view was accepted on the Neon Preview branch;
  an aggregate check proved zero matching rows on Production. The candidate now
  applies the existing endpoint-aware Preview mutation guard before rate-limit
  or persistence work in all public analytics and experiment event routes.
  The reconciled contract fails closed with HTTP 503 and no-store semantics.
- **Data-quality correction:** tracked spend is visible without a lead
  denominator but cannot unlock a target; partial revenue/referral-fee totals
  and incomplete paid-channel cost baselines remain unmeasured; agent
  first-follow-up remains explicitly uninstrumented until agent-grain assignment
  evidence exists. All 42 contract keys are unique.
- **Current acceptance:** the previously sealed PR #225 head
  `60599703cf8ac5e65794b696aefaebc6353bbdf0` is preserved at
  `rescue/amm-pr225-pre-pr224-parent-refresh-20260829-1224`. Exact sealed PR
  #224 head `2effb45e2a324c25875dcf7d24019eae8dfdad38` was merged without rebase,
  reset, force push, or conflict at reconciliation commit
  `eab49cbe2926f3726d289473c308363e1f03de9e`. The refreshed tree retains the
  inherited lead-intent truth and keyboard-accessible channel-economics region.
  Final exact head `f33c87f27bfcbbcad3b5566aefd80909d25303bb`
  passes branch-bound GitHub Release Gate `33263356616`: Node 24, doctor
  43/43, safety 14/14, 264 files / 3,324 tests, strict typecheck, full ESLint,
  optimized 59-page build, and 95 active routes / 17 acknowledged duplicates.
  Immutable Preview `dpl_9MNpd2ETo9Zgdd25NKfgue2ScQ7U` is READY at
  `https://ask-magic-mike-fuedubfue-eyes-up-industries.vercel.app`; protected
  run `33263505472` passes 18 read-only checks, six deliberate mutation skips,
  15/15 browser checks, responsive before/after review, and exact-deployment
  runtime inspection with zero warning, error, fatal, or mutating-method log.
  The only 5xx is the expected read-only Preview SLA refusal. The hosted
  browser contract scopes legacy economics labels to their visible section and
  directly exercises the collapsed readiness audit, avoiding duplicate-text
  ambiguity. Production remains unchanged at
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`.
- Detailed design: `docs/phase9/BASELINE_TARGET_READINESS.md`.

## Phase 9 lead-intent default truth — 2026-08-29

- **Reuse decision:** the candidate extends the existing Seller and Buyer
  forms, canonical lead lifecycle command, deterministic score, qualification
  contract, and regression suites. It adds no parallel funnel, lead store,
  CRM, router, provider, notification path, or visual system.
- **Truth correction:** untouched forms no longer assert `Move-in ready`,
  `ASAP`, `30-60 days`, or `Not sure yet`. Optional selects begin blank and
  omitted fields remain unknown through browser serialization and canonical
  persistence. An unchecked buyer preapproval affirmation is omitted rather
  than persisted as a false consumer statement.
- **Decision integrity:** unknown timeline now contributes zero score points,
  persists as `null`, and cannot earn seller A-grade urgency. Explicit
  planning-horizon answers retain their compatibility mapping; `not sure`,
  `unknown`, and unrecognized text do not become 24 months.
- **Current acceptance:** the previously sealed PR #224 head
  `5c75b8f919442c05b607eb666c5595023057d94d` is preserved at
  `rescue/amm-pr224-pre-pr223-accessibility-seal-20260829-1210`. The candidate
  now inherits exact accessibility-refreshed PR #223 head
  `1d893f4c23ca53a1b852a1953b953b40e6f997f3` through merge `614a67a` without
  a force push. Exact Node 24.18.0 focused acceptance passes 4 files / 48 tests,
  strict TypeScript and targeted ESLint. Final exact-head CI, immutable Preview,
  protected browser, security, isolation, and runtime-log evidence is bound to
  PR #224 before any promotion.
- **Authority boundary:** no existing Production row is rewritten; no
  migration, lead/event, communication, provider, WordPress, DNS, deployment,
  publication, deletion, or NellySelly action occurred. Production remains
  unchanged and the established first release gate still controls promotion.
- Detailed design and evidence:
  `docs/phase9/LEAD_INTENT_DEFAULT_TRUTH.md` and
  `docs/phase9/LEAD_INTENT_DEFAULT_TRUTH_QA_EVIDENCE.md`.

## Phase 9 channel-economics truth hardening — 2026-08-29

- **Reuse decision:** original PR #223 head
  `294e08fc8524e515364c7a7bd49cfe8413d3d08c` is preserved at
  `rescue/amm-pr223-pre-pr222-exact-seal-20260829-040442`. This refreshed
  candidate extends exact sealed PR #222 head
  `c6ff9157e66705128a283b98096f74ca8247cdab`, the canonical Growth Command
  Center, Neon lead/outcome/spend reads, deterministic opportunity radar, and
  local-demand decision packets. It adds no parallel dashboard, CRM, database,
  provider adapter, AI estimator, or write path.
- **Truth correction:** `referral_paid` amounts are now recorded costs rather
  than revenue. Repeated typed outcomes use the latest evidence snapshot, and
  signed-client counts, CPQL, cost per signed client, fee burden, and tracked
  contribution are exposed with explicit definitions.
- **Unknown is not zero:** ROAS and tracked contribution are withheld unless
  every close has actual brokerage-revenue evidence and every portal/referral
  close has explicit fee evidence. Partial coverage blocks `scale_candidate`
  and creates exact-count reconciliation opportunities.
- **Authority boundary:** `/admin/growth` remains server-authorized,
  aggregate-only, and read-only. It cannot write an outcome, assign a lead,
  send a message, publish, call a provider, change spend, or touch WordPress,
  DNS, Production, or NellySelly. Tracked contribution is explicitly not net
  income.
- **Current acceptance:** refreshed code-bearing head
  `f52e661bcca09824eafc1c7006102ba9716a16b2` passes exact Node 24.18.0
  isolation, safety 14/14, all 263 files / 3,306 tests, strict TypeScript,
  full ESLint, optimized Next.js 15.5.21 build with 59 generated pages, 95/17
  route proof, clean-tree doctor 43/43, Production dependency audit,
  662-commit and exact-delta gitleaks, ancestry, whitespace, and focused
  Next.js/React security review. Per-close fee matching rejects
  unrelated-channel and same-channel non-close evidence; a dedicated test
  proves explicit zero fee is valid review evidence. Authenticated local
  production-build browser acceptance passes 2/2 desktop/mobile scenarios,
  while CLI inspection confirms only GET requests, zero console errors or
  warnings, contained table overflow, and readable truth states. Exact GitHub,
  immutable Preview, protected hosted-browser, and runtime-log sealing remain
  pending. Production remains unchanged at the current PR #209 release
  authority; this Draft candidate has no Production authority.
- Detailed design and evidence:
  `docs/phase9/CHANNEL_ECONOMICS_TRUTH.md` and
  `docs/phase9/CHANNEL_ECONOMICS_TRUTH_QA_EVIDENCE.md`.

## Phase 9 local-demand decision packets — 2026-08-29

- **Reuse decision:** this stacked candidate extends the canonical Growth
  Command Center, exact sealed PR #221 head, persisted Neon opportunity ledger,
  and existing Search Console/Business Profile workbenches. It adds no second
  dashboard, CRM, provider connector, lead store, AI agent, campaign system, or
  publication path.
- **Implementation:** persisted opportunities now expose only type-allowlisted
  aggregate evidence, bounded geography/segment context, confidence, evidence
  freshness, a deterministic next review decision, source-workbench handoff,
  and an explicit limitation. Raw queries, URLs, consumer data, provider IDs,
  fingerprints, arbitrary evidence, and secret material are not rendered.
- **Source-truth correction:** Google's retired `business_conversations` metric
  is removed from active CSV acceptance. The legacy summary contract pins its
  compatibility field to zero, while additive migration
  `20260825060000_local_demand_metric_truth_guard.sql` rejects every new or
  revised canonical GBP signal claiming the retired metric. Existing rows are
  not scanned, rewritten, or deleted.
- **Authority boundary:** `/admin/growth` remains server-authorized and
  read-only. The packet builder is deterministic; it cannot publish, send,
  assign, mutate a profile, spend, call Google, create a lead, or touch
  WordPress, DNS, Production, or NellySelly.
- **Current acceptance:** exact Node 24.18.0 passes the reconciled focused 8
  files / 60 tests, all 263 files / 3,299 tests, strict TypeScript, full ESLint,
  optimized Next.js 15.5.21 build, 95/17 route proof, 14/14 release safety,
  deployable-source isolation, and Production dependency audit. Disposable
  PostgreSQL 17.11 proves insert/update rejection, historical preservation, and
  role denial. The original code-bearing commit
  `5d550c5e76005f898cbe0482b12ca982359e46e8` is preserved in history; the
  reconciliation is based on exact sealed PR #221 head
  `61e152cb7ce03fd1904a06f30435dbe7ef36c4e1`. Exact clean-head
  GitHub/Preview/browser sealing remains pending; Production is unchanged.
- Detailed design and local evidence:
  `docs/phase9/LOCAL_DEMAND_DECISION_PACKETS.md` and
  `docs/phase9/LOCAL_DEMAND_DECISION_PACKETS_QA_EVIDENCE.md`.

## Phase 9 cross-domain measurement consolidation — 2026-08-29

- **Reuse decision:** exact PR #212 head
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a` contains the existing reviewed
  consent-gated Ask runtime, WordPress bridge 1.2.0, release package, verifier,
  tests, and activation/rollback runbooks. It is being reconciled onto exact
  sealed PR #220 head `19689e95d824d7d06e5f3b60cd18335f53018c93`
  instead of creating a second analytics implementation. Git ancestry proves
  PR #212 is contained in PR #221; PR #212 is closed as superseded with its
  branch and every artifact preserved.
- **Authority boundary:** the cumulative train's canonical Neon event ledger,
  server-owned conversion outcomes, valid pseudonymous funnel identity, Web
  Vitals privacy controls, and automated-browser exclusion remain authoritative.
  External analytics receives only registered public events and allowlisted
  dimensions through the dedicated `ammDataLayer`; no PII or test traffic is
  eligible.
- **Fail-closed activation:** Ask requires exact Production-only container
  configuration and explicit analytics consent. Advertising storage, user data,
  and personalization stay denied. The canonical WordPress bridge has its own
  default-off flag and requires the current consent provider's exact `allow`
  state. Neither boundary is activated by this consolidation.
- **Security hardening:** both public browser analytics routes require a present
  exact approved Origin. Experiment JSON is bounded at 4,096 bytes and exact
  identifiers are validated before repository access. WordPress withdrawal
  sends a denied update, removes the injected tag and only Google cookies, and
  prevents duplicate same-page runtime loading.
- **Preview data hardening:** final application head
  `735cc8930eb595b550adf69ace1d6fef3b82a939` applies the existing
  endpoint-attested Preview mutation guard to both telemetry routes before rate
  limiting or repository access. Read-only Preview returns HTTP 503 with
  `private, no-store`; controlled Preview mutation remains a two-flag explicit
  exception and was not enabled.
- **Live hold:** the read-only public preflight remains `HOLD` because Our Town
  currently initializes legacy GTM head/noscript code before the deferred
  cookie-choice provider. WordPress replacement and controlled runtime QA need
  their own later owner gate before Ask-side measurement can be considered.
- **Former-head local acceptance:** exact Node 24.18.0 passed 9 focused files / 77 tests,
  all 261 files / 3,275 tests, strict TypeScript, full ESLint, optimized Next.js
  15.5.21 build, 95 active routes / 17 acknowledged duplicates, 14/14 release
  safety, and system isolation. Isolated Chromium passes 4/4 mutation-blocked
  runtime scenarios. PHP 8.1 syntax, package integrity, source/archive parity,
  and checksum verification pass for the refreshed bridge 1.2.0 artifact.
- **Exact application-head evidence:** Node 24 run `33239065433`, immutable
  Preview `dpl_8bWUx49oChfNeUrQpErDA9XxwK24`, and protected run `33239236233`
  pass 261 files / 3,291 tests, typecheck, lint, build, isolation, safety 14/14,
  doctor 43/43, 18 read-only checks, six intentional mutation skips, 4/4 browser
  scenarios, and `PREVIEW_READY`. Nine inspected desktop/mobile captures have
  no overflow or console warning/error; runtime logs show the expected 503 and
  no warning/error/fatal entry.
- **Release order:** PR #209's Production authority is consumed and cannot be
  reused. This candidate follows exact sealed PR #220 and still requires its
  own later approval after the separate WordPress gate. One PII-free automatic
  Preview page-view was persisted on superseded head `84ab4568...`, disclosed,
  and left intact; no lead or communication resulted. No Production,
  environment, WordPress, DNS, publication, spend, deletion, provider, or
  NellySelly action has occurred.
- Detailed design and historical evidence:
  `docs/phase9/CROSS_DOMAIN_MEASUREMENT_ACTIVATION.md` and
  `docs/phase9/CROSS_DOMAIN_MEASUREMENT_QA_EVIDENCE.md`.
## PR #220 downstream reconciliation — 2026-08-29

- Preserved prior PR #220 head `5e605ca8bd8b313f7a4c29b2d1220c7c40a477a3`
  at `rescue/amm-pr220-pre-pr219-exact-seal-20260829-012049` before change.
- Merged exact sealed PR #219 head
  `b628fc00fc6b03d89871c65d884fe649db025968` normally, without force push,
  at exact-parent merge commit
  `61c162143cb9892f88a2318d32888ba2d644f329`. Product, API, migration,
  route, and focused-test files merged without conflict.
- The candidate reuses the authenticated Growth Command Center, shared bounded
  ingress transport, canonical `market_signals` and advisory
  `market_opportunities`, exact Neon endpoint guards, `growth:manage` RBAC,
  and immutable audit ledger. It adds no parallel CRM, database, dashboard,
  Google/provider connector, profile editor, publisher, lead path, or message
  path.
- Reconciled code-bearing head `d73abeb1f2979f3c217fc5b0a873b483e0bd5561`
  passes isolation, safety 14/14, all 257 files / 3,238 tests, strict
  TypeScript, ESLint, optimized Next.js 15.5.21 build with 59 generated pages,
  95/17 route proof, release doctor 43/43, zero known Production dependency
  vulnerabilities, 655-commit gitleaks, exact-parent ancestry, whitespace,
  and focused Next.js/React/SQL security review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 37 migrations and
  passed the spend, organic-search, and local-profile executable contracts.
  Browser and legacy-role execution remained denied, every synthetic
  transaction rolled back, and database-native assertion confirmed zero
  retained synthetic rows or receipts. The stopped cluster was moved
  recoverably to Trash; no remote database was connected.
- Fresh exact-head CI, immutable Preview, protected no-commit browser/visual,
  and bounded runtime-log proof remains mandatory after the documentation-only
  evidence seal.
- PR #220 remains Draft with `GROWTH_LOCAL_PROFILE_IMPORT_ENABLED=false` and
  no Production, migration, feature-gate, report-import, Google, WordPress,
  DNS, lead/message, or NellySelly authority.

## PR #219 downstream reconciliation — 2026-08-29

- Preserved prior PR #219 head `5486bed20272d2a661bc28a0e3a4a4576b2cb11f`
  at `rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`.
- Merged exact sealed PR #218 head
  `f065d8801bec295c99185d846ff4bc38de2a0a6f` without force push at
  exact-parent reconciliation head
  `f2754d0e1858c1afcf639977051f3488ab591f89`. Product, API, migration,
  shared-ingress refactor, route, and test files merged automatically with no
  conflict.
- The candidate reuses the existing Growth Command Center, growth ledgers,
  shared bounded ingress transport, endpoint attestation, `growth:manage`
  permission, and audit system. It adds no Google/provider connection,
  parallel database/dashboard, content publisher, lead path, or message path.
- Reconciled head `5d598cc2228b6564af883a9716aedf1aa28cb2fb`
  passes isolation, safety 14/14, 252 files / 3,210 tests, strict TypeScript,
  ESLint, the optimized 57-page Next.js 15.5.21 build, 92/17 route proof,
  release doctor 43/43, zero known Production dependency vulnerabilities,
  653-commit gitleaks, exact-parent ancestry, whitespace, and focused security
  review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 36 migrations and
  passed both spend and organic executable contracts. Execution remained
  denied to anon, authenticated, and service roles; rollback left zero
  synthetic rows or receipts. The stopped cluster was moved recoverably to
  Trash and no remote database was connected.
- PR #219 remains Draft with `GROWTH_SEARCH_IMPORT_ENABLED=false` and no
  Production or import authority. Fresh exact-head GitHub CI, immutable
  Preview, protected no-commit browser/visual, and bounded runtime-log proof
  remain mandatory after the documentation-only evidence seal.

## PR #218 downstream reconciliation — 2026-08-29

- Preserved prior PR #218 head `cd087e5c5c0fda82a3175b86b550c966120eb2ab`
  at `rescue/amm-pr218-pre-pr217-exact-seal-20260829-001928`.
- Merged exact sealed PR #217 head
  `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf` without force push. Application,
  API, migration, and test files merged automatically; only `CHANGELOG.md` and
  this additive release ledger required manual reconciliation. Exact-parent
  merge head is `693af26f3fb536f62784b475cbbebebfde28ff9f`.
- PR #218 remains Draft with `GROWTH_SPEND_IMPORT_ENABLED=false` and no
  Production authority. Former local, PostgreSQL, CI, Preview, browser, visual,
  and runtime-log proof is historical until repeated on the refreshed exact
  head.
- Exact-parent code-bearing/reconciliation head
  `894643a60bd9fb50b441dccb3d2d3d8e6b5c805b` passes 6 focused files / 47
  tests, all 247 files / 3,184 tests, strict TypeScript before and after build,
  full ESLint, optimized Next.js 15.5.21 build with 55 generated pages, 89/17
  route proof, release doctor 43/43, safety 14/14, Ask/Nelly isolation,
  Production dependency audit, a 651-commit redacted secret scan, ancestry,
  whitespace, and focused Next.js/React/SQL security review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 35 migrations. The
  spend-ingress executable contract passed, role execution remained denied,
  and rollback left zero synthetic channels, campaigns, or receipts. Fresh
  exact-head GitHub CI, immutable Preview, protected no-commit browser/visual,
  and bounded runtime-log proof remain pending after the documentation seal.

## PR #217 downstream reconciliation — 2026-08-28

- Preserved prior PR #217 head `d04984b4d162f13c79af261beb55a82f15a86b80`
  at `rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`.
- Merged exact sealed PR #216 head
  `211485df28fc818ab783ed357df8486f1460d5e2` without force push. Application
  files merged automatically; only additive release-history ledgers required
  manual reconciliation. Exact-parent application head is
  `e616170657861c3dd83fae43b28bef9cf89506af`.
- PR #217 remains Draft with no Production authority. Exact sealed head
  `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf` passed complete local, CI,
  immutable Preview, protected no-write browser, visual, security, isolation,
  and runtime-log acceptance.
## Phase 9 marketing-spend ledger ingress — 2026-08-24

- **Reuse decision:** repository, migration-history, and branch searches found
  the existing canonical `marketing_channels`, `marketing_campaigns`,
  `marketing_spend_daily`, Growth Command Center, KPI calculations,
  `growth:manage` permission, and immutable audit ledger—but no spend importer.
  This candidate extends those assets on exact sealed Draft PR #217 head
  `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf`; it adds no parallel database,
  dashboard, provider adapter, campaign manager, or lead system.
- **Implementation:** one protected paste/file workbench, two same-origin
  bounded APIs, a strict 19-column CSV v1 normalizer, deterministic row/batch
  fingerprints, minimized receipts, and one owner-only atomic Neon function.
  Raw CSV is never persisted. Exact replay is idempotent; channel, campaign,
  and daily-fact creation/revision retain immutable before/after evidence;
  conflicting identities and synthetic/QA markers in any identity field fail
  closed.
- **Authority boundary:** `GROWTH_SPEND_IMPORT_ENABLED=false` is the safe
  default. Preview cannot mutate, browser/database roles cannot execute the
  import contract, and commits also require exact configured Ask Magic Mike
  Production-endpoint attestation. This feature cannot contact a provider,
  change a budget, launch a campaign, create a lead, send a message, or touch
  WordPress, DNS, or NellySelly.
- **Historical acceptance:** former code-bearing head passed 5 focused files /
  30 tests, all 247 files / 3,182 tests,
  strict TypeScript, full ESLint, optimized Next.js 15.5.21 build,
  89/17 route proof, 14/14 release safety, Production dependency audit, system
  isolation, script syntax, and whitespace checks pass on Node 24.18.0. A fresh
  disposable PostgreSQL 17.11 rebuild of all 35 migrations passes executable
  insert/replay/revision, malformed-date, identity, synthetic-refusal, audit,
  immutability, role-denial, and rollback contracts. Exact code-bearing commit
  `ed02f26af99911253f398ec5c1448e183a5dd976` has clean 43/43 release doctor,
  staged/full-history secret, exact-base ancestry, and diff proof. GitHub
  Release Gate `32795263654`, immutable Preview
  `dpl_2E7rVLVQy5wHnabTwcCSjpwSjpS6`, and protected QA `32795486986` pass.
  All 8 browser scenarios pass, including authenticated 1280 px and 390 px
  spend-workbench proof with zero commit requests, zero overflow, and zero
  browser errors. The exact-deployment log audit found no error/fatal log,
  commit endpoint call, provider action, or spend-ingress API request. That
  proof must be repeated on the refreshed exact head before release.
- **Release order:** PR #209 is accepted; Draft PR #210 remains the first
  pending application candidate. This stacked candidate cannot leapfrog PRs
  #210–#217 and requires its own later,
  exact migration/merge/deploy approval; importing one reviewed real report is
  an additional report-specific approval.
- Detailed scope:
  `docs/phase9/MARKETING_SPEND_INGRESS_RELEASE_GATE.md` and
  `docs/phase9/MARKETING_SPEND_INGRESS_QA_EVIDENCE.md`.

## Phase 9 vendor ingress contract lab — 2026-08-24

- **Reuse decision:** this candidate extends the existing Phase 9
  `vendor-ingress.ts` normalization contract on exact sealed Draft PR #216 head
  `211485df28fc818ab783ed357df8486f1460d5e2`; it adds no parallel lead API,
  database, CRM, provider router, webhook store, or notification path.
- **Implementation:** one `growth:manage`-protected page and one same-origin,
  512-byte API exercise fixed Zillow, Follow Up Boss, Meta, and Google test
  profiles. Follow Up Boss and Meta verify their documented raw-body HMAC
  contracts, Google maps documented `user_column_data`, and Zillow fails closed
  until authenticated provider onboarding supplies the real contract.
- **Truth boundary:** every run is `isTest=true` and `INTERNAL QA — DO NOT
  CONTACT`; caller-supplied payloads, raw-payload retention, provider calls,
  database writes, lead creation, and live activation are structurally absent.
  The shared normalizer now treats missing test state as a review reason and
  continues to refuse inferred channel consent.
- **Final acceptance:** exact head
  `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf` passes 6 focused files / 46
  tests, all 242 files / 3,153 tests, strict TypeScript before and after build,
  full ESLint, optimized Next.js 15.5.21 build with 53 generated pages, 86/17
  route proof, release doctor 43/43, safety 14/14, Ask/Nelly isolation,
  Production dependency audit, a 650-commit redacted secret scan, ancestry,
  whitespace, clean-worktree proof, and focused Next.js/React security review
  on Node 24.18.0.
- **CI/Preview proof:** GitHub Release Gate `33232958503` passed with artifact
  `9709073285` and digest
  `sha256:773f2f0577a15cf289e3003f2c9288021e6c18804795708cc97f68ab31f64e27`.
  Immutable READY Preview `dpl_BbDatyCASikChD1UPt33znkwXWmb` at
  `https://ask-magic-mike-f0xvpp05w-eyes-up-industries.vercel.app` passed
  protected workflow `33233146887`: 17 no-write checks, 6 deliberate mutation
  skips, and 6/6 desktop/mobile browser scenarios. Runtime logs contained no
  POST/PUT/PATCH/DELETE or warning/error/fatal entry during the QA window.
- **Safety:** no Production, environment, schema, database row, lead/event,
  message, provider credential/call, WordPress/DNS, publication, spend,
  deletion, or NellySelly action.
- Detailed scope:
  `docs/phase9/VENDOR_INGRESS_CONTRACT_LAB.md` and
  `docs/phase9/VENDOR_INGRESS_CONTRACT_LAB_QA_EVIDENCE.md`.

## Current accepted release — 2026-08-28

- PR #209 reviewed head `b28b380f2cc3f9b63b2c0048b398e97a88dfee4b`
  merged as `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and passed
  same-commit Production acceptance on deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.
- The dedicated encrypted Production limiter secret is present by name/scope;
  every durable limiter readiness boolean is true and strict monitoring passes
  9/9. The exact gate is consumed and exhausted.
- Draft PR #210 is the next ordered application candidate, sealed at exact head
  `93af400494a94a8d8aedb09ece16bbff4dfd214b`; it remains unmerged and
  un-deployed pending its separate exact gate.
- No PR #210 Production, environment, database, lead, event, notification,
  WordPress, DNS, publication, spend, deletion, or NellySelly mutation has
  occurred.
- Immutable acceptance evidence:
  `docs/phase9/DURABLE_RATE_LIMIT_PRODUCTION_ACCEPTANCE_2026-08-28.md`.

## PR #211 downstream reconciliation — 2026-08-28

- Preserved prior PR #211 head `5d566a4a14d4a7cb67175683fdf099e8d62747b7`
  at `rescue/amm-pr211-pre-pr210-exact-seal-20260828-213129`.
- Merged exact sealed PR #210 head
  `93af400494a94a8d8aedb09ece16bbff4dfd214b` without force push while
  preserving the existing Ask clarity, shared skip link, focus target, and
  keyboard contracts.
- PR #211 remains Draft with no Production authority. Former proof is
  historical until fresh exact-head Node 24 and protected no-write Preview QA
  pass.

## PR #213 downstream reconciliation — 2026-08-28

- Preserved prior PR #213 head `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea`
  at `rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`.
- Merged exact sealed PR #211 head
  `c5700eda5e32ff6ead9a985c86b811a3c46e1e66` without force push. Application
  files merged without manual resolution; only additive history and executable
  release-authority records conflicted.
- PR #213 remains Draft with no Production authority. Its responsive menu and
  focus contracts require fresh exact-head Node 24, immutable Preview,
  screenshot-first responsive, browser-interaction, and no-write runtime proof.

## Phase 9 funnel-event identity integrity — 2026-08-28

- **Reuse decision:** the stacked candidate extends only the existing browser
  submission UUID, `POST /api/events`, Neon analytics repository, and atomic
  lead command in Draft PR #216 on exact Draft PR #215 head
  `c53cec6043525b593b254c457efdbbe5a29c0520`; no tracker, cookie, form, API,
  database, CRM, provider, or notification system is added.
- **Conflict prevented:** inspection proved that pre-creating `sessions` for
  anonymous events would make `capture_public_lead_v1` return an idempotency
  conflict and could block a real lead. That approach was removed before any
  commit or database use.
- **Implementation:** validated pseudonymous funnel UUIDs are stored only as a
  protected repository-injected analytics property, then naturally match
  `sessions.id` when durable lead capture succeeds. Home Value, seller,
  buyer/renter/open-house, Ask lead preparation, and appointment events share
  the established UUID. Home Value synchronously creates or reuses that UUID
  before the first address event, so its earliest stage cannot outrun passive
  client initialization; unavailable secure browser crypto fails truthfully.
- **KPI authority:** browser success remains available to GA/GTM/PostHog and
  widget parents, while `/api/events` rejects browser-authored lead/widget
  creation, qualification, appointment-request, and notification outcomes. The
  server's post-storage event is the only canonical lead-conversion row;
  replay cannot inflate it. Ask now emits its browser-only conversion signal
  after a fresh successful durable response, matching the other funnels, and
  suppresses that signal on idempotent replay.
- **Privacy/consent:** the UUID is absent from browser dimensions, URLs, PII,
  and public properties. Buyer/seller email/call permission now requires the
  corresponding supplied contact method. Historical null-session events are
  not backfilled or reclassified.
- **Final sealed acceptance:** exact head
  `211485df28fc818ab783ed357df8486f1460d5e2` on Node 24.18.0 passes 12 focused
  files / 89 tests, all 239 files / 3,137 tests, strict TypeScript, full ESLint,
  optimized Next.js 15.5.21 build, 84/17 route proof, release doctor 43/43,
  safety 14/14, system isolation, dependency audit, a 648-commit redacted
  tracked-history secret scan, ancestry, diff, and clean-worktree proof.
- **Immutable Preview/browser proof:** READY deployment
  `dpl_5AMQELNpzwU52cA4SN2ZivwzPt6f` at
  `https://ask-magic-mike-mo6wo5449-eyes-up-industries.vercel.app` passed Release
  Gate `33231948183` and exact-branch protected run `33232071508`: 17 read-only
  checks, six deliberate mutation skips, all six desktop/mobile browser
  scenarios, zero unexpected writes, `GO`, and `PREVIEW_READY`. Runtime filters
  found zero POST/PUT/PATCH/DELETE and zero warning/error/fatal records in the
  acceptance window.
- **Parent refresh and proof correction:** former head
  `a6098ab4ee7a13d024bafc08264628e2691a8e06` remains preserved at
  `rescue/amm-pr216-pre-pr215-exact-seal-20260828-231335`. The default-branch
  bootstrap run retained valid read-only evidence but exercised only three
  browser scenarios; exact-branch run `33232071508` is the authority for all
  six. PR #216's shared fail-closed mutation interceptor remains intact.
- **Safety:** no Production, environment, schema, lead, message, provider,
  WordPress/DNS, publication, spend, deletion, or NellySelly action.
- Detailed scope:
  `docs/phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY.md` and
  `docs/phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY_QA_EVIDENCE.md`.

## Phase 9 home-value completion integrity — 2026-08-24

- **Reuse decision:** Draft PR #215 extends the released Home Value funnel and
  canonical lead command on exact sealed Draft PR #214 head
  `81a2c7544318d630437ed3e86cbea029c5c9b57d`; add no form, endpoint, database,
  CRM, provider, notification path, or analytics system.
- **Evidence:** one bounded, aggregate-only Production sequence reached
  `contact_submitted` but not `lead_created`. Missing historical session and
  funnel dimensions prevent identity or prospect classification; the record is
  explicitly unclassified and no conversion rate is claimed.
- **Implementation:** persist from the first valid Contact step, make phone
  optional on the current email-first Home Value UI, accept email or phone at
  the API contract, apply the same bounded email/phone validation in the UI and
  API, prevent call-consent evidence without a phone, and emit a privacy-
  allowlisted `lead_submit_failed` event on durable failure.
- **Parent refresh:** former head `2d020358da1d7f95ebf82c47c0f1c0e83d6216d2`
  is preserved at
  `rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229`. Exact sealed PR #214
  merged with conflicts limited to additive changelog, QA-evidence, and
  release-authority records; no application file required manual conflict
  resolution.
- **Application acceptance:** exact parent-refresh head
  `eff8fc04449fab4fd34cd0fb69735e6787d0b382` passed 236 files / 3,108 tests,
  strict types, lint, optimized build, 84/17 route proof, doctor 43/43, safety
  14/14, isolation, dependency/secret checks, Release Gate `33229869967`,
  READY Preview `dpl_8qNH7Ry1gSPqdSwHrRNM3Y9LHhZR`, and protected no-write
  run `33230015801` with 17 pass / 6 intentional skips / 0 fail and 3/3
  intercepted browser checks.
- **Acceptance boundary:** current-run desktop/390/320 inspection found no
  horizontal overflow and proved empty-address focus/error behavior without a
  lead. Four Preview page-load telemetry POSTs were recorded explicitly; no
  lead/delivery/provider request occurred. The resulting evidence-only head
  still requires its own exact-head CI and protected Preview proof before the
  later gate.
- **Safety:** no Production, environment, database, lead/event, message,
  provider, WordPress/DNS, publication, spend, deletion, or NellySelly action.
- Detailed scope:
  `docs/phase9/HOME_VALUE_COMPLETION_INTEGRITY.md` and
  `docs/phase9/HOME_VALUE_COMPLETION_INTEGRITY_QA_EVIDENCE.md`.

## Phase 9 lead-alert brand identity — 2026-08-24

- **Reuse decision:** extend only the canonical lead-alert HTML renderer and
  protected Message Review Studio in Draft PR #214 on exact sealed Draft PR #213
  head `d2a1bf01d0962e07dd1e460acd4c295e145cf6a8`. Preserve score bands, routing,
  recipients, outbox, BCC, providers, retry, suppression, and delivery gates.
- **Implementation:** `lead_alert_email_v3` composes the approved Our Town logo
  and Mike avatar over the existing privacy-safe HOT/ACTIVE/NEW/QA backgrounds.
  Lead facts remain selectable HTML/plain text. The protected studio renders
  three `[TEST]` synthetic no-send states with no contact details.
- **Ledger integrity:** stored v1/v2 email alerts retain the legacy renderer on
  retry; unknown recorded template versions fail closed instead of silently
  changing content.
- **Historical candidate acceptance:** the former head passed 234 files / 3,088 tests, strict
  TypeScript, full ESLint, optimized Next.js 15.5.21 build, 84/17 route proof,
  14/14 release safety, Ask Magic Mike / NellySelly deployable-source
  isolation, no known Production dependency vulnerabilities, a redacted
  599-commit history scan with no leaks, and whitespace verification. Exact
  application head `46a9af538302951f1190df24a8bdf64f3be07450`
  is READY on immutable Preview deployment
  `dpl_CX5UbqeFUVE9BDdVCmhpttmNyy3Q`; 1280 × 720 and 390 × 844 rendered
  acceptance passes with zero horizontal overflow, no send controls, and a
  clean browser/runtime-error log. This proof is historical until the refreshed
  head is reverified.
- **Parent refresh:** former PR #214 head
  `94e3d66190df138d42c1321adfeb0cefb0478545` is preserved at
  `rescue/amm-pr214-pre-pr213-exact-seal-20260828-222353`; exact sealed PR #213
  `d2a1bf01d0962e07dd1e460acd4c295e145cf6a8` merged with conflicts limited to
  additive changelog and release-authority records. Fresh
  exact-head CI, immutable Preview, no-send visual, and deployment-log proof
  are mandatory before the later gate can be requested.
- **Safety:** no generated likeness was accepted; no lead, email/BCC, SMS/MMS,
  Push, consumer acknowledgment, provider call, database write/migration,
  Production action, WordPress/DNS change, publication, spend, deletion, or
  NellySelly action.
- Detailed scope: `docs/phase9/LEAD_ALERT_BRAND_IDENTITY.md`.

## Phase 9 responsive conversion-identity polish — 2026-08-24

- **Reuse decision:** extend only the shared `BlackDiamondHeader` on exact
  sealed Draft PR #211 head `c5700eda5e32ff6ead9a985c86b811a3c46e1e66`;
  preserve the existing Black Diamond identity, Ask CTA, skip link, routes,
  forms, lead command, consent, analytics, and providers.
- **Evidence:** fresh exact-Preview screenshots show healthy desktop/mobile
  identity and conversion surfaces, but the full intent navigation is hidden
  below `md`, leaving only an implicit logo return or distant footer for path
  switching.
- **Implementation:** Draft PR #213 adds one compact intent menu, labeled
  navigation landmarks, active-route `aria-current`, 44-pixel trigger,
  Escape/focus return, outside-pointer close, narrow-phone sizing, and the
  existing smooth-scroll declaration expected by Next.js.
- **Local acceptance:** 3 focused files / 11 tests, all 232 files / 3,082
  tests, strict TypeScript, full ESLint, optimized Next.js 15.5.21 build with
  52 generated pages, 83/17 route proof, release safety 14/14, system
  isolation, no known Production dependency vulnerabilities, a redacted
  596-commit gitleaks scan, and whitespace verification pass.
  In-app browser checks at 1280×720, 390×844, and 320×700 prove complete
  labels, current-route state, Buyer→Seller navigation, automatic close,
  outside-click close, Escape focus return, no horizontal overflow, and a
  warning/error-free fresh console.
- **Compatibility correction:** the first remote run rejected one stale
  source-string assertion for the Plan link after navigation moved into one
  typed registry. The contract now requires the exact registry destination
  and label; the full suite passes. Immutable exact-head remote proof remains
  pending after the evidence commit.
- **Safety:** no field fill, submit, migration, Production action, lead/event,
  message, provider call, WordPress/DNS change, publication, spend, deletion,
  or NellySelly action.
- **Current parent refresh:** former PR #213 head
  `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea`
  is preserved at
  `rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`; fresh exact-head
  proof is required after the conflict-free application merge.
- Detailed scope:
  `docs/phase9/RESPONSIVE_CONVERSION_IDENTITY_POLISH.md` and
  `docs/phase9/RESPONSIVE_CONVERSION_IDENTITY_POLISH_QA_EVIDENCE.md`.

## Phase 9 Ask conversion clarity and keyboard access — 2026-08-23

- **Reuse decision:** stack only the focused Ask/public-header correction on
  canonical alias candidate `e41957ee6abe62a5ec15207cb3574efd6fc79ecc`.
  Rescue ref `rescue/amm-pre-ask-conversion-accessibility-20260823-2235`
  preserves the exact pre-change state.
- **Evidence:** the current rendered Production DOM has one main landmark and
  a labeled Ask field but no skip link; the active source still used
  product-centric “advisor interface” language and allowed a blank Send action
  to no-op before the server's required-message boundary.
- **Implementation:** the shared Black Diamond header now exposes the first
  focusable `Skip to main content` link, focuses one `#page-content` target,
  and retains an href fallback. All 12 shared-header surfaces provide that
  target with `tabIndex={-1}`. `/ask` uses consumer-action copy and a visible
  required label; its existing field now declares the canonical 2,000-
  character limit, name, type, autocomplete behavior, mobile enter hint, and
  contextual description.
- **Local acceptance:** exact Node 24.18.0 passes 3 focused files / 11 tests,
  all 231 files / 3,065 tests, strict typecheck, ESLint, optimized Next.js
  15.5.21 build with 52 static pages, 83/17 route proof, release safety 14/14,
  system isolation, a no-vulnerability Production dependency audit, and a
  redacted 574-commit secret scan with no leaks.
- **Protected Preview acceptance:** the exact candidate head
  `af22494d96bc3fe1ec930a24f350e4b3e863fe2f` renders on its immutable Vercel
  Preview. Fresh in-app checks prove skip-link focus treatment and target
  activation, native empty-submit blocking with no API request, 390x844
  no-overflow geometry, and a warning/error-free inspected console.
- **Evidence limit:** current in-app screenshot capture timed out on both the
  target and a neutral control page; the operating-system fallback returned an
  unusable black virtual-surface frame. No screenshot was accepted and no
  screenshot-level visual-audit or full-accessibility claim is made.
- **Safety:** no migration or external mutation. This candidate follows the
  sealed PR #209 and Draft PR #210 stack; it has no independent authority to
  merge or deploy.
- Detailed scope: `docs/phase9/ASK_CONVERSION_ACCESSIBILITY_CLARITY.md` and
  `docs/phase9/ASK_CONVERSION_ACCESSIBILITY_CLARITY_QA_EVIDENCE.md`.
## Phase 9 field-experience trust fast-track — 2026-08-23

- **Reuse decision:** preserve PR #199 exact head
  `7690e54b3c1d225d09ab8838774c4ac9c6316cce` at
  `rescue/amm-pr199-pre-fast-track-20260823-175922`, then apply only its unique
  field-experience implementation to canonical PR #205 head
  `b9bbf61e60d94e980ea2453560966e1730655592`. PR #187's KPI-target migration,
  numeric targets, and stale stack remain excluded.
- **Collection boundary:** the root app reports only LCP, INP, and CLS on exact
  canonical Production hosts and registered public routes. Preview,
  automation, known internal QA, private routes, and malformed callers fail
  closed before persistence.
- **Privacy upgrade:** durable observations have no lead/session association or
  attribution and retain no query, raw URL, raw agent, IP, cookie, token, or raw
  metric ID. A domain-separated SHA-256 digest supports bounded duplicate
  suppression without preserving the browser-generated identifier.
- **Protected intelligence:** the existing Growth Command Center shows
  aggregate-only overall/mobile/desktop P75 values with truthful unavailable
  states and sample-maturity labels. The query is fixed, parameterized,
  deduplicated, and capped at 25,000 recent eligible rows.
- **Local acceptance:** exact Node 24.18.0 passes 5 focused files / 29 tests,
  all 226 files / 3,031 tests, strict typecheck, ESLint, optimized Next.js
  15.5.21 build with 52 static pages, 83/17 route proof, safety 14/14, system
  isolation, and a no-vulnerability Production dependency audit.
- **Remote acceptance:** Draft PR #206 application head
  `1954f8ee63f0de40c5c7326f34b7acf6be94cf27` is cleanly mergeable and passes
  GitHub Node 24 run `32669693059`, READY immutable Vercel Preview
  `dpl_8LnG6VoGbskJpERDGXbf7YNDHDCL`, and protected no-write run
  `32669923014`: 17 read-only passes / 6 intentional mutation skips / 0
  failures, Widget 2/2, doctor 43/43, safety 14/14, release-candidate GO, and
  `PREVIEW_READY`. Preview fatal/error/warning log queries each returned zero.
- **Rendered acceptance:** exact optimized build is visually clean at
  1440x1000 and 390x844 with one main, no horizontal overflow, truthful
  unavailable-state rendering, zero `/api/events` requests, and zero browser
  warnings/errors.
- **Release status:** no migration or Production mutation. Keep Draft behind
  #202 → #203 → #204 → #205. The final documentation-only head must retain
  green exact-head checks recorded on PR #206; no Production gate is issued.
- Detailed scope: `docs/phase9/FIELD_EXPERIENCE_TRUST.md`.

## Phase 9 public hero delivery fast-track — 2026-08-23

- **Reuse decision:** apply only PR #201 implementation commit
  `1ca7ff00eacbc7da6d9b861431109c3d009c6861` on refreshed PR #203 head
  `6da82fe6d9a87f0ced6da5f4cdae04defea5e4ae`. Clean ordered merge
  `010e18fcf610997948fcf694361c4b6b2423884f` carries that predecessor into
  PR #204; rescue branch
  `rescue/amm-pr204-pre-pr203-refresh-20260823-173028` preserves the prior
  sealed head. Preserve the released Black
  Diamond composition, Mike imagery, Our Town identity, copy, CTAs, routes,
  attribution, forms, and canonical lead pipe.
- **Live evidence:** a fresh write-intercepted Production audit at 390 × 844
  loaded one 289,876-byte mobile hero; 1440 × 900 loaded one 503,788-byte
  desktop hero. Both current elements report `loading=auto` and
  `fetchPriority=auto`, with zero browser warnings/errors.
- **Implementation:** use the existing Next.js `getImageProps` optimizer at the
  established 768-pixel art-direction breakpoint, intrinsic dimensions,
  `sizes="100vw"`, eager loading, and high fetch priority. No artwork, copy, or
  layout is regenerated.
- **Local acceptance:** after the ordered refresh, exact Node 24.18.0 passes 4
  focused files / 15 tests, the complete 221-file / 2,994-test suite, strict
  typecheck, ESLint, optimized
  Next.js build with 52 static pages, 82/17 route-manifest proof, 14/14 release
  safety, system isolation, a no-vulnerability Production dependency audit,
  empty migration delta, and redacted staged secret scan.
- **Rendered acceptance:** fresh write-intercepted optimized builds load one
  hero resource per viewport: 56,792 bytes at 390 × 844 and 108,706 bytes at
  1440 × 900. Art direction, identity, H1, CTAs, eager/high priority, one main,
  and zero overflow remain correct with zero browser warnings/errors.
- **Superseded pre-refresh remote acceptance:** Draft PR #204 application head
  `e1024cd1234dc5b200ed953705127f9efa4bb8fd` passes GitHub run `32662812090`,
  READY Preview `dpl_CVWc7vVZ2Ju8qv7KanpYshn4uKKS`, and protected no-write run
  `32662942232`: 17 pass / 6 intentional write skips / 0 fail, Widget 2/2,
  doctor 43/43, safety 14/14, release candidate GO, `PREVIEW_READY`, and zero
  fatal/error/warning runtime logs. Deployed browser-negotiated image responses
  are 56,744 bytes mobile and 108,706 bytes desktop.
- **Dependency:** this candidate follows PR #203, which follows PR #202. It is
  not release-eligible until both predecessors release in order, this branch is
  refreshed onto exact `main`, and fresh exact-head proof passes.
- **Safety:** no migration or Production mutation. The refreshed Draft head
  requires fresh exact-head CI/Preview/protected proof recorded in PR #204. No
  Production gate is issued.
- Detailed scope:
  `docs/phase9/PUBLIC_HERO_DELIVERY_TRUST.md` and
  `docs/phase9/PUBLIC_HERO_DELIVERY_TRUST_QA_EVIDENCE.md`.

## Phase 9 owned-traffic activation fast-track — 2026-08-23

- **Production evidence:** aggregate-only Neon reads at 20:23 UTC report six
  safely suppressed QA leads and zero live/contactable leads, outcomes,
  response samples, spend, experiments, or non-test publication proofs.
- **Reuse decision:** transplant only the unique reviewed application work from
  PRs #197 and #198 onto PR #204, now refreshed through exact predecessor head
  `bd16a115af9f4b17dccab0bb7dad41682816be5d`. Clean ordered merge
  `52a9b31cbab8da2e2ac251fe483bbbbd9a3f34e8` carries it into PR #205. Rescue
  references `rescue/amm-pre-owned-traffic-fast-track-20260823-1625` and
  `rescue/amm-pr205-pre-pr204-refresh-20260823-173028` preserve both earlier
  boundaries.
- **Scope:** separate audited legacy Our Town attribution from exact KPI
  evidence, and expose authenticated GET-only readiness manifests for the
  existing homepage, home-value, and We Buy Homes WordPress CTAs.
- **Safety:** no stored attribution rewrite, migration, Production action,
  WordPress edit, form replacement, provider send, spend, DNS change, deletion,
  or NellySelly action. A readiness manifest cannot authorize publication.
- **Recommended first action:** after this application stack is eventually
  released, prepare one separately approved homepage href replacement using a
  fresh matching manifest and verified WordPress revision.
- **Fresh public precondition proof:** at 20:37:18 UTC, the actual Node 24
  server implementation fetched the three exact WordPress pages and published
  page index through fixed HTTPS allowlists. Homepage page 149, home-value page
  3952, and We Buy Homes page 3631 each returned `legacy_match_ready`, one
  current/rollback link, one proposed canonical link, zero lookalikes,
  `publicationAuthorized=false`, and `mutationPerformed=false`. Public index,
  page-record, and homepage probes returned HTTP 200; no authenticated or write
  request was made.
- **Local acceptance:** after the ordered refresh, exact Node 24.18.0 passes 3
  focused files / 36 tests, all 223 files / 3,011 tests, strict typecheck,
  ESLint, optimized Next.js
  15.5.21 build with 52 static pages, 83/17 route proof, safety 14/14, doctor
  43/43, isolation, and a no-vulnerability Production dependency audit.
- **Rendered acceptance:** the optimized local Production build passes at
  1440×1000 and 390×844 with one main, document width equal to viewport width,
  three protected manifest links, zero writable forms in the deliberately
  database-unconfigured read-only runtime, GET-only browser requests, and zero
  console warnings/errors. Focused visual inspection confirms the WordPress
  card and controls are restrained, legible, and correctly stacked.
- **Verification boundary:** candidate secret/diff/migration integrity,
  exact-head CI, immutable Preview, and protected no-write runtime acceptance
  are sealed below. Any later refresh onto `main` must repeat the exact-head
  proof before release eligibility is reconsidered.
- **Superseded pre-refresh remote acceptance:** Draft PR #205 head
  `a1e8a4940f8d9eefe21bc6f43514e2e4941e8e31` is cleanly mergeable and passes
  Node 24 run `32665394864`, READY Preview
  `dpl_5AWNXqLf5k9Gc8UEqK2hA1AHiLFH`, and protected run `32665666025`: 17
  read-only passes / 6 intentional mutation skips / 0 failures, Widget 2/2,
  doctor 43/43, safety 14/14, release candidate GO, `PREVIEW_READY`, and zero
  fatal/error/warning deployment logs. Preview RBAC is disabled, so the
  manifest route truthfully returns 409 before a WordPress fetch; its
  authorized `report:view` path passes isolated route execution tests.
- **Final local integrity:** no migration delta, no known Production dependency
  vulnerability, clean diff, and gitleaks scanned 560 commits / approximately
  14.71 MB with no leak.
- **Release status:** keep Draft behind #202 → #203 → #204. The refreshed head
  requires fresh exact-head CI/Preview/protected proof recorded in PR #205. No
  Production gate is issued; after predecessors release, retarget to exact
  `main` and repeat exact-head proof.
- Plan and rollback:
  `docs/phase9/OWNED_TRAFFIC_ACTIVATION_FAST_TRACK.md` and
  `docs/phase9/WORDPRESS_OWNED_DEMAND_ACTIVATION_CHANGE_SET.md`.

## Phase 9 conversion-journey integrity fast-track — 2026-08-23

- **Live evidence:** a 390×844 Production audit intercepted lead/event and
  third-party analytics writes before navigation. Homepage address-to-contact
  progression worked with zero browser warnings/errors. On /buy, a blank
  submit rendered the correct email-or-phone status but left focus on the
  submit button, reproducing the recoverability defect fixed by PR #200.
- **Reuse decision:** exact PR #200 application/tests were applied to exact PR
  #202 head. All application and test files composed cleanly; only five
  cumulative status documents required current-authority reconciliation.
- **Scope:** immutable first touch, fresh tagged last touch, renter-page
  identity, replay-safe lead-created analytics, and accessible either-or
  contact recovery. No form, endpoint, database, provider, dashboard, route
  family, or visual system was added.
- **Dependency:** this candidate now includes PR #202 final head
  `37aa69421a70a177504e9ccaed99fef75852849e` through clean merge commit
  `3b5aef0aea2254c4b410393bb84ad1e1b61b7510`. Rescue branch
  `rescue/amm-pr203-pre-pr202-refresh-20260823-173028` preserves the previous
  sealed head. It cannot release before PR #202 and must be retargeted to the
  exact resulting `main` before any later gate is eligible.
- **Local acceptance:** after the ordered refresh, exact Node 24.18.0 passes 4
  focused files / 42 tests and the complete suite, strict typecheck, ESLint, optimized
  Next.js 15.5.21 build with 52 static pages, 82/17 route-manifest proof,
  system isolation, release safety 14/14, no-vulnerability Production
  dependency audit, diff integrity, empty migration delta, and a redacted
  staged secret scan.
- **Rendered acceptance:** optimized local mobile Buyer and Renter paths have
  one main, no horizontal overflow, zero browser warnings/errors, repeated
  invalid-submit focus recovery, exact `renter_page` payload identity, immutable
  Buyer first touch, and refreshed Renter last touch. Lead/event routes were
  mocked before navigation; no durable write occurred.
- **Superseded pre-refresh remote acceptance:** Draft PR #203 application head
  `a86eece1f2b18ceb064d109912c5b77314d2aca9` passes exact-head GitHub Node 24
  run `32660966818`, READY Preview `dpl_DQUyVzLXPmvyjghqUVzPtqoDuHcq`, and
  protected no-write run `32661259833`: 17 pass / 6 intentional write skips /
  0 fail, Widget 2/2, doctor 43/43, safety 14/14, release candidate GO,
  `PREVIEW_READY`, and zero fatal/error/warning runtime logs.
- **Safety:** no migration or Production mutation. The refreshed Draft head
  requires fresh exact-head CI/Preview/protected status recorded in PR #203.
  PR #203 cannot release
  before PR #202 and must then be refreshed onto exact `main` and re-proven
  before a separate later gate is eligible.
- Detailed scope:
  docs/phase9/CONVERSION_JOURNEY_INTEGRITY.md and
  docs/phase9/CONVERSION_JOURNEY_INTEGRITY_QA_EVIDENCE.md.

## Phase 9 durable rate-limit readiness — 2026-08-23

- Authenticated Vercel evidence found 17 paired error occurrences on the two
  public event routes: Production had a canonical database but no suitable
  server-only HMAC secret and therefore used the availability-first per-instance
  memory limiter. The existing public readiness endpoint still returned HTTP
  200 and the status-only monitor passed 9/9.
- The candidate reuses the existing Neon `rate_limit_buckets` table and HMAC
  implementation. It adds no provider, database, migration, route, dashboard,
  lead store, or public form.
- Production readiness now requires the exact table schema/upsert target,
  schema and CRUD privileges, effective RLS access, and the dedicated
  `RATE_LIMIT_HASH_SECRET`; it returns only boolean dependency state. Vercel
  Preview remains read-only and is not made dependent on a Production secret.
- The synthetic monitor now validates the body contract rather than accepting
  HTTP 200 alone. Against unchanged Production it truthfully reports 8/9,
  proving the prior false-green path is closed by the candidate.
- A final security pass replaced the raw Neon driver error object with one of
  four bounded operational codes. The privacy regression test injects a
  synthetic private failure marker and proves it never reaches `console.error`.
- A second exact-candidate review found two emergency-path defects: the memory
  fallback had no identifier cap and did not partition keys by route. It now
  reclaims expired entries, caps active identifiers at 10,000, fails closed for
  new identifiers at capacity, and mirrors the durable route partition. See
  `docs/phase9/PR209_SECURITY_REVIEW.md`.
- The exact read-only capability query passed on canonical Neon Production in
  35 ms with all four store booleans true. This proves the database object and
  SQL-editor role; deployed health must still prove the exact Vercel role.
- Exact local Node 24.18.0 verification passes 6 focused files / 59 tests, the
  complete 218-file / 2,983-test suite, strict typecheck, ESLint, the optimized
  Next.js 15.5.21 build, 52 static pages, 82 active routes, 14/14 release
  safety, 43/43 release doctor, system isolation, a no-vulnerability Production
  dependency audit, and a redacted full-history secret scan. The diff contains no
  migration.
- No Production secret, deployment, request write, lead, event, notification,
  email, SMS, Push, WordPress edit, publication, DNS change, spend, deletion,
  or NellySelly action occurred.
- Decision and evidence:
  `docs/phase9/DURABLE_RATE_LIMIT_READINESS.md` and
  `docs/phase9/DURABLE_RATE_LIMIT_READINESS_QA_EVIDENCE.md`.
- Draft PR #202 application head
  `abd2269b77496024a20d172e83a5404f013c5a43` passes GitHub run
  `32659072474`, READY Preview `dpl_FvHmNSQLKq9EGp24LPijSfPAW3Me`, deployed
  runtime capability health, and protected run `32659271882`. Acceptance is 17
  pass / 6 write skips / 0 fail, Widget 2/2, doctor 43/43, release candidate GO,
  `PREVIEW_READY`, and 0 warning/error/fatal logs. Earlier head `6067512...` and
  its evidence are retained but superseded.
- Overlaying this hardening on the existing synthetic PR #197–#201 stack caused
  no executable conflict; only the cumulative go-live runbook conflicted.
- Protected CLI verification created one empty, zero-deployment helper project
  and immediately relinked the worktree to canonical Ask Magic Mike. The helper
  is recorded in the asset manifest and preserved for separately approved
  cleanup.
- Historical gate consumed on 2026-08-28; it is exhausted and not reusable:
  `APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.
## Phase 9 conversion identity polish — 2026-08-22

- A fresh Production no-submit audit found that the canonical home-value path
  omitted consumer name while the buyer path already captured it. The existing
  Contact step now collects required name and email and sends name through the
  canonical `/api/leads` payload; no new form or backend was created.
- Validation now moves focus to the invalid address, name, email, or phone and
  associates the live error only with that field. The four-stage funnel and
  Black Diamond visual system remain intact.
- Consumer footer navigation no longer promotes internal Widget Preview,
  OurTown Integration, or Social Preview surfaces. Those routes remain
  non-indexable and available for their existing operational purpose.
- Screenshot QA now intercepts lead creation, durable analytics, and public
  experiment events and uses unmistakable synthetic identity, eliminating all
  page-triggered application write paths observed in the full capture matrix.
- Released-main refresh evidence passes exact Node 24.18.0, 215 test files /
  2,950 tests, strict typecheck, ESLint, optimized build, 82 active routes,
  14/14 safety, 43/43 doctor, system isolation, eight Chromium homepage/widget
  checks, dependency audit, candidate secret scan, diff check, and empty
  migration scan. Final exact-head Node 24 run `32612226020`, immutable Preview
  deployment `dpl_az7g38CUEynxgqxMAuLoWJEv52Td`, and protected no-write QA run
  `32612370721` pass with 17 pass / 6 safe skip / 0 fail, widget 2/2, doctor
  43/43, and strict `PREVIEW_READY`.
- The branch is refreshed onto released PR #194 merge
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6`; its prior stacked head is
  preserved at `rescue/amm-pr195-pre-released-pr194-refresh-20260822-1959`.
  The only automatic conflict was the cumulative QA evidence document; the
  application merge was clean.
- PR #195 head `db13953fc5f6d24a684f66c9a1c10c6b929b72b3` was merged as
  Production/main `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and accepted on
  Vercel deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Fresh read-only
  acceptance passes 15/15 conversion checks and 19/19 Production smoke checks
  with two intentional authenticated/write skips.
- Detailed decision and QA:
  `docs/phase9/CONVERSION_IDENTITY_POLISH.md` and
  `docs/phase9/CONVERSION_IDENTITY_POLISH_QA_EVIDENCE.md`.
- PR #195 was approved and merged as
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`, then accepted on Production
  deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. Its gate is exhausted.

## Phase 9 WordPress owned-demand activation change set — 2026-08-22

- **Implemented locally, not published:** the existing authenticated
  `/admin/distribution` command now exposes read-only readiness-manifest links
  for three established Our Town WordPress placements.
- **Live public read passed:** homepage page ID 149, home-value page ID 3952,
  and We Buy Homes page ID 3631 each resolved one exact legacy href, one exact
  rollback value, and one canonical proposed URL with complete placement-level
  attribution. Every manifest reported `mutationPerformed=false`.
- **Reuse result:** no new funnel, lead API, lead store, dashboard, publisher,
  form, notification engine, or analytics vocabulary was added. The package
  reuses the canonical owned-demand resolver and Lead Center `report:view`
  boundary.
- **Safety result:** exact HTTPS host allowlists, redirect revalidation,
  a 3 MB streaming response cap, explicit published-row validation, page-ID
  checks, duplicate/missing-target rejection, deterministic SHA-256
  preconditions covering every ambiguity signal, private/no-store headers, and
  raw-HTML exclusion are implemented and covered.
- **Recommended first action:** one separately approved homepage CTA href
  replacement only. No WordPress publication is included in this application
  candidate.
- Detailed scope and rollback:
  `docs/phase9/WORDPRESS_OWNED_DEMAND_ACTIVATION_CHANGE_SET.md`.

## Phase 9 iOS phone handoff consolidation — 2026-08-22

- Historical PR #179 was audited rather than merged wholesale. Its unique
  iPhone Home Screen credential-context repair is consolidated once on released
  PR #193 merge `9b82afb609674bb0209b73f8ac9622ab02733e2a`; its obsolete
  router/docs stack remains excluded.
- The existing Web Push, VAPID, Neon subscription/outbox, service worker, and
  protected phone APIs are reused. No carrier SMS, second PWA, second provider,
  second database, phone takeover, migration, device enrollment, or send was
  added.
- The restricted Brandon invite now opens a private token-scoped install page
  and `/phone-alerts/`-scoped manifest. The installed app exchanges the signed
  invite for a different server-minted Secure, HttpOnly, SameSite=Strict
  session credential, then continues on a token-free URL. A raw invite pasted
  into the cookie slot is rejected.
- A canonical Neon-backed, HMAC-pseudonymized one-time nonce guard denies
  cross-browser replay. Production fails closed when durable claim enforcement
  is unavailable on Vercel or owned/self-hosted Production; an existing
  installed app may reopen only with its matching HttpOnly session cookie.
- Exact Ask Magic Mike origin binding excludes Our Town, NellySelly, and
  arbitrary Vercel hostnames from this privileged handoff. Private/no-store,
  no-referrer, noindex, CSP, and robots controls cover every phone-alert route.
- The scoped copy repository cannot relabel an existing Mike/primary endpoint.
  With Lead Center RBAC enabled, the legacy secret-header invite endpoint is
  disabled so only an operator holding `notification:manage` can create the
  link. The optional QA Push is durably limited to one attempt per setup session
  and copy subscription in Production.
- Final released-base verification passes exact Node 24.18.0, 214 files / 2,949
  tests, strict typecheck, ESLint, optimized build, 82 active routes, 14/14
  safety, and 43/43 doctor checks. Production dependency audit,
  patch-integrity, candidate secret, and migration scans pass; PR #194 contains
  no database migration.
- PR #194 final reviewed head
  `851ebe530ac6a91a4e410f26538d29c1bf43f1c6` was refreshed onto released PR
  #196 base `c08abe1168840b99ccba07866bbec8cf7a6752fb`; its prior state is preserved
  at `rescue/amm-pr194-pre-pr196-refresh-20260822-1945`. Exact Node 24 run
  `32606142473`, Ready Preview deployment
  `dpl_7nhaV5tpS4YArtgKVV9PfVBRHq4H`, and protected Preview QA run
  `32606286620` pass.
- Protected Preview acceptance records 17 passes, six intentional write skips,
  zero failures, two expected browser tests, 43/43 doctor checks, and strict
  `PREVIEW_READY`. The automated phone probe uses only an invalid synthetic
  token and performs no invite, claim, limiter persistence, device
  registration, or send.
- PR #194 was approved and merged as
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6`, then accepted on Production
  deployment `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. Read-only acceptance passed
  conversion 15/15, smoke 19 pass / two intentional skips / zero failures,
  canonical Neon/RBAC/Push readiness, private invalid-install behavior, apex
  redirect, and zero deployment error logs.
- Detailed decision: `docs/phase9/PHONE_INSTALL_HANDOFF_CONSOLIDATION.md`.
- The PR #194 application gate is exhausted. Physical device enrollment and a
  `[TEST]` Push remain separate actions.

## Phase 9 privacy and KPI-trust consolidation — 2026-08-22

- Audited PRs #190-#192, then refreshed the consolidation onto released PR #185
  merge `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` and consolidated their unique
  independent work once. Source commits, exclusions, rescue ref, and rollback
  are recorded in `docs/PHASE9_PRIVACY_KPI_TRUST_CONSOLIDATION.md`.
- Durable Neon rate limiting now stores only versioned HMAC-SHA-256 bucket
  identifiers, updates bucket freshness, and removes stale records after 24
  hours. Protected health reports only whether a suitable server secret exists.
- Public analytics now uses an event/property allowlist, bounded JSON bodies,
  exact public-origin checks, coarse browser/device classes, and registered UTM
  dimensions. Public callers cannot bind events to canonical lead or agent IDs;
  the persistence repository re-applies the privacy boundary. Slug shape alone
  is insufficient: unregistered single-token names and address slugs are
  discarded, and open-house identifiers are reduced to a generic placement
  class. Full attribution remains in the protected canonical lead record.
- Both public analytics routes now await the canonical Neon write, return HTTP
  202 only for a durable event, and return HTTP 503 when persistence is
  unavailable. All JSON-LD script surfaces share an escaping serializer rather
  than inserting raw `JSON.stringify` output.
- The protected Growth Command Center adds aggregate-only outcome and delivery
  evidence for eligible non-test, non-suppressed leads. Optional-table or query
  failure renders unavailable instead of fabricating zero. A post-refresh audit
  closed a normalization defect that previously left `configured=true` beside
  an aggregate query error and could render misleading zero values.
- PR #187's KPI target register and migration remain deferred. This candidate
  contains no migration, publisher, provider send, second data store, or live
  data action.
- The released-main refresh gate passed system isolation, 14/14 release-safety
  checks, 211 test files / 2,911 tests, strict typecheck, ESLint, the optimized
  Next.js 15.5.21 build, and 80
  active routes. Production dependencies have no known vulnerability; a
  fresh redacted 511-commit full-history scan reports no leak; diff and
  migration checks are clean. The prior Node 24 CI, canonical Vercel Preview,
  authorization, privacy, and responsive 390/1440 rendering evidence remains a
  historical checkpoint. Exact-head GitHub/Vercel and protected Preview
  evidence after the final registered-attribution patch is tracked on PR #193
  and remains mandatory before release readiness.
- PR #193 was approved, merged as
  `9b82afb609674bb0209b73f8ac9622ab02733e2a`, and accepted on Production
  deployment `dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a`. Its application gate is
  exhausted and cannot authorize another action.

## Phase 9 consolidated owned-demand command — 2026-08-22

- PR #185 was the single application consolidation vehicle on released PR #184
  merge `f5f82f1bfaadea0ed20da50738ebc1f83e8dab97`. It preserves the unique
  Buyer/current-router safety work from PR #185 and the useful asset,
  WordPress-audit, and lifecycle work from PRs #186, #188, and #189.
- The protected `/admin/distribution` page remains the sole operator command.
  It now derives 35 exact general, offer, and named WordPress placements from
  one allowlisted catalog and joins current native proof to eligible
  first-party attribution without treating either stream as proof of the other.
- Missing Growth measurement now produces `measurement_unavailable`, hides
  lead-dependent totals, and suppresses the recommended placement. Missing
  publication-proof evidence separately produces `evidence_unavailable`.
- Protected feed/story/QR exports require `report:view`; public short codes
  resolve only to fixed canonical UTM destinations. The WordPress auditor is
  read-only, host-allowlisted to the apex and `www` Our Town HTTPS hosts, and
  revalidates every redirect hop.
- Final release review found that the renter export referenced a branch-only
  JPEG even though protected Preview rendering resolves approved source art
  from the released canonical host. Code-bearing fix
  `9a8baf935a7a68cda528ec4aee90b7cfcf5e87fc` now reuses the equivalent retained
  Production PNG and corrects the executable test's PNG MIME type. The former
  URL returned HTTP 404 on Production; all three current export sources return
  HTTP 200 with image content.
- The latest public WordPress audit at `2026-08-22T14:10:43.297Z` fetched 42 of
  42 sitemap pages and made no form submission or WordPress change. Current
  aggregate Production truth remains six test/suppressed records and zero
  eligible live demand, outcomes, first-response samples, spend, or proofs.
- Before the schema repair, the post-hardening application matrix passed 5
  files / 46 tests and the full Node 24 gate passed 206 files / 2,869 tests.
  Those results remain useful regression history but are not final release
  authority for the migration-bearing head. Fresh exact-head Node 24 CI,
  canonical Preview, protected flow, rendered acceptance, dependency, secret,
  migration, and diff evidence is tracked on PR #185 after push so this
  document does not create self-referential evidence churn. PR #185 is now
  released as merge `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` on Production deployment
  `dpl_41AZkLvufuAC92h6QJeqhiyjkBcM`; the constraint-only migration was applied
  and verified on canonical Neon before the exact reviewed application merge.
- Protected Preview workflows now run release doctor before generating launch
  authority and must assert exact `PREVIEW_READY` afterward. This closes a
  false-green path where endpoint/browser checks passed but a missing doctor
  report left launch authority `BLOCKED`.
- Final UI-to-Neon tracing found that the application already accepted
  `ourtown_wordpress` and seven named placements while the released ledger
  constraints did not. A valid operator action would pass runtime validation
  and fail durable storage. PR #185 now includes one additive constraint-only
  migration, `20260822195000_owned_demand_wordpress_proof_scope.sql`, to repair
  that existing-system mismatch instead of introducing a second ledger.
- Isolated PostgreSQL 17.11 proof passes all 11 WordPress placement tuples,
  `live`/`configured`/`removed` state contracts, replay idempotency, foreign-host
  rejection, cross-channel placement rejection, immutable audit creation,
  browser-role denial, and rollback of all synthetic rows. A legacy Facebook
  proof survived the migration unchanged.
  The pinned production cutover runner verified a backup, advisory/table locks,
  one transaction, six validated v2 constraints, and unchanged lead, audit,
  proof, function, RLS, trigger, and grant state. No lead or proof row changed.
- Fresh exact-tree Node 24.18.0 verification passes system isolation, 14/14
  release-safety controls, 207 test files / 2,879 tests, strict typecheck,
  ESLint, the optimized Next.js 15.5.21 build, and 80 active routes. Focused
  WordPress proof/cutover coverage passes 5 files / 55 tests. Exact remote CI,
  canonical Preview, protected flow, and rendered evidence remain required
  after the repaired head is pushed.
- The released PR did not publish, send, spend, submit a lead, mutate
  WordPress, modify DNS, contact a consumer, or act on NellySelly.
- Its migration/application gate is exhausted and must not be reused. External
  WordPress, GBP, social, email-signature, or QR publication remains a separate
  exact action and approval.

The source-branch sections below preserve implementation history. Their old
stack order and standalone approval phrases are superseded by the consolidated
PR #185 decision above; they are not independent release authority.

## Phase 9 exact owned-demand activation loop — 2026-08-21

- Reused the existing protected `/admin/distribution` page, seven canonical
  channel definitions, 35 exact placements, UTM builder, Neon Growth signals,
  append-only native publication-proof ledger, Lead Center RBAC, and Preview
  fail-closed controls. No parallel system was added.
- Added a pure deterministic join that shows the exact lifecycle relationship
  between current native proof and eligible first-party attribution. It never
  infers publication from a lead signal or a lead from publication evidence.
- Added channel-specific active-state handling, stable newest-proof selection,
  exact proof-attribution identity validation, evidence-unavailable fail-closed
  state, reconciliation priority for signals without active proof, and one
  evidence-backed next operator decision.
- The existing page now exposes compact lifecycle totals, the current priority,
  and a collapsed audit of all exact placements while preserving separate
  publication-proof history and channel packets.
- Current Production aggregate truth remains six test/suppressed lead rows and
  zero genuine live/contactable leads, owned-source signals, outcomes, spend,
  experiments, or first-response samples. All relevant canonical schemas are
  healthy.
- Focused verification passes 3 files / 39 tests. The full local release gate
  passes system isolation, 14/14 release-safety checks, 209 test files / 2,909
  tests, strict typecheck, ESLint, optimized Next.js 15.5.21 build, and the
  81-route manifest. Production dependencies have no known vulnerability, and
  a redacted gitleaks history scan covered 478 commits with no finding.
- Local protected visual QA passes 12/12 desktop/mobile checks across the reused
  public funnels, widget surfaces, Distribution Command, and KPI target register
  with no overflow, missing required copy, forbidden copy, or browser console
  error. Local Node 26.5.1 is newer than the declared Node 24.x engine; exact
  Node 24 CI and canonical Vercel Preview proof remain pending before the Draft
  PR is release-ready.
- No Production deployment, database migration/write, proof record, lead,
  WordPress edit, external publication, email/SMS/Push, provider action, spend,
  DNS change, or NellySelly action occurred.
- This source-branch work is incorporated into consolidated PR #185. Its former
  standalone stack and gate are historical and no longer authorize a release.

## Phase 9 WordPress owned-traffic consolidation — 2026-08-21

- Reused the live Our Town Properties pages, Gravity Forms, Canonical Lead
  Bridge 1.1.0, existing isolated iframe loader, canonical Ask Magic Mike
  funnels, protected Distribution Command, UTM builder, publication-proof
  ledger, and Neon lead backend. No parallel frontend, form service, CRM,
  database, notification engine, publisher, or analytics store was introduced.
- A read-only live sitemap audit checked 42/42 pages successfully. It found
  Gravity Form 7 on 39 pages, while authenticated prior evidence proves only
  Gravity Form 3 is enabled for signed canonical forwarding. This candidate
  deliberately does not widen that allowlist.
- The audit identified three self-canonical seller-value routes, two
  direct-purchase routes, two Ask Mike routes, four legacy native-capture
  pages, five pages with multiple capture systems, three direct canonical-app
  links lacking complete placement UTMs, and two embeds lacking placement
  `utm_content`. These are controlled consolidation candidates, not permission
  to redirect, noindex, deactivate a plugin, or replace a form.
- Added `pnpm amm:audit:wordpress` and a reusable parser that stores only
  structural public evidence. It excludes WordPress nonces, cookies, form
  values, lead data, credentials, private configuration, and arbitrary page
  text.
- Added the `ourtown_wordpress` owned-demand channel and seven exact named
  placements to the existing authenticated `/admin/distribution` surface:
  homepage Ask Mike, established home value, We Buy Homes, Mike's agent page,
  listing/buyer, rental-to-homeownership, and the existing Ask Magic Mike
  embed. Exact links retain canonical-host and UTM allowlists.
- Named placements use the existing append-only publication-proof workflow;
  WordPress proof URLs are restricted to `ourtownproperties.com`. The existing
  QR/creative catalog now derives four WordPress general/offer assets in
  addition to the prior 24 assets.
- Preserved the live sitewide and page-specific telephone targets. The
  conflicting unverified number was not added to any campaign or interface.
- Mobile 390 x 844 visual inspection confirmed that existing black/gold
  sections should be preserved while reducing each intent page to one durable
  capture path. No form was submitted during visual QA.
- Focused verification passes 5 files / 85 tests. The full release gate passes
  208 test files / 2,901 tests, strict typecheck, ESLint, optimized Next.js
  15.5.21 build, 81-route verification, 14/14 release-safety checks, and system
  isolation. `pnpm audit --prod` reports no known vulnerability; redacted
  gitleaks history inspection covered 477 commits with no finding.
- Local Node 26.5.1 is newer than the repository's Node 24.x engine. The build
  nevertheless completed. A webpack cache write also reported local `ENOSPC`
  after compilation; all pages and the route manifest completed successfully,
  and only disposable `.next` output was removed afterward.
- No Production deployment, WordPress mutation, form or notification change,
  database query/write, lead, external message, publication, redirect, DNS
  change, spend, or NellySelly action occurred.
- This source-branch work is incorporated into consolidated PR #185 without
  PR #187's KPI-target migration. Its former stack and gate are historical.

## Phase 9 protected owned-demand asset studio — 2026-08-21

- Reused the existing six-channel/four-placement owned-demand command, exact UTM
  builder, approved Mike imagery, public funnels, and Lead Center RBAC. No
  second campaign dashboard, publisher, provider, lead store, database schema,
  or CRM was introduced.
- Added three protected exports for each of 24 canonical placements: 1080×1350
  feed PNG, 1080×1920 story PNG, and raw high-error-correction QR SVG. The 72
  combinations are derived from the same definitions used for operator copy and
  attribution.
- Added 24 allowlisted `/go/[code]` 307 redirects to exact full UTM destinations.
  Unknown/malformed codes fail closed; there is no arbitrary destination or
  open redirect. The route is no-store/noindex and robots-disallowed.
- Asset downloads require a real `report:view` session, accept only exact
  channel/placement/format tuples, use approved local imagery, and return
  private/no-store, CSP-sandboxed, noindex attachments. They make no provider or
  database call and accept no consumer data.
- Executable QA found and closed unsupported renderer CSS, full-UTM QR density,
  story footer overlap, and WebP decoder/MIME failures. The ordinary UI preserves
  WebP assets; exports use retained canonical JPEG/PNG sources that already
  exist on the released host.
- Final local verification passes system isolation, 14/14 release-safety checks,
  203 test files / 2,846 tests, strict typecheck, ESLint, optimized Next.js
  15.5.21 build, and 80 active routes / 17 acknowledged root–`src` duplicates.
  Production dependencies have no known vulnerability; 471 Git commits have no
  detected secret leak. Independent OpenCV scans pass for the compressed feed,
  story, and Chromium-rendered raw SVG exemplars.
- This source-branch work is incorporated into consolidated PR #185; exact-head
  Preview evidence is required on that consolidated head.
- No Production deployment, Neon migration/write, lead submission, email/SMS/
  Push send, WordPress/DNS change, external publication, QR distribution,
  spend, or NellySelly mutation occurred.
- Its former standalone gate is superseded by the consolidated PR #185
  application gate. External publication remains separately approval-gated.

## Phase 9 current-router safety consolidation — 2026-08-21

- Audited PRs #179 and #182 against the exact PR #183/#184 stack before writing
  new code. Both PRs are now Draft with explicit out-of-order merge warnings;
  neither branch nor its evidence was deleted.
- Reused PR #182's unique work once: the existing `/buy` funnel is now visible
  in the Black Diamond desktop navigation and homepage path grid; Preview CORS
  accepts only the exact Vercel deployment/branch origins supplied by the
  platform; Production remains restricted to owned origins.
- Modernized the release-safety scanner to inspect all 535 deployable files in
  canonical root `app/` and delegated `src/`, current widget/listing/health
  routes, and current Neon/Better Auth/Resend/Web Push/provider secrets.
- Replaced the retired-router CTA authority with 24 checks against the active
  public routes, real Black Diamond components, both deployable trees, and the
  current owner approval/runbook documents.
- Node 24.18 verification passes: 14/14 release-safety checks, 202 test files /
  2,837 tests, strict typecheck, ESLint, Next.js 15.5.21 Production build, and
  78 active routes / 17 acknowledged root–`src` duplicates. Production
  dependencies have no known vulnerabilities; 469 Git commits have no detected
  secret leak.
- Desktop 1440px and mobile 390px Playwright inspection passes for the homepage
  and Buyer funnel. The five path cards remain balanced/stacked, consent stays
  readable, and the existing black/gold/cyan visual system remains intact.
- Draft PR #185 is stacked on PR #184. Code-bearing head
  `4b92d286caae09114b2aa0f84eb7b084ad26cb2a` passed Node 24 GitHub run
  `32516288876` and Ready Preview
  `dpl_BByVkaLDwDKnkScV4R4f5v3vbNwf`. Public/health routes return 200,
  anonymous Distribution Command returns 401 with private headers, an exact
  Preview origin reaches non-persisting request validation, a foreign origin is
  rejected, and the render contains no NellySelly marker.
- The first protected-Preview probe from the unlinked worktree created empty
  helper project `amm-phase9-current-router-safety-20260821`
  (`prj_iGynowHru4TBNwWgvoiSIG193Ukf`). It has zero deployments, domains, and
  application effect. The worktree was relinked to the canonical Vercel project;
  the helper is preserved pending separately approved cleanup.
- No Production deployment, Neon migration/write, lead submission, email/SMS/
  push send, WordPress/DNS change, external publication, spend, or NellySelly
  mutation occurred.

## Phase 9 owned-demand publication proof ledger — 2026-08-21

- Production aggregate truth is zero live demand: six test/suppressed leads,
  zero contactable live leads, zero first-response samples, zero live delivery
  failures, zero outcomes, zero spend, and zero overdue routing at the recorded
  read-only observation. No PII was queried or retained.
- Reused the protected Distribution Command, canonical Neon database, Lead
  Center RBAC, immutable audit log, UTM builder, public funnels, and retained
  campaign assets. No publisher, provider integration, second CRM, Supabase
  runtime, or parallel campaign database was added.
- Added one append-only, RLS-enabled publication-proof ledger and one idempotent
  server-only RPC. A successful first insert creates exactly one immutable
  `growth.publication_proof_recorded` audit event; replay creates neither a
  duplicate proof nor duplicate audit.
- Raw final post copy is validated and SHA-256 hashed in memory, then discarded.
  Public evidence URLs are channel/HTTPS/host/query allowlisted both on write
  and again on read. PII, credentials, placeholders, unsupported guarantees,
  and known Fair Housing risk phrases fail closed.
- Added `growth:manage` only to administrators and the primary lead owner. The
  Server Action rechecks that permission, requires an explicit observation
  confirmation, refuses legacy Basic-auth-only mutation sessions, uses
  parameterized SQL, and is blocked by the existing Preview mutation guard.
- Added a hash-pinned, backup-first Production cutover runner with exact
  approval, canonical Neon identity and prerequisite checks, advisory locks,
  one transaction, migration-ledger insertion, privilege/immutability/audit
  postconditions, and lead/audit no-change digests.
- Added an executable PostgreSQL 17 publication-proof contract to the existing
  isolated local staging verifier. It proves service/browser role boundaries,
  one-proof/one-audit idempotency, unsafe-host rejection, append-only behavior,
  synthetic rollback, and zero external calls.
- The contract found and fixed two pre-Production defects: postflight now reads
  trigger event bits instead of depending on PostgreSQL display order, and the
  migration now revokes inherited `service_role` privileges before granting
  only SELECT and INSERT. The reviewed migration hash is
  `c60c1a6e692d487e0adfd98d0eb3a9cff89ad77a3233b53075a4c8b63bde3ede`.
- PR #183 is merged and live at Production commit
  `b8b31fb20223ad0f0ad311fee1ee3de20d0f7ae9`. PR #184 was refreshed onto that
  exact `main` before migration and application release.
- The full local release gate passes system isolation, 14/14 safety checks,
  200 test files / 2,831 tests, strict typecheck, ESLint, the Next.js 15.5.21
  Production build, and the 78-route manifest. Production dependencies report
  no known vulnerabilities; a redacted full-history scan reports no secret
  leaks. Production-render Playwright checks pass 10/10 desktop/mobile routes
  with no overflow, missing required copy, prohibited claim, bare-appraisal
  wording, or console error. The migration hash/plan gate passes. A disposable
  local reset applied all 33 migrations through the new SQL, and
  `staging:local:verify` passes the real PostgreSQL 17.6 role, idempotency,
  audit, host, RLS, and immutability contract with all synthetic changes rolled
  back.
- PR #184's canonical exact-head Node 24 CI, Preview, merge, and Production
  deployment identifiers are kept in PR metadata rather than frozen into this
  self-referential release file. The protected Preview serves expected
  public/health routes and rejects anonymous `/admin/distribution` access.
- Vercel CLI verification created empty helper project
  `amm-phase9-publication-ledger-20260821`
  (`prj_QcHch6KY1m2g0BKtOoVVFregRhho`) before the worktree was relinked to the
  canonical project. It has zero deployments and no application/domain effect;
  it remains preserved pending a separate exact cleanup approval.
- Reconciled the current operating authority, asset manifest, consolidation
  plan, release queue, limitations, daily Lead Center guide, architecture,
  release log, and final report without deleting historical evidence. The
  launch doctor/authority scanners now check PR #181, canonical
  Neon/Better-Auth/Resend/Web-Push variable names, both deployable app trees,
  and MLS-contextual MATRIX usage instead of falsely rejecting the ordinary
  phrase `form-readiness matrix`. Focused scanner coverage passes 82/82.
- The exact ledger migration/release gate was received on 2026-08-22. The
  unchanged hash-pinned migration committed once after one fail-closed rollback
  exposed and corrected a PostgreSQL 18 verifier-only catalog-render mismatch.
  Two validated 351,600-byte backups were retained. Independent postflight
  proves zero seeded proofs and unchanged lead/audit counts and digests.
- No lead mutation, WordPress change, provider call, email, SMS, social/GBP
  publication, print distribution, spend, DNS change, or NellySelly mutation
  occurred.
- External publication remains a separate final-copy/identity/visual/URL/removal
  approval and is not authorized by the ledger gate.

## Phase 9 campaign safety + three-offer owned-demand flight — 2026-08-21

- Reused the canonical protected `/admin/distribution` command, Neon Growth
  ledger, public funnels, UTM builder, and retained Black Diamond imagery. No
  parallel campaign dashboard, lead store, publisher, or migration was added.
- Added seller `/home-value`, buyer `/buy`, and renter `/rent` briefs across all
  six existing owned channels: 18 exact channel/offer placements plus the six
  existing general-question placements.
- Attribution requires an exact normalized source alias, medium, campaign, and
  complete `utm_content` match. Generic and offer-specific results are counted
  exactly once.
- Added accessible local clipboard controls. They make no network request and do
  not publish, send, mutate a lead, or write to the database.
- A current-run desktop/mobile operator audit found and closed the remaining
  activation-path friction: the measured bottleneck now points to the first
  recommended channel, and each channel exposes one deterministic local-only
  packet containing its general placement, three offer placements, exact URLs,
  and review boundaries. The shared mobile Lead Center navigation remains a
  separately scoped cross-route polish item.
- Closed a degraded-state truth gap without adding another data layer. The
  route now distinguishes ready, not-configured, schema-pending, and
  query-failed Growth measurement. Unavailable measurement renders em dashes,
  recovery guidance, and no data-backed channel recommendation; prepared copy
  remains reviewable without being misrepresented as observed demand.
- Audited and rewrote retained legacy campaign libraries containing unverified
  volume, tenure, valuation-error, demand, school-proxy, response-time,
  superlative, and direct-phone claims. Public copy preserves the current live
  office number `252-243-7700`; private routing numbers remain private.
- Hardened the active `/ask` interface and prompt set so it uses consumer-stated
  objective criteria instead of neighborhood, school-proxy, or unverified
  buyer-demand guidance.
- Replaced two soft, undersized legacy offer portraits with higher-resolution
  approved local Mike assets already in the canonical repository.
- Focused verification passes 6 files / 337 tests. The full local release gate
  passes system isolation, 14/14 release-safety controls, 196 test files / 2,797
  tests, strict typecheck, ESLint, the Next.js 15.5.21 Production build, and the
  78-route manifest. Production dependencies report no known vulnerabilities;
  the redacted 482-commit history scan reports no secret leaks. Local
  Production-render visual QA passes 10/10 desktop/mobile route checks with no
  overflow, missing copy, prohibited claim, bare appraisal language, or console
  error.
- A separate no-database Production-render acceptance passes at desktop and
  mobile sizes with three unavailable metrics, no false-zero inference, no
  measured recommendation, no overflow, and no console/page error.
- Code-bearing commit `a0c80eaa9b429ed48871fc221d93af5e7d6fdfa1`
  produced Ready Preview deployment `dpl_5UQL8LDfMvFvvi4YZ8UhLdyDFbWF` at
  `https://ask-magic-mike-ihjwzl8rw-eyes-up-industries.vercel.app`. GitHub's
  release gate and both Vercel checks pass. Read-only exact-Preview proof passes
  ten public/health/listing checks and eight desktop/mobile renders with no
  NellySelly identity, private listing field, overflow, missing required copy,
  prohibited claim, or console error. Anonymous `/admin/distribution` access is
  denied with 401, Basic challenge, `no-store`, and `SAMEORIGIN`; authenticated
  Preview inspection was not bypassed.
- During protected-Preview setup, Vercel CLI created empty helper project
  `amm-phase9-campaign-compliance-20260821`
  (`prj_JUyx03Rh8iABqAFepNNuPI2jJqut`). It has zero deployments and no effect on
  the canonical project. It remains intact pending the separate exact cleanup
  gate documented in the Phase 9 runbook.
- Production, WordPress, Neon, email, SMS, Push, social accounts, GBP, DNS, and
  NellySelly are unchanged by this candidate.
- This historical candidate was released through PR #183. Its approval gate is
  exhausted and is not authority for any current action.

## Phase 9 first-human-response intelligence — 2026-08-20

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
- PR #181 completed in Production at head
  `ed125cdfa09b7cc1a47b7c715bc15af7e6aeceea`, merge commit
  `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`, and Vercel deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`. Canonical public routes, health,
  authorization, and Ask Magic Mike/NellySelly isolation checks passed.
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
- The fail-closed read-only Production preflight passed against canonical Neon
  project `bitter-star-20214385`, Production branch
  `br-round-base-auh6h2wd`, unpooled owner endpoint
  `ep-proud-bonus-autwv60g`. All prerequisite, schema, role, privilege, source
  baseline, and target-absence checks were true; 6 leads and 9 audit rows had
  0 eligible historical response backfills.
- Migration `20260820013000` then applied once to canonical Neon Production
  branch `br-round-base-auh6h2wd` with the validated backup retained. Six
  suppressed QA leads, zero live prospects, and existing audit counts remained
  unchanged. No lead, message, WordPress, DNS, or NellySelly mutation occurred.

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

## Phase 9 Neon Preview endpoint attestation — 2026-08-23

- Draft PR #209 now binds Preview mutation authority to the actual Neon
  endpoint parsed from server-only `DATABASE_URL`; labels and toggles alone are
  insufficient.
- The application write guard and protected health/QA gate both require an
  exact Preview endpoint match, an explicit Production non-match, and valid,
  distinct expected endpoint IDs.
- Protected health output remains categorical-only. Connection strings,
  credentials, and raw endpoint identifiers are never returned.
- Canonical infrastructure documentation now identifies Preview branch
  `br-morning-paper-aun3378r` and Production branch
  `br-round-base-auh6h2wd`; Ask Magic Mike/NellySelly isolation remains intact.
- Local release verification passed with 3,054 tests, strict typecheck, lint,
  optimized build, 83-route manifest, 14/14 release safety checks, zero known
  Production dependency vulnerabilities, and no gitleaks findings.
- No Preview mutation flags, Production secrets, database rows, migrations,
  sends, merges, deployments, WordPress changes, or NellySelly systems were
  touched.

## Phase 9 atomic release-authority reconciliation — 2026-08-23

- Fresh authenticated GitHub/Vercel and read-only public checks confirmed at
  that time that PR #195
  merge `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and Production deployment
  `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW` were the accepted live baseline.
- PR #209 became the sole documented application release candidate. PRs #202
  through #208 remain preserved as incremental review evidence with no
  independent merge or Production authority.
- The then-current authority docs exposed one optional Preview-mutation gate, one
  combined Production durability/merge/deploy gate, and the later independent
  one-href WordPress homepage gate without reusing any consumed approval.
- Added an executable five-check documentation contract so known stale stacked-
  release claims cannot silently return to the operating source of truth.
- Fresh public evidence passes conversion 15/15 and smoke 19/19 with two
  intentional skips. Candidate monitoring truthfully reports 8/9 until the
  durable Production limiter contract is released.
- Full decision and no-action record:
  [`phase9/ATOMIC_RELEASE_AUTHORITY_RECONCILIATION.md`](./phase9/ATOMIC_RELEASE_AUTHORITY_RECONCILIATION.md).

## Phase 9 organic-search opportunity ingress — 2026-08-24

- PR #209 is accepted and its gate is exhausted. Draft PR #219 is stacked
  after sealed PR #218 and cannot leapfrog the first pending candidate, PR
  #210, or PRs #211–#218.
- The existing Growth Command Center now has a protected, Preview-first
  `/admin/growth/search-ingress` workbench and bounded preview/commit APIs.
- One exact owned-page Search Console report can be normalized into existing
  `market_signals` and advisory `market_opportunities`; no query text, raw CSV,
  provider payload, or credential is retained.
- Deterministic thresholds and visible factor points replace opaque AI scoring.
- An additive PostgreSQL 17 contract provides owner-only atomic reconciliation,
  immutable receipts/audits, exact replay, and operator-state preservation.
- Safe default is `GROWTH_SEARCH_IMPORT_ENABLED=false`; Production and Preview
  database identity remains exact-endpoint attested.
- Historical pre-refresh proof passes: 39 focused tests, 3,207 full tests, PostgreSQL 17 contract,
  typecheck, lint, Node 24 build, 92-route manifest, 14/14 safety, isolation,
  dependency audit, staged secret scan, and exact-head protected Preview QA.
- Runtime code head `5552a1a` is `READY` at immutable deployment
  `dpl_FcBUJ7hDxKu7oeMpXb8UuVHpkkCz`; Release Gate run `32801867752` and
  protected QA run `32801994614` pass. That evidence is bound to the former
  head and must be repeated. Remote evidence was 17 pass / six
  intentional skip / zero fail and 10/10 browser cases with zero commit calls.
- No Search Console access, Production migration/configuration/merge/deployment,
  real import, page publication, lead/message/campaign action, WordPress/DNS
  edit, purchase, deletion, or NellySelly action occurred.
- Evidence and exact gates:
  [`phase9/ORGANIC_SEARCH_INGRESS_RELEASE_GATE.md`](./phase9/ORGANIC_SEARCH_INGRESS_RELEASE_GATE.md)
  and
  [`phase9/ORGANIC_SEARCH_INGRESS_QA_EVIDENCE.md`](./phase9/ORGANIC_SEARCH_INGRESS_QA_EVIDENCE.md).

## Phase 9 local-profile performance ingress — 2026-08-25

- Added a protected `/admin/growth/local-profile-ingress` workbench to the
  existing Growth Command Center; no parallel dashboard or database was made.
- Added bounded preview/commit APIs for one allowlisted, aggregate Google
  Business Profile performance report contract.
- Added deterministic signal normalization and one explainable
  `local_profile_interaction_gap` opportunity policy.
- Added an additive immutable receipt table and owner-only PostgreSQL import
  function with server-side score/fingerprint recomputation, advisory locking,
  exact replay, atomic reconciliation, and operator-state preservation.
- Safe default is `GROWTH_LOCAL_PROFILE_IMPORT_ENABLED=false`; synthetic input
  cannot commit and real input also requires endpoint/database/write
  attestation, exact fingerprint, report reference, and typed confirmation.
- Local proof passes 3,234 tests, PostgreSQL 17 contract/parity, typecheck,
  lint, optimized build, 95-route manifest, 14/14 safety, isolation, dependency
  and secret audits, and 2/2 responsive browser scenarios.
- Draft PR #220 is clean/mergeable on PR #219. Code-bearing Preview deployment
  `dpl_EFb7Vzs65KoNWDXJLNr59caV92fS` is `READY`; Release Gate run
  `32808025256` and protected Preview QA run `32808693945` pass. Preview proof
  is 17 pass / six intentional mutation skips / zero fail plus 12/12 current
  browser scenarios.
- Production and external systems are unchanged. The candidate must remain
  stacked after PR #219 and the already ordered release train.
- Evidence:
  [`phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS_QA_EVIDENCE.md`](./phase9/LOCAL_PROFILE_PERFORMANCE_INGRESS_QA_EVIDENCE.md).

## Phase 9 public owned-referral handoff — 2026-08-29

- Reused the active Black Diamond homepage, approved 1200×630 social card,
  canonical `/ask` funnel, existing attribution persistence, and privacy-safe
  analytics endpoint.
- Replaced the public homepage's internal-facing social-ad asset promotion with
  a consumer-facing, generic referral handoff; the non-indexed social review
  route remains available for controlled review but is no longer promoted to
  consumers from the homepage.
- Added direct-click native Web Share only after an available `canShare`
  capability probe accepts the fixed packet, plus Clipboard copy and a visible
  manual-copy fallback without a third-party script, provider, popup, database,
  or sender.
- Added exact `consumer_share` / `referral` / `amm_owned_demand_2026` /
  `homepage_referral_share` attribution and two bounded events whose labels do
  not overclaim delivery or publication.
- The packet cannot contain form answers, saved plan state, current URL,
  session/lead IDs, contact details, click IDs, or free text.
- Exact-parent focused acceptance passes 37 tests on Node 24.18.0, strict
  typecheck, targeted lint, 14/14 release safety, deployable-source isolation,
  `git diff --check`, and the Production dependency audit with no known
  vulnerability. Historical pre-refresh proof also passed 266 files / 3,338
  tests, full lint, optimized Next.js 15.5.21 build with 59 static pages, 95
  active routes / 17 acknowledged duplicates, clean-tree release doctor 43/43,
  and redacted full/delta Gitleaks scans. Fresh exact-head CI, Preview,
  no-write browser QA, runtime-log, and secret-scan proof remain mandatory.
- Former head `b1bd4b2012c037f4a71806b449541cdcfdd758b6` is preserved at
  `rescue/amm-pr228-pre-pr227-parent-refresh-20260829-133619`. The candidate was
  reconciled through normal merge commit
  `38a22f5627f2b8f7293d9f65bf3a4f27b7475044` onto exact sealed PR #227 head
  `ee1dd462665e423c17a69b6ab7d1c3a7a70a1409`; no rebase or force-push was used.
  The earlier source rescue
  `rescue/amm-pr228-pre-pr227-exact-seal-20260829-0636` also remains intact.
- Prior desktop/mobile no-write browser QA reports no overflow, console/page
  error, bad response, external request, or internal `/social-preview` link;
  axe reports zero automated WCAG A/AA violations on the new section. Fresh
  immutable exact-head Browser and hosted Preview evidence remain required
  after push.
- Production remains unchanged on authority commit
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`. WordPress, Vercel Production,
  Neon Production, external publishing, lead submission, email/SMS/Push, and
  NellySelly remain unchanged.
- Design and boundaries:
  [`phase9/PUBLIC_OWNED_REFERRAL_HANDOFF.md`](./phase9/PUBLIC_OWNED_REFERRAL_HANDOFF.md).
- QA evidence:
  [`phase9/PUBLIC_OWNED_REFERRAL_HANDOFF_QA_EVIDENCE.md`](./phase9/PUBLIC_OWNED_REFERRAL_HANDOFF_QA_EVIDENCE.md).

## Phase 9 OTP Facebook crawler exact Apache diagnosis — 2026-08-28

- Fresh production checks remain 40/42: only the Our Town `/ask-mike/` and
  Mike-agent pages return 403 to `facebookexternalhit`; Ask Magic Mike and all
  tested non-Facebook social crawlers pass.
- Authenticated cPanel/Apache inspection located the exact server-global
  directives: `facebookexternalhit` is assigned to `bad_bots`, then denied by
  `Require not env bad_bots` in `pre_virtualhost_global.conf`.
- The error surface is `authz_core` `AH01630`, the cPanel production-domain
  ModSecurity control reports Off, and no matching root `.htaccess` rule exists.
- The former unknown-ModSecurity-rule-ID instruction is superseded by one
  host-operator, per-vhost/account override specification limited to GET/HEAD
  and four exact public paths.
- The live verifier and existing Traffic/Revenue admin guidance now distinguish
  this exact OTP Facebook-only condition from unknown crawler failures. They no
  longer recommend Cloudflare Bot Fight Mode, a broad user-agent allowlist, or
  a ModSecurity rule-ID search.
- Focused no-network regression coverage passes 111 tests across the verifier,
  Traffic readiness, and Launch Control modules. A fresh read-only live run
  remains truthfully 40/42 and prints the bounded host change packet instead of
  the superseded broad bypass.
- Diagnosis reuse now requires the exact two known paths, crawler, and HTTP 403
  result; partial, alternate-path, and alternate-status failures stay unknown.
  The proposed host expression also enforces the two allowed hostnames and uses
  `req_novary` to avoid cache fragmentation by Host or User-Agent.
- Exact PR #229 head
  `ab24fc0ef2eef10f9b368d57909d899dd053d204` passed 266 files / 3,345 tests,
  strict typecheck, full lint, optimized build with 59 generated pages, 14/14
  release safety, 43/43 release doctor, dependency audit, source isolation,
  and exact-delta/full-history Gitleaks. Release Gate `33267688596`, immutable
  Preview `dpl_9pRRE8JHQG28ohxhFgcJwbRufKdf`, and protected QA `33267872275`
  passed with `GO` / `PREVIEW_READY` while all mutations remained fail-closed.
- After PR #229 was sealed, the separately approved account-level test was
  consumed. A backed-up document-root `.htaccess` trial parsed, but the two
  HTML pages remained 403 because the earlier server-global authorization
  decision had already been made. Acceptance failed, so the original file was
  restored byte-for-byte and the retained backup was moved outside the public
  root.
- Post-rollback proof matches the 40/42 baseline: normal browsers return 200;
  Facebook remains denied on the two pages, a non-allowlisted path, login,
  admin, REST POST, and XML-RPC POST. The supported cPanel userdata include is
  root-owned and unavailable to the account.
- No active host-file override, firewall change, Apache reload, cache purge,
  WordPress edit, Vercel/database change, communication, DNS, Production app,
  or NellySelly action remains from the completed test.
- Evidence and controlled change contract:
  [`phase9/OTP_FACEBOOK_CRAWLER_APACHE_EVIDENCE_2026-08-28.md`](./phase9/OTP_FACEBOOK_CRAWLER_APACHE_EVIDENCE_2026-08-28.md)
  and
  [`FACEBOOK_CRAWLER_FIREWALL_CHANGE.md`](./FACEBOOK_CRAWLER_FIREWALL_CHANGE.md).
- Controlled test evidence:
  [`phase9/OTP_FACEBOOK_CRAWLER_ACCOUNT_OVERRIDE_TEST_2026-08-28.md`](./phase9/OTP_FACEBOOK_CRAWLER_ACCOUNT_OVERRIDE_TEST_2026-08-28.md).

## Phase 9 capability authority ledger candidate — 2026-08-29

- Reconciled the current competitive benchmark against executable code and the
  ordered release/approval records instead of treating every benchmark feature
  as a greenfield gap.
- Added a pure typed ledger that separates established Production capability,
  reviewed application candidates, operator/host gates, external dependencies,
  and intentionally prohibited autonomy.
- Rendered the ledger inside the existing `/admin/growth` route after its
  `report:view` authorization boundary. The section contains no form, fetch,
  server action, provider call, or mutation path.
- The ledger excludes PR #209's consumed durability gate and the consumed
  account-level crawler-test gate. It displays the future PR #230 application
  gate with an explicit PR #210-first ordering warning, plus the current Our
  Town consent-runtime gate; the page cannot create, consume, or broaden either
  approval. The completed-and-rolled-back crawler test is recorded only as a
  root/WHM access dependency.
- Final local acceptance passes 267 files / 3,351 tests, strict typecheck, full
  lint, optimized Next.js 15.5.21 build, 95/17 route proof, 14/14 safety,
  deployable-source isolation, zero known Production dependency
  vulnerabilities, and desktop/mobile no-write browser QA with zero axe A/AA
  violations. After the exact PR #229 parent refresh, fresh final-head CI,
  immutable Preview, protected QA, visual/runtime, and Production non-mutation
  evidence are pinned in the PR seal without a self-referential evidence-only
  commit.
- No route, migration, dependency, environment variable, secret, database,
  public page, provider, communication, WordPress, DNS, hosting, Production, or
  NellySelly state changed.
- Implementation and boundary contract:
  [`phase9/CAPABILITY_AUTHORITY_LEDGER.md`](./phase9/CAPABILITY_AUTHORITY_LEDGER.md).
- QA evidence:
  [`phase9/CAPABILITY_AUTHORITY_LEDGER_QA_EVIDENCE.md`](./phase9/CAPABILITY_AUTHORITY_LEDGER_QA_EVIDENCE.md).

## Phase 9 bounded organic page experiment briefs — 2026-08-29

- Reused the existing protected Search Console CSV workbench, validated owned
  page rows, deterministic opportunity scores, and Growth authority ledger.
- Added a pure builder for internal-review-only experiment briefs containing
  owner inputs, one-change scope, evidence-aware measurement, real-estate and
  Fair Housing guardrails, stop conditions, and immutable official references.
- Briefs produce no public copy and perform no provider call, live-page fetch,
  database write, campaign, message, spend, redirect, or publication action.
- Preserved the prior PR #231 head at
  `rescue/amm-pr231-pre-pr230-parent-refresh-20260829-150534`, then merged exact
  sealed PR #230 head `680e257d8e35b2033638e84b09c742608268fc20`
  through normal merge commit `b840152`.
- The refresh hardening replaced invalid flow-content children inside the
  native disclosure summary with phrasing-content elements while retaining the
  established Black Diamond visual hierarchy and responsive behavior.
- Exact local Node 24 acceptance passes 9 focused files / 65 tests and 268
  files / 3,357 full tests, plus strict typecheck and targeted lint. Final full
  lint/build/safety/isolation, secret scans, immutable Preview, protected
  no-write browser proof, runtime logs, and Production non-mutation evidence
  remain bound to the final PR seal rather than a self-referential docs commit.
- No Production, Vercel environment, Neon, WordPress, DNS, provider,
  communication, publication, spend, deletion, or NellySelly mutation occurred.
- Decision and QA evidence:
  [`phase9/ORGANIC_SEARCH_EXPERIMENT_BRIEF_QA_EVIDENCE.md`](./phase9/ORGANIC_SEARCH_EXPERIMENT_BRIEF_QA_EVIDENCE.md).
