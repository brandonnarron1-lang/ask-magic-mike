# Known Limitations — Ask Magic Mike

Updated 2026-08-21. This document records the current Neon/Resend/Web Push
system, not the superseded Supabase/mock-email/Twilio-era architecture.

## 1. Demand and measurement

### No genuine live-demand sample yet

Current aggregate Production evidence contains six suppressed/test leads and no
contactable live prospect. Source, outcome, and first-response dashboards are
therefore structurally ready but statistically empty. Never fabricate a prospect
or relabel a QA submission to improve a KPI.

### Intelligence requires real observations

Predictions, experiments, source comparisons, response percentiles, and outcome
rates remain low-confidence until genuine traffic produces adequate samples.
Deterministic routing and scoring continue to work; AI summaries and statistical
recommendations are advisory and never silently assign a lead.

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
Brandon's enrollment. PR #179 contains a deferred iOS Home Screen handoff repair
that must be refreshed before release.

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

The hosting WAF blocks FacebookExternalHit on selected WordPress paths. Use
AskMagicMike.com links as the current social fallback. Any exception must name
the exact managed rule, path, and GET/HEAD methods; global bot protection must
not be weakened.

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

PR #183 is merged and live. PR #184's hash-pinned Neon migration is applied and
independently verified; its exact application release evidence is tracked on the
PR. Neither release authorizes an external placement or provider action.

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
| 1 | Reconcile the downstream stacked PRs onto released #184 and re-establish exact-head evidence | No Production mutation without its own gate |
| 2 | Publish one approved zero-spend placement and record native proof | Channel-specific approval |
| 3 | Activate Mike's account and enroll each owner's Web Push device | Per-person takeover/test approval |
| 4 | Approve consent wording before expanding WordPress forms | Mike/BIC approval |
| 5 | Attach `hub.ourtownproperties.com` | DNS/Vercel approval |
| 6 | Add MLS or CRM integrations only under an existing approved contract/account | Provider/credential approval |
