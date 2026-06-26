# Admin Operations Guide

**Audience:** Mike Eatmon and authorized Our Town Properties team members  
**Environment:** [askmagicmike.com/admin](https://askmagicmike.com/admin) (Basic Auth required)

---

## Accessing the Admin Dashboard

Navigate to `https://askmagicmike.com/admin` in a browser. Enter the admin credentials when prompted. All admin routes require Basic Auth — do not share credentials.

---

## Dashboard Overview (`/admin`)

The main dashboard shows:

| Panel | What it tells you |
|---|---|
| Stat tiles (top row) | Total leads, urgent count, hot count, SLA-breached count |
| Attention Required | Named leads that are urgent or SLA-breached, with direct links |
| Funnel tiles (if Supabase connected) | New today, contacted, appointments requested, unassigned |
| Source breakdown | Lead counts by UTM source |
| Command Centers nav | Links to all specialized command centers |
| Recent Leads table | Click any row to open the lead detail page |

**Attention Required** appears when at least one lead is urgent (score ≥80, timeline ≤3 months) or SLA-breached. Click any lead row to go directly to the detail page. "All clear" shown when none qualify.

---

## Lead Detail (`/admin/leads/[id]`)

Shows full lead information:

- **Temperature badge** — color-coded: ruby (urgent), gold (hot), amber (warm), slate (nurture/low)
- **Next Best Action** — recommended follow-up action based on score + temperature + timeline
- **Attribution** — referrer type, UTM source/medium/campaign, landing page
- **Consent flags** — SMS, call, email consent recorded at intake

---

## Leads Inbox (`/admin/leads`)

Filter by: temperature, lead type, status, grade, source, city, unassigned only, spam suspect.  
Sort by: newest, oldest, highest score, SLA breached.

Use **Unassigned Only** filter to find leads that were not routed to an agent.

---

## Agent Routing (`/admin/routing`)

Shows the real-time state of the agent assignment system.

- **Agent Roster** — all agents with role (Primary/Backup/Admin), active status, daily load bar, priority score
- **SLA Windows** — Accept: 2 min from assignment · Contact: 5 min from assignment
- **SLA Breach Alert** — shown in ruby when any routing row has missed its window
- **Recent Routing Decisions** — last 50 assignments, linked to lead detail pages
- **Unassigned Leads** — count of leads without a routing row, with link to filtered inbox

The routing engine runs automatically on lead submission. Agents are selected by priority score and availability. If no agent is available, the Admin Escalation agent is assigned.

---

## Revenue Sentinel (`/admin/revenue`)

Pipeline summary with conversion rates at each funnel stage. SLA alert thresholds shown in amber/ruby.

---

## Traffic (`/admin/traffic`)

UTM source attribution, session counts, and referrer breakdowns.

---

## Distribution (`/admin/distribution`)

Content scheduling queue and platform plan. Read-only visibility into the distribution pipeline.

---

## SLA Response Protocol

When the Attention Required panel or routing SLA breach alert is active:

1. Click the lead name to open the detail page
2. Review the Next Best Action recommendation
3. Contact the lead via the method they consented to (phone/SMS/email)
4. Update lead status in Supabase directly or through the admin interface

**SLA windows are tight by design.** The 5-minute contact window is industry best practice for warm inbound leads. Response speed is the #1 driver of lead conversion.

---

## Data Integrity Rules

- Admin pages never show mock data in production. If Supabase is not connected, pages show a locked state.
- Lead data is never mutated from the admin UI — all writes go through Supabase directly or via authenticated API routes.
- Attribution data (UTM, referrer) is recorded at intake and is immutable.
- Consent flags are set by the user at intake. Do not contact a lead via a channel they did not consent to.

---

## Troubleshooting

**Admin page shows "Admin Unavailable"**  
Supabase environment variables are not set. Contact the developer to verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project settings.

**Lead count is 0 but leads were submitted**  
Check the Supabase `leads` table directly. If the `leads` table is missing, run migration `00012` (see `docs/PRODUCTION_RELEASE_LOG.md` for migration history).

**Routing page shows no agents**  
The `agents` table may be empty. Seed data is in `supabase/migrations/00010_seed_agents.sql`. Run the migration in Supabase or insert Mike Eatmon's record manually.

**SLA breach count is stuck**  
SLA breaches clear when `accepted_at` or `contacted_at` is set on the `lead_routing` row. Update these fields in Supabase to acknowledge contact.
