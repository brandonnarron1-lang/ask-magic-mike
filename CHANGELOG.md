# Changelog

## 2026-08-30 — PR #238 Production acceptance and fail-closed authority

- Accepted reviewed PR #238 as merge
  `cef0f366380e2e8aa95a70cf45a70830d7997d45`, tree
  `e6f388311fd07fc84ed0e580b77b190f7c56f458`, and Vercel deployment
  `dpl_EU6Bx2Fj76HtBmNotCEKcfDk5uwe` after Release Gate 33313337535 passed.
- Recorded the five-migration canonical Neon cutover, unchanged bounded
  counts, zero receipt rows, disabled import gates, validated backup receipt,
  hardened privilege postflight, and healthy runtime acceptance.
- Changed the machine-readable authority contract to schema 4 with
  `candidate: null`; the consumed PR #238 phrase is retained only as evidence
  and cannot be exposed as a current Growth Center gate.
- Kept WordPress, leads, notifications, providers, DNS, publication, spend,
  deletion, purchases, and NellySelly unchanged.

## 2026-08-30 — Preview identity and controlled-proof reuse

- Scoped the established Preview/Production Neon endpoint attestations to the
  cumulative Draft branches while keeping Preview writes and all providers
  disabled.
- Rebuilt exact PR #238 and passed protected no-write QA with confirmed Preview
  identity, explicit Production-endpoint refusal, and 15/15 browser checks.
- Bound the existing controlled Lead Center write/readback proof to PR #238 by
  proving its 36-file surface and candidate migration are byte-identical;
  avoided creating a redundant synthetic lead.
- Production, WordPress, live leads, notifications, DNS, publication, spend,
  deletion, and NellySelly remained unchanged.

## 2026-08-30 — Neon optional-role cutover preflight correction

- Ran the cumulative cutover runner in read-only mode against the exact
  unpooled Neon Production endpoint and found one stale Supabase-era
  prerequisite: canonical Neon intentionally has `service_role` but not the
  optional `anon` or `authenticated` roles.
- Updated preflight to require the server role while accepting either bounded
  browser-role state, and updated postflight privilege checks to join only
  roles that exist. An absent browser role is now correctly treated as denied.
- Corrected Production preflight passed every identity, prerequisite,
  absent-target, and zero-ledger check. A PostgreSQL 17.11 disposable execute
  and verify also passed all five migrations with both browser roles absent.
- No Production SQL, merge, deployment, environment change, WordPress save,
  lead mutation, notification, DNS, spend, deletion, or NellySelly action was
  performed.

## 2026-08-30 — Neon Lead Center API persistence candidate

- Activated the documented Lead Center REST paths under the authoritative root
  router using thin wrappers over one handler implementation, and replaced
  their Supabase-only/false `mock_mode` behavior with the canonical
  provider-neutral persistence boundary and Neon-first reads.
- Added atomic, allowlisted lead patch, note, task, and reason-aware assignment
  functions with durable IDs, immutable privacy-minimized audit evidence, and
  browser-role revocation.
- Made spam clearing recover the last valid pre-spam status from immutable
  audit history, with a legacy-only `new` fallback.
- Strengthened controlled Preview QA to require exact note/task ID readback;
  all synthetic records remain test-marked and outbound sends remain disabled.
- Applied the additive migration only to the attested Neon Preview branch,
  proved durable idempotent lead/note/task/patch/assignment behavior, then
  retained the append-only-consent QA row as dead, unassigned, test-marked,
  and fully communication-suppressed.
- Restored Preview to read-only. No Production database, deployment,
  environment, WordPress, lead, notification, DNS, publication, spend,
  deletion, or NellySelly change was performed.

## 2026-08-29 — Secret-safe Vercel Production environment truth

- Added a name-and-scope-only Vercel Production manifest path to the launch
  doctor, with value-bearing input rejection and no secret file creation.
- Aligned email-provider readiness with the deployed runtime contract:
  `EMAIL_PROVIDER` is explicit when present and Resend is safely inferred from
  the existing `RESEND_API_KEY` when the selector is absent.
- Added fail-closed classification for the three growth-import gates and tests
  covering Production scope filtering, duplicate collapse, secret-field
  rejection, provider fallback, and gate presence.
- Documented the authenticated read-only evidence in
  `docs/phase9/VERCEL_ENV_PRESENCE_TRUTH.md`.

## 2026-08-29 — Singular cumulative release authority

- Added one machine-readable, typed release-authority manifest that identifies
  accepted Production as PR #209 and the only current cumulative application
  candidate as exact Draft PR #238.
- Reconciled active runbooks, owner gates, architecture records, rollback
  guidance, and the protected Growth capability ledger so PRs #210–#237 remain
  preserved lineage without presenting obsolete component gates as executable.
- Bound the cumulative gate to the exact PR #238 head, tree, ordered cutover
  command, and SHA-256 hashes of the four reviewed additive migrations.
- Kept PR #239 classified as dependent read-only operator tooling. No
  Production, database, WordPress, lead, message, provider, DNS, publication,
  spend, deletion, or NellySelly action occurred.

## 2026-08-29 — Privacy-minimized WordPress legacy-lead dry-run

- Upgraded the existing `reconcile-wordpress-leads` operator path with an optional
  Production-endpoint-attested, transaction-read-only legacy CSV comparison.
