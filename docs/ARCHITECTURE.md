# Architecture

> Current source of truth (2026-08-21): Next.js root `app/`, Vercel project
> `eyes-up-industries/ask-magic-mike`, and Neon PostgreSQL project
> `bitter-star-20214385`. See `CURRENT_STATE_RECONCILIATION.md` and
> `OWNER_APPROVAL_QUEUE.md`. Sections below
> that describe Supabase as canonical or `/api/intake/submit` as the active
> public path are `SUPERSEDED` historical design notes retained for provenance.

## Active public lead-capture boundary

The active root `POST /api/leads` route is the one public lead command used by
Ask Magic Mike funnels, the isolated iframe widget, and the signed Our Town
Properties Gravity Forms bridge. It normalizes into one canonical Neon
transaction:

```text
exact public Origin OR signed WordPress raw body
  -> JSON/type/size/idempotency/consent validation
  -> Preview zero-write + Production durable rate limit
  -> deterministic score and routing preparation
  -> capture_public_lead_v2
       session + contact + lead + dedupe + assignment
       source attribution + consent + audit + internal email outbox
  -> post-commit immediate dispatch/analytics/monitoring
       failure-isolated; outbox retry remains authoritative
```

Success is never reported before the lifecycle transaction commits. Replay
returns the existing canonical identity without a second provider call.
Browser input cannot author score, routing, assignment, suppression, duplicate,
or KPI test state. Public channel permission requires the server-owned umbrella
consent plus the exact channel grant; SMS remains denied until a separately
approved public SMS consent control exists.

## Active inbound SMS consent boundary

`POST /api/webhooks/sms/inbound` is the single consumer-reply/opt-out command.
Exact form media is always treated as Twilio and requires the provider's signed
canonical callback URL, independent of whether new outbound sends are enabled.
The admin-secret JSON transport exists only for local non-Production tests;
Production refuses it and Preview is zero-write.

One canonical Neon statement claims the provider receipt, records one timeline
event, suppresses every existing lead record matching the normalized U.S.
number, upserts each SMS purpose permission, and cancels eligible sequences.
Receipt failure therefore cannot become a false successful replay. Exact replay
is inert, changed-content event-ID reuse conflicts, and a previously unmatched
receipt can heal on the same signed replay after its lead exists. No raw phone
or message body is retained in webhook metadata. See
[`phase9/SMS_INBOUND_CONSENT_ATOMIC_BOUNDARY.md`](./phase9/SMS_INBOUND_CONSENT_ATOMIC_BOUNDARY.md).

Read-only Preview refuses before the shared limiter can write. Production
requires durable Neon-backed limiting unless the exact documented emergency
flag is deliberately active. All public responses are private/no-store and
correlation-addressable. The historical `src/app` lead route is outside the
deployed root App Router and is not a competing authority.

## Active public experiment boundary

The existing Home Value experiment uses one exposure endpoint and the existing
canonical Neon growth ledger. The browser supplies only a SHA-256 pseudonymous
subject to `POST /api/experiments/event`; the endpoint accepts exposure only,
selects the deterministic variant after runtime/code/database approval gates,
and never accepts a lead ID or browser-authored conversion.

If the exposure is active, four bounded context fields accompany the existing
`POST /api/leads` request. The lead route revalidates the exact experiment,
subject shape, variant, Home Value source, and static surface before the
canonical transaction. After a new non-test lead commits, the server writes the
`lead_created` experiment event using that exact durable lead UUID. The
repository requires the prior stored assignment, recomputes its deterministic
variant, rejects substitutions, and confirms lead eligibility. Replay performs
no second conversion write.

```text
public exposure -> deterministic stored assignment
durable lead commit -> server-bound eligible conversion
```

Preview refuses before limiter/ledger mutation, Production requires durable
limiting, and inactive/unapproved experiments fall back to the control funnel.
This path reuses `growth_experiments`, `growth_experiment_assignments`, and
`growth_experiment_events`; it does not create a second experiment or analytics
system.

## Historical data flow (`SUPERSEDED`)

