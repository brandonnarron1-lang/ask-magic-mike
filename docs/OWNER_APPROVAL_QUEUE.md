# Owner Approval Queue

Updated 2026-08-24 from authenticated GitHub, Vercel, Neon, WordPress, and
Production evidence. The public funnel and internal email path are live. This
queue covers only actions that still require a human or external-system gate.

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
   form submission, or message send.

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Atomic Production durability candidate

- Fresh 2026-08-23 read-only Production checks pass the public conversion
  verifier 15/15 and smoke 19/19 with two intentional skips. The candidate
  monitor reports 8/9 because the deployed readiness body does not prove the
  required durable limiter contract. This is the one immediate Production
  correction.
- Draft PR [#209](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/209)
  on branch `codex/phase9-controlled-release-candidate-20260823` is the sole
  current application release vehicle. It consolidates the reviewed work from
  PRs #202 through #208 once and binds Preview write authority to the actual
  server-only Neon endpoint.
- The latest branch-only security review also bounds the emergency memory
  limiter and isolates fallback counters by route. The pre-hardening head is
  preserved at
  `rescue/amm-pr209-pre-memory-fallback-hardening-20260824-0333`. Treat the
  current GitHub PR head—not a commit literal embedded in this mutable file—as
  the release candidate. Immediately before using the gate, require that head
  to remain Draft, cleanly mergeable against the recorded Production base, and
  green in the full Node 24 release gate, exact Vercel Preview, protected
  no-write acceptance, Widget E2E, dependency audit, secret scan, and current
  Production preflight. If the head moves, every prior exact-head seal becomes
  historical evidence and the complete proof must be repeated.
- The exact pre-reconciliation application/security head
  `b4e76f795d74d6a7c0947b16150cdb9c6c63e23a` passed 228 files / 3,054 tests,
  strict typecheck, ESLint, optimized build, 83-route proof, 14/14 safety,
  isolation, dependency and history-secret scans, exact Vercel Preview, 17
  no-write passes with six intentional write skips, Widget 2/2, and categorical
  exact Preview endpoint match/Production non-match. The final PR head must
  repeat exact-head proof after this authority reconciliation.
- Optional isolated synthetic Preview mutation and cleanup requires:
  `APPROVE PHASE 9 NEON-ATTESTED CONTROLLED PREVIEW MUTATION QA`.
- The only combined Production configuration/application release phrase is:
  `APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.
- The Production phrase authorizes one encrypted Production-only durability
  secret, the exact reviewed PR #209 merge/deploy, and one malformed non-lead
  request that writes only an HMAC-pseudonymized rate-limit bucket before
  returning HTTP 400. It does not authorize a lead, analytics event, email,
  SMS, Push, WordPress change, publication, spend, DNS change, migration,
  deletion, or NellySelly action.
- Stale encrypted Upstash variable names remain ignored. Their deletion is not
  included in this gate.

## Later sequential candidates — no current release authority

These candidates preserve already-built work. They are not part of PR #209's
gate and must not be merged out of order:

1. Draft PR [#210](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/210)
   consolidates `/value` and `/we-buy-houses` onto the canonical conversion
   routes with permanent, query-preserving redirects and a matching Production
   monitor contract. It is synchronized with exact PR #209 candidate
   `1d1d8d4f8e0970f3f6a1b80ab9ff2bebcd40216d`; the immediately prior PR #210
   head is preserved at
   `rescue/amm-pr210-pre-release-ledger-integrity-sync-20260824-0617`.
   Fresh exact-head proof remains mandatory. After PR #209 is released, retarget
   or refresh #210 onto the exact new `main`, repeat proof, then require
   `APPROVE PHASE 9 CANONICAL ALIAS CONSOLIDATION MERGE AND PRODUCTION DEPLOYMENT`.
2. Draft PR [#211](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/211)
   retains the shared skip-to-content path and clearer required Ask intake.
   It is synchronized with exact clean PR #210 head
   `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`; the immediately prior PR #211
   head is preserved at
   `rescue/amm-pr211-pre-pr210-ledger-sync-20260824-0632`. Fresh exact-head
   proof remains mandatory, and it later requires
   `APPROVE PHASE 9 ASK CONVERSION ACCESSIBILITY MERGE AND PRODUCTION DEPLOYMENT`
   after a fresh exact-main refresh and proof.
3. Draft PR [#213](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/213)
   reuses the shared Black Diamond public header to restore complete mobile
   Home Value / Sell / Buy / Plan / Ask navigation, current-route semantics,
   and keyboard-safe dismissal without changing a funnel, form, route, API,
   database, or visual system. It is based on exact Draft PR #211 head
   `6eacc33d16e34897c97288e48cd736433a3d9e15` and must remain after #211 in
   release order. After all predecessors release, refresh onto exact `main`,
   repeat full exact-head proof, then require
   `APPROVE PHASE 9 RESPONSIVE CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`.
4. Draft PR [#212](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/212)
   reuses the existing Google container and canonical event ledger for
   consent-gated cross-domain measurement. It must be refreshed after the
   selected application sequence and requires authenticated Google/Vercel
   configuration review plus
   `APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT`.

5. Draft PR [#214](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/214)
   reuses the canonical notification renderer, approved Mike/Our Town assets,
   urgency selector, and protected Message Review Studio for
   `lead_alert_email_v3`. It is based on sealed Draft PR #213 head
   `431ae9eebba7d38712305fa257f118cf0e498a89`; its sealed head is
   `3ac0885a6f19fc479266457cff760ef836094470`, and it must remain after #213 in
   release order. After all predecessors release, refresh onto exact `main`,
   repeat full exact-head and no-send visual proof, then require
   `APPROVE PHASE 9 LEAD-ALERT BRAND IDENTITY V3 MERGE AND PRODUCTION DEPLOYMENT`.

6. Draft PR [#215](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/215)
   reuses exact PR #214 head
   `3ac0885a6f19fc479266457cff760ef836094470` and moves durable capture to the
   first valid contact step, with email required on the current UI and phone
   optional. It has no schema or provider change, and applies one shared
   contact-validation contract at both the browser and API boundaries. After
   PR #214 releases, refresh it onto exact `main`, repeat complete exact-head
   proof, then require
   `APPROVE PHASE 9 HOME-VALUE COMPLETION INTEGRITY MERGE AND PRODUCTION DEPLOYMENT`.

The historical shorter conversion-identity phrase released PR #195 and is
exhausted; it cannot authorize PR #213, PR #214, or the home-value candidate.

None of these later phrases can authorize another PR, secret, database write,
form submission, notification, WordPress/DNS change, publication, spend,
deletion, or NellySelly action.

## Superseded and deferred release records

- PRs #202 through #208 remain open or preserved only as incremental review
  evidence. PR #209 contains their reviewed cumulative application work once.
  They have no independent release authority and may not be merged or deployed
  under an old gate.
- PRs #197, #198, #200, and #201 are closed with branches preserved. PR #199's
  unique field-experience work is included once in PR #209 through its reviewed
  current-stack successor.
- PR #187's KPI-target migration remains deferred because Production has no
  eligible live-demand baseline. It is not part of PR #209.
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