- Added deterministic match/conflict classifications, local-duplicate detection,
  bounded CSV handling, PII-free output, and explicit refusal of import/execute
  arguments.
- Added synthetic tests and an operator runbook. No live WordPress export,
  Production query, lead mutation, notification, provider call, or deployment was
  performed.

## 2026-08-29 — Cumulative Phase 9 growth cutover hardening

- Added one hash-pinned, exact-identity Production cutover runner for the four
  already-reviewed growth migrations instead of leaving four separate manual
  SQL paths.
- Added fail-closed approval, safe-disabled import-gate, endpoint, ledger,
  prerequisite, backup, advisory-lock, single-transaction, ownership, RLS,
  privilege, trigger, row-count, and rollback interlocks.
- Proved the actual execute/verify path against disposable PostgreSQL 17.11:
  four migrations and four ledger rows, zero growth/receipt rows, all hardened
  objects present, and a validated custom backup with 93 restore entries.
- Performed no Production database, Vercel, WordPress, provider, lead,
  notification, DNS, spend, publication, deletion, or NellySelly mutation.

## 2026-08-29 — Organic experiment briefs exact-parent refresh

- Preserved the prior PR #231 head at
  `rescue/amm-pr231-pre-pr230-parent-refresh-20260829-150534`, then merged exact
  sealed PR #230 head `680e257d8e35b2033638e84b09c742608268fc20`
  through normal merge commit `b840152` without rebase, reset, force push, or
  branch deletion.
- Reused the existing protected Search Console workbench and deterministic
  opportunity model to produce internal, non-publishing experiment briefs;
  no CMS, database, AI writer, provider, route, or lead system was added.
- Hardened the disclosure summary to valid phrasing-content markup while
  preserving the approved Black Diamond layout, native keyboard behavior, and
  responsive disclosure pattern; added a regression for that HTML contract.
- Added no Production, environment, migration, database write, provider call,
  public copy, WordPress edit, communication, spend, DNS, or NellySelly action.

## 2026-08-29 — Capability authority ledger candidate

- Preserved the prior PR #230 head at
  `rescue/amm-pr230-pre-pr229-parent-refresh-20260829-143600`, then merged exact
  sealed PR #229 head `ab24fc0ef2eef10f9b368d57909d899dd053d204`
  without rebase, reset, force push, or branch deletion.
- Added one typed, read-only capability ledger to the existing protected Growth
  Command Center so Production, reviewed candidates, operator/host gates,
  external dependencies, and prohibited autonomy remain visibly distinct.
- Reconciled the competitive benchmark with already-built database revival,
  recurring-value planning, messaging, and provider-contract foundations to
  prevent parallel rebuilds.
- Replaced the consumed PR #209 durability gate and superseded homepage-only
  WordPress gate with the current ordered-candidate and consent-runtime gates;
  the ledger no longer presents historical authority as actionable.
- Reconciled the inherited keyboard-scroll help with one stable accessible name
  for the channel-economics region so the latest parent contract, browser query,
  and static authorization guard agree.
- Added no route, migration, package, provider call, public surface, mutation,
  secret, or Production change.

## 2026-08-28 — OTP Facebook crawler account override acceptance test

- Executed the explicitly approved, four-path GET/HEAD-only account-root
  Apache trial after creating a byte-identical backup.
- Proved the directive parsed but could not supersede the earlier
  server-global authorization decision; the social matrix remained 40/42.
- Restored the original `.htaccess`, verified its SHA-256 against the retained
  backup, moved that backup outside the public root, and reconfirmed normal
  browser and sensitive-route behavior.
- Proved the supported per-vhost include is root-owned, so no additional
  WordPress or `.htaccess` workaround should be built. No active hosting,
  application, database, communication, DNS, publication, or NellySelly change
  remains from the test.

## 2026-08-29 — OTP Facebook crawler Apache diagnosis candidate

- Replaced the superseded unknown-ModSecurity-rule hypothesis with the exact
  live cause: a server-global Apache `SetEnvIfNoCase` mapping of
  `facebookexternalhit` to `bad_bots`, denied by `Require not env bad_bots`.
- Added a bounded host-operator remediation, acceptance, rollback, and exact
  approval gate without editing Apache, `.htaccess`, WordPress, Vercel, DNS,
  cache, Production data, communications, or NellySelly.
- Replaced the verifier and existing admin surfaces' stale broad-WAF whitelist
  instructions with diagnosis-aware, fail-closed guidance; an unknown crawler
  failure can no longer inherit the OTP Apache diagnosis.
- Consolidated historical operator aliases onto the canonical root-cause and
  change sheets so no active runbook still asks for a nonexistent ModSecurity
  rule ID.
- Tightened diagnosis reuse to the exact two known Our Town URLs, Facebook
  crawler identity, and HTTP 403 result; every partial, different-path, or
  different-status failure now fails closed to generic investigation guidance.
- Added an explicit two-host condition to the representative Apache expression
  and switched header reads to `req_novary` so the bounded access-control test
  does not fragment caches by Host or User-Agent.

## 2026-08-29 — Public owned-referral handoff candidate

- Replaced the internal-facing homepage social-asset promotion with a
  consumer-facing Share/Copy referral handoff using the existing Black Diamond
  identity and approved 1200×630 social card.
- Added a fixed canonical `/ask` referral URL, privacy-allowlisted handoff/copy
  events, native Web Share plus `canShare` capability detection, and a
  Clipboard/manual-copy fallback.
