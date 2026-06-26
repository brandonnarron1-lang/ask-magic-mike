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
| **Today's Operations** (if Supabase connected) | Follow-ups overdue + never-contacted assigned leads |
| Source breakdown | Lead counts by UTM source |
| Command Centers nav | Links to all 5 specialized command centers |
| Recent Leads table | Click any row to open the lead detail page |

**Attention Required** appears when at least one lead is urgent (score ≥80, timeline ≤3 months) or SLA-breached. Click any lead row to go directly to the detail page. "All clear" shown when none qualify.

**Today's Operations** appears when at least one of these conditions is true:
- **Follow-ups Due** — leads where `next_follow_up_at` is in the past; click tile to go to filtered inbox
- **Never Contacted** — leads with status `assigned`, no `last_contacted_at`, created more than 2 hours ago

---

## Lead Detail (`/admin/leads/[id]`)

Shows full lead information:

- **Temperature badge** — color-coded: ruby (urgent), gold (hot), amber (warm), slate (nurture/low)
- **Next Best Action** — recommended follow-up action based on score + temperature + timeline
- **Attribution** — referrer type, UTM source/medium/campaign, landing page
- **Consent flags** — SMS, call, email consent recorded at intake
- **Profile card** — includes `Last Contacted` (timestamp or "Never") and `Next Follow-up` (timestamp or "Not set")
- **Follow-up Date** action card — set or clear `next_follow_up_at` using the datetime picker; cleared via the "Clear" button; revalidates the dashboard and this page on save

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

---

## Daily Launch Monitoring

### Morning checklist (run before 9 AM local time)

| Step | URL / command | Expected |
|---|---|---|
| 1. SLA breach | `/admin/leads?filter=sla_breach` | 0 results by 9 AM |
| 2. Never contacted | `/admin/leads?filter=never_contacted` | 0 results by 10 AM |
| 3. Follow-up due | `/admin/leads?filter=follow_up_due` | Work through before noon |
| 4. Urgent queue | `/admin/leads?filter=urgent` | All A+/A leads have `last_contacted_at` set |
| 5. Health check | `GET /api/admin/health` with `x-admin-secret` | `ok: true, database.reachable: true, live_sms_disabled: true` |

### Quick filter chips reference

The leads inbox now shows five quick filter chips at the top:

| Chip | URL param | Shows |
|---|---|---|
| All leads | `?` (no filter) | Full inbox |
| Urgent (A+/A) | `?filter=urgent` | Grade A+ or A leads |
| SLA breach | `?filter=sla_breach` | A+/A leads, never contacted, 5+ min old |
| Follow-up due | `?filter=follow_up_due` | Past-due `next_follow_up_at` |
| Never contacted | `?filter=never_contacted` | Assigned leads, no contact, 2+ hr old |

### "Last contact" column

The leads inbox now shows a **Last contact** column. Values:
- `just now` — contacted < 1 minute ago
- `15m ago` — contacted N minutes ago
- `3h ago` — contacted N hours ago
- `2d ago` — contacted N days ago
- `never` *(italic, muted)* — `last_contacted_at` is null

### Post-deploy smoke test

Run immediately after any production deploy:
```bash
TARGET_URL=https://www.askmagicmike.com pnpm run amm:smoke:prod
```

To verify the session-create write path (smoke session only — **not a real lead**):
```bash
TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs --write
```

All checks should pass. Security header checks (`hsts`, `noSniff`, etc.) report `warn` until Delta headers are confirmed live. After confirming, promote those checks to `fail` in `scripts/prod-smoke.mjs`.

### Before deploying

Always verify what is currently live before pushing:
```bash
node scripts/amm/verify-production-alias.mjs
```

This confirms the live commit at `www.askmagicmike.com` and prevents unattributed production changes.

### Escalation path

| Severity | Condition | Action |
|---|---|---|
| P0 | `database.reachable: false` | Page Brandon immediately. Do not take other actions. |
| P0 | `live_sms_disabled: false` in prod | Page Brandon + Mike. Stop all campaigns. |
| P1 | A+/A lead unreachable after 30 min | Escalate to Mike; log in lead notes. |
| P2 | `overdueSla > 3` at morning check | Work SLA queue before any other admin task. |
| P3 | Smoke test fail on any check | Investigate before the next deploy. |
