# Owner Approval Queue

Updated 2026-08-29 from authenticated GitHub, Vercel, Neon, WordPress, and
Production evidence. The public funnel and internal email path are live. This
queue covers only actions that still require a human or external-system gate.

## Cross-domain measurement consolidation — later, not currently requestable

- Draft PR [#221](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/221)
  consolidates exact PR #212 onto exact sealed PR #220 head
  `19689e95d824d7d06e5f3b60cd18335f53018c93`. PR #212 is closed as
  superseded with its branch, commits, package, evidence, and rollback assets
  preserved. PR #221 is the sole cross-domain application candidate. It reuses
  the
  existing Our Town GTM container and canonical Neon ledger with explicit basic
  consent, advertising consent denied, private/Preview/QA exclusion, exact
  container isolation, and the newer cumulative KPI/privacy controls.
- No Google, Vercel environment, Production deployment setting, or WordPress
  surface has changed. Final application head `735cc893...` passes exact Node 24
  CI, immutable Preview, protected no-write QA, desktop/mobile visual review,
  and runtime-log review. Read-only Preview now refuses first-party telemetry
  writes server-side before rate limiting or repository access.
- A follow-up live audit found the brokerage page starts GTM and its Google tag
  before the deferred cookie-choice provider. The read-only cross-domain
  preflight therefore returns `HOLD`. The gate is not requestable until that
  ordering and authenticated GTM/GA4 domain/consent configuration pass.
- Canonical bridge 1.2.0 contains the prepared, disabled-by-default repair.
  It preserves the approved Form 3 bridge and replaces no indexed page or
  cookie provider. Its first exact gate, after final PR/package evidence, is:
  `APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA`.
- That WordPress phrase authorizes backup, 1.2.0 installation, preservation of
  current Form 3 settings, exact legacy GTM head/noscript removal, measurement
  flag enablement, and reversible source/deny/allow/network QA only.
- One live Production page-view row and one Production experiment-exposure
  attempt from the earlier 2026-08-24 browser-routing error remain disclosed.
  A separate superseded PR #221 Preview also persisted one PII-free automatic
  homepage page-view before the new server guard. No lead or message was
  created. Cleanup is not included in either candidate's release phrase.
- After the hold clears, its only configuration/release phrase is:
  `APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT`.
- That phrase will not authorize a lead submission, email/SMS/Push, WordPress
  edit, marketing publication, spend, DNS change, database mutation, deletion,
  or NellySelly action.

## Completed Production release sequence

Release only one approved PR at a time. Rebase the downstream PR on the exact
new `main`, then rerun Node 24 CI and Vercel Preview before using its gate.

1. PR [#183](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/183)
   — campaign safety and three-offer owned-demand flight head
   `95a4f210eed4f8991e96e2eee595da5907112ba9` was merged as
   `b8b31fb20223ad0f0ad311fee1ee3de20d0f7ae9` and accepted on Production
   deployment `dpl_HwVDyckyCRB1NoaNb1E82xSpr75z`.
2. PR [#184](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/184)
   — its exact gate was received; reviewed head
   `ed5da234ee34d06eb121084e01c97d79b08a815e` was merged as
   `f5f82f1bfaadea0ed20da50738ebc1f83e8dab97` and accepted on Production
   deployment `dpl_ANYodUJ7VcceRRDAfpX6APkSKUcW`. The backup-first Neon
   migration is applied and verified.
3. PR [#185](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/185)
   — its exact gate was received; the WordPress proof-scope migration was
   backup-first applied and verified, and reviewed application head
   `2877fab35591c7f43c8def2ee920a12654b37a22` was merged as
   `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` and accepted on Production
   deployment `dpl_41AZkLvufuAC92h6QJeqhiyjkBcM`.
4. PR [#193](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/193)
   — its exact gate was received; privacy/KPI head
   `21fdb5b3490cdc0517518578878a8db5d1b683a7` was merged as
   `9b82afb609674bb0209b73f8ac9622ab02733e2a` and accepted on Vercel Production
   deployment `dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a`. It contained no migration.
5. PR [#196](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/196)
   — its exact verifier gate was received; reviewed head
   `c8e19c8e822e585bc4b27c7abc47adf3a88fc8ad` was merged as
   `c08abe1168840b99ccba07866bbec8cf7a6752fb` and accepted on Production
   deployment `dpl_sew1CoF13dtfJTsvasDJf6vyndj8`. It contained no migration.
6. PR [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194)
   — its exact iOS handoff gate was received after the PR #196 release. Final
   reviewed head `851ebe530ac6a91a4e410f26538d29c1bf43f1c6` was merged as
   `5a3c5c7f2463ea399c21b616ff249f6c67e156b6` and accepted on Production
   deployment `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. It contained no migration,
   device enrollment, or send.
7. PR [#195](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/195)
   — its exact conversion-identity gate was received; reviewed head
   `db13953fc5f6d24a684f66c9a1c10c6b929b72b3` was merged as
   `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and accepted on Production
   deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. It contained no migration,
   form submission, or message send. Fresh read-only verification passes 15/15
   funnel and 19/19 smoke checks.
8. PR [#209](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/209)
   — its exact combined durability gate was received; reviewed head
   `b28b380f2cc3f9b63b2c0048b398e97a88dfee4b` was merged as
   `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and accepted on Production
   deployment `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`. The encrypted
   Production-only limiter secret, all readiness booleans, bounded malformed
   request, 9/9 monitor, same-commit Node 24 release gate, and clean log window
   were verified. It contained no migration, lead, valid analytics event,
   notification, message, WordPress, DNS, publication, spend, or NellySelly
   action.

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Completed Production durability release

- PR #209 is merged, accepted, and documented in
  `docs/phase9/DURABLE_RATE_LIMIT_PRODUCTION_ACCEPTANCE_2026-08-28.md`.
- Its exact gate is consumed and cannot authorize any later candidate, secret,
  database action, message, publication, or cleanup.
- Stale encrypted Upstash variable names remain ignored. Their deletion was not
  included and remains a separate action.

## Next sequential candidates — no current release authority

These candidates preserve already-built work. They are not part of PR #209's
consumed gate and must not be merged out of order:

Each proof set resolves the current GitHub PR head at verification time.
If the head moves, proof must be repeated across exact-head CI, Preview,
browser, and runtime checks before any gate becomes requestable.

1. Draft PR [#210](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/210)
   consolidates `/value` and `/we-buy-houses` onto the canonical conversion
   routes with permanent, query-preserving redirects and a matching Production
   monitor contract. It has been merged forward onto accepted PR #209 `main`
   `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` without force-pushing; the
   immediately prior PR #210 head is preserved at
   `rescue/amm-pr210-pre-main-cutover-20260828-210054`.
   Fresh exact-head proof remains mandatory before requesting
   `APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT`.
2. Draft PR [#211](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/211)
   retains the shared skip-to-content path and clearer required Ask intake.
   It is synchronized without force push with exact sealed PR #210 head
   `93af400494a94a8d8aedb09ece16bbff4dfd214b`; the immediately prior PR #211
   head is preserved at
   `rescue/amm-pr211-pre-pr210-exact-seal-20260828-213129`. Fresh exact-head
   proof remains mandatory, and it later requires
   `APPROVE PHASE 9 ASK CONVERSION ACCESSIBILITY MERGE AND PRODUCTION DEPLOYMENT`
   after a fresh exact-main refresh and proof.
3. Draft PR [#213](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/213)
   reuses the shared Black Diamond public header to restore complete mobile
   Home Value / Sell / Buy / Plan / Ask navigation, current-route semantics,
   and keyboard-safe dismissal without changing a funnel, form, route, API,
   database, or visual system. It is synchronized with exact clean PR #211 head
   `c5700eda5e32ff6ead9a985c86b811a3c46e1e66`; the immediately prior PR #213
   head is preserved at
   `rescue/amm-pr213-pre-pr211-exact-seal-20260828-215231`. It must
   remain after #211 in release order. After all predecessors release, refresh
   onto exact `main`, repeat full exact-head proof, then require
   `APPROVE PHASE 9 RESPONSIVE CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`.
4. Draft PR [#214](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/214)
   reuses the canonical notification renderer, approved Mike/Our Town assets,
   urgency selector, and protected Message Review Studio for
   `lead_alert_email_v3`. It is synchronized without force push with exact
   sealed Draft PR #213 head
   `d2a1bf01d0962e07dd1e460acd4c295e145cf6a8`; the immediately prior PR #214
   head is preserved at
   `rescue/amm-pr214-pre-pr213-exact-seal-20260828-222353`. It must
   remain after #213 in release order. After all predecessors release, refresh
   onto exact `main`, repeat full exact-head and no-send visual proof, then require
   `APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT`.

5. Draft PR [#215](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/215)
   reuses exact sealed PR #214 head
   `81a2c7544318d630437ed3e86cbea029c5c9b57d` and moves durable capture to the
   first valid contact step, with email required on the current UI and phone
   optional. Its immediately prior head is preserved at
   `rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229`. It adds
   no schema or provider and applies one shared contact-validation contract at
   the browser and API boundaries. Exact parent-refresh application head
   `eff8fc04449fab4fd34cd0fb69735e6787d0b382` passed local, CI, immutable
   Preview, protected no-write, intercepted-browser, responsive, and runtime-log
   acceptance. The evidence-only seal must repeat exact-head proof. After PR
   #214 releases, refresh it onto exact `main`, repeat complete proof, then require
   `APPROVE PHASE 9 HOME-VALUE COMPLETION INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`.

6. Draft PR [#216](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/216)
   reuses exact sealed PR #215 head
   `c53cec6043525b593b254c457efdbbe5a29c0520` and the existing
   submission/idempotency UUID, canonical event route, Neon event ledger, and
   atomic lead command. The immediately prior PR #216 head
   `a6098ab4ee7a13d024bafc08264628e2691a8e06` is preserved at
   `rescue/amm-pr216-pre-pr215-exact-seal-20260828-231335`; the
   earlier pre-refresh head remains at
   `rescue/amm-pr216-pre-pr215-seal-sync-20260824-1353`. Initial code-bearing head
   `0c45a33b706d7e8a02501ccf83baf24a83ec107d` links
   privacy-minimized funnel stages without pre-creating `sessions`, closes the
   first-interaction Home Value identity edge, and rejects browser-authored
   lead/widget creation, qualification, appointment-request, and notification
   outcomes. A later log audit invalidated older protected runs as no-write
   proof because widget telemetry reached Preview after only `/api/leads` was
   intercepted. Prior head `727c534f6f77b8a7acfe51eba361da57e6671cb4`
   is preserved at
   `rescue/amm-pr216-pre-widget-no-write-proof-fix-20260824-1432`; repair head
   `90108d8b386a264ae8e536e6503043f79f7a14ae` gives both browser suites one
   fail-closed mutation boundary. It has no migration, provider, cookie, form,
   endpoint, or Production configuration change. Treat the current GitHub PR
   head—not the historical code-bearing heads named here—as the final release
   candidate; all earlier local, CI, Preview, browser, and runtime proof must be
   repeated on that exact head. Exact sealed head
   `211485df28fc818ab783ed357df8486f1460d5e2` passed complete local, CI,
   immutable Preview, protected no-write, six-scenario browser, visual, and
   runtime-log acceptance. Release Gate `33231948183` and exact-branch
   protected run `33232071508` are the final PR #216 evidence authority.
   After PR #215 releases, refresh it onto exact `main`, repeat complete
   exact-head and write-intercepted Preview proof, then require
   `APPROVE PHASE 9 FUNNEL EVENT IDENTITY INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`.

Draft PRs #217 through #225 continue the same ordered stack after #216.
PR #221 is the sole cross-domain candidate; PR #225 is the current
evidence-first baseline/target-readiness tail. None may leapfrog a predecessor.
Each must be refreshed onto the exact newly accepted base, re-proved, and
receive its own documented gate before merge or Production.

7. Draft PR [#217](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/217)
   reuses exact sealed PR #216 head
   `211485df28fc818ab783ed357df8486f1460d5e2`, the existing vendor-neutral
   normalizer, and the authenticated Growth Intelligence surface. Its former
   head `d04984b4d162f13c79af261beb55a82f15a86b80` is preserved at
   `rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`. It adds only a
   fixed-profile, `growth:manage`-protected synthetic contract lab for Zillow,
   Follow Up Boss, Meta, and Google; it accepts no caller-supplied lead payload,
   calls no provider, writes no database, and creates no lead or message. Prior
   proof is historical until repeated on the current GitHub PR head. After PR
   #216 releases, refresh it onto exact `main`, repeat complete exact-head and
   protected no-write proof, then require
   `APPROVE PHASE 9 VENDOR INGRESS CONTRACT LAB MERGE AND PRODUCTION DEPLOYMENT`.

8. Draft PR [#218](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/218)
   reuses exact sealed PR #217 head
   `8a6b92039bb82c1158db514c2c2f064ceb9cbbcf`, the canonical growth schema,
   Growth Command Center, `growth:manage` RBAC, and immutable audit ledger.
   Its former head `cd087e5c5c0fda82a3175b86b550c966120eb2ab` is
   preserved at
   `rescue/amm-pr218-pre-pr217-exact-seal-20260829-001928`. It adds one
   safe-disabled, bounded, audited spend-ingress contract and no parallel
   database, dashboard, campaign manager, provider adapter, CRM, or analytics
   ledger. Former proof is historical until repeated on the current GitHub PR
   head. After PR #217 releases, refresh it onto exact `main`, apply the
   reviewed additive migration, repeat complete exact-head and protected
   no-commit proof, then require
   `APPROVE PHASE 9 MARKETING SPEND INGRESS MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT`.
   That gate keeps `GROWTH_SPEND_IMPORT_ENABLED=false`; importing one reviewed
   report requires a later report-specific approval.

9. Draft PR [#219](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/219)
   reuses exact sealed PR #218 head
   `f065d8801bec295c99185d846ff4bc38de2a0a6f`, the existing Growth Command
   Center, `market_signals`, advisory `market_opportunities`, shared bounded
   ingress primitives, `growth:manage` RBAC, and immutable audit ledger. Its
   former head `5486bed20272d2a661bc28a0e3a4a4576b2cb11f` is preserved at
   `rescue/amm-pr219-pre-pr218-exact-seal-20260829-004949`. It adds one
   privacy-minimized, safe-disabled Search Console **Pages** report contract;
   it stores no query text or raw CSV, calls no Google/provider API, and cannot
   publish a page, create a lead, send a message, or cross into NellySelly.
   Former proof is historical until repeated on the current GitHub PR head.
   After PR #218 releases, refresh it onto exact `main`, apply the reviewed
   additive migration, repeat complete exact-head and protected no-commit
   proof, then require
   `APPROVE PHASE 9 ORGANIC SEARCH INGRESS MIGRATION, PR 219 MERGE, AND PRODUCTION DEPLOYMENT`.
   That gate keeps `GROWTH_SEARCH_IMPORT_ENABLED=false`; importing one exact
   reviewed report requires a later report-specific approval.

10. Draft PR [#220](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/220)
   reuses exact sealed PR #219 head
   `b628fc00fc6b03d89871c65d884fe649db025968`, the existing Growth Command
   Center, shared bounded ingress transport, `market_signals`, advisory
   `market_opportunities`, `growth:manage` RBAC, exact Neon endpoint guards,
   and immutable audit ledger. Its former head
   `5e605ca8bd8b313f7a4c29b2d1220c7c40a477a3` is preserved at
   `rescue/amm-pr220-pre-pr219-exact-seal-20260829-012049`. It adds one
   privacy-minimized, safe-disabled aggregate Google Business Profile
   performance-report contract; it retains no raw CSV, search terms, provider
   location IDs, credentials, or consumer PII, calls no Google/provider API,
   and cannot edit a profile, publish content, create a lead, send a message,
   or cross into NellySelly. Former proof is historical until repeated on the
   current GitHub PR head. After PR #219 releases, refresh it onto exact
   `main`, apply the reviewed additive migration, repeat complete exact-head
   and protected no-commit proof, then require
   `APPROVE PHASE 9 LOCAL PROFILE PERFORMANCE INGRESS PRODUCTION MIGRATION, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.
   That gate keeps `GROWTH_LOCAL_PROFILE_IMPORT_ENABLED=false`; enabling real
   commit authority requires the separate
   `APPROVE LOCAL PROFILE PERFORMANCE IMPORT GATE ENABLEMENT AND SAME-COMMIT PRODUCTION REDEPLOYMENT`
   gate, and each report still requires its reviewed reference, exact
   fingerprint, and authenticated typed confirmation.

11. Draft PR [#221](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/221)
   reuses and consolidates exact PR #212 onto exact sealed PR #220 head
   `19689e95d824d7d06e5f3b60cd18335f53018c93`. Its former head
   `65eb466a2e7991364efe2db78044006ebcdf8b5d` is preserved at
   `rescue/amm-pr221-pre-pr220-exact-seal-20260829-020318`. Its final sealed
   head is `61e152cb7ce03fd1904a06f30435dbe7ef36c4e1`. It preserves the canonical
   first-party ledger, applies exact Production-only container isolation,
   explicit basic consent, advertising denial, public-route allowlists, PII
   minimization, Preview/QA/automation exclusion, and the independently
   disabled WordPress bridge 1.2.0. It remains a HOLD candidate pending fresh
   exact-head release/Preview proof and the separately approved WordPress
   consent-order remediation. Only after those controls pass may it request
   `APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT`.

12. Draft PR [#222](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/222)
   reuses exact sealed PR #221 head
   `61e152cb7ce03fd1904a06f30435dbe7ef36c4e1`, the authenticated Growth
   Command Center, and the canonical Search Console/Business Profile evidence
   ledgers. Its former head `08e0d345dd52a01d5da9a42b10dde982cbcce606`
   is preserved at
   `rescue/amm-pr222-pre-pr221-exact-seal-20260829-031605`. It adds bounded,
   deterministic, read-only local-demand decision packets and one forward-only
   guard against new or revised canonical GBP signals claiming Google's
   retired `business_conversations` metric. It adds no provider call, AI
   publisher, message sender, profile mutation, lead path, database silo, or
   NellySelly dependency. After PR #221 and all earlier candidates release,
   refresh it onto exact `main`, repeat the migration rehearsal and complete
   exact-head/protected no-write proof, then require
   `APPROVE PHASE 9 LOCAL-DEMAND METRIC TRUTH GUARD MIGRATION, PR 222 MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.

The historical shorter conversion-identity phrase released PR #195 and is
exhausted; it cannot authorize PR #213 or any later candidate.

None of these later phrases can authorize another PR, secret, database write,
form submission, notification, WordPress/DNS change, publication, spend,
deletion, or NellySelly action.

## Superseded and deferred release records

- PRs #202 through #208 remain preserved only as incremental review
  evidence. PR #209 contains their reviewed cumulative application work once.
  They have no independent release authority and may not be merged or deployed
  under an old gate.
- PRs #197, #198, #200, and #201 are closed with branches preserved. PR #199's
  unique field-experience work is included once in PR #209 through its reviewed
  current-stack successor.
- PR #187 is closed as superseded by PR #225, with its branch, commits,
  migration, tests, and evidence preserved. Its KPI-target migration and
  parallel target writer remain excluded because Production has no eligible
  live-demand baseline.
- PR #212 is closed as superseded by its exact descendant PR #221. Its branch,
  consent repair package, evidence, and rollback materials remain preserved;
  it has no independent release authority.
- PR #182 and historical PR #179 are superseded by already released current-
  stack work. Physical Web Push enrollment and a `[TEST]` receipt remain
  separate per-person actions.
- PRs #92 and #119 through #121 remain archive-after-review history, not a
  parallel Production release plan.

The first later WordPress mutation remains exactly one homepage href and still
requires `APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`
after a fresh matching manifest and verified page-149 rollback.

## People and brokerage decisions

1. Mike/BIC: decide whether preserved Form 7 entry 1550 permits a
   purpose-limited one-to-one response. Do not market, alert, or forward it
   until that decision is recorded.
2. Mike/BIC: approve requested-response consent and separately optional
   marketing consent before Forms 1, 2, or 4–7 enter the bridge allowlist.
3. Mike: activate his dormant `primary_lead_owner` account from his approved
   email/device and pass assigned-lead-only, logout, and revocation acceptance.
4. Brandon and Mike separately: enroll their own supported browsers for Web
   Push, grant notification permission, and approve one `[TEST]` receipt.
5. Brokerage/BIC/legal reviewer: approve seller-options, guaranteed-value,
   cash-offer, territory, response-time, or material campaign claims before
   publication.

## Infrastructure and publication gates

1. Hosting operator: identify the exact ModSecurity rule blocking the Facebook
   crawler on selected WordPress URLs before approving one narrow GET/HEAD
   exception. Do not weaken global bot protection.
2. DNS/Vercel owner: approve attachment of `hub.ourtownproperties.com` and the
   exact Vercel-provided CNAME. Canonical `/admin` remains available meanwhile.
3. Owner: approve each exact internal test send, consumer acknowledgment,
   WordPress placement, GBP/social/email publication, QR distribution, or paid
   campaign immediately before execution.
4. Owner/BIC: approve a registered carrier-SMS provider and sender before SMS
   activation. No free workaround may bypass registration, consent, or carrier
   rules.
5. Owner: separately approve deletion of the empty Vercel helper projects
   listed in `docs/CANONICAL_ASSET_MANIFEST.md`. Each has zero deployments and
   no custom-domain or Production effect; none is deleted implicitly.

## Resolved and removed from this queue

- PRs #170, #172, #173, #177, #178, #180, #181, #183, and #184 are released;
  do not request their historical approval phrases again.
- Canonical Neon Production and Better Auth/RBAC are established.
- Form 3 signed WordPress forwarding and duplicate native-notification shutdown
  passed controlled QA.
- Internal Resend email, hidden audit BCC, provider message ID, and delivery
  reconciliation have controlled QA evidence.
- Both Ask Magic Mike hostnames belong only to the canonical Vercel project.