- Added no publisher, provider, lead store, external send, database migration,
  Production mutation, or NellySelly dependency.

## 2026-08-29 — PR #225 refresh onto exact sealed PR #224

- Preserved the previously sealed PR #225 head
  `60599703cf8ac5e65794b696aefaebc6353bbdf0` at
  `rescue/amm-pr225-pre-pr224-parent-refresh-20260829-1224` before changing the
  stacked candidate.
- Merged exact sealed PR #224 head
  `2effb45e2a324c25875dcf7d24019eae8dfdad38` without rebase, reset, force
  push, or conflict at reconciliation commit
  `eab49cbe2926f3726d289473c308363e1f03de9e`.
- Retained PR #224's truthful blank lead-intent defaults and PR #223's named,
  focusable, keyboard-scrollable channel-economics region while keeping PR
  #225's baseline register read-only and target entry locked.
- Exact Node 24.18.0 local acceptance passes 10 focused files / 99 tests,
  strict TypeScript, targeted ESLint, release safety 14/14, sealed-parent
  ancestry, and whitespace checks. Fresh exact-head GitHub, immutable Preview,
  protected browser/visual, and runtime-log evidence remains mandatory.
- No Production, environment, database row, target, lead/event, communication,
  provider, WordPress/DNS, deployment, publication, deletion, or NellySelly
  action occurred.

## 2026-08-29 — Lead-intent default truth candidate

- Preserved the previously sealed PR #224 head
  `5c75b8f919442c05b607eb666c5595023057d94d` at
  `rescue/amm-pr224-pre-pr223-accessibility-seal-20260829-1210`, then merged
  accessibility-refreshed PR #223 head
  `1d893f4c23ca53a1b852a1953b953b40e6f997f3` without a force push.
- Reused the current Seller and Buyer intake, canonical lead lifecycle command,
  deterministic scoring, and qualification logic instead of creating another
  form, lead store, router, or intelligence layer.
- Removed silently asserted condition, timeline, and financing defaults from
  untouched forms; optional values now begin blank and are omitted until the
  consumer explicitly selects them.
- Removed the untouched buyer preapproval assertion; the field is omitted
  unless the consumer affirmatively checks it.
- Preserved missing, unrecognized, and explicitly uncertain timelines as
  `null`, awarded them zero points, and required an explicit urgent timeline
  before seller A-grade qualification. Only actual planning-horizon answers
  retain the 24-month compatibility mapping.
- Added form-payload and atomic lifecycle regressions plus same-viewport mobile
  before/after evidence without changing the released visual system.
- No Production, environment, database row, lead/event, communication,
  provider, WordPress/DNS, deployment, publication, deletion, or NellySelly
  action occurred.

## 2026-08-29 — Channel-economics truth candidate

- Preserved original PR #223 head
  `294e08fc8524e515364c7a7bd49cfe8413d3d08c` at
  `rescue/amm-pr223-pre-pr222-exact-seal-20260829-040442`, then reconciled the
  candidate onto exact sealed PR #222 head
  `c6ff9157e66705128a283b98096f74ca8247cdab` without a force push.
- Reused the canonical Growth Command Center, Neon outcome/spend ledgers,
  deterministic intelligence engine, and PR #222 decision packets instead of
  creating a finance dashboard, CRM, provider adapter, database, or AI
  estimator.
- Corrected `referral_paid` so it is a referral cost and can never inflate
  attributed revenue or ROAS.
- Added signed-client economics, CPQL, recorded fee burden, tracked
  contribution, and explicit closed-revenue/referral-fee coverage.
- Missing or partial evidence is now unknown rather than zero: it withholds
  ROAS/contribution and blocks scale recommendations until every applicable
  close is reviewed.
- Kept the Growth surface server-authorized, aggregate-only, read-only, and
  explicit that tracked contribution is not net income.
- Made the intentionally wide channel-economics table an explicitly named,
  keyboard-focusable scroll region with visible focus and arrow-key guidance;
  protected browser acceptance now proves keyboard horizontal movement.
- Former-head test and visual proof is historical until the refreshed exact
  head passes local, CI, immutable Preview, protected browser, security,
  isolation, and runtime-log acceptance.
- Refreshed code-bearing head `f52e661bcca09824eafc1c7006102ba9716a16b2`
  passes exact Node 24 isolation, safety 14/14, 263 files / 3,306 tests,
  strict types, lint, optimized 59-page build, 95/17 route proof, doctor 43/43,
  Production dependency audit, 662-commit gitleaks, focused security review,
  and 2/2 authenticated desktop/mobile read-only browser scenarios. Exact
  GitHub, immutable Preview, hosted visual, and runtime-log sealing remain
  pending.
- No Production, environment, database, lead/event, communication, provider,
  WordPress/DNS, publication, spend, deletion, or NellySelly action occurred.

## 2026-08-29 — Local-demand decision packets candidate

- Preserved prior PR #222 head
  `08e0d345dd52a01d5da9a42b10dde982cbcce606` at
  `rescue/amm-pr222-pre-pr221-exact-seal-20260829-031605`, then reconciled the
  candidate onto exact sealed PR #221 head
  `61e152cb7ce03fd1904a06f30435dbe7ef36c4e1` without a force push.
- Kept PR #221's final funnel-identity browser proof unchanged; PR #222 adds
  only its separate authenticated Growth Command Center visual acceptance.
