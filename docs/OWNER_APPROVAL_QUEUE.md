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

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Next consolidated application candidate

- Draft PR [#193](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/193)
  is the sole next application candidate. It consolidates the independent
  privacy, durable limiter, and aggregate KPI-trust work from PRs #190–#192 on
  released `main`. It contains no migration, publisher, provider send, or live
  data action.
- After final exact-head Node 24 CI, canonical Vercel Preview, protected-flow,
  security, and desktop/mobile acceptance pass, its only release phrase is:
  `APPROVE PHASE 9 PRIVACY AND KPI TRUST MERGE AND PRODUCTION DEPLOYMENT`.
- That future phrase will authorize only the exact reviewed PR #193 merge and
  canonical Vercel Production deployment. It will not authorize a WordPress
  edit, GBP/social/email publication, QR distribution, message, lead submission,
  migration, spend, DNS change, provider action, deletion, or NellySelly action.

## Stacked candidates after PR #193

- Draft PR [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194)
  consolidates only the secure iOS Home Screen Web Push handoff. It remains
  stacked on PR #193 and must not be merged out of order. Physical enrollment
  and one `[TEST]` Push remain separate owner-controlled actions.
- Draft PR [#195](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/195)
  remains stacked after PR #194 and must be refreshed and revalidated only after
  both predecessors release in order.

## Deferred candidates requiring refresh and overlap review

- PR [#182](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/182)
  is superseded for release. Its unique Buyer/current-router work is preserved
  in consolidated PR #185, so its former gate must not be requested or reused.
- PR #187's KPI-target migration is deferred because Production has no eligible
  live-demand baseline. It is not part of PR #185.
- PRs #186, #188, and #189 are preserved as source history; their useful work
  is consolidated into PR #185 and their former standalone gates are obsolete.
- PRs #190–#192 remain preserved as source history; their independently useful
  work is consolidated once in Draft PR #193 and is not part of PR #185.
- PR [#179](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/179)
  repairs the iOS Home Screen Web Push handoff. Refresh it after the current
  stack and rerun protected iPhone-install acceptance before considering
  `APPROVE IOS PHONE ALERT INSTALL HANDOFF MERGE AND PRODUCTION DEPLOYMENT`.
  Physical enrollment and a `[TEST]` push remain separate actions.
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
5. Owner: separately approve deletion of either empty Vercel helper project.
   Both currently have zero deployments and no domain effect.

## Resolved and removed from this queue

- PRs #170, #172, #173, #177, #178, #180, #181, #183, and #184 are released;
  do not request their historical approval phrases again.
- Canonical Neon Production and Better Auth/RBAC are established.
- Form 3 signed WordPress forwarding and duplicate native-notification shutdown
  passed controlled QA.
- Internal Resend email, hidden audit BCC, provider message ID, and delivery
  reconciliation have controlled QA evidence.
- Both Ask Magic Mike hostnames belong only to the canonical Vercel project.
