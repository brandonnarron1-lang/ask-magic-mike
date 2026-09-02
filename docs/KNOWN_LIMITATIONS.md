# Known Limitations — Ask Magic Mike

Updated 2026-09-02. This document records the current Neon/Resend/Web Push
system, not the superseded Supabase/mock-email/Twilio-era architecture.

## Current release authority

- Accepted Production is PR #247 merge
  `a2f3de834830f600df106dbf5836ae4bbde4eb4a`, tree
  `0065f829fc94f87ab5e0faf596c8e56733be3972`, on Ready deployment
  `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`.
- PR #248 is the only active reviewed application candidate, at head
  `f6134b71f258003aa5dc201cf5ef7cdb6eb61ee7` and tree
  `832be2750355391f9198fcaaaa6f46bb3beb8b3f`.
- The PR #247 approval is consumed. The only requestable application gate is
  `APPROVE PHASE 9 CONNECTOR READINESS APPLICATION PR 248 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`.
- This file describes limitations; `CURRENT_RELEASE_AUTHORITY.md` and its
  machine-readable manifest remain authoritative if chronological evidence
  elsewhere conflicts.

## 1. Demand and measurement

### No genuine live-demand sample yet

This static file does not assert a current Production lead count. The last
controlled baseline had no contactable live-demand sample; the authenticated
Lead Center and Growth aggregates are the point-in-time authority. Until genuine
demand supplies a defensible sample, source, outcome, and first-response
analysis remains low-confidence. Never fabricate a prospect or relabel a QA
submission to improve a KPI.

### Intelligence requires real observations

Predictions, experiments, source comparisons, response percentiles, and outcome
rates remain low-confidence until genuine traffic produces adequate samples.
Deterministic routing and scoring continue to work; AI summaries and statistical
recommendations are advisory and never silently assign a lead.

### Numeric operating targets remain disabled

The protected Growth Command Center now names 42 baseline evidence contracts,
their sample thresholds, and their readiness states. At the last controlled
baseline there was no eligible live-demand denominator, so target entry remained
locked. Runtime aggregates—not this static file—determine current readiness.
Directional samples cannot become an approved target until their evidence
contract is satisfied. A future durable target lifecycle requires measured
evidence plus a separate owner-reviewed decision; QA rows cannot unlock it.

Reconciled spend can be measured as independent context even when lead volume
is zero, but that does not unlock a conversion or economics target. Partial
close-revenue, referral-fee, or paid-channel spend coverage remains unknown
rather than rendering a deceptively low dollar or cost value.

### Field-performance telemetry is active but not decision-grade yet

PR #209 activated the privacy-minimized LCP, INP, and CLS reporter. There is not
yet enough genuine Production traffic to treat those observations as a stable
baseline. Browser headers are not authentication, so aggregates remain
rate-limited, deduplicated, sample-labeled, and advisory rather than
transaction truth.

### Preview database identity must be attested before any controlled write

Every Vercel Preview remains categorically read-only unless protected health
attests a Preview Neon endpoint distinct from Production and all existing
mutation controls agree. Public analytics and experiment routes enforce that
endpoint-aware guard before rate limiting or persistence. One historical,
privacy-minimized page-view created while the inherited-credential gap was
being diagnosed exists only on the Neon Preview branch; an aggregate check
found no matching Production row. Do not enable Preview mutation until the
separate endpoint-attestation gate passes.

## 2. Messaging and staff alerts

### Internal email is live; consumer automation is not broadly enabled

Authenticated Resend delivery, the hidden audit BCC, provider message IDs, and
outbox reconciliation have controlled QA evidence. Consumer acknowledgment,
nurture, and sequence sends remain purpose-, consent-, template-, suppression-,
and approval-gated. A queued provider state is not a delivered-state claim.

### Web Push requires per-device human enrollment

The schema, VAPID configuration, protected setup flow, and push adapter are
present. Each person must install/enable notifications on their own supported
device and approve one `[TEST]` receipt. Mike's device cannot be represented by
Brandon's enrollment. Historical PR #179's unique iOS Home Screen handoff was
consolidated and released through PR #194 on the current verified stack.
Physical installation and test receipt remain separate human actions.

### Carrier SMS/MMS is intentionally disabled

There is no compliant zero-cost substitute for a registered carrier sender.
Twilio-compatible code remains dormant until the owner approves a paid provider,
registered sender, recipient policy, credentials, and test. Email and Web Push
are the free-first internal notification paths.

## 3. WordPress expansion

### Form 3 is the only approved canonical bridge form

The signed WordPress bridge forwards Home Value Form 3 and has controlled
idempotency/email evidence. Forms 1, 2, and 4–7 remain blocked because their
field/consent/attribution contracts are not all approved. Gravity Forms entries
remain preserved locally; duplicate Form 3 native notification is inactive.

