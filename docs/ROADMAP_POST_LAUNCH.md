# Post-Launch Roadmap — Ask Magic Mike
**Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase
**Horizon:** 12 months post-launch

---

## Roadmap Philosophy

This roadmap prioritizes revenue impact, operational leverage, and broker time savings. Features are not added for completeness — they are added because they improve lead conversion, agent productivity, or broker intelligence.

**Priority framework:**
- **P1 (Revenue Critical):** Directly increases close rate or lead volume
- **P2 (Operational):** Saves broker/agent time significantly
- **P3 (Intelligence):** Improves decision quality
- **P4 (Infrastructure):** Platform health and scalability

---

## Phase 16 — Listing Intelligence (Q3 2026)

**Goal:** Close the gap between lead inquiry and active listing inventory.

### Features
- **FlexMLS RESO API integration** — automatic nightly listing sync (replaces CSV import)
- **Property performance dashboard** — days on market, showings, price reductions, expiration tracking
- **Buyer-listing recommendation engine** — match buyer leads to active listings based on signals
- **Listing-to-lead attribution** — which listings drive the most inquiry volume?
- **Expired listing alert** — flag leads who inquired about a property that is now expired/withdrawn

**Success metric:** 30% increase in listing-inquiries-to-appointment rate.

---

## Phase 17 — Communication Layer (Q3 2026)

**Goal:** Enable authorized outbound communication directly from the platform.

### Features
- **Transactional email via Resend** — agent notifications, lead confirmation emails, appointment reminders
- **Email template library** — pre-built, broker-approved templates for common scenarios
- **SMS drip opt-in** — for leads who explicitly opt in at submission, broker-approved sequences only
- **Communication audit log** — every message sent is logged with timestamp, sender, recipient, content

**Safety guardrails:**
- No automated message sends without broker pre-approval of each sequence
- All templates reviewed by Mike Eatmon before activation
- TCPA opt-in stored with every outbound SMS consent

**Success metric:** Agent follow-up rate increases from current baseline to > 95% within SLA window.

---

## Phase 18 — Document Generation Engine v2 (Q4 2026)

**Goal:** Generate production-ready, print-ready documents from the platform.

### Features
- **PDF generation** — branded PDF output for all document templates (CMA, listing presentation, roadmaps)
- **Our Town Properties branding** — logo, colors, typography in every generated document
- **E-signature ready** — documents structured for easy upload to DocuSign / authentisign
- **Document history** — track which documents were generated for which leads
- **Batch generation** — generate appointment prep documents for all appointments in a given week

**Success metric:** Broker time spent on document prep reduced by 60%.

---

## Phase 19 — Real-Time Operations (Q4 2026)

**Goal:** Eliminate polling delays and bring the platform closer to real-time.

### Features
- **Real-time agent notifications** — WebSocket push when a new lead is assigned
- **Live SLA countdown** — visual countdown timer on A+ leads in the agent portal
- **Broker alert system** — push notification to broker when a critical event occurs (agent unresponsive, A+ lead breached)
- **Live lead feed** — watch new leads appear on the Command Center without refresh

**Success metric:** A+ lead response time average decreases from current baseline to < 3 minutes.

---

## Phase 20 — Automated Follow-Up Sequences (Q1 2027)

**Goal:** Enable systematic nurture of B/C leads without manual effort.

### Features
- **Broker-approved sequence library** — pre-written 5-touch sequences for seller, buyer, and valuation leads
- **Opt-in gate** — sequences only activate for leads who explicitly opt in at submission
- **Pause/stop controls** — agent or broker can pause/stop any active sequence instantly
- **Sequence performance tracking** — open rates, click-throughs, re-activation rates
- **TCPA compliance dashboard** — monitor consent status and sequence activity

**Safety note:** This phase requires TCPA legal review before activation.

**Success metric:** B lead conversion rate increases 15% vs. manual-only follow-up.

---

## Phase 21 — Intelligence Brain v2 (Q1 2027)

**Goal:** Make the Intelligence Brain more accurate and actionable.

### Features
- **Persistent knowledge graph** — graph stored in Supabase, evolves over time, historical comparison
- **Seller heat map** — geographic visualization of seller intent across Wilson, NC neighborhoods
- **Market timing predictor** — predict optimal listing windows based on historical closing data
- **Agent performance intelligence** — compare agent response patterns and conversion correlations
- **Lead lifetime value prediction** — estimate LTV from initial signals (referral likelihood, repeat buyer potential)

**Success metric:** Top predictions achieve > 70% accuracy at 30-day horizon.

---

## Phase 22 — Mobile Operations (Q2 2027)

**Goal:** Full-function mobile experience for agents in the field.

### Features
- **Mobile-responsive agent portal** — first-class mobile layout for all agent pages
- **Progressive Web App (PWA)** — install on home screen, offline-first for lead viewing
- **Location-aware features** — "leads near my current location" for field agents
- **One-tap contact logging** — log a call with a single tap from the lead screen

**Success metric:** Agent portal mobile usage increases from < 5% to > 40%.

---

## Phase 23 — Revenue Intelligence (Q2 2027)

**Goal:** Close-loop attribution from lead source to commission.

### Features
- **Closed deal recording** — mark deals as closed with sale price, commission, agents
- **ROI by source** — true cost-per-close by UTM source (requires spend data import)
- **Agent commission tracking** — estimated commission by agent per period
- **Revenue forecast** — predictive revenue model from current pipeline signals
- **Year-over-year comparisons** — season-adjusted performance tracking

**Success metric:** Broker can attribute $X commission to each marketing channel within 24 hours of close.

---

## Deferred Items (Not Prioritized for 12-Month Roadmap)

These are technically feasible but intentionally deferred:

| Item | Why Deferred |
|------|-------------|
| Consumer-facing property search | Not needed; listings on ourtownproperties.com via WordPress/IDX |
| AI-generated listing descriptions | Content quality risk without expert review gate |
| Automated social publishing | Requires broker approval on every post; manual is safer |
| International / multi-market | Out of scope — Wilson, NC only |
| Consumer account / portal | Not in the brokerage model; leads call/email agents |
| Blockchain transaction records | Solution without a problem |

---

## How Priorities Change

This roadmap is a living document. Priorities shift based on:
1. **Mike Eatmon's broker feedback** — his workflow pain points and wins determine sequencing
2. **Traffic and conversion data** — what the funnel numbers reveal about gaps
3. **Agent feedback** — what's slowing agents down in their daily workflow
4. **Market conditions** — Wilson, NC market dynamics affect which intelligence features matter most

Quarterly review: First Friday of each quarter, roadmap is reviewed and reprioritized based on the above signals.
