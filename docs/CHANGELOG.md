# Changelog

## 2026-08-28 — Baseline and target-readiness control

- Added a read-only baseline-readiness layer to the existing protected Growth
  Command Center; no parallel dashboard, target database, or write route was
  created.
- Reused and updated PR #187's reviewed KPI vocabulary against the current
  canonical Growth aggregates while deliberately excluding its stale migration
  and numeric target writer.
- Classified 42 evidence contracts as measured, directional, insufficient,
  not instrumented, or unavailable. Demand-dependent metrics remain unmeasured
  when eligible live demand is zero, even if naive arithmetic would show zero.
- Added a compact activation gate, explicit target lock, collapsed evidence
  audit, and direct handoff to the existing Distribution Command.
- Recorded the aggregate-only Production baseline and current Neon allowance
  risk without exposing PII or embedding a stale provider value in the app.
- Closed an inherited Preview-safety gap found during direct hosted QA. All
  public analytics/experiment persistence routes now apply the existing
  endpoint-aware Preview mutation guard before durable rate limiting or event
  storage. Automated-browser suppression remains intact, and ordinary Preview
  telemetry returns a truthful non-persisted response.
- Aggregate-only incident reconciliation proved the single QA page-view landed
  only on the Neon Preview branch; the identical Production time/path window
  contained zero rows. The Preview artifact was preserved rather than hidden by
  deletion.
- No Production row/configuration, target, lead, message, provider,
  publication, spend, WordPress/DNS, deletion, or NellySelly mutation occurred;
  the single preserved Preview analytics artifact is documented above.

## 2026-08-29 — PR #221 cross-domain measurement consolidation

- Reused exact PR #212 head
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a` and reconciled it onto exact
  sealed PR #220 head `19689e95d824d7d06e5f3b60cd18335f53018c93`; no parallel analytics store,
  browser identity, WordPress forwarding path, or deployment was created.
- Preserved the cumulative train's canonical lead/event authority, valid
  pseudonymous funnel identity, server-owned conversion outcomes, Web Vitals
  privacy boundary, and automation/no-write Preview controls.
- Kept both activation boundaries disabled: Ask requires exact Production-only
  configuration plus explicit consent, and WordPress bridge 1.2.0 requires its
  separate default-off constant plus the existing cookie provider's exact
  `allow` state.
- Added fail-closed missing-Origin checks on both browser analytics routes,
  reused the shared bounded JSON ingress for the experiment endpoint, aligned
  its identifiers to canonical repository contracts, and added reversible
  WordPress consent withdrawal with Google-only cookie expiry and no duplicate
  same-page runtime.
- Retained the public preflight `HOLD` until the brokerage's legacy pre-consent
  GTM head/noscript bootstrap is replaced under its independent owner gate.
- Added the existing endpoint-attested Preview mutation guard to both public
  telemetry routes before rate limiting or repository access. Read-only Preview
  now fails closed with 503/no-store; the two-flag controlled Preview exception
  remains disabled.
- Disclosed one PII-free automatic homepage `page_view` persisted by the
  superseded Preview before the server repair. It created no lead, identity,
  notification, message, or Production write and remains intact.
- Final application head `735cc8930eb595b550adf69ace1d6fef3b82a939`
  passes exact Node 24 CI (`33239065433`), immutable Preview
  `dpl_8bWUx49oChfNeUrQpErDA9XxwK24`, protected no-write run `33239236233`,
  18 read-only checks, six intentional mutation skips, 4/4 browser scenarios,
  nine inspected desktop/mobile captures, and clean warning/error/fatal logs.
- Production remains `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; no WordPress, Google, environment,
  Production, lead, communication, DNS, spend, deletion, or NellySelly action
  occurred.

## 2026-08-29 — PR #220 refresh onto exact sealed PR #219

- Preserved former PR #220 head
  `5e605ca8bd8b313f7a4c29b2d1220c7c40a477a3` at
  `rescue/amm-pr220-pre-pr219-exact-seal-20260829-012049`.
- Merged exact sealed PR #219 head
  `b628fc00fc6b03d89871c65d884fe649db025968` without force push at
  exact-parent merge head `61c162143cb9892f88a2318d32888ba2d644f329`.
  Product, API, migration, route, and focused-test files merged without
  conflict.
- Retained the canonical Growth Command Center, bounded ingress transport,
  growth ledgers, endpoint guards, RBAC, and audit system. Reconciled head
  `d73abeb1f2979f3c217fc5b0a873b483e0bd5561` passes isolation, safety 14/14,
  257 files / 3,238 tests, strict types, lint, optimized 59-page build, 95/17
  routes, doctor 43/43, dependency audit, 655-commit gitleaks, exact-parent
  ancestry, whitespace, and focused security review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 37 migrations and
  passed the spend, organic-search, and local-profile contracts with denied
  browser/legacy-role execution and zero synthetic residue after rollback.
  Exact-head CI, immutable Preview, protected no-commit browser/visual, and
  runtime-log evidence remain pending after the documentation-only seal.
