# Owner Approval Queue

Updated 2026-08-22 from authenticated GitHub, Vercel, Neon, WordPress, and
Production evidence. The public funnel and internal email path are live. This
queue covers only actions that still require a human or external-system gate.

## Completed Production release sequence

Release only one approved PR at a time. Rebase the downstream PR on the exact
new `main`, then rerun Node 24 CI and Vercel Preview before using its gate.

1. PR [#183](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/183)
   — campaign safety and three-offer owned-demand flight is merged and live.
2. PR [#184](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/184)
   — its exact gate was received; the backup-first Neon migration is applied
   and verified, and application release evidence is attached to the PR.
3. PR [#185](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/185)
   — its exact gate was received; the WordPress proof-scope migration was
   backup-first applied and verified, and reviewed application head
   `2877fab35591c7f43c8def2ee920a12654b37a22` was merged as
   `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` and deployed to Production.
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
   device enrollment, carrier SMS, or send.

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Next consolidated application candidate

- Draft PR [#195](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/195)
  is the sole next application candidate. It reuses the canonical home-value
  funnel and adds required seller identity, field-specific focus/error
  ownership, consumer-only footer navigation, and mutation-free visual QA.
- It is refreshed onto released PR #194 merge
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6`; the prior stacked head is
  preserved at `rescue/amm-pr195-pre-released-pr194-refresh-20260822-1959`.
  Local and exact-head Node 24 proof, immutable Vercel Preview, and protected
  no-write QA are green at
  `db13953fc5f6d24a684f66c9a1c10c6b929b72b3`; its gate is now evidence-ready
  but remains unconsumed.
- Its only application release phrase is:
  `APPROVE PHASE 9 CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`.
- That future phrase will authorize only the exact reviewed PR #195 merge and
  canonical Vercel Production deployment. It will not authorize a WordPress
  edit, GBP/social/email publication, QR distribution, message, lead
  submission, migration, device enrollment, test Push, spend, DNS change,
  provider action, deletion, or NellySelly action.

## Stacked attribution-trust candidate after PR #195

- Draft PR [#197](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/197)
  on branch `codex/phase9-legacy-wordpress-attribution-trust-20260822` is
  stacked behind PR #195. It separates narrowly recognized legacy Our Town
  attribution evidence from exact owned-demand KPIs without changing stored
  attribution.
- It cannot merge before PR #195. After PR #195 releases, preserve a rescue
  ref, refresh this candidate onto exact `main`, and rerun Node 24 CI,
  canonical Preview, protected visual QA, and release-safety checks. The current
  branch is already aligned with PR #195's exact hardened head; the prior state
  is preserved at
  `rescue/amm-pr197-pre-pr195-final-refresh-20260822-2226`. Exact Node 24,
  immutable Preview, and protected no-write QA are green. This does not replace
  the post-release `main` refresh.
- Its later application-only phrase is:
  `APPROVE PHASE 9 LEGACY WORDPRESS ATTRIBUTION TRUST MERGE AND PRODUCTION DEPLOYMENT`.
- That phrase will not authorize a WordPress edit, crawler/firewall exception,
  lead submission, consumer or internal message, publication, migration,
  physical phone enrollment, test Push, spend, DNS change, provider action,
  deletion, or NellySelly action.

## Stacked WordPress activation candidate after PR #197

- Draft PR [#198](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/198)
  is stacked behind PR #197. It adds protected, rollback-ready, read-only
  readiness manifests for three exact brokerage placements and cannot publish
  or edit WordPress.
- Its pre-stack head is preserved at
  `rescue/amm-pr198-pre-pr197-stack-refresh-20260822-2247`. After PRs #195 and
  #197 release in order, preserve another rescue ref, refresh this candidate
  onto exact `main`, and rerun Node 24 CI, canonical Preview, protected browser
  QA, and release-safety checks.
- Local stack, security, build, and responsive no-write acceptance are green;
  exact-head remote evidence remains required after push.
- Its later application-only phrase is:
  `APPROVE PHASE 9 WORDPRESS ACTIVATION CHANGE SET MERGE AND PRODUCTION DEPLOYMENT`.
- Even after PR #198 is released, a WordPress publication remains a separate
  action. The first proposed write is the homepage link only, and its gate is:
  `APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`.

## Stacked field-experience candidate after PR #198

- Branch `codex/phase9-field-experience-trust-20260822` is stacked behind PR
  #198 and extracts only the privacy-safe LCP/INP/CLS capability preserved in
  deferred PR #187. It excludes PR #187's KPI-target migration and numeric
  targets.
- The candidate uses the existing public analytics route and ledger, writes no
  telemetry in Preview, and contains no migration. It cannot release before
  PRs #195, #197, and #198 release in order and it is refreshed and re-proven
  on exact `main`.
- Local release, dependency, secret, migration, and protected desktop/mobile
  no-write evidence is green. Exact-head Node 24 and immutable Vercel Preview
  evidence still must pass after the branch is pushed; this does not make the
  later gate eligible ahead of the predecessor stack.
- Its later exact gate is:
  `APPROVE PHASE 9 FIELD EXPERIENCE TRUST MERGE, PRODUCTION DEPLOYMENT, AND FIELD TELEMETRY ACTIVATION`.
- That phrase will authorize only the exact reviewed application release and
  minimized Production LCP/INP/CLS observations. It will not authorize a
  numeric target, migration, lead/form submission, message, WordPress/social
  publication, device enrollment, spend, DNS change, deletion, provider
  purchase, or NellySelly action.

## Deferred candidates requiring refresh and overlap review

- PR [#182](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/182)
  is superseded for release. Its unique Buyer/current-router work is preserved
  in consolidated PR #185, so its former gate must not be requested or reused.
- PR #187's KPI-target migration is deferred because Production has no eligible
  live-demand baseline. It is not part of PR #185.
- PRs #186, #188, and #189 are preserved as source history; their useful work
  is consolidated into PR #185 and their former standalone gates are obsolete.
- PRs #190–#192 remain preserved as source history; their independently useful
  work was consolidated once in released PR #193 and is not part of PR #185.
- Historical PR [#179](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/179)
  is preserved but superseded by the released current-stack iOS handoff in PR
  [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194).
  Physical enrollment and a `[TEST]` Push remain separately approved actions.
- PRs #92 and #119–#121 remain archive-after-review candidates. They are not a
  parallel Production release plan.

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

- PRs #170, #172, #173, #177, #178, #180, #181, #183, #184, #193, and #194 are released;
  do not request their historical approval phrases again.
- Canonical Neon Production and Better Auth/RBAC are established.
- Form 3 signed WordPress forwarding and duplicate native-notification shutdown
  passed controlled QA.
- Internal Resend email, hidden audit BCC, provider message ID, and delivery
  reconciliation have controlled QA evidence.
- Both Ask Magic Mike hostnames belong only to the canonical Vercel project.
