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
5. PR [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194)
   — its exact gate was received; iOS handoff head
   `851ebe530ac6a91a4e410f26538d29c1bf43f1c6` was merged as
   `5a3c5c7f2463ea399c21b616ff249f6c67e156b6` and accepted on canonical Vercel
   Production deployment `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. It contained no
   migration, carrier SMS, device enrollment, or message send.

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Next consolidated application candidate

- Draft PR [#195](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/195)
  is the sole next application candidate. It polishes public conversion
  identity and navigation on released `main` and contains no migration,
  WordPress mutation, message send, provider action, or spend.
- Its released-base Node 24 CI and canonical Vercel Preview pass. It remains
  Draft. Its only application
  release phrase is:
  `APPROVE PHASE 9 CONVERSION IDENTITY POLISH MERGE AND PRODUCTION DEPLOYMENT`.
- That future phrase will authorize only the exact reviewed PR #195 merge and
  canonical Vercel Production deployment. It will not authorize a WordPress
  edit, GBP/social/email publication, QR distribution, message, lead submission,
  migration, physical phone enrollment, test Push, spend, DNS change, provider
  action, deletion, or NellySelly action.

## Stacked candidates after PR #195

- Draft PR [#197](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/197)
  remains stacked on PR #195. It separates legacy WordPress attribution
  evidence from canonical live-source measurement. After PR #195 releases, it
  must be rebased on the exact new `main` and pass exact-head Node 24 CI,
  canonical Preview, and protected browser QA before its distinct gate can be
  used:
  `APPROVE PHASE 9 LEGACY WORDPRESS ATTRIBUTION TRUST MERGE AND PRODUCTION DEPLOYMENT`.
- Draft PR [#198](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/198)
  is a standalone, read-only WordPress activation change-set candidate based on
  released `main`. It adds protected, rollback-ready readiness manifests for
  three exact brokerage placements but cannot publish or edit WordPress. Because
  it overlaps the owned-demand surface, refresh it after PRs #195 and #197, then
  rerun exact-head acceptance before using its distinct application gate:
  `APPROVE PHASE 9 WORDPRESS ACTIVATION CHANGE SET MERGE AND PRODUCTION DEPLOYMENT`.
- Even after PR #198 is released, one exact WordPress page publication remains a
  separate action. The first proposed write is the homepage link only, and its
  gate is:
  `APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`.

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
  is preserved but superseded for release by the released iOS handoff
  consolidation in PR
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