- Production remains `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; no Production, environment, Neon,
  Google/provider, profile, import, publication, lead, message, WordPress,
  DNS, purchase, deletion, or NellySelly mutation occurred.

## 2026-08-29 — PR #219 refresh onto exact sealed PR #218

- Preserved former PR #219 head
  `5486bed20272d2a661bc28a0e3a4a4576b2cb11f` at
  `rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`.
- Merged exact sealed PR #218 head
  `f065d8801bec295c99185d846ff4bc38de2a0a6f` without force push at
  reconciliation head `f2754d0e1858c1afcf639977051f3488ab591f89`.
  Product, API, migration, shared-ingress, route, and test files merged without
  conflict.
- Retained the existing growth ledgers and controls. Reconciled head
  `5d598cc2228b6564af883a9716aedf1aa28cb2fb` passes isolation, safety 14/14,
  252 files / 3,210 tests, strict types, lint, optimized 57-page build, 92/17
  routes, doctor 43/43, dependency audit, 653-commit gitleaks, exact-parent
  ancestry, whitespace, and focused security review on Node 24.18.0.
- A fresh disposable PostgreSQL 17.11 cluster applied all 36 migrations and
  passed both ingress contracts with denied browser/legacy-role execution and
  zero synthetic residue after rollback. Exact-head CI, immutable Preview,
  protected no-commit browser/visual, and runtime-log evidence remain pending
  after the documentation-only evidence seal.
- Production remains `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; no Production, environment, Neon, Search
  Console, import, publication, lead, message, provider, campaign/budget,
  WordPress, DNS, purchase, deletion, or NellySelly mutation occurred.

## 2026-08-29 — PR #218 refresh onto exact sealed PR #217

- Preserved former PR #218 head
  `cd087e5c5c0fda82a3175b86b550c966120eb2ab` at
  `rescue/amm-pr218-pre-pr217-exact-seal-20260829-001928`.
- Merged exact sealed PR #217 head
  `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf` without force push at
  exact-parent merge head `693af26f3fb536f62784b475cbbebebfde28ff9f`.
  Application, API, migration, and test files merged automatically; only two
  additive release-history ledgers conflicted.
- Retained the canonical growth schema, Growth Command Center, audited
  spend-ingress contract, and safe-disabled import boundary. Former-head proof
  is historical pending fresh exact-head application, PostgreSQL, Preview,
  protected no-commit browser, security, isolation, and runtime-log evidence.
- Exact-parent code-bearing/reconciliation head
  `894643a60bd9fb50b441dccb3d2d3d8e6b5c805b` passes 6 focused files / 47
  tests, all 247 files / 3,184 tests, strict types before and after build,
  lint, optimized 55-page build, 89/17 routes, doctor 43/43, safety 14/14,
  isolation, dependency audit, 651-commit gitleaks, ancestry, whitespace, and
  focused security review. A disposable PostgreSQL 17.11 rebuild applied 35
  migrations, passed the transaction contract, and retained zero synthetic
  rows after rollback. Exact-head CI/Preview evidence remains pending after the
  documentation-only seal.
- Production remains `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; no Production, environment, Neon, spend,
  lead, message, provider, campaign/budget, WordPress, DNS, publication,
  purchase, deletion, or NellySelly mutation occurred.

## 2026-08-28 — PR #217 refresh onto exact sealed PR #216

- Preserved former PR #217 head
  `d04984b4d162f13c79af261beb55a82f15a86b80` at
  `rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`.
- Merged exact sealed PR #216 head
  `211485df28fc818ab783ed357df8486f1460d5e2` without force push at application
  head `e616170657861c3dd83fae43b28bef9cf89506af`. Product application files
  merged automatically; only additive history ledgers conflicted.
- Retained the existing vendor-neutral normalizer and the protected,
  fixed-profile, no-write/no-provider-call contract lab. Prior PR #217 evidence
  is historical pending fresh exact-head proof.
- Reconciliation head `5721a62f40a0d2c63475ca43608be066dddb018a`
  passes 6 focused files / 46 tests, all 242 files / 3,153 tests, strict types,
  lint, 53-page build, 86/17 route proof, doctor 43/43, safety 14/14, isolation,
  dependency audit, 649-commit gitleaks, ancestry, whitespace, clean-tree, and
  focused security review. Exact-head CI and protected Preview proof remain
  mandatory after the documentation-only seal.
- Production remains `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; no Production, environment, database,
  lead/event, message, provider, WordPress, DNS, publication, spend, deletion,
  or NellySelly mutation occurred.

## 2026-08-28 — PR #216 exact-parent application acceptance