- Reused the canonical Growth Command Center and persisted Search
  Console/Business Profile opportunities instead of creating another dashboard,
  provider connector, CRM, database, or AI agent.
- Added deterministic decision packets with type-allowlisted aggregate evidence,
  confidence, freshness, source context, one owner-review next decision, and
  explicit non-execution limitations.
- Removed Google's retired `business_conversations` metric from active CSV
  acceptance, fixed the legacy compatibility total to zero, and added a
  forward-only Neon guard against new/revised canonical signals claiming it.
- Preserved historical evidence and excluded raw queries, arbitrary URLs,
  consumer data, provider IDs, fingerprints, and arbitrary JSON fields from the
  rendered packet.
- No Production, environment, database row, lead/event, communication,
  provider call, WordPress/DNS, publication, spend, deletion, or NellySelly
  action occurred.

## 2026-08-29 — Cross-domain measurement consolidation candidate

- Reused the already-reviewed PR #212 application, WordPress bridge, tests,
  release package, and activation runbooks instead of creating another
  analytics implementation.
- Reconciled that consent-gated measurement work onto exact sealed PR #220 head
  `19689e95d824d7d06e5f3b60cd18335f53018c93`, preserving the newer funnel
  identity, durable KPI authority, privacy minimization, automation exclusion,
  and read-only Preview controls.
- External analytics remains fail closed: the Ask runtime requires the exact
  approved Production container, explicit analytics consent, a canonical
  public route, and non-QA/non-automated traffic. Advertising purposes remain
  denied and the dedicated `ammDataLayer` receives only allowlisted fields.
- The canonical WordPress bridge remains independently disabled by default;
  its 1.2.0 Basic Consent loader requires the existing provider's exact
  `allow` state and rejects coexistence with the legacy GTM bootstrap.
- Hardened both public browser analytics routes to require a present approved
  Origin, bounded experiment JSON at 4,096 bytes with exact input contracts,
  and added explicit WordPress allow-to-deny revocation with Google-only cookie
  expiry and duplicate-runtime prevention.
- No Production configuration, deployment, migration, lead/event write,
  communication, WordPress edit, publication, spend, DNS, deletion, provider,
  or NellySelly action occurred.
## 2026-08-29 — PR #219 refresh onto exact sealed PR #218

- Preserved prior PR #219 head `5486bed20272d2a661bc28a0e3a4a4576b2cb11f`
  at `rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`.
- Merged exact sealed PR #218 head
  `f065d8801bec295c99185d846ff4bc38de2a0a6f` without force push at
  reconciliation head `f2754d0e1858c1afcf639977051f3488ab591f89`.
  Product, API, migration, shared-ingress, route, and test files merged without
  conflict.
- Retained the canonical Growth Command Center, growth ledgers, shared bounded
  ingress transport, endpoint attestation, RBAC, audit ledger, spend contract,
  and safe-disabled organic-search contract. No parallel analytics product,
  database, dashboard, OAuth client, provider adapter, or publisher was added.
- Reconciled head `5d598cc2228b6564af883a9716aedf1aa28cb2fb`
  passes isolation, safety 14/14, 252 files / 3,210 tests, strict types, lint,
  optimized 57-page build, 92/17 routes, doctor 43/43, dependency audit,
  653-commit gitleaks, exact-parent ancestry, whitespace, and focused security
  review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 36 migrations and
  passed both spend and organic contracts with denied browser/legacy-role
  execution and zero synthetic rows or receipts after rollback. Exact-head CI,
  immutable Preview, protected no-commit browser/visual, and runtime-log proof
  remain pending after the documentation-only evidence seal.
- Changed no Production deployment, environment, Neon object or row, Search
  Console property, import, page, lead, message, provider, campaign/budget,
  WordPress surface, DNS, purchase, deletion, or NellySelly system.

## 2026-08-29 — PR #218 refresh onto exact sealed PR #217

- Preserved prior PR #218 head `cd087e5c5c0fda82a3175b86b550c966120eb2ab`
  at `rescue/amm-pr218-pre-pr217-exact-seal-20260829-001928`.
- Merged exact sealed PR #217 head
  `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf` without force push at
  exact-parent merge head `693af26f3fb536f62784b475cbbebebfde28ff9f`.
  Application, API, migration, and test files merged automatically; conflicts
  were limited to two additive release-history ledgers.
- Retained the existing Growth Command Center, canonical growth schema,
  `growth:manage` boundary, immutable audit ledger, bounded CSV contract, and
  safe-disabled import gate. No parallel database, dashboard, importer,
  provider adapter, campaign manager, CRM, or analytics ledger was created.
- Former-head proof is historical until fresh exact-head Node 24, disposable
  PostgreSQL 17, immutable Preview, protected no-commit browser, security,
  isolation, and runtime-log verification pass.
- Exact-parent code-bearing/reconciliation head
  `894643a60bd9fb50b441dccb3d2d3d8e6b5c805b` passes 6 focused files / 47
  tests, all 247 files / 3,184 tests, strict TypeScript before and after build,
  full ESLint, optimized 55-page Next.js 15.5.21 build, 89/17 route proof,
  doctor 43/43, safety 14/14, Ask/Nelly isolation, Production dependency audit,
  651-commit gitleaks, ancestry, whitespace, and focused security review.
