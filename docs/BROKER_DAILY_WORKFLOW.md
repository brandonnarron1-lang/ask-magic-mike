# Broker Daily Workflow — Ask Magic Mike
**Mike Eatmon · Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase

---

## Morning Brief (9:00 AM — 15 minutes)

### Step 1: Open the Command Center
Navigate to `/admin`. Today's date and live metrics load automatically.

**Look at in order:**
1. **Action Required strip** — any ruby/urgent items demand immediate attention before anything else
2. **Lead Intelligence grid** — how does today's volume compare to recent days?
3. **Funnel Health** — new leads today, unassigned count
4. **Today's Operations** — follow-ups due today, never-contacted leads

### Step 2: Clear the Action Required Strip
For each urgent or SLA-breached lead:
- Click the lead row
- Review their question and score
- Decide: assign to agent, handle personally, or mark as handled
- **Target:** Action Required strip empty by 10:00 AM

### Step 3: Check Intelligence Pulse
Review the 4-metric Intelligence Pulse strip:
- **Pipeline Value** — is it trending up?
- **Appointments (7d)** — is appointment cadence healthy?
- **SLA Compliance** — target ≥ 90%; below 80% = agent coaching needed
- **Active Campaigns** — marketing actively generating leads?

---

## Mid-Day Check-In (12:00 PM — 10 minutes)

1. Re-open `/admin` — new leads since morning?
2. Check **Today's Operations** — follow-ups still pending?
3. Open `/admin/routing` — any leads sitting unassigned > 30 minutes?
4. Spot-check 2–3 A+ leads from today — contacted by agent? Notes logged?

---

## Afternoon Intelligence Review (3:00 PM — 20 minutes, 2–3x per week)

### Seller Intelligence (`/admin/intelligence/sellers`)
- Any leads with readiness score ≥ 65? These are your hottest potential listings.
- Read the reasoning section — what signals are driving the score?
- Action: personal call or appointment invitation to top 3 seller leads

### Predictions (`/admin/intelligence/predictions`)
- Review critical + high urgency predictions
- Pay attention to: `likely_listing`, `likely_closing`, `sla_breach`, `stale_lead`
- Act on stale leads — assign to re-engagement campaign or reassign agent

### Opportunities (`/admin/intelligence/opportunities`)
- Top 1–2 opportunities: what's the fastest win this week?
- Review risks section — any compliance or pipeline risks?

---

## Weekly Reviews (Friday — 30 minutes)

### Revenue Review (`/admin/revenue`)
- Pipeline value vs. last week
- Predicted closings in 30-day window — realistic?
- Revenue sentinel alerts — anything flagged?

### Campaign Performance (`/admin/analytics/campaigns`)
- Which UTM sources produced the most A+/A leads?
- Cost-per-lead by channel (if tracking spend externally)
- Top-performing campaigns → increase budget allocation

### Agent Performance (`/admin/routing`)
- Which agents have highest SLA compliance?
- Which agents have most overdue follow-ups?
- Coaching needed? Use the appointment prep documents for training sessions.

### Marketing Distribution (`/admin/distribution`)
- Content queued for next week?
- Pending approvals — approve or revise
- Social media performance from prior week

---

## Monthly Intelligence Review (1st of Month — 1 hour)

1. **Memory Layer** (`/admin/intelligence/memory`) — review brokerage memory strength and milestone narrative
2. **Knowledge Graph** (`/admin/intelligence/relationships`) — how interconnected is your lead ecosystem?
3. **Buyer Pipeline** (`/admin/intelligence/buyers`) — time horizon distribution trends
4. **Property Intelligence** (`/admin/intelligence/properties`) — which properties are getting the most digital attention?
5. **Document Generation** — create monthly CMA packets for your top 5 seller prospects
6. Update agent routing rules if territory or capacity has changed

---

## Listing Appointment Checklist

When preparing for a listing appointment:
1. Open the lead from `/admin/leads/[id]`
2. Generate **Appointment Prep** document (from `/admin/documents`)
3. Generate **CMA Packet** for the property
4. Generate **Listing Presentation** if full presentation needed
5. Print or email documents to yourself before appointment
6. After appointment: log outcome in lead notes, update status, schedule follow-up

---

## Key Metrics to Watch (Weekly Targets)

| Metric | Target |
|--------|--------|
| SLA Compliance Rate | ≥ 90% |
| A+ Lead Response Time | < 5 minutes |
| Appointment Acceptance Rate | > 65% |
| Follow-ups Completed on Time | > 80% |
| Never-Contacted Leads (48h) | 0 |
| New Leads Per Week | Based on spend / organic traffic |
| Seller Pipeline Value | Growing trend |

---

## Escalation Triggers

These conditions require immediate broker intervention:
- SLA compliance < 75% for any 24-hour period
- Agent not responding to assigned leads > 4 hours
- Any A+ lead not contacted within 30 minutes
- System error preventing lead capture (check Vercel logs)
- Duplicate lead detection triggering > 5 per day (may indicate form loop)