```
User visits askmagicmike.com
  │
  ▼
[Session Created] ──── attribution captured (UTM, referrer, device)
  │                    analytics: session_created
  │
  ▼
[Landing Page]
  ├── Free-text question input
  ├── Property address input
  └── CTA chips (home_worth, should_sell_now, tour_home, what_can_afford, talk_to_mike)
        │
        ▼ user selects chip or submits question
  [Intake Flow] (5 steps)
  │
  ├── Step 1: Confirm/edit question + address
  ├── Step 2: Intent (sell/buy/both) + Timeline
  ├── Step 3: Contact info (name, email, phone)
  ├── Step 4: TCPA consent (SMS / Call / Email)
  └── Step 5: Confirmation (score-informed)
        │
        ▼ POST /api/intake/submit
  [Submit Handler]
  │
  ├── 1. Validate (Zod)
  ├── 2. Upsert lead row (Supabase)
  ├── 3. Compute score (deterministic — no AI)
  │       ├── Seller score (0-100)
  │       ├── Buyer score (0-100)
  │       ├── Composite = max(seller, buyer)
  │       └── Temperature (urgent/hot/warm/nurture/low)
  ├── 4. Upsert lead_scores row (with factor_log JSONB)
  ├── 5. Assign agent (priority → load → availability)
  ├── 6. Create lead_routing row (SLA deadlines computed)
  ├── 7. CRM sync (null/FUB/kvCORE adapter — fire and forget)
  └── 8. Fire analytics events
        │
        ▼
  [Admin Dashboard]
  └── Leads table with temperature badges, score display, SLA timers
```

## Key Modules

### Scoring (`src/lib/scoring/`)

Deterministic scorer — no AI, no external calls. Every decision is logged in `factor_log` JSONB for full auditability. Versioned via `scorer_version`.

```
ScoringInput → computeScore() → LeadScore
                    │
                    ├── computeSellerScore()  → seller_certainty_score + factors
                    ├── computeBuyerScore()   → buyer_certainty_score + factors
                    ├── composite = max(seller, buyer)
                    └── classifyTemperature() → temperature
```

Temperature ladder:
- **urgent**: composite ≥ 80 AND timeline ≤ 3 months
- **hot**: composite ≥ 65
- **warm**: composite ≥ 40
- **nurture**: composite ≥ 20
- **low**: composite < 20

### CRM Adapter (`src/lib/crm/`)

Factory pattern — always returns an adapter. The `null` adapter is the default:

```
getCRMAdapter()
  ├── FUB_API_KEY present  → FollowUpBossAdapter
  ├── KVCORE_API_KEY present → KvCoreAdapter
  └── neither              → NullCRMAdapter (skipped, logged)
```

All operations are logged to `crm_sync_log` regardless of adapter.

### Attribution (`src/lib/attribution/`)

Pure functions — no side effects. Parses URLSearchParams and classifies referrer.

```
parseAttribution(params, referrer, landingPage) → Attribution
classifyReferrer(referrerUrl, utmMedium) → ReferrerType
```

### Agent Routing (`src/lib/routing/`)

```
assignAgent(agents[], context?) → RoutingDecision | null

Selection algorithm:
  1. Filter: isActive=true, role != 'admin'
  2. Filter: within availability window (agent's local time)
  3. Filter: currentLoad < maxDailyLeads
  4. Sort: priorityScore DESC, currentLoad ASC
  5. Return first result, or null
```

SLA timers are stored as absolute timestamps in `lead_routing`:
- `accept_deadline = assigned_at + 2 minutes`
- `contact_deadline = assigned_at + 5 minutes`

### Analytics Ledger (`src/lib/analytics/`)

Canonical analytics writes use the server-side Neon repository. Public callers
pass exact event, origin, body-size, rate-limit, property, path, attribution-
registry, and PII-minimization checks; a successful HTTP 202 means the write
completed, while unavailable persistence fails truthfully with HTTP 503.
Trusted server/provider paths can associate events with canonical entities only
after their own authorization and durable operation.

```
browser trackEvent(params) → minimized POST /api/events (non-blocking UX)
public route → runtime validation → Neon analytics_events
trusted operation → server ledger → Neon analytics_events
```

The active public ingress preserves one wire format and one ledger.
`/api/events` is the current snake-case browser handler and
`/api/widget/events` re-exports that exact handler. It requires an explicit
approved origin, excludes automated-browser telemetry before shared state
access, refuses ordinary Preview writes before rate limiting, and permits
Production persistence only after an allowed durable limiter result. Response
correlation, no-store behavior, event/property allowlists, and safe failure
semantics are enforced at that boundary.

The historical camel-case adapter under `src/app/api/analytics/event` belongs
to the ignored router tree and is not present in the active route manifest. It
is retained fail-safe for source provenance, but is neither a live endpoint nor
a second analytics authority.

Form funnels reuse their existing browser submission/idempotency UUID as a
protected `funnel_session_id` property. It is absent from browser analytics
dimensions and does not create a `sessions` row. If lead storage succeeds, the
atomic capture reuses that UUID as `sessions.id`; aggregate queries can then
join the pre-lead steps without weakening lifecycle atomicity. Browser-authored
lead/widget creation, qualification, appointment-request, and notification
outcome rows are refused; server post-storage `lead_created` is the canonical
lead-conversion authority.

