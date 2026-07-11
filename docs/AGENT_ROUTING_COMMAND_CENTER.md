# Agent Routing Command Center

**Route:** `/admin/routing`  
**Auth:** Basic Auth (same as all admin routes)  
**Data freshness:** `force-dynamic`, `revalidate: 0` — live on every request

---

## Purpose

The Agent Routing Command Center gives Mike Eatmon a real-time view of lead assignments: which agents are active, how loaded they are, which leads are waiting, and whether any SLA windows have been missed.

It is read-only. No mutations happen from this page.

---

## Schema Dependencies

| Table | Read columns |
|---|---|
| `agents` | id, name, email, role, is_active, current_load, max_daily_leads, priority_score, timezone, notification_email, notification_sms |
| `lead_routing` | id, lead_id, agent_id, assigned_at, accept_deadline, contact_deadline, accepted_at, contacted_at, status, assignment_reason |
| `leads` | first_name, last_name, temperature (joined via lead_routing) |

The `accept_deadline` and `contact_deadline` columns are maintained by the database from `assigned_at`: `assigned_at + INTERVAL '2 minutes'` and `assigned_at + INTERVAL '5 minutes'` respectively (see `supabase/migrations/00005_routing.sql`).

---

## Data Layer

**`src/lib/admin/routing-command.ts`** — `loadRoutingCommand(): Promise<RoutingCommandData>`

- Returns `{ configured: false, ... }` if Supabase env vars are absent — page shows a locked state, never mock data.
- Queries `agents` ordered by `priority_score DESC`.
- Joins `lead_routing` → `agents` + `leads` (last 50 rows), ordered by `assigned_at DESC`.
- Computes SLA breach flags client-side from deadline timestamps vs. `Date.now()`.
- Counts unassigned leads as `total leads − assigned routing rows` (approximate; routing rows capped at 50).

---

## UI Sections

### Top-Line Tiles
Four stat tiles: Active Agents, Unassigned Leads, Pending Accept, SLA Breaches.  
Colors: emerald for active, amber for unassigned/pending, ruby for breaches, cream when count is zero.

### SLA Breach Alert
Shown only when `slaBreachCount > 0`. Dismissible by resolving the underlying routing rows.

### Agent Roster
Cards for each agent: name, email, role badge (Primary / Backup / Admin), active/inactive status, daily load progress bar (emerald → amber → ruby as load increases), priority score, timezone.

Inactive agents are shown below active agents at reduced opacity.

### Routing Rules
Static explanation panel: accept window (2 min), contact window (5 min), escalation target (Admin Role). Sourced from `lead_routing` migration constraints — not editable from the UI.

### Recent Routing Decisions
Scrollable table of the last 50 routing assignments: lead name (linked to `/admin/leads/[id]`), agent, status badge, time since assignment, assignment reason.

SLA-breached rows show a ruby "SLA Breach" badge regardless of status.

### Unassigned Alert
Footer alert when `unassignedLeadCount > 0`. Links to `/admin/leads?unassigned_only=true`.

---

## Routing Logic Reference

Assignment runs via `assignAgent()` in `src/lib/routing/assign-agent.ts`. The function is pure and called from the lead submission API route. It selects the highest-`priority_score` active agent whose `current_load < max_daily_leads` and whose `availability` JSONB covers the current day/hour.

Seed agents (from `supabase/migrations/00010_seed_agents.sql`):

| Agent | Role | Priority | Max Daily |
|---|---|---|---|
| Mike Eatmon | primary | 100 | 50 |
| Admin Escalation | admin | 0 | 999 |

---

## Tests

**`tests/admin/routing-command.test.ts`**  
- Unconfigured environment returns EMPTY shape (no Supabase required)  
- RoutingCommandData interface shape validation  
- SLA breach detection (8 cases)  
- Load percentage clamping and division-by-zero guard
