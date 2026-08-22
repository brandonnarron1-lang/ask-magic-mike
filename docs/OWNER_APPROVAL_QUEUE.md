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

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Next consolidated application and schema-repair candidate

- PR [#185](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/185)
  is the sole owned-demand application consolidation vehicle. It preserves the
  useful work from PRs #185, #186, #188, and #189 on released PR #184 while
  excluding PR #187's KPI-target migration and PRs #190–#192.
- Final tracing found that the existing Neon proof constraints did not yet
  accept the WordPress tuples already validated by the application. PR #185 now
  includes one additive constraint-only repair plus a pinned, backup-first,
  one-transaction cutover runner. It contains no publisher or seeded proof.
- After exact-head Node 24 CI, canonical Vercel Preview, PostgreSQL contract,
  protected-flow, security, and desktop/mobile acceptance pass, the only
  release phrase to request is:
  `APPROVE PHASE 9 OWNED-DEMAND WORDPRESS PROOF MIGRATION, PR 185 MERGE, AND PRODUCTION DEPLOYMENT`.
- That future phrase will authorize only the reviewed migration, exact PR #185
  merge, and canonical Vercel Production deployment. It will not authorize a
  WordPress edit, GBP/social/email publication, QR distribution, message, lead
  submission, any other database migration, spend, DNS change, provider action,
  deletion, or NellySelly action.

## Stacked candidates after PR #185

- Draft PR [#193](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/193)
  consolidates the independent privacy, durable limiter, and aggregate KPI-trust
  work from PRs #190–#192. It has no migration or provider action and must be
  refreshed onto released `main` after PR #185, then rerun exact-head evidence
  before its distinct privacy/KPI approval gate can be requested.
- Draft PR [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194)
  consolidates only the secure iOS Home Screen Web Push handoff. It remains
  stacked on PR #193 and must not be merged out of order. Physical enrollment
  and one `[TEST]` Push remain separate owner-controlled actions.

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