- Exact application head `70198a7bb8467ac741b3c0977bd0ed95b8b5dbda`
  passed 239 files / 3,137 tests, strict types, lint, 52-page build, 84/17
  route proof, doctor 43/43, safety 14/14, isolation, dependency audit,
  647-commit secret scan, and whitespace.
- Release Gate `33231179999` / artifact `9708564416` passed. Immutable Preview
  `dpl_52wRTaBSYs1d6rGKmtMmetB8V2Cs` is READY.
- Exact-branch protected run `33231584499` / artifact `9708684727` passed 17
  read-only checks, six deliberate no-write skips, 6/6 intercepted browser
  checks, release-candidate `GO`, and `PREVIEW_READY`.
- The older default-branch bootstrap proved only its three widget checks; the
  exact-branch workflow is the authority for the complete six-scenario suite.
- Four desktop/mobile generated captures passed manual readability/containment
  review. Method- and level-filtered Preview logs showed no escaped mutation
  and no warning/error/fatal record.
- Production stayed on `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` /
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; the evidence-only seal must now repeat
  exact-head proof.

## 2026-08-28 — PR #216 refresh onto exact sealed PR #215

- Preserved prior PR #216 head `a6098ab4ee7a13d024bafc08264628e2691a8e06`
  at `rescue/amm-pr216-pre-pr215-exact-seal-20260828-231335`.
- Merged exact sealed PR #215 head
  `c53cec6043525b593b254c457efdbbe5a29c0520` without force push. Application
  files merged automatically; only additive history, QA evidence, and the
  executable release-authority test conflicted.
- Preserved PR #216's existing funnel identity, server-owned conversion,
  consent-channel, and shared fail-closed Preview mutation contracts.
- Earlier local, CI, Preview, browser, and runtime proof is historical until
  repeated on the resulting exact head.
- No Production, environment, database, lead/event, notification, provider,
  WordPress, DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #216 refresh onto final PR #215 cutover hygiene

- Preserved former PR #216 head `253480326312d42a159323176d69e87f47262921`
  at `rescue/amm-pr216-pre-final-pr215-cutover-hygiene-20260824-180325`.
- Merged exact final PR #215 head
  `2d020358da1d7f95ebf82c47c0f1c0e83d6216d2` while preserving first-contact
  durability and the funnel-event identity design.
- Kept PR #216's shared fail-closed first-party API mutation interceptor and
  updated the inherited endpoint-specific source test to enforce that stronger
  catch-all contract.
- Prior PR #216 proof is historical; fresh exact-head CI, immutable Preview,
  intercepted browser acceptance, and zero-write runtime evidence are mandatory.
- No Production, environment, database, lead/event, notification, provider,
  WordPress, DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — Funnel-event identity-integrity candidate

- Existing form UUIDs now connect pre-lead funnel stages to eventual durable
  sessions through protected first-party event context; no cookie, endpoint,
  table, tracker, or migration was added.
- Verification caught and removed a proposed early `sessions` insert that
  would have triggered the atomic lead command's idempotency-conflict guard.
- Browser GA/GTM/PostHog/widget success signals remain intact, but the canonical
  event route rejects browser-authored lead/widget creation, qualification,
  appointment-request, and notification outcomes and retains the server's
  post-storage `lead_created` as the only lead-conversion authority.
- Failure events remain allowlisted and PII-free; Home Value, buyer, seller,
  Ask preparation, and appointment flows now share the existing submission
  identity and have focused regression coverage.
- Home Value now creates or reuses its established submission UUID
  synchronously before the first address interaction event. Secure UUID
  generation failure is surfaced truthfully instead of producing an unlinked
  first-stage row.
- Ask emits a browser-only conversion only after fresh durable capture, not an
  idempotent replay. The existing protected-Preview runner now executes all
  four public funnels at 1,440 × 1,000 and 390 × 844 plus a failure path, with
  PNG evidence retained.
- Refreshed code-bearing head `0c45a33b706d7e8a02501ccf83baf24a83ec107d`
  passes 10 focused files / 72 tests, all 237 files / 3,123 tests, strict
  TypeScript, full ESLint, optimized build/84-route proof, 14/14 safety,
  isolation, the Production dependency audit, and a 615-commit redacted
  tracked-history scan. GitHub Release Gate run `32760061703` passed.
- Exact-Preview logs later proved the older widget scenarios intercepted the
  lead command but allowed passive `/api/events` telemetry to reach Preview.
  Protected run `32761949512` therefore remains valid visual/behavior evidence
  but is superseded as no-write proof. No lead, provider, notification, or
  canonical conversion was created; privacy-minimized Preview analytics rows
  may have been written.