`POST /api/chat/session` is a compatibility endpoint for issuing the same class
of opaque public UUID. It is not an authentication session and performs no
database write. Preview issues it before shared limiting; Production issues it
only after an allowed durable rate-limit result. Canonical session ownership
still begins inside the atomic lead-capture transaction.

The dependent field-experience candidate reuses this ledger for Production-only
LCP/INP/CLS. It writes no lead/session/attribution identity, converts the raw
browser metric ID to a domain-separated digest, and lets the protected Growth
read model calculate bounded, digest-deduplicated P75 evidence by mobile and
desktop. Preview renders no reporter and performs no telemetry write.

### Growth economics and controlled spend ingress

The Growth Command Center reads the existing canonical Neon tables
`marketing_channels`, `marketing_campaigns`, and `marketing_spend_daily` for
channel economics. It does not infer spend, revenue, or ROI from analytics
events.

The feature-gated spend workbench accepts one exact canonical CSV contract and
performs a no-write server preview first. A later authorized commit revalidates
the original bounded CSV, verifies the reviewed SHA-256 batch fingerprint, and
calls the owner-only `import_marketing_spend_batch_v1` transaction. That
function serializes imports, refuses synthetic or conflicting identities,
reconciles campaign-day facts, and writes immutable per-row and aggregate audit
evidence plus a minimized append-only receipt. Exact replay returns the prior
receipt without duplicating spend. Raw CSV is never retained.

`GROWTH_SPEND_IMPORT_ENABLED=false` is the deployment-safe default. A commit
also requires explicit Production runtime/database labels and a distinct exact
match to the configured Ask Magic Mike Production Neon endpoint. Preview,
public/browser database roles, and the legacy service role have no mutation
authority. The ingress has no provider client and cannot launch a campaign,
change a budget, create a lead, or send a message.

### Valuation (`src/lib/valuation/`)

Provider abstraction. Mock provider returns deterministic estimates based on zip code prefix. Real providers (ATTOM, HouseCanary) are stubs.

Every report stores the disclaimer text verbatim alongside the estimate. The `disclaimer_version` field ties the record to the exact text shown.

## Database Schema Summary

13 migration files (00001 → 00013). Tables by category:

### Core funnel (migrations 00001–00009)

| Table | Purpose |
|-------|---------|
| `sessions` | One per page visit; captures attribution before any lead data |
| `leads` | One per session; the core lead record |
| `lead_scores` | One per lead; deterministic score with full factor log |
| `agents` | Agent roster with availability and load tracking |
| `lead_routing` | Agent assignment with SLA deadline columns |
| `properties` | Property records linked to leads |
| `valuation_reports` | AVM estimates with comps and disclaimer |
| `analytics_events` | Every named event; append-only |
| `crm_sync_log` | Every CRM operation attempt; append-only audit trail |

### Schema v2 — broker ops + compliance (migration 00011)

| Table | Purpose |
|-------|---------|
| `contacts` | Deduplicated contact records; one contact may have many leads |
| `source_attribution` | Detailed UTM + referrer attribution per lead |
| `consents` | Immutable consent records; one row per consent event |
| `messages` | Outbound SMS and email records with delivery status |
| `agent_assignments` | Full assignment history (agent, reason, timestamps) |
| `compliance_flags` | Opt-out events (STOP/UNSUBSCRIBE) and compliance audit rows |
| `audit_logs` | Admin action audit trail — every PATCH, assign, or status change |

### Canonical platform — listings + operations (migration 00012)

| Table | Purpose |
|-------|---------|
| `tasks` | Admin-created tasks per lead with priority and due dates |
| `listings` | Active listing inventory (MLS import; broker-only) |
| `listing_photos` | Photos linked to listing rows |
| `listing_private_fields` | Confidential MLS fields; never exposed publicly |
| `flex_imports` | Raw FlexMLS import staging rows |
| `listing_matches` | Listings matched to buyer leads |
| `notifications` | In-app admin notifications |
| `marketing_templates` | Reusable copy blocks for campaigns |
| `generated_assets` | AI-generated content records (images, copy drafts) |
| `sms_templates` | Named SMS template library |
| `email_templates` | Named email template library |
| `message_deliveries` | Delivery tracking per outbound message |
| `integration_accounts` | External CRM / service account credentials (encrypted) |
| `webhook_events` | Raw inbound webhook payloads (Twilio, Resend, etc.) |
| `saved_views` | Admin-saved filter presets |
| `campaigns` | Campaign definitions |
| `campaign_events` | Campaign event log |

