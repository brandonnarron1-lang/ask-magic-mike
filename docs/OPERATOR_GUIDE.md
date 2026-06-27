# Operator Guide — Ask Magic Mike
**Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase

This guide covers daily operation of the Ask Magic Mike platform for brokers and administrators.

---

## Platform Overview

Ask Magic Mike is a brokerage lead intelligence and operations platform. It:
- Captures leads from ourtownproperties.com via embedded widget and landing pages
- Scores, grades, and routes leads to agents automatically
- Monitors SLA compliance and escalates urgent leads
- Provides brokerage intelligence (predictions, opportunities, seller/buyer signals)
- Tracks conversation, attribution, and revenue pipeline

**What it does NOT do automatically:**
- Send outbound messages without explicit human trigger
- Publish content without human approval
- Modify or delete lead records without operator action
- Access or expose MLS-confidential data publicly

---

## The Command Center (`/admin`)

The Command Center is the broker's daily starting point. It shows:

| Section | What It Shows |
|---------|---------------|
| Lead Intelligence | Total leads, urgent count, hot leads, SLA breaches |
| Funnel Health | New today, contacted, appointment requests, unassigned |
| Action Required | All urgent and SLA-breached leads — click to open |
| Today's Operations | Follow-ups due, never-contacted leads |
| Source Attribution | UTM breakdown — where leads are coming from |
| Intelligence Pulse | Pipeline value, appointments (7d), SLA compliance, active campaigns |
| Command Centers | Links to all 11 platform sections |
| Recent Leads | Full lead table with inline expand |

**Daily habit:** Open Command Center each morning. Work the Action Required strip first, then Today's Operations.

---

## Lead Flow

```
Visitor submits /ask or /embed/ask
         ↓
Session created → Lead created in Supabase
         ↓
Lead scored (A+/A/B/C) + SLA clock starts
         ↓
Agent assignment (routing rules apply)
         ↓
Agent notified → Agent contacts lead
         ↓
Contact logged → SLA satisfied
         ↓
Appointment / follow-up / status updates
         ↓
Intelligence brain tracks and updates signals
```

---

## Lead Grades

| Grade | Meaning | SLA |
|-------|---------|-----|
| A+ | Highest intent — call immediately | 5 minutes |
| A | High intent — call same day | 60 minutes |
| B | Medium intent — follow up within 24h | 24 hours |
| C | Low intent / nurture | No hard SLA |

**SLA breach:** A lead is "breached" when it has not been contacted within its SLA window. Breached leads appear in the Action Required strip and glow ruby on the dashboard.

---

## Intelligence Brain (`/admin/intelligence`)

The Intelligence Brain processes brokerage signals into actionable insights.

### Sub-sections:

**Predictions** — AI-generated predictions about likely outcomes (listings, closings, SLA breaches, stale leads). Ordered by urgency.

**Opportunities** — Ranked opportunities for revenue growth (highest ROI, fastest win, largest pipeline). Each opportunity includes estimated value, effort, and confidence.

**Properties** — Interest scores for every property that has received inquiry activity. Shows which properties are hot vs. cold.

**Sellers** — Readiness scores for every lead with seller signals. Higher score = more likely to list soon.

**Buyers** — Purchase probability scores for buyer leads. Includes time horizon distribution (immediate / 0-30d / 30-90d / etc).

**Relationships** — Knowledge graph showing connections between leads, agents, campaigns, properties, and conversations.

**Memory** — Immutable timeline of all significant events in the brokerage system. Read-only. Never writes to `analytics_events`.

---

## Listings OS (`/admin/listings`)

Shows seller leads, listing inquiries, neighborhood heat, and property import status.

**To import listings from FlexMLS:**
1. Export a standard CSV from FlexMLS (MLS#, Address, Price, Status, Beds, Baths, SqFt)
2. POST to `/api/admin/listings/import` with `Authorization: Bearer {ADMIN_SECRET}` and `Content-Type: multipart/form-data`, field name: `file`
3. Intelligence engine begins matching buyer leads to imported properties automatically

---

## Document Engine (`/admin/documents`)

Generates professionally structured documents from live lead data. Available templates:

| Document | For |
|----------|-----|
| CMA Packet | Seller consultation — comps, pricing, net proceeds |
| Listing Presentation | Seller appointment — marketing plan, value proposition |
| Marketing Packet | Pre-listing — photography brief, MLS description, social posts |
| Open House Packet | Open house materials — sign-in, talking points, follow-up |
| Buyer Consultation | First buyer meeting — needs assessment, expectations |
| Appointment Prep | Pre-appointment agent brief from lead intelligence |
| Closing Checklist | Transaction management — all tasks from contract to keys |
| Seller Roadmap | Step-by-step seller journey (Wilson, NC market) |
| Buyer Roadmap | Step-by-step buyer journey (Wilson, NC market) |

**To use:** Open a lead from Leads Inbox → select a document template → system pre-populates with lead data.

---

## Agent Routing (`/admin/routing`)

The routing system assigns leads to agents based on:
- Agent capacity (max concurrent leads)
- Lead type (seller vs. buyer)
- Territory / specialty (if configured)
- Round-robin fallback when all agents at capacity

**Manual override:** Admins can manually reassign any lead from the lead detail page.

---

## Revenue Command Center (`/admin/revenue`)

Shows pipeline value, estimated commissions, predicted closings, and revenue alerts. The Revenue Sentinel fires alerts when:
- A hot lead goes cold (temperature drops from A+ to B or lower)
- A high-value lead hits SLA breach
- Predicted closings in 30-day window change significantly

---

## Automation (`/admin/automation`)

Automation workflows handle:
- SLA sweep (every 5 minutes via Vercel cron)
- Follow-up reminders for agents
- Lead re-routing when agent unresponsive
- Conversation depth analysis triggers

**Automation does NOT:** Send messages automatically. All outbound communication requires explicit human action from an agent.

---

## Traffic (`/admin/traffic`)

Shows UTM source breakdown, referrer classification, session data, and campaign performance. Use this to measure which paid channels produce the highest-quality leads.

---

## Distribution (`/admin/distribution`)

Multi-channel content distribution queue. Controls social post scheduling, marketing asset distribution, and campaign activation. All content requires broker approval before publication.

---

## Analytics (`/admin/analytics`)

- **Reports:** Custom period-over-period reports
- **Campaigns:** Performance by UTM campaign
- **Conversations:** Widget conversation depth and completion rates
- **Sources:** Full UTM source breakdown

---

## Security & Access

- Admin portal requires `ADMIN_SECRET` in `Authorization: Bearer` header
- Agent portal requires `AGENT_SECRET` + agent-specific authentication
- Never share credentials in Slack or email
- Rotate `ADMIN_SECRET` via Vercel environment variables (30-day cycle minimum)
- After rotation, update `scripts/amm/verify-production-alias.mjs` reference

---

## Common Tasks

**Check if the platform is healthy:**
```
pnpm run amm:launch:doctor
```

**Verify production alias hasn't drifted:**
```
node scripts/amm/verify-production-alias.mjs
```

**Trigger SLA sweep manually:**
```
curl -X POST https://askmagicmike.com/api/admin/sla/sweep \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

**Import listings from CSV:**
```
curl -X POST https://askmagicmike.com/api/admin/listings/import \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -F "file=@listings-export.csv"
```