- A fresh disposable PostgreSQL 17.11 cluster applied all 35 migrations and
  passed the spend contract; the synthetic transaction rolled back to zero
  test channels, campaigns, and receipts. Fresh exact-head CI, immutable
  Preview, protected browser/visual, and runtime logs remain mandatory after
  the documentation-only seal.
- Changed no Production deployment, environment, Neon object or row, spend,
  lead, message, provider, campaign, budget, WordPress surface, DNS,
  publication, purchase, deletion, or NellySelly system.
## 2026-08-24 — Marketing-spend ledger ingress candidate

- Reused the canonical growth schema, Growth Command Center, KPI engine,
  `growth:manage` RBAC, and immutable audit ledger after full-history inspection
  found no prior spend importer.
- Added one protected paste/file workbench and bounded same-origin preview and
  commit APIs for an exact 19-column canonical CSV contract.
- Added deterministic row/batch fingerprints, strict date/identity/metric and
  formula validation, all-identity synthetic/QA refusal, stale-review
  protection, exact Ask Magic Mike Production-endpoint attestation, and a safe-
  disabled `GROWTH_SPEND_IMPORT_ENABLED=false` default.
- Added an owner-only atomic PostgreSQL function with serialized imports, exact
  replay idempotency, insert/revision/unchanged reconciliation, immutable
  before/after audits for dimension and daily-fact creation/revision, and
  append-only minimized receipts; raw CSV is never persisted.
- Added 30 focused parser, persistence, migration, guard, and route tests plus a
  PostgreSQL 17 executable contract covering all 35 migrations, malformed-date
  safety, role denial, immutability, and rollback.
- Added authenticated desktop/mobile Preview scenarios that derive the preview
  response from the canonical parser, intercept any commit call, prove keyboard
  and label behavior, and preserve screenshots. Their first mobile run exposed
  and then verified the correction of a 1,098 px overflow defect at a 390 px
  viewport and a hidden-file-input focus/label gap.
- Sealed exact code-bearing head `ed02f26af99911253f398ec5c1448e183a5dd976`
  with GitHub Release Gate `32795263654`, READY immutable Preview
  `dpl_2E7rVLVQy5wHnabTwcCSjpwSjpS6`, protected QA `32795486986`, 8/8 browser
  scenarios, and an exact-deployment log audit showing no error/fatal log,
  commit endpoint call, provider activity, or spend-ingress API request.
- No Production, environment, Neon, lead/event, message, provider, campaign,
  budget, WordPress, DNS, publication, purchase, deletion, or NellySelly action
  occurred.

## 2026-08-28 — PR #217 refresh onto exact sealed PR #216

- Preserved prior PR #217 head `d04984b4d162f13c79af261beb55a82f15a86b80`
  at `rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`.
- Merged exact sealed PR #216 head
  `211485df28fc818ab783ed357df8486f1460d5e2` without force push. Product
  application files merged automatically; conflicts were limited to additive
  release-history ledgers.
- Retained the existing vendor-neutral normalizer and protected synthetic
  contract lab. No parallel lead API, provider router, database, CRM, webhook
  store, or notification path was created.
- Prior PR #217 proof is historical pending fresh exact-head Node 24, immutable
  Preview, protected no-write browser, security, isolation, and runtime-log
  verification.
- Reconciliation head `5721a62f40a0d2c63475ca43608be066dddb018a`
  passes 6 focused files / 46 tests, all 242 files / 3,153 tests, strict types,
  lint, optimized 53-page build, 86/17 route proof, doctor 43/43, safety 14/14,
  isolation, dependency audit, a 649-commit secret scan, ancestry, whitespace,
  clean-tree, and focused security review. Exact-head CI and protected Preview
  proof remain mandatory after this documentation-only seal.
- Changed no Production deployment, environment, database row, lead, event,
  message, provider, WordPress surface, DNS, publication, spend, deletion, or
  NellySelly system.

## 2026-08-24 — Vendor ingress contract lab candidate

- Reused the existing Phase 9 vendor-neutral normalizer instead of creating a
  second lead API, provider router, database, or CRM.
- Added one `growth:manage`-protected contract lab for Zillow Tech Connect,
  Follow Up Boss, Meta Lead Ads, and Google Ads lead forms using only fixed
  `INTERNAL QA — DO NOT CONTACT` profiles.
- Implemented constant-time Follow Up Boss, Meta, and Google verification
  primitives aligned to current first-party documentation; Zillow fails closed
  until its authenticated provider onboarding contract is available.
- Added a forward-compatible Google `user_column_data` adapter while preserving
  `lead_id`, click attribution, explicit `is_test`, and review-only consent.
- Made unknown vendor test state an explicit review reason instead of silently
  classifying an event as live.
- The protected API accepts only a 512-byte profile selector and contains no
  database client, SQL, provider fetch, caller-supplied payload, message send,
  or live activation path.
- No Production, environment, database, lead/event, message, provider,
  WordPress, DNS, publication, spend, deletion, or NellySelly action occurred.

## 2026-08-28 — PR #216 exact-parent application acceptance

- Exact application/parent-refresh head
  `70198a7bb8467ac741b3c0977bd0ed95b8b5dbda` passes 12 focused files / 89
  tests, all 239 files / 3,137 tests, strict typecheck, ESLint, the optimized
  52-page build, 84/17 route proof, release doctor 43/43, safety 14/14,
  Ask/Nelly isolation, dependency audit, a 647-commit redacted secret scan,
  and whitespace verification.
