# Owner Approval Queue

Updated 2026-08-21 from authenticated GitHub, Vercel, Neon, WordPress, and
Production evidence. The public funnel and internal email path are live. This
queue covers only actions that still require a human or external-system gate.

## Active Production release sequence

Release only one approved PR at a time. Rebase the downstream PR on the exact
new `main`, then rerun Node 24 CI and Vercel Preview before using its gate.

1. PR [#183](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/183)
   — campaign safety and three-offer owned-demand flight:
   `APPROVE PHASE 9 CAMPAIGN SAFETY AND THREE-OFFER OWNED-DEMAND FLIGHT MERGE AND PRODUCTION DEPLOYMENT`
2. PR [#184](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/184)
   — append-only owned-demand publication-proof ledger, only after #183 lands
   and #184 is refreshed:
   `APPROVE PHASE 9 OWNED-DEMAND PUBLICATION PROOF LEDGER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT`
3. PR [#185](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/185)
   — current-router safety and Buyer discovery, only after #184 lands and #185
   is refreshed:
   `APPROVE PHASE 9 CURRENT-ROUTER SAFETY AND BUYER DISCOVERY MERGE AND PRODUCTION DEPLOYMENT`
4. PR [#186](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/186)
   — protected deterministic owned-demand exports and allowlisted QR
   attribution, only after #185 lands and #186 is refreshed:
   `APPROVE PHASE 9 OWNED-DEMAND ASSET STUDIO MERGE AND PRODUCTION DEPLOYMENT`
5. Stacked branch `codex/phase9-kpi-target-register-20260821` — protected,
   append-only KPI target register, only after #186 lands and this candidate is
   refreshed against the resulting head:
   `APPROVE PHASE 9 KPI TARGET REGISTER PRODUCTION MIGRATION, MERGE, AND PRODUCTION DEPLOYMENT`

The #184 and KPI-target phrases authorize their respective reviewed
backup-first Neon migrations, exact code merge, and canonical Vercel deployment.
The other phrases authorize only their reviewed code merge and canonical
deployment. None authorizes recording a KPI target, a social/GBP
post, email campaign, QR printing/distribution, consumer message, spend, DNS
change, WordPress change, provider action, or deletion.

## Deferred candidates requiring refresh and overlap review

- PR [#182](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/182)
  modernizes launch-authority checks and surfaces buyer discovery. It overlaps
  #183's buyer and operational-document work. Do not release it until the
  current stack lands, the overlap is reconciled, and exact-head evidence is
  re-established. Its retained gate is
  `APPROVE PHASE 9 LAUNCH AUTHORITY AND BUYER DISCOVERY MERGE AND PRODUCTION DEPLOYMENT`.
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
5. Owner: separately approve deletion of any specifically named empty Vercel
   helper project. The owned-demand studio helper currently has zero deployments
   and no domain effect; its exact cleanup gate is
   `APPROVE DELETE EMPTY VERCEL HELPER PROJECT amm-phase9-owned-demand-assets-20260821`.

## Resolved and removed from this queue

- PRs #170, #172, #173, #177, #178, #180, and #181 are merged; do not request
  their historical approval phrases again.
- Canonical Neon Production and Better Auth/RBAC are established.
- Form 3 signed WordPress forwarding and duplicate native-notification shutdown
  passed controlled QA.
- Internal Resend email, hidden audit BCC, provider message ID, and delivery
  reconciliation have controlled QA evidence.
- Both Ask Magic Mike hostnames belong only to the canonical Vercel project.