## Key Design Decisions

**Pseudonymous funnel identity first; canonical session on durable capture.**
Public funnel events may carry the existing random submission UUID in protected
analytics context, but analytics never insert `sessions`. The atomic lead
lifecycle creates the canonical session and lead together so an early event
cannot occupy the session key or block capture.

**Scoring is deterministic.** No AI in the scoring path. The `scorer_version` field allows replaying historical scores against a new algorithm without data loss.

**CRM adapter is always present.** The null adapter ensures the submit handler never branches on "is CRM configured?" — it always calls the adapter. Adding CRM is a config change, not a code change.

**Consent is immutable.** `consent_timestamp` is never updated. The `consent_language_version` ties each record to the exact text shown at consent time.

**Analytics never blocks lead storage.** Browser event recording is non-blocking
and can fail independently. A lead success state depends only on durable lead
capture; canonical conversion is written server-side afterward.

**Money in cents.** All price values (sale price, estimate) are stored as BIGINT in cents to avoid floating point rounding issues.
# Canonical Production lead pipe (refreshed 2026-08-21)

This section is the active architecture decision for the Ask Magic Mike / Our Town
Properties lead flow. Older design notes in this file remain historical unless they
conflict with this section.

## System of record

- Public application: Next.js root `app/` router in this repository, deployed as
  Vercel project `eyes-up-industries/ask-magic-mike`.
- Canonical database: Neon PostgreSQL through the server-only
  `NeonPostgresAdapter` and the reviewed atomic function
  `capture_public_lead_v2`. The Supabase/PostgREST adapter is rollback-only.
- Brokerage/SEO surface: `https://www.ourtownproperties.com` (WordPress,
  Beaver Builder, Gravity Forms, FlexMLS/IDX). It remains a presentation and
  attribution bridge, not a competing lead database.
- Private review surface: the protected AdminOps routes under `/admin`, enforced
  by server-side per-user Lead Center sessions, role permissions, and assigned-lead
  object scope.
- Outbound delivery: the existing Resend adapter and `lead_notifications` outbox.
  Internal delivery uses the configured production boundary; consumer campaigns,
  carrier SMS, and other external sends retain independent approval/consent gates.

`capture_public_lead_v2` wraps the proven v1 contact/dedupe/routing transaction
and adds the complete deterministic score, test suppression, consent ledger,
first/last-touch attribution, click IDs, placement context, source idempotency key,
and one canonical internal-email outbox row before commit. Provider delivery stays
outside the database transaction; a provider failure therefore cannot lose or
roll back the lead, while an outbox-write failure cannot leave an alertless lead.

## Durable request sequence

`public form/widget -> runtime validation and bot controls -> atomic Neon
capture -> same-record consent/attribution/score enrichment -> internal notification
outbox -> atomic first attempt / five-minute unclaimed recovery -> bounded
provider retry -> AdminOps timeline`

Provider failure never rolls back a durable lead. A public success response is only
returned after the atomic capture succeeds. Notification status is reported from
the outbox, not inferred from an HTTP 200 from the public form.

The scheduled worker may recover `pending` rows only after five minutes and
only through the existing conditional claim. It never auto-replays
`processing`; those records require provider-history reconciliation because the
external outcome may be ambiguous.

The existing atomic RPC remains the first durable write. Additive enrichment
patches the same lead/source rows and appends immutable consent evidence before
the notification service runs. Any release that changes this contract must carry
its own reviewed migration, exact approval, preflight, transaction, postflight,
and rollback evidence before promotion.

## Active route boundary

The root `app/` tree is the deployed router. The older `src/app/` tree remains in
the repository as reference and for shared server modules; route-manifest checks
explicitly acknowledge duplicate root/src files. New public routes must be added to
the root tree or wrapped there deliberately.

## Data boundary

The public app may receive a user question and attribution context. It must never
return internal notes, agent secrets, private MLS fields, provider credentials, or
database errors. AdminOps reads use server-only service-role access after the admin
boundary. Analytics receives event names and low-risk attribution only; raw contact
fields are excluded.

## Rollback

The recorded Production baseline is PR #181 merge
`5335697edf31eed0b8a38cd0295a4f5e7d501a3e`, Vercel deployment
`dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`. Application rollback re-points aliases to
the recorded prior Ready artifact. Database rollback is release-specific,
backup-first, and evidence-preserving; lead, consent, notification, response,
outcome, and audit records are never deleted merely to roll back application
code.

