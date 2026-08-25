# Phase 9 local-profile performance ingress

Date: 2026-08-24

Status: implementation candidate; Production and external accounts unchanged

Authority: protected validation and operator-approved aggregate import only

## Decision

Extend the existing Growth Intelligence ingress pattern with one bounded Google
Business Profile performance report. Do not create another dashboard, campaign
studio, lead store, CRM, provider account, OAuth integration, or publisher.

The candidate reuses:

- the authenticated Lead Center and `growth:manage` permission;
- the shared bounded CSV transport;
- the canonical Neon `market_signals`, `market_opportunities`, and immutable
  `audit_logs` ledgers;
- the existing Growth Command Center navigation and opportunity queue; and
- the Production identity, mutation, and exact-confirmation gates already used
  by the spend and Search Console ingress tools.

## Measured reason

An aggregate-only query of canonical Neon Production at
`2026-08-25T03:16:33.786264Z` returned:

- 6 total leads, all 6 test or communication-suppressed;
- 0 live and 0 contactable live prospects;
- 0 live responses or outcomes;
- 0 spend rows and $0 recorded spend;
- 0 non-test market signals or opportunities; and
- 0 non-test publication proofs.

The public funnel itself returned HTTP 200 on its primary seller, buyer,
home-value, Ask, widget, liveness, and readiness routes. The existing ordered
release train already contains the durable-rate-limit readiness and canonical
alias corrections. The remaining business constraint is measurable owned/local
demand, not another public form, lead database, notification engine, visual
system, or CRM.

## Current official mechanism

Google currently documents that verified Business Profile owners/managers can
inspect profile performance data such as views, searches, website clicks,
call-button clicks, direction requests, and applicable booking interactions:

- https://support.google.com/business/answer/9918094?hl=en

Google also documents a Business Profile Performance API for daily metrics and
monthly search-keyword impressions. It requires OAuth authorization and may
require separate GBP API access:

- https://developers.google.com/my-business/reference/performance/rest
- https://developers.google.com/my-business/reference/performance/rpc/google.mybusiness.performance.v1

Google ended Business Profile chat and call-history features on July 31, 2024,
and documents that `BUSINESS_CONVERSATIONS` is no longer available in the
Performance API:

- https://support.google.com/business/answer/14919056?hl=en

This candidate deliberately accepts a reviewed, normalized aggregate CSV. It
does not request OAuth, call Google, create API credentials, store a Google
location identifier, or retain search-keyword text.

## Import contract

One report covers one allowlisted brokerage profile and one date window. Rows
contain only approved aggregate metric keys and non-negative integer values.
The initial allowlist is:

- Search impressions: desktop/mobile × Search/Maps;
- website clicks;
- call-button clicks;
- direction requests;
- bookings.

`business_conversations` is rejected by the parser. The legacy v1 database
summary keeps a `conversations` field fixed at zero solely so the already-
reviewed atomic import contract stays compatible. Additive migration
`20260825060000_local_demand_metric_truth_guard.sql` also rejects any new or
revised canonical Google Business Profile signal that claims the retired
metric. It does not scan, rewrite, or delete historical evidence.

Unknown columns, unknown metrics, mixed profile/window identity, duplicate
metrics, future dates, oversized values, spreadsheet formulas, control
characters, malformed CSV, and non-aggregate payloads fail closed.

The normalized rows derive:

- one deterministic profile-performance market signal per metric;
- a deterministic aggregate interaction-rate signal; and
- an explainable local-profile opportunity only when minimum evidence and a
  published policy threshold are both satisfied.

No lead identity, phone number, email address, property address, message, raw
search term, IP address, user agent, OAuth token, credential, provider payload,
or raw CSV is retained.

## Safety boundary

- Page and APIs require server-side `growth:manage` authorization.
- Cookie-authenticated POSTs require an exact same-origin request before auth.
- Request bodies and CSV cells are bounded independently.
- Preview is read/compute-only and always available to an authorized operator.
- Commit remains disabled by default and requires an exact batch fingerprint,
  explicit report reference, exact confirmation phrase, Production database
  identity, and runtime write authority.
- Synthetic examples can never commit.
- Durable import is transactional, idempotent, and audit-linked.
- Responses are private/no-store and sandboxed.
- The importer cannot publish a GBP post, edit a Business Profile, send a
  message, create a lead, spend money, mutate WordPress, or touch NellySelly.

## Rollback

Before Production, leave the candidate branch/PR unmerged. After an explicitly
approved release, application rollback is a revert or promotion of the previous
Ready Vercel deployment. The additive receipt table should remain installed and
immutable; preserve audit and signal history and use a reviewed forward fix for
schema issues. Disabling the import environment gate stops new commits without
removing evidence.
