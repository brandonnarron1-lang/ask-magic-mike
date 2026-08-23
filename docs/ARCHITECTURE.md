# Architecture

> Current source of truth (2026-08-21): Next.js root `app/`, Vercel project
> `eyes-up-industries/ask-magic-mike`, and Neon PostgreSQL project
> `bitter-star-20214385`. See `CURRENT_STATE_RECONCILIATION.md` and
> `OWNER_APPROVAL_QUEUE.md`. Sections below
> that describe Supabase as canonical or `/api/intake/submit` as the active
> public path are `SUPERSEDED` historical design notes retained for provenance.

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

The dependent field-experience candidate reuses this ledger for Production-only
LCP/INP/CLS. It writes no lead/session/attribution identity, converts the raw
browser metric ID to a domain-separated digest, and lets the protected Growth
read model calculate bounded, digest-deduplicated P75 evidence by mobile and
desktop. Preview renders no reporter and performs no telemetry write.

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

**Session-first.** Sessions are created on page load before any lead data exists. This captures attribution and abandonment analytics even when no form is submitted.

**Scoring is deterministic.** No AI in the scoring path. The `scorer_version` field allows replaying historical scores against a new algorithm without data loss.

**CRM adapter is always present.** The null adapter ensures the submit handler never branches on "is CRM configured?" — it always calls the adapter. Adding CRM is a config change, not a code change.

**Consent is immutable.** `consent_timestamp` is never updated. The `consent_language_version` ties each record to the exact text shown at consent time.

**Analytics never blocks.** `trackEventNoWait()` fires and forgets. Zero risk of analytics failure causing an intake failure.

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
  `capture_public_lead_v1`. The Supabase/PostgREST adapter is rollback-only.
- Brokerage/SEO surface: `https://www.ourtownproperties.com` (WordPress,
  Beaver Builder, Gravity Forms, FlexMLS/IDX). It remains a presentation and
  attribution bridge, not a competing lead database.
- Private review surface: the protected AdminOps routes under `/admin`, enforced
  by server-side per-user Lead Center sessions, role permissions, and assigned-lead
  object scope.
- Outbound delivery: the existing Resend adapter and `lead_notifications` outbox.
  Internal delivery uses the configured production boundary; consumer campaigns,
  carrier SMS, and other external sends retain independent approval/consent gates.

## Durable request sequence

`public form/widget -> runtime validation and bot controls -> atomic Neon
capture -> same-record consent/attribution/score enrichment -> internal notification
outbox -> bounded provider retry -> AdminOps timeline`

Provider failure never rolls back a durable lead. A public success response is only
returned after the atomic capture succeeds. Notification status is reported from
the outbox, not inferred from an HTTP 200 from the public form.

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
