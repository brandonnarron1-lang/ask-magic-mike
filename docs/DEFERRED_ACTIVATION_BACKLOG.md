# Deferred Activation Backlog

| Item | Status | Why it is deferred | Activation proof |
| --- | --- | --- | --- |
| Carrier SMS/MMS to Mike and Brandon | DEFERRED — PAID SERVICE | Reliable U.S. A2P delivery needs an approved sender/provider, registration, consent, and recurring cost | registered sender, approved copy/recipients, sandbox and controlled QA delivery |
| Consumer acknowledgment email | DEFERRED — LEGAL OR BROKERAGE APPROVAL | distinct consumer communication and unsubscribe/consent policy | approved template, channel rules, provider delivery and suppression proof |
| Multi-user RBAC/auth | BLOCKED — HUMAN ACTION | approved identities, roles, recovery, and agent visibility decisions required | per-user sessions, server-side role/assignment tests, audit actor IDs |
| WordPress canonical bridge | IMPLEMENTED — ACTIVATION REQUIRED | live plugin/page/form publication is an owner gate | backup, shadow health, form-specific QA, one-entry/one-lead reconciliation |
| Staff Web Push | IMPLEMENTED — ACTIVATION REQUIRED | each owner must grant phone permission | active primary/copy subscriptions and approved internal QA receipt |
| Global CSP enforcement | IMPLEMENTED — ACTIVATION REQUIRED | report-only telemetry and third-party inventory needed to avoid breakage | zero unexpected violations, enforced-header smoke |
| Our Town Facebook crawler fix | BLOCKED — HOST ACTION | proven server-global Apache rule is outside this branch; bounded override is prepared | Facebook crawler gets 200 with correct OG metadata on both pages and the verifier reaches 42/42 |
| GA4/GTM/Search Console production changes | IMPLEMENTED — ACTIVATION REQUIRED | property/container access and publication approval | no-PII events, cross-domain session proof, test/internal exclusion |
| External CRM synchronization | NOT REQUIRED | canonical Lead Center is sufficient for current operation | approved destination, field map, idempotent sandbox sync |
| Paid ads/lead vendors | DEFERRED — PAID SERVICE | owned funnel must operate first; spend not approved | owner budget, compliance review, tagged campaign, conversion proof |
| Coastal/expanded market claims | DEFERRED — LEGAL OR BROKERAGE APPROVAL | service area and brokerage claims require owner/BIC approval | approved copy and route/assignment coverage |
| Legacy Supabase runtime cleanup | SUPERSEDED | rollback/reference code remains; removal is not critical path | route-by-route deletion PR after backup and no-import proof |
| Stale PRs #92/#119/#120/#121 | ARCHIVE AFTER REVIEW | pre-consolidation changes may conflict with current main | fresh diff reviewed; close only with owner authorization |