- Preserved prior head `727c534f6f77b8a7acfe51eba361da57e6671cb4`
  at `rescue/amm-pr216-pre-widget-no-write-proof-fix-20260824-1432`.
  Code-bearing head `90108d8b386a264ae8e536e6503043f79f7a14ae`
  centralizes both browser suites on one fail-closed POST/PUT/PATCH/DELETE API
  interceptor. Replacement exact-head protected proof is mandatory.

## 2026-08-28 — PR #215 exact-parent application acceptance

- Exact application head `eff8fc04449fab4fd34cd0fb69735e6787d0b382`
  reuses sealed PR #214 `81a2c7544318d630437ed3e86cbea029c5c9b57d`
  and passed the complete local Node 24 release bar: 236 files / 3,108 tests,
  strict types, lint, 52-page build, 84/17 route proof, doctor 43/43, safety
  14/14, isolation, dependency audit, 646-commit secret scan, and whitespace.
- Release Gate `33229869967` / artifact `9708168965` passed. Immutable Preview
  `dpl_8qNH7Ry1gSPqdSwHrRNM3Y9LHhZR` is READY.
- Protected run `33230015801` / artifact `9708219853` passed 17 read-only
  checks, six deliberate no-write skips, 3/3 intercepted browser checks,
  release-candidate `GO`, and `PREVIEW_READY`.
- Current-run desktop and narrow-mobile visual evidence found no horizontal
  overflow and proved specific empty-address focus/error behavior without a
  lead submission. Runtime logs contained only four page-load telemetry POSTs,
  no lead/delivery/provider request, and no warning/error/fatal record.
- Production stayed on `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`.
  This documentation-only seal must be re-proved at its resulting exact head.

## 2026-08-28 — PR #215 refresh onto exact sealed PR #214

- Preserved prior PR #215 head `2d020358da1d7f95ebf82c47c0f1c0e83d6216d2`
  at `rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229`.
- Merged exact sealed PR #214 head
  `81a2c7544318d630437ed3e86cbea029c5c9b57d` without force push. Conflicts
  were limited to additive history, QA evidence, and release-authority records;
  application files merged without manual resolution.
- Retained first-valid-contact durable storage, optional phone, shared bounded
  contact validation, consent-channel accuracy, privacy-safe failure telemetry,
  and the canonical idempotent lead lifecycle.
- Prior PR #215 proof is historical; fresh exact-head CI, immutable Preview,
  write-intercepted browser acceptance, and protected no-write runtime evidence
  are mandatory.
- No Production, environment, database, lead/event, notification, provider,
  WordPress, DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #215 refresh onto final PR #214 cutover hygiene

- Preserved former PR #215 head `0e47db8780c7257f0d445d75e034aacd535c06a4`
  at `rescue/amm-pr215-pre-final-pr214-cutover-hygiene-20260824-174316`.
- Merged exact former PR #214 head
  `94e3d66190df138d42c1321adfeb0cefb0478545` without application conflict.
- Retained first-valid-contact durable storage, optional phone, shared bounded
  contact validation, consent-channel accuracy, privacy-safe failure telemetry,
  and the canonical idempotent lead lifecycle.

## 2026-08-28 — PR #214 refresh onto exact sealed PR #213

- Preserved prior PR #214 head `94e3d66190df138d42c1321adfeb0cefb0478545`
  at `rescue/amm-pr214-pre-pr213-exact-seal-20260828-222353`.
- Merged exact sealed PR #213 head
  `d2a1bf01d0962e07dd1e460acd4c295e145cf6a8` without force push. Conflicts
  were limited to additive history and release-authority records; application
  files merged without manual resolution.
- Preserved the approved exact identity assets, accessible HTML/plain-text lead
  facts, template-pinned retries, synthetic no-send gallery, and Production-404
  acceptance-route contract on top of the current responsive conversion shell.
- Prior PR #214 proof is historical. Fresh exact-head CI, immutable Preview,
  current-run visual acceptance, and protected no-send runtime evidence remain
  mandatory.

## 2026-08-24 — Home-value completion-integrity candidate

- Reused the canonical Black Diamond Home Value funnel and atomic lead command
  instead of adding another form, API, database, notification path, or CRM.
- Moved durable storage to the first valid contact step and collapsed the
  separate required-phone screen into one email-first Contact step with
  optional phone.
- Kept the API flexible for address plus email or phone, preserved
  idempotency/attribution/scoring/routing/outbox behavior, and prevented call
  permission from being recorded without a phone number.
- Reused one contact-validation helper at the browser and API boundaries so
  malformed email plus short/overlong phone values cannot reach persistence.
- Added aggregate-only reproducible Production evidence and a privacy-safe
  `lead_submit_failed` event that cannot carry error text or PII.
- No Production, database, lead/event, message, provider, WordPress/DNS,
  publication, spend, deletion, or NellySelly action occurred.

## 2026-08-24 — PR #214 refresh onto final PR #213 cutover hygiene