- GitHub Release Gate run `33231179999` passed with artifact `9708564416`
  (`sha256:aedb154485d8dd63fadfb227340988fea1a85dc9176689dde9a2c0f10651d36a`).
- Immutable Preview `dpl_52wRTaBSYs1d6rGKmtMmetB8V2Cs` is READY at
  `https://ask-magic-mike-h7ylc9by3-eyes-up-industries.vercel.app`.
- Exact-branch protected run `33231584499` passed 17 read-only checks, six
  deliberate mutation skips, all six widget/funnel browser tests, release-
  candidate `GO`, and `PREVIEW_READY`. Artifact `9708684727` has digest
  `sha256:b48ce2c006ceefd217f6f6e622b7514bb17842be19ec63e7b0a63f38db9e232f`.
- Review caught that the default-branch bootstrap dispatcher still ran only
  three widget checks. Its read-only results remain valid, but the exact-branch
  workflow above is the acceptance authority for all six scenarios.
- Four generated desktop/mobile Home Value and Ask captures were visually
  inspected as readable, contained, branded synthetic states. Direct Vercel
  log filters for POST/PUT/PATCH/DELETE and warning/error/fatal each returned
  zero records during the protected window.
- Production remains on `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. This documentation-only seal must repeat
  exact-head CI and protected Preview proof before the later release gate.

## 2026-08-28 — PR #216 refresh onto exact sealed PR #215

- Preserved prior PR #216 head `a6098ab4ee7a13d024bafc08264628e2691a8e06`
  at `rescue/amm-pr216-pre-pr215-exact-seal-20260828-231335`.
- Merged exact sealed PR #215 head
  `c53cec6043525b593b254c457efdbbe5a29c0520` without force push. Application
  files merged automatically; conflicts were limited to additive changelog,
  QA-evidence, and executable release-authority records.
- Retained the existing funnel UUID, canonical event route, server-owned
  conversion authority, consent-channel integrity, and shared fail-closed
  Preview mutation interceptor.
- Prior PR #216 proof is historical pending fresh exact-head Node 24,
  immutable Preview, write-intercepted browser, security, isolation, and
  zero-mutation runtime verification.
- Changed no Production deployment, environment, database row, lead, event,
  message, provider, WordPress surface, DNS, publication, spend, deletion, or
  NellySelly system.

## 2026-08-24 — PR #216 refresh onto final PR #215 cutover hygiene

- Preserved former PR #216 head `253480326312d42a159323176d69e87f47262921`
  at `rescue/amm-pr216-pre-final-pr215-cutover-hygiene-20260824-180325`.
- Merged exact final PR #215 head
  `2d020358da1d7f95ebf82c47c0f1c0e83d6216d2`, retaining the ordered PR #209
  through PR #215 release, no-write, no-send, and first-contact durability
  contracts.
- Preserved the existing funnel UUID, canonical event route, server-owned
  conversion authority, consent-channel integrity, and shared fail-closed
  Preview mutation interceptor.
- Reconciled PR #215's older endpoint-specific browser contract to PR #216's
  stronger shared catch-all boundary and upgraded the inherited source-level
  regression test to enforce the stronger design.
- Invalidated older PR #216 proof pending fresh exact-head Node 24, immutable
  Preview, write-intercepted browser, security, and deployment-log verification.
- Changed no Production deployment, environment, database row, lead, event,
  message, provider, WordPress surface, DNS, spend, deletion, or NellySelly
  system.

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
  sizes plus one recoverable failure path.
- Refreshed code-bearing head `0c45a33b706d7e8a02501ccf83baf24a83ec107d`
  passes 10 focused files / 72 tests, all 237 files / 3,123 tests, strict
  typecheck, full ESLint, optimized build/84-route proof, 14/14 release safety,
  isolation, Production dependency audit, and a 615-commit redacted history
  scan. GitHub Release Gate run `32760061703` passed.
- A later exact-Preview log audit found that the older widget scenarios only
  intercepted `/api/leads`; passive `/api/events` requests reached Preview
  during protected run `32761949512`. No lead, provider, notification, or
  canonical conversion was created, but privacy-minimized Preview analytics
  rows may have been written, so that run is not accepted as no-write proof.
- Preserved that head at
  `rescue/amm-pr216-pre-widget-no-write-proof-fix-20260824-1432`. Code-bearing
  head `90108d8b386a264ae8e536e6503043f79f7a14ae` makes both browser suites use
  one fail-closed interceptor for POST/PUT/PATCH/DELETE, synthetically fulfills
  approved commands, and blocks plus records every unexpected mutation.
  Replacement exact-head protected proof is mandatory. Production remains
  unchanged.
## 2026-08-28 — PR #215 exact-parent application acceptance

- Reused the canonical Home Value funnel and `POST /api/leads` command on exact
  sealed PR #214 head `81a2c7544318d630437ed3e86cbea029c5c9b57d`;
  the exact application/parent-refresh head is
  `eff8fc04449fab4fd34cd0fb69735e6787d0b382`.
- Passed 236 files / 3,108 tests, strict typecheck, ESLint, the optimized
  52-page build, 84/17 route proof, release doctor 43/43, safety 14/14,
  Ask/Nelly isolation, dependency audit, a 646-commit redacted secret scan,
  and whitespace verification.
- GitHub Release Gate run `33229869967` passed with artifact `9708168965`
  (`sha256:09f00d64c6f9c9ab593529c5a67da4981ce5d350eec4700fc3d59a30620af2c2`).
- Immutable Preview deployment `dpl_8qNH7Ry1gSPqdSwHrRNM3Y9LHhZR` is READY at
  `https://ask-magic-mike-ao5u74sfz-eyes-up-industries.vercel.app`.
