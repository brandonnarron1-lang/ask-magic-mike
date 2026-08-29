# Phase 9 channel-economics truth hardening

Date: 2026-08-29

Status: refreshed stacked Draft candidate on exact sealed PR #222; Production
and external systems unchanged

Authority: read-only interpretation of canonical lead, spend, and outcome evidence

## Decision

Upgrade the existing Growth Command Center and deterministic intelligence engine
instead of creating another dashboard, finance database, CRM, provider adapter,
or AI estimator.

Original PR #223 head `294e08fc8524e515364c7a7bd49cfe8413d3d08c`
is preserved at
`rescue/amm-pr223-pre-pr222-exact-seal-20260829-040442`. The refreshed
candidate is reconciled onto exact sealed PR #222 head
`c6ff9157e66705128a283b98096f74ca8247cdab` without a force push.

The audit proved two material accounting defects in the existing calculation:

1. `referral_paid` amounts were added to attributed revenue; and
2. one recorded close amount could make partially documented channel economics
   appear complete.

This candidate separates revenue from referral cost and makes missing financial
evidence unknown rather than zero. It does not infer commission, referral-fee
percentages, sale price, net income, or future value.

## Canonical formulas

For each lead and outcome type, the latest valid `occurred_at` record is the
current evidence snapshot. Older repeated rows do not get summed into revenue or
cost.

- **Attributed revenue:** actual `closed.amount_usd` only.
- **Recorded referral fees:** actual `referral_paid.amount_usd` only; this is a
  cost and can never increase revenue or ROAS.
- **Tracked contribution:** attributed revenue minus tracked acquisition spend
  minus recorded referral fees.
- **ROAS:** attributed revenue divided by tracked spend.
- **CPQL:** tracked spend divided by qualified leads.
- **Cost per signed client:** tracked spend divided by agreement-signed-or-later
  leads.

Tracked contribution is an operating acquisition measure, not accounting net
income, gross commission income, taxable income, or profit. It excludes every
expense not represented by the canonical spend and referral-fee ledgers.

## Evidence-completeness rules

ROAS and tracked contribution render only when all applicable evidence in the
selected window is complete:

1. every closed lead has an actual closed-brokerage-revenue amount; and
2. every portal or referral-channel close has an explicit referral-fee outcome;
   and
3. every paid channel with leads has corresponding tracked spend evidence.

An explicit fee amount of zero is valid evidence that the close was reviewed and
no fee was incurred. An absent row is unknown and cannot be treated as zero.

Partial coverage creates `spend_missing`, `closed_revenue_missing`, and/or
`referral_fee_review_required`, withholds ROAS and tracked contribution, and
blocks `scale_candidate`. The opportunity radar reports the exact number of
missing close reviews rather than the whole channel count. Evidence from an
unrelated channel cannot satisfy another channel's completeness requirement.

Scale eligibility now requires at least two closes, complete financial evidence,
positive tracked contribution, at least 3x ROAS, and no unresolved referral-fee
review. It remains a recommendation requiring separate spend approval.

## Reused assets and boundaries

This candidate reuses:

- canonical Neon `leads`, `source_attribution`, `marketing_spend_daily`, and
  `lead_outcomes` data;
- the existing server-authorized `/admin/growth` route;
- the existing Lead Center closed-revenue workflow and
  `lead:record_revenue` permission;
- current test/suppression exclusions, response-time evidence, opportunity
  radar, and approval classes; and
- the existing Vercel Preview and release-gate workflows.

The Growth page stays read-only. It adds no form, Server Action, provider call,
message, campaign launch, spend change, lead assignment, or database write.
`referral_paid` is already an allowed canonical outcome type, but this candidate
does not invent a new fee-entry mutation. Missing fee evidence is surfaced for
controlled reconciliation; adding a new operator write seam requires its own
RBAC, audit, database, and Production approval.

## Privacy and security

Only aggregate financial metrics and source/campaign labels already available to
the protected `report:view` surface render. No consumer contact data, property
address, message content, recipient, provider credential, secret, or arbitrary
JSON is added. QA, test, and communication-suppressed records remain excluded at
the canonical Neon query boundary.

## Rollback and release order

Before Production, rollback is abandonment of the stacked Draft PR. After a
separately approved release, rollback is a forward revert or promotion of the
last accepted Vercel deployment. No schema rollback is needed because this
candidate has no migration.

The ordered release train remains authoritative. This candidate cannot
leapfrog its sealed predecessors or independently reuse any consumed Production
authority. Its eventual gate is:

```text
APPROVE PHASE 9 CHANNEL ECONOMICS TRUTH MERGE AND PRODUCTION DEPLOYMENT
```

That phrase authorizes only the exact sealed head after all predecessor gates
have completed; it does not authorize database edits, spend, provider actions,
messages, WordPress changes, DNS changes, or NellySelly access.