- Preserved former PR #214 head `3ac0885a6f19fc479266457cff760ef836094470`
  at `rescue/amm-pr214-pre-final-pr213-cutover-hygiene-20260824-172407`.
- Merged exact final PR #213 head
  `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea` without application conflict.
- Retained the approved exact identity assets, accessible HTML/plain-text lead
  facts, template-pinned retries, synthetic no-send gallery, and Production-404
  acceptance-route contract.
- Prior PR #214 proof is historical; fresh exact-head CI, protected Preview,
  no-send visual acceptance, and zero-delivery runtime evidence remain
  mandatory.
- No Production, environment, database, lead/event, notification, provider,
  WordPress, DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — Lead-alert brand identity v3 candidate

- The current email alert remained operationally complete, but its decorative
  hero did not visibly identify Mike or Our Town at the first-response moment.
- `lead_alert_email_v3` now composes the exact approved logo, exact approved
  Mike portrait, and existing deterministic urgency background in email-safe
  presentation markup; consumer details remain selectable HTML/plain text and
  never become raster PII.
- Historical v1/v2 outbox retries remain template-pinned. Unknown stored
  versions fail closed and remain visible instead of silently changing content.
- The protected Message Review Studio and a Preview/local-only, Production-404
  route expose three `[TEST]` synthetic renders with no recipient, provider,
  queue, lead, mutation control, or send path.
- The attempted built-in identity-preserving AI composite was rejected by the
  generation safety system. No alternate model or approximated likeness was
  used; exact approved source assets provide the higher-trust result.
- Full local Node 24 proof passes 234 files / 3,088 tests, strict typecheck,
  full ESLint, optimized build, 84-route proof, 14/14 safety, and deployable-
  source isolation. The exact application Preview passes 1280 × 720 and
  corrected 390 × 844 acceptance with no horizontal overflow or browser/runtime
  warning/error entries; supply-chain and history-secret scans are clean.
## 2026-08-28 — PR #213 refresh onto exact sealed PR #211

- Preserved prior PR #213 head `3c5ecdec2941a3ef01fa26bd2810a3ffa3156eea`
  at `rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`.
- Merged exact sealed PR #211 head
  `c5700eda5e32ff6ead9a985c86b811a3c46e1e66` without force push. Conflicts
  were limited to additive history and release-authority records; application
  files merged without manual resolution.
- Preserved the established Black Diamond system, PR #211 Ask/keyboard
  contracts, and PR #213's one shared mobile intent menu, active-route state,
  narrow-phone behavior, and focus-safe dismissal.
- Former PR #213 proof is historical. Fresh exact-head CI, immutable Preview,
  screenshot-first responsive audit, browser interaction, and no-write runtime
  evidence remain mandatory.
- No Production, environment, database, lead/event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-28 — PR #211 refresh onto exact sealed PR #210

- Preserved prior PR #211 head `5d566a4a14d4a7cb67175683fdf099e8d62747b7`
  at `rescue/amm-pr211-pre-pr210-exact-seal-20260828-213129`.
- Merged exact sealed PR #210 head
  `93af400494a94a8d8aedb09ece16bbff4dfd214b` without force push. Conflicts
  were limited to additive history, implementation status, and release-
  authority records; application files did not overlap.
- Preserved PR #210's redirects and accepted Production ledger alongside PR
  #211's Ask semantics, shared skip link, focus target, and keyboard tests.
- Prior PR #211 proof is historical. Fresh exact-head CI, protected Preview,
  keyboard, and zero-write runtime evidence are mandatory.
- No Production, environment, database, lead/event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-28 — PR #210 refresh onto accepted PR #209 Production