- Protected no-write run `33230015801` checked out the exact application head
  and passed 17 read-only checks, six deliberate mutation skips, 3/3
  write-intercepted browser checks, release-candidate `GO`, and
  `PREVIEW_READY`. Artifact `9708219853` has digest
  `sha256:17c4339d2c62846df1191b5a94acd107c78a130d09cac40ba40d899eadd1e6e9`.
- Current-run 1280, 390, and 320 visual acceptance found no horizontal
  overflow; empty submission focused the address field and exposed a specific
  live-region error without creating a lead. Preview logs contained four
  page-load analytics POSTs, no lead/delivery/provider request, and no
  warning/error/fatal record.
- This evidence-only seal changes no Production deployment, environment,
  database schema/lead, notification, provider, WordPress, DNS, publication,
  spend, deletion, or NellySelly system. The resulting documentation head must
  repeat exact-head CI and protected Preview proof before the later gate.

## 2026-08-28 — PR #215 refresh onto exact sealed PR #214

- Preserved prior PR #215 head `2d020358da1d7f95ebf82c47c0f1c0e83d6216d2`
  at `rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229`.
- Merged exact sealed PR #214 head
  `81a2c7544318d630437ed3e86cbea029c5c9b57d` without force push. Conflicts
  were limited to additive changelog, QA-evidence, and executable release-
  authority records; application files merged without manual resolution.
- Retained the canonical Home Value funnel, shared lead command, first-valid-
  contact durable write, optional-phone semantics, bounded contact validation,
  consent-channel accuracy, and privacy-safe durable-failure telemetry.
- Invalidated former PR #215 proof pending fresh exact-head Node 24, immutable
  Preview, write-intercepted interaction, and protected no-write runtime proof.
- Changed no Production deployment, environment, database row, lead, event,
  notification, provider, WordPress surface, DNS, publication, spend, deletion,
  or NellySelly system.
## 2026-08-24 — PR #215 refresh onto final PR #214 cutover hygiene

- Preserved former PR #215 head `0e47db8780c7257f0d445d75e034aacd535c06a4`
  at `rescue/amm-pr215-pre-final-pr214-cutover-hygiene-20260824-174316`.
- Merged exact final PR #214 head
  `94e3d66190df138d42c1321adfeb0cefb0478545`, retaining the ordered PR #209
  through PR #214 release, no-write, and no-send contracts.
- Preserved the existing Home Value funnel, canonical lead command, shared
  contact validation, first-valid-contact durable write, optional-phone
  semantics, and privacy-safe durable-failure telemetry.
- Conflicts were limited to additive changelog and release-order documentation;
  no funnel, API, lead, notification, provider, or analytics application file
  required manual conflict resolution.
- Invalidated older PR #215 proof pending fresh exact-head Node 24, immutable
  Preview, write-intercepted browser, security, and deployment-log verification.
- Changed no Production deployment, environment, database row, lead, event,
  message, provider, WordPress surface, DNS, spend, deletion, or NellySelly
  system.

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
## 2026-08-28 — PR #214 refresh onto exact sealed PR #213

- Preserved prior PR #214 head `94e3d66190df138d42c1321adfeb0cefb0478545`
  at `rescue/amm-pr214-pre-pr213-exact-seal-20260828-222353`.
- Merged exact sealed PR #213 head
  `d2a1bf01d0962e07dd1e460acd4c295e145cf6a8` without force push. Conflicts
  were limited to additive changelog and executable release-authority records;
  application files merged without manual resolution.
- Retained the existing urgency selector, notification outbox, approved Our
  Town/Mike assets, accessible HTML/plain-text facts, version-pinned retries,
  synthetic no-send gallery, and Production-404 acceptance-route safeguard.
- Invalidated former PR #214 proof pending fresh exact-head Node 24, immutable
  Preview, current-run visual/interaction audit, and protected no-send runtime
  verification.
- Changed no Production deployment, environment, database row, lead, event,
  notification, provider, WordPress surface, DNS, publication, spend, deletion,
  or NellySelly system.

## 2026-08-24 — PR #214 refresh onto final PR #213 cutover hygiene

- Preserved former PR #214 head `3ac0885a6f19fc479266457cff760ef836094470`
  at `rescue/amm-pr214-pre-final-pr213-cutover-hygiene-20260824-172407`.
- Merged exact final PR #213 head
  `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea`, retaining the full ordered
  PR #209 through PR #213 release and no-write contracts.
- Preserved the version-pinned lead-alert v3 renderer, synthetic no-send
  gallery, Preview-only acceptance route, and Production-404 safeguard.
- Conflicts were limited to additive changelog history; no application file
  required manual conflict resolution.
- Invalidated older PR #214 proof pending fresh exact-head Node 24, protected
  Preview, no-send visual, and deployment-log verification.
- Changed no Production deployment, environment, database row, lead, event,
  message, provider, WordPress surface, DNS, spend, deletion, or NellySelly
  system.

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
## 2026-08-28 — PR #213 refresh onto exact sealed PR #211