## Operating-intelligence outcome boundary (Phase 9)

The existing Growth command center reads `lead_outcomes`; it is not a separate
CRM. Lead Center lifecycle actions use the additive
`mutate_admin_lead_status_v2` transaction so the lifecycle projection, immutable
audit event, and one idempotent business outcome cannot drift apart.

Only evidence-bearing stages map to outcomes: qualified, appointment set, closed
won, closed lost, and disqualified. Test/suppression state is copied to the
outcome. Optional closed revenue is actual brokerage revenue and is visible or
mutable only through the existing `lead:record_revenue` permission. Application
rollback returns to v1; outcome and audit records are preserved.

## First-human-response boundary (Phase 9)

`last_contacted_at` remains the mutable operational timestamp for recent-contact
and nurture logic. It is not used as proof of first response. The server-only
`lead_response_milestones` table stores one immutable first-human-response event
per lead with actor, source, audit evidence, copied test/suppression state, the
server-resolved responding Lead Center user/agent, and the assigned-agent
snapshot captured at the response moment. Responder and assignment identifiers
are opaque evidence rather than foreign keys so a later approved user or agent
removal cannot rewrite or block retention of the milestone. Lead-level approved
deletion still cascades through the canonical lead relationship.

Lifecycle v3 wraps the complete v2 lifecycle/outcome transaction and records the
milestone only for the explicit `contacted` action. The protected Lead Center
also exposes an authorized, confirmation-gated “record now” action for actual
human follow-up after a lead has advanced. Neither path sends a consumer message.

Growth reporting derives P50/P75/P90 elapsed minutes from canonical lead
creation to the milestone, excludes test/suppressed leads and milestones, and
segments performance by source/campaign, lead type, and response owner.
Response-owner attribution prefers the resolved responder, then the immutable
response-time assignment snapshot, and never joins the lead's current assignee
for historical credit. Unattributed evidence stays explicit, and every segment
shows sample size/maturity before an operator treats it as directional or
operational. Application rollback returns to v2; milestone and audit evidence
is preserved.

## Privacy-minimized organic-search ingress boundary (Phase 9)

The Growth Command Center reuses `market_signals` and `market_opportunities` as
the only organic-demand read model. The protected Search Console workbench does
not add a provider connection or a parallel analytics store. It accepts one
operator-reviewed owned-page report, validates it without writing, and sends
only normalized page metrics and deterministic evidence to the owner-only
`import_organic_search_batch_v1` transaction after a separate gate.

Raw CSV, Search Console query text, credentials, and provider payloads are never
durable inputs. Only approved Ask Magic Mike and Our Town page hosts pass.
Signal, confidence, opportunity category, and score factors are deterministic;
AI neither scores nor publishes. Import receipts and audits are immutable,
exact replays are idempotent, and existing operator status/action class is
preserved. `GROWTH_SEARCH_IMPORT_ENABLED=false` keeps deployments inert by
default, while exact Neon endpoint attestation prevents Preview or cross-project
mutation.

## Atomic provider-email lifecycle boundary (Phase 9)

Resend remains the authenticated internal-email provider and the canonical
Neon outbox remains the delivery authority. The signed provider callback now
executes receipt claim, notification lifecycle update, communication-event
append, and eligible email suppression as a single parameterized PostgreSQL
statement. An exact replay cannot repeat those effects, and an interrupted
statement cannot strand a completed receipt ahead of missing downstream state.

The callback is provider-authenticated rather than browser-Origin authorized.
It therefore requires the existing Svix signature over the exact bounded raw
body, an exact configured event allowlist, and a valid provider message ID.
Preview is read-only. Raw payloads and recipient addresses are not retained in
the provider receipt. This changes no schema, send adapter, retry worker,
assignment rule, consent rule, or Lead Center read model.

## Atomic SMS status lifecycle boundary (Phase 9)

The existing Twilio status endpoint remains the only carrier-status ingress.
It verifies Twilio's signature over the canonical callback URL and all bounded
form fields, then writes one deterministic provider receipt, one monotonic
notification projection, and one communication event in a single PostgreSQL
statement. Preview refuses before body processing or persistence.

Because Twilio does not provide a unique status-event ID and does not guarantee
callback arrival order, the receipt key is Message SID + normalized status and
the projection uses a deterministic evidence rank. Exact replay does nothing;
weaker late states cannot regress stronger evidence; confirmed delivery may
correct an earlier failure. This changes no sender, recipient, retry worker,
lead routing, database schema, or public phone identity.