- Recorded accepted PR #209 Production merge
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`; its durability gate is exhausted.
- Preserved prior PR #210 head `3ed8d050edd386aa0cd4a83d230ff3170d24a306`
  at `rescue/amm-pr210-pre-main-cutover-20260828-210054` and merged accepted
  `main` forward without force push.
- Kept PR #210 limited to canonical query-preserving redirects plus matching
  monitor/tests. Fresh exact-head Node 24 and protected Preview proof remain
  mandatory before its separate release gate.
- No Production, environment, database, lead, event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #213 refresh onto final PR #211 cutover hygiene

- Preserved former PR #213 head `431ae9eebba7d38712305fa257f118cf0e498a89`
  at `rescue/amm-pr213-pre-final-pr211-cutover-hygiene-20260824-170330`.
- Merged exact final PR #211 head
  `5d566a4a14d4a7cb67175683fdf099e8d62747b7` without application conflict.
- Retained the existing Black Diamond header extension, mobile intent menu,
  active-route state, narrow-phone behavior, and Escape focus safeguard.
- Prior PR #213 proof is historical; fresh exact-head CI, protected Preview,
  navigation, and zero-write runtime proof remain mandatory.
- No Production, environment, database, lead/event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — Responsive conversion-identity navigation candidate

- Screenshot-first review confirmed the released Black Diamond identity and
  forms remain strong while the shared mobile header hides every intent path
  except Ask.
- Draft PR #213 extends that one shared header with labeled mobile/desktop
  navigation, current-route semantics, a compact premium intent panel,
  Escape/focus return, outside-pointer dismissal, and narrow-phone sizing.
- The existing Ask CTA, PR #211 skip link, routes, attribution, consent, forms,
  lead command, visual tokens, and legal copy are preserved.
- Local in-app-browser acceptance passed at 1280×720, 390×844, and 320×700,
  including a real local Buyer→Seller switch, no overflow, and a clean fresh
  browser console.

## 2026-08-24 — PR #211 refresh onto final PR #210 cutover hygiene

- Preserved former PR #211 head `6eacc33d16e34897c97288e48cd736433a3d9e15`
  at `rescue/amm-pr211-pre-final-pr210-cutover-hygiene-20260824-164445`.
- Merged exact final PR #210 head
  `3ed8d050edd386aa0cd4a83d230ff3170d24a306` while retaining the entire final
  PR #209 durability/no-write contract.
- Preserved the shared skip-link focus behavior and Ask field semantics, and
  reconciled only additive history and release-authority declarations.
- Prior PR #211 proof is historical; fresh exact-head CI, protected Preview,
  keyboard, and zero-write runtime evidence remain mandatory.
- No Production, environment, database, lead/event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #211 refresh onto release-ledger-sealed PR #210

- Preserved prior PR #211 head at
  `rescue/amm-pr211-pre-pr210-ledger-sync-20260824-0632`.
- Merged exact PR #210 parent `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`
  while retaining the Ask keyboard behavior and all upstream authority checks.
- Former PR #211 checks are historical only. Exact-head CI, protected Preview,
  no-write browser acceptance, and skip-link focus transfer must be repeated.
- No Production, environment, database, lead/event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #211 runtime skip-link focus hardening

- Protected Preview DOM and field semantics passed, but the integrated
  locator/CUA path did not retain focus on `#page-content` after activation.
  Because that path could not reliably perform a first Tab either, the result
  is recorded as an ambiguity rather than definitive browser behavior.
- Preserved the pre-fix candidate at
  `rescue/amm-pr211-pre-runtime-skip-focus-20260824-0418`.
- The shared header now reasserts the same content-target focus once the
  browser activation cycle completes; the target and route contract are
  unchanged.
- Regression coverage now models the browser refocus edge case. Fresh exact-
  head CI, Preview, and keyboard proof remain mandatory before release.
- The existing protected Preview browser file now also runs a fully intercepted
  Tab/Enter test. Local Chromium passes all three tests with no application
  write.

## 2026-08-24 — PR #211 stack refresh onto refreshed PR #210

- Preserved the former PR #211 head at
  `rescue/amm-pr211-pre-pr210-refresh-20260824-0405`.
- Synchronized the accessibility candidate with exact refreshed PR #210 head
  `5b884d5eca43fb4dcd1111c59c78a85c54698db1` before any Production action.
- The only merge conflict was additive release history in this file. The Ask,
  header, and shared content-target implementation did not overlap.
- Prior PR #211 CI and Preview are historical evidence only. The refreshed head
  must repeat exact-head proof before its later gate is requestable.

## 2026-08-24 — PR #210 refresh onto final PR #209 cutover hygiene

- Preserved former PR #210 head `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`
  at `rescue/amm-pr210-pre-final-pr209-cutover-hygiene-20260824-162615`.
- Merged exact final PR #209 head
  `b28b380f2cc3f9b63b2c0048b398e97a88dfee4b`, retaining its read-only cutover
  guard and fail-closed Preview browser telemetry interception.
- Resolved the sole additive release-authority test conflict while preserving
  PR #210's redirect/monitor contracts and both candidates' evidence ledgers.
- Prior PR #210 proof is historical; fresh exact-head CI, Preview identity,
  browser no-write evidence, and deployment-log proof remain mandatory.
- No Production, environment, database, lead, event, notification, WordPress,
  DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #210 refresh onto release-ledger-sealed PR #209

- Preserved the pre-refresh PR #210 head at
  `rescue/amm-pr210-pre-release-ledger-integrity-sync-20260824-0617`.
- Merged exact sealed parent `1d1d8d4f8e0970f3f6a1b80ab9ff2bebcd40216d`
  without changing the alias implementation or any external system.
- Preserved the canonical-alias gate contracts and the completed-release ledger
  integrity coverage from PR #209.
- Prior PR #210 checks are now historical only; exact-head CI, Preview identity,
  no-write runtime QA, and browser proof must be repeated before later release.

## 2026-08-24 — PR #210 stack refresh onto sealed PR #209

