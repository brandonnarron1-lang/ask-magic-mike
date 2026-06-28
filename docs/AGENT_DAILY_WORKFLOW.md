# Agent Daily Workflow — Ask Magic Mike
**Our Town Properties, Inc. · Wilson, NC**
**Version:** Omega Launch Phase

This guide covers the daily workflow for real estate agents using the Ask Magic Mike agent portal.

---

## Your Agent Portal (`/agent`)

Your portal shows only your assigned leads — you cannot see other agents' leads.

**Sections:**
- **Dashboard** — summary of your pipeline, today's tasks, performance snapshot
- **Leads** — your assigned leads with filter and search
- **Tasks** — your pending action items with due dates
- **Performance** — your SLA compliance, response times, conversion rates

---

## Morning Routine (First Thing)

### 1. Check Your Lead Inbox (`/agent/leads`)
Sorted by urgency. Leads marked **urgent** or **SLA breached** are your first priority.

**For each urgent lead:**
- Read their question and intent
- Call or text immediately (within your SLA window)
- After contact, log it via the "Log Contact" action on the lead

### 2. Review Today's Tasks (`/agent/tasks`)
- Follow-ups scheduled for today
- Appointment confirmations needed
- Pending note or status updates

### 3. Check Never-Contacted Leads
If you have any lead assigned > 2 hours with no contact logged, address these before new leads come in.

---

## SLA Standards

| Lead Grade | Your SLA | Consequence of Breach |
|-----------|----------|----------------------|
| A+ | 5 minutes | Visible to broker immediately |
| A | 60 minutes | Flagged in daily review |
| B | 24 hours | Flagged in weekly review |
| C | 72 hours | Soft target |

**Important:** SLA is measured from the moment the lead is assigned to you. The clock starts automatically. Log your first contact immediately after you reach out — even a text counts.

---

## Logging Contact

After any outreach (call, text, email):
1. Open the lead at `/agent/leads/[id]`
2. Click "Log Contact"
3. Select contact method (Call / Text / Email)
4. Add brief notes: what did they say? Next step?
5. Set follow-up date if needed
6. Save

This stops the SLA clock and gives the broker visibility into your activity.

---

## Handling Different Lead Types

### Seller Leads (intent: sell, list, cash offer)
1. Ask about their timeline — are they 0–3 months, 3–6 months, or exploring?
2. Ask about their property — address, condition, reason for selling
3. Offer: free home valuation consultation with Mike Eatmon
4. Goal: book a listing appointment
5. After call: update status to `appointment_requested` if they agreed to meet

### Buyer Leads (intent: buy, search)
1. Confirm budget range and pre-approval status
2. Ask about neighborhoods, school needs, timeline
3. Offer: free buyer consultation — share available properties
4. Goal: book a buyer consultation or property showing
5. After call: update status to `contacted` or `appointment_requested`

### Valuation Leads
1. These are seller leads who asked for an estimate
2. Do NOT give a number on the phone — schedule the consultation
3. The broker (Mike) delivers the CMA in person
4. Your job: qualify timeline and motivation, then hand off to Mike for listing appointment

---

## Using Appointment Prep Documents

Before any appointment, generate the Appointment Prep document:
1. Go to `/admin/documents` (requires admin access granted by broker)
2. Find the lead's name and select "Appointment Prep"
3. The system generates: lead summary, conversation history, intelligence signals, recommended talking points

This brief takes 2 minutes to review and significantly improves appointment outcomes.

---

## Status Updates

Keep lead statuses current — the broker monitors this daily.

| Status | When to Set |
|--------|------------|
| `new` | Default on assignment |
| `contacted` | After first successful contact |
| `appointment_requested` | Lead agreed to meet |
| `appointment_set` | Appointment confirmed with date/time |
| `nurture` | Lead interested but not ready (3–12 months) |
| `dead` | Explicitly not interested or unqualified |
| `converted` | Signed listing agreement or buyer agreement |

---

## Performance Targets

Your performance is tracked and visible to the broker.

| Metric | Target |
|--------|--------|
| A+ Response Time | < 5 minutes average |
| A Response Time | < 60 minutes average |
| SLA Compliance | ≥ 90% overall |
| Follow-up On Time | > 80% |
| Appointment Rate | > 20% of contacted leads |

---

## What to Do When You Can't Reach a Lead

After 3 attempts (call, text, email) with no response:
1. Set a follow-up for 3 days out
2. Add a note: "3 attempts, no response. Following up [date]."
3. Change status to `nurture` if they're low-grade or `contacted` if high-grade

After 3 follow-up cycles with no response:
1. Set status to `dead` with a note explaining the attempts
2. The system may automatically trigger a re-engagement campaign

---

## Dos and Don'ts

**Do:**
- Log every contact immediately after outreach
- Set a follow-up date every time you update a lead
- Read the lead's original question before calling — they told Mike exactly what they want
- Keep notes professional and factual

**Don't:**
- Share lead information with parties outside Our Town Properties
- Use the lead's contact info for personal marketing
- Log a contact you didn't actually make (broker reviews logs)
- Leave A+ leads waiting more than 5 minutes
