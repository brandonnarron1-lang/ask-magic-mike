# Architecture

## Data Flow

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

Fire-and-forget. Never throws. Falls back to `console.log` if Supabase is not configured.

```
trackEvent(params) → void (async, never awaited in critical path)
trackEventNoWait(params) → void (sync wrapper, swallows errors)
```

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