- Preserved the former PR #210 head at
  `rescue/amm-pr210-pre-pr209-security-sync-20260824-0401`.
- Synchronized the branch with exact PR #209 candidate
  `6eb89264d59c8d25a711a1ffa178828343772f75` before any Production action.
- The only merge conflict was additive release history in this file. Both
  records were retained; application redirect files did not overlap.
- Prior PR #210 CI and Preview remain historical evidence only. The refreshed
  head must repeat the complete exact-head proof before its later gate is
  requestable.

## 2026-08-24 — Completed-release ledger integrity

- Reconciled the seven completed Phase 9 application releases against
  authenticated GitHub head/merge records and Vercel READY Production
  deployments.
- Corrected the PR #195 head mismatch and completed the PR #183–#185 authority
  chains without changing any current release gate.
- Added executable coverage requiring each completed owner-queue entry to
  retain its exact PR head, merge commit, and Production deployment ID.
- No runtime, Production, environment, database, lead, event, notification,
  WordPress, DNS, publication, spend, deletion, or NellySelly mutation occurred.

## 2026-08-24 — PR #209 emergency-limiter security hardening

- A Next.js/React security review found that the non-durable fallback retained
  every unique identifier for the process lifetime and omitted the route
  partition used by the canonical Neon limiter.
- The fallback now has a 10,000-identifier cap, opportunistic expiry cleanup,
  fail-closed capacity behavior, and typed route isolation.
- Full post-change Node 24 verification passes 229 test files / 3,064 tests,
  strict typecheck, ESLint, 14/14 release safety, optimized build, all 83 active
  routes, the Production dependency audit, and tracked-history/changed-file
  secret scans. Exact-head Preview evidence remains mandatory after push.
- No migration, Production action, secret entry, lead/event write, message,
  WordPress edit, publication, DNS change, spend, deletion, or NellySelly
  action occurred.

## 2026-08-23 — Ask conversion clarity and keyboard-access candidate

- Preserved the existing Black Diamond visual system, Ask chat API, canonical
  lead preparation path, analytics, attribution, and 2,000-character server
  contract; no new funnel, AI provider, lead store, or component system was
  created.
- Replaced product-centric “interface” language on `/ask` with a shorter
  consumer action and a clear visible question label.
- Added required, named, bounded, and mobile-keyboard-aware semantics to the
  existing Ask question input without collecting another data field.
- Added one reusable focus-visible skip link to the shared public header and a
  real programmatically focusable content target on every surface using that
  header.
- Added DOM and source contracts for link order, focus movement, field
  semantics, server-limit parity, and complete shared-header target coverage.
- No migration, Production action, lead/event write, AI/provider request,
  message, WordPress edit, publication, spend, DNS change, deletion, or
  NellySelly action occurred.

## 2026-08-23 — Canonical campaign-alias consolidation candidate

- Reused the existing Phase 9.5 metadata, sitemap, crawl-policy, and structured-
  data implementation; no parallel SEO/content system was created.
- Added permanent `/value` → `/home-value` and `/we-buy-houses` → `/sell`
  redirects through the canonical Next.js configuration.
- Proved the redirects preserve UTM parameters and click IDs exactly, retaining
  first/last-touch attribution for historical WordPress, QR, social, and email
  links.
- Changed the remaining active public internal `/value` link to point directly
  at `/home-value`.
- Reconciled the Production monitor with the new route contract: it now checks
  `/home-value` as the canonical `200` document and verifies both compatibility
  aliases return the intended `308` destination.
- Deliberately omitted deprecated FAQ rich-result markup, unsupported AI-search
  files, generated location pages, and unverified business claims.
- No Production deployment, database change/write, lead, message, WordPress
  edit, DNS change, spend, or NellySelly action occurred.

## 2026-08-23 — Atomic release-authority reconciliation

- Reconciled the operating source-of-truth documents to the accepted PR #195
  Production commit/deployment and one canonical Draft application candidate,
  PR #209.
- Preserved PRs #202 through #208 as incremental review evidence while removing
  their stale independent release authority from current operator guidance.
- Separated the optional Neon-attested Preview mutation gate, the combined
  Production durability secret/merge/deploy gate, and the later one-href
  WordPress publication gate.
- Added a five-check executable documentation contract that rejects known stale
  stacked-release claims. No application behavior, Production state, database,
  message, publication, DNS, spend, or NellySelly state changed.

## 2026-08-23 — Public hero delivery fast-track candidate

- Reused PR #201's isolated responsive-image implementation on exact sealed PR
  #203 instead of recreating the Black Diamond hero or waiting behind unrelated
  WordPress and field-telemetry candidates.
- Preserved the approved artwork, composition, copy, CTAs, attribution, routes,
  forms, and lead backend while moving only hero delivery to Next.js responsive
  image source sets with intrinsic dimensions and explicit LCP priority.