- Preserved prior PR #213 head `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea`
  at `rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`.
- Merged exact sealed PR #211 head
  `c5700eda5e32ff6ead9a985c86b811a3c46e1e66` without force push. Conflicts
  were limited to additive changelog and executable release-authority records;
  application files merged without manual resolution.
- Retained PR #211's Ask clarity, skip-link focus, and current Production
  ledger together with PR #213's single shared responsive navigation,
  active-route semantics, narrow-phone behavior, and Escape focus safeguard.
- Invalidated former PR #213 proof pending fresh exact-head Node 24, immutable
  Preview, screenshot-first responsive audit, browser interaction, and no-write
  runtime verification.
- Changed no Production deployment, environment, database row, lead, event,
  notification, WordPress surface, DNS, publication, spend, deletion, or
  NellySelly system.

## 2026-08-28 — PR #211 refresh onto exact sealed PR #210

- Preserved prior PR #211 head `5d566a4a14d4a7cb67175683fdf099e8d62747b7`
  at `rescue/amm-pr211-pre-pr210-exact-seal-20260828-213129`.
- Merged exact sealed PR #210 head
  `93af400494a94a8d8aedb09ece16bbff4dfd214b` without force push. The only
  conflicts were additive changelog, implementation-status, and executable
  release-authority records; application files did not overlap.
- Retained PR #210's canonical redirects and current PR #209 acceptance ledger
  together with PR #211's existing Ask clarity, shared skip link, focus target,
  and real-browser keyboard contracts.
- Invalidated former PR #211 proof pending fresh exact-head Node 24, protected
  Preview, keyboard, and zero-write runtime verification.
- Changed no Production deployment, environment, database row, lead, event,
  notification, WordPress surface, DNS, publication, spend, deletion, or
  NellySelly system.

## 2026-08-28 — PR #210 refresh onto accepted PR #209 Production

- Recorded accepted PR #209 Production merge
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; its durability gate is exhausted.
- Preserved prior PR #210 head `3ed8d050edd386aa0cd4a83d230ff3170d24a306`
  at `rescue/amm-pr210-pre-main-cutover-20260828-210054` and merged accepted
  `main` forward without force push.
- Retained only PR #210's canonical query-preserving redirects and monitor/test
  scope. Fresh exact-head Node 24 and protected Preview proof remain required.
- Changed no Production deployment, environment, database row, lead, event,
  notification, WordPress surface, DNS, publication, spend, deletion, or
  NellySelly system.

## 2026-08-24 — PR #213 refresh onto final PR #211 cutover hygiene

- Preserved former PR #213 head `431ae9eebba7d38712305fa257f118cf0e498a89`
  at `rescue/amm-pr213-pre-final-pr211-cutover-hygiene-20260824-170330`.
- Merged exact final PR #211 head
  `5d566a4a14d4a7cb67175683fdf099e8d62747b7`, retaining the complete PR #209
  cutover/no-write and PR #210/PR #211 redirect/accessibility contracts.
- Preserved PR #213's shared responsive navigation, active-route semantics,
  narrow-phone layout, and closed-menu Escape focus correction.
- Conflicts were limited to additive changelog history; no application file
  required manual conflict resolution.
- Invalidated older PR #213 proof pending fresh exact-head Node 24, protected
  Preview, responsive-navigation, and zero-write runtime verification.
- Changed no Production deployment, environment, database row, lead, event,
  message, WordPress surface, DNS, spend, deletion, or NellySelly system.

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

## 2026-08-24 — PR #211 refresh onto final PR #210 cutover hygiene

- Preserved former PR #211 head `6eacc33d16e34897c97288e48cd736433a3d9e15`
  at `rescue/amm-pr211-pre-final-pr210-cutover-hygiene-20260824-164445`.
- Merged exact final PR #210 head
  `3ed8d050edd386aa0cd4a83d230ff3170d24a306`, retaining the canonical redirects,
  monitor contract, PR #209 cutover guard, and browser telemetry no-write rules.
- Preserved PR #211's shared skip link, focus targets, consumer Ask semantics,
  and real-browser keyboard contract.
- Resolved additive release-history and authority-test conflicts without
  creating another funnel, header, monitor, or E2E system.
- Invalidated older PR #211 checks pending fresh exact-head Node 24, protected
  Preview, keyboard, and zero-write runtime proof.
- Changed no Production deployment, environment, database row, lead, event,
  message, WordPress surface, DNS, spend, deletion, or NellySelly system.

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
## 2026-08-24 — PR #210 refresh onto final PR #209 cutover hygiene

- Preserved former PR #210 head `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`
  at `rescue/amm-pr210-pre-final-pr209-cutover-hygiene-20260824-162615`.
- Merged exact final PR #209 head
  `b28b380f2cc3f9b63b2c0048b398e97a88dfee4b`, retaining its read-only cutover
  guard and fail-closed Preview browser telemetry interception.
- Resolved the sole additive release-authority test conflict while preserving
  PR #210's redirect/monitor contracts and both candidates' evidence ledgers.
- Invalidated older PR #210 checks pending fresh exact-head Node 24 and
  protected no-write Preview proof.
- Changed no Production deployment, environment, database row, lead, event,
  message, WordPress surface, DNS, spend, deletion, or NellySelly system.

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