### One preserved Form 7 entry has unclear consent

Entry 1550 is retained without contact, marketing, alerting, or canonical
forwarding pending Mike/BIC review. Code must not infer consent from the mere
existence of an entry.

### Facebook crawler access is constrained on selected Our Town URLs

The server-global Apache authorization policy blocks FacebookExternalHit on
selected WordPress paths. The account-level `.htaccess` trial was ineffective
and fully rolled back. Use AskMagicMike.com links as the current social
fallback; the remaining correction requires a root/WHM per-vhost rule limited
to the reviewed public paths and GET/HEAD methods.

## 4. Operator identity and private entry point

### Mike's Lead Center account is provisioned but dormant

Brandon's administrator acceptance is complete. Mike must choose his password
from his approved email/device and pass assigned-lead-only, logout, and session
revocation acceptance before operating as `primary_lead_owner`.

### The hub subdomain is not attached

The protected Lead Center is available under the canonical Ask Magic Mike admin
routes. `hub.ourtownproperties.com` remains a staged redirect/domain design and
requires separate DNS/Vercel approval.

## 5. Property, MLS, and CRM data

### Our Town/FlexMLS remains the listing authority

Ask Magic Mike exposes public-safe degraded listing endpoints, but it does not
claim a current unrestricted MLS feed or scrape confidential fields. Live
availability and broker-only MLS data must come from approved Our Town/FlexMLS
workflows and contract-authorized integrations.

### CRM sync remains optional

Canonical Neon is the durable lead source of truth. The CRM adapter remains null
until the owner approves an existing CRM account and enters scoped credentials
securely. CSV export remains available with audit logging.

## 6. Release and publication boundaries

### Current release state

Current accepted Production is PR #247 merge
`a2f3de834830f600df106dbf5836ae4bbde4eb4a`, exact tree
`0065f829fc94f87ab5e0faf596c8e56733be3972`, on deployment
`dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`. Deployment
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` is the immediate application rollback.

PR #248 is the only active reviewed application candidate. Its machine-bound
head/tree, hosted gate, immutable Preview, rollback, and exact owner-only
application gate are sealed. PRs #249 through #266 are ordered Draft review
work with no independent Production authority. Head, tree, migration,
environment, or evidence drift invalidates any future gate.

PR #238 is an applied and verified five-migration receipt. Historical component
and superseded review PRs retain evidence but have no independent current
release authority. Current Production readiness, post-deploy verification, and
the six-hour monitor pass.

### Prepared content is not published content

The Distribution Command prepares copy and tracked URLs but does not call GBP,
social, email-signature, or print providers. A placement may be marked live only
after an authorized operator acts in the native platform and records valid
evidence. External publication, removal, and spend each remain separate actions.

## 7. Legal, compliance, and promise boundaries

- No automated appraisal, guaranteed value, guaranteed offer, inventory claim,
  response-time promise, or closing promise is produced.
- Protected-class data or neighborhood/school proxies are not used for scoring,
  targeting, routing, or recommendations.
- Direct-purchase and seller-options language remains conditional and
  broker-reviewed.
- The public brokerage phone remains `252-243-7700` until the owner explicitly
  approves a change.
- AI generation is not on the lead-storage, scoring, routing, notification, or
  assignment hot path. Approved static visual templates remain deterministic.

## 8. Local verification limitation

The local Supabase PostgreSQL 17.6 image segfaults on one redundant direct call
to a revoked 18-argument function after `SET ROLE authenticated`. The release
contract therefore proves function denial from PostgreSQL's catalog ACL and
uses an actual SQLSTATE `42501` authenticated table-read denial. Service-role
execution, idempotency, audit creation, unsafe-host rejection, RLS, and hard
UPDATE/DELETE rejection all run against real PostgreSQL and roll back. The
Production cutover additionally targets canonical Neon PostgreSQL 18 with
backup-first, identity, role, hash, and postflight interlocks.

## Prioritized next actions

| Priority | Action | Gate |
|---|---|---|
| 1 | Obtain the exact PR #248 owner approval while its sealed head/tree remain unchanged | Exact application-only gate in `CURRENT_RELEASE_AUTHORITY.md` |
| 2 | After that application release passes, review and upgrade the hash-pinned Connector 1.1.0 package | Separate Connector plugin gate |
| 3 | Rebuild the page-specific manifest and verified rollback before publishing one visible WordPress placement | Separate page-specific publication gate |
| 4 | Activate Mike's account and enroll each owner's Web Push device | Per-person takeover/test approval |
| 5 | Approve consent wording before expanding WordPress forms | Mike/BIC approval |
| 6 | Attach `hub.ourtownproperties.com`, or add MLS/CRM integrations under an approved contract | Exact DNS/provider approval |