- A fresh no-write Production audit measured the retained static hero at
  289,876 bytes on 390 × 844 mobile and 503,788 bytes on 1440 × 900 desktop;
  both currently report automatic loading and fetch priority.
- Fresh optimized local proof loads exactly one art-directed hero response:
  56,792 bytes on mobile and 108,706 bytes on desktop, with eager/high
  priority, no horizontal overflow, and zero browser warnings/errors.
- Exact Node 24 acceptance passes 221 files / 2,993 tests, strict typecheck,
  ESLint, optimized build with 52 static pages, 82/17 route-manifest proof,
  14/14 release safety, system isolation, and a clean Production dependency
  audit.
- PR #204 application head passes exact-head GitHub CI, a matching immutable
  Vercel Preview, protected 17-pass/6-write-skip acceptance, Widget 2/2,
  release doctor 43/43, release candidate GO, `PREVIEW_READY`, and zero
  Preview warning/error/fatal logs. Deployed browser-negotiated hero variants
  are 56,744 bytes mobile and 108,706 bytes desktop.
- No migration, Production action, lead/event write, message, WordPress edit,
  publication, spend, DNS change, deletion, or NellySelly action occurred.

## 2026-08-23 — Durable rate-limit readiness candidate

- Closed a false-green observability path where Production could return ready
  and pass the synthetic monitor while public event routes used non-durable
  per-instance rate limiting.
- Reused the canonical Neon limiter and added boolean-only Production checks
  for the exact table shape/upsert target, schema and CRUD privileges,
  effective RLS access, and a dedicated server-only HMAC secret.
- Added a read-only store-capability verifier with safe boolean-only output;
  the exact query passed against the authenticated Neon Production branch.
- Made the synthetic monitor validate the readiness response contract instead
  of treating HTTP 200 as sufficient proof.
- Replaced raw Neon limiter-error logging with bounded operational error codes;
  a regression test proves credential-like connection details cannot enter
  Vercel logs when the durable store fails.
- Kept isolated Vercel Preview read-only and independent of Production secrets.
- Local Node 24 acceptance passes 218 files / 2,983 tests, strict typecheck,
  ESLint, optimized build, 82 routes, 14/14 safety, system isolation,
  43/43 release doctor, dependency audit, redacted full-history secret scan, and
  no-migration review.
- PR #202 hardened application head passes PR merge-ref CI, exact-head Vercel
  Preview status, deployed runtime capability health, protected
  17-pass/6-write-skip acceptance, Widget 2/2, 43/43 doctor, zero Preview
  warning/error/fatal logs, and `PREVIEW_READY`. Prior proof is retained but
  superseded because it did not prove schema/upsert, privileges, or RLS.
- The hardening overlays the synthetic PR #197–#201 stack without executable
  conflicts; only the cumulative go-live runbook needs later reconciliation.
- No Production secret, deployment, migration, lead/event write, notification,
  email, SMS, Push, WordPress edit, publication, DNS, spend, deletion, or
  NellySelly action occurred.
## 2026-08-22 — Conversion identity and public-navigation polish candidate

- Reused the canonical home-value funnel and added required consumer name
  capture to its existing Contact step without increasing funnel length.
- Added invalid-field focus and field-specific error association for address,
  name, email, and phone.
- Removed internal preview/integration links from the shared consumer footer
  and replaced them with canonical buyer, seller, home-value, Ask Mike, planner,
  contact, legal, and accessibility paths.
- Made the historical screenshot helper intercept `/api/leads`, `/api/events`,
  and `/api/experiments/event`, preventing visual QA from creating a lead or
  writing analytics/experiment evidence when database configuration is present.
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

## 2026-08-25 — Phase 9 local-profile performance ingress candidate

- Extended the existing Growth Command Center with a protected, bounded
  aggregate Google Business Profile performance-report workbench.
- Reused canonical Neon market-signal, opportunity, and audit ledgers; no
  parallel CRM, dashboard, database, OAuth integration, or publisher was
  introduced.
- Added deterministic privacy-minimized parsing, scoring, opportunity logic,
  preview/commit APIs, immutable receipts, exact replay, and a server-recomputed
  PostgreSQL 17 import contract.
- Kept commit authority disabled by default and separated application/schema
  release, feature-gate enablement, and each real report import into explicit
  review gates.
- Corrected and regression-tested responsive metric rendering after visual QA
  found mobile table clipping.
- Passed 3,234 tests, PostgreSQL contract/parity proof, strict typecheck, lint,
  optimized build, 95-route verification, 14/14 safety, isolation, dependency
  and secret scans, and desktop/mobile visual QA.
- No Production/Preview data mutation, Google call, profile edit, publication,
  send, merge, deployment, environment change, purchase, WordPress/DNS edit,
  or NellySelly action occurred.

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
