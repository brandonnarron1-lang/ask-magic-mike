# Revenue Command Center — Daily Operating Guide

**This is read-only. It does not send email, SMS, calls, automations, or outbound messages.**

URL: `https://www.askmagicmike.com/admin/revenue`  
Access: Any username + ADMIN_SECRET — retrieve the secret from the approved password manager.

---

## Start With the Today Action Board

The **Today Action Board** is the first thing you'll see at the top of `/admin/revenue`. It tells you what needs attention right now, derived from lead urgency, routing gaps, and funnel attribution health — without you having to scroll through everything.

### Overall Status Pill

| Pill | Meaning |
|---|---|
| **All clear** (green) | No alerts. Funnel and attribution look healthy. |
| **Info** (blue) | Something worth knowing — e.g., high-intent leads arrived today. |
| **Needs attention** (amber) | One or more warnings — funnel quiet, unattributed leads, unassigned routing gap. |
| **Critical** (red) | Immediate action required — funnel may be broken or a lead has been unassigned > 24 h. |

### Summary Cards

Five cards across the top show:
- **Actions** — total items in today's action list (max 8)
- **Critical** — number of critical-severity alerts
- **Warnings** — number of warning-severity alerts
- **High Intent 24 h** — hot/urgent leads created today
- **WP Attr 24 h** — WordPress-attributed leads in the last 24 h (zero = investigate)

### Action Items

Up to 8 action items, sorted urgent → high → normal. Colored dots:
- **Red dot** = urgent (act immediately)
- **Amber dot** = high priority (act today)
- **Grey dot** = normal (act this week)

Each item shows a title, reason, and specific action to take. If a lead is linked, "View lead →" opens the lead detail.

### Alerts

Each alert shows severity, title, detail message, and a suggested action. Alerts are not tasks — they are signals. If an alert says "Run live funnel QA", use:

```
pnpm run amm:verify:funnel
```

### Do Not Contact Synthetic/Test Records

If the board shows a "Synthetic/test residue" alert, those records are QA seeds — not real people. Do not follow up, do not call, do not email.

---

## What to Check Every Morning

Open `/admin/revenue` and review in this order:

1. **Today Action Board (top)** — read the status pill and act on any urgent/high items first
2. **Executive Snapshot (Section 0)** — new leads in the last 24h, high-intent count, unattributed count
3. **Integrity Warnings (Section 5b)** — any amber/red warnings at a glance
4. **Action Priority Queue (Section 5)** — top 20 leads sorted by urgency, score, then recency
5. **Traffic Path Scorecard (Section 1b)** — confirm all three OTP traffic paths are generating leads

This takes under 5 minutes on a normal day.

---

## How to Read Executive Snapshot

| Field | What It Means |
|---|---|
| New Leads (24h) | Total leads submitted in the last 24 hours |
| High Intent (24h) | Leads scored hot or urgent in the last 24h — act on these today |
| WordPress Attributed (7d) | Leads tagged `website_widget` campaign from OTP embed pages |
| Unattributed (7d) | Leads with no source_attribution row — data gap, investigate if growing |

A high-intent count > 0 means Mike or the team should follow up that day.  
Unattributed > 0 is not an emergency but should trend toward 0. If it's growing, check the OTP embed pages.

---

## How to Read Traffic Path Scorecard

Rows represent the `utm_medium` value for each known OTP traffic path:

| Path | Where It Comes From |
|---|---|
| Website Widget | Ask Mike embed on `/ask-mike/`, `/ask-magic-mike/` |
| Homepage CTA | OTP homepage "Ask Mike" button |
| Agent Profile CTA | Mike Eatmon profile page `/agents/mike-eatmon/` |
| Direct / Unknown | Direct traffic, untracked links, or missing UTMs |

**Green state**: all three OTP paths show some leads over 30d, hot/urgent = 0, missing attribution = 0.  
**Needs attention**: Hot/Urgent column > 0 means high-priority leads from that source.  
**Problem**: Missing Attribution > 0 for `website_widget` means the embed may have lost UTM passing.

---

## What Counts as High Priority

A lead is high priority if **any** of the following are true:
- Temperature = `urgent` — act same day
- Temperature = `hot` — act within 24 hours
- Score ≥ 75 — high engagement signal even without explicit temperature
- Has email AND phone AND no assigned agent

The Action Priority Queue automatically sorts: urgent → hot → score desc → newest. Review from the top.

---

## What to Do with Unassigned Leads

1. Open the lead detail link (View → column) in the Action Priority Queue
2. Review the question and intent they submitted
3. Assign to Mike or a team member in the CRM (outside this tool)
4. This tool is read-only — no assignment happens here

An unassigned lead older than 24h with a hot/urgent temperature is an escalation trigger (see below).

---

## What Synthetic / Test Residue Means

Section 7 lists leads with synthetic marker emails (`@example.com`, `qa+amm-`, `amm-wordpress-smoke`, etc.).  
These are test leads from integration QA — they are **not real people**.  
- Do NOT contact them
- They are excluded from the Action Priority Queue automatically
- They cannot be deleted (append-only compliance design) but they will never appear in the lead follow-up flow

If you see synthetic residue from the current day, that means a test was run. The previous QA leads from setup are expected and harmless.

---

## What Not to Click

- Do not click any external links on this page expecting to contact a lead — there are none
- Do not attempt to delete rows from this view — it is read-only
- Do not copy lead emails into mass-mail tools
- Do not use the lead detail URL to send outbound messages — it is informational only

---

## Escalation Triggers

Act immediately if:
- **High Intent (24h) > 3** and it is already past noon — Mike should reach out today
- **Unattributed (7d) increasing** over consecutive days — check OTP embed pages (run `pnpm run amm:verify:funnel`)
- **Integrity Warning: secret marker detected** — contact the developer immediately
- **Admin page returns 200 without login prompt** — authentication may be broken, contact developer
- **Admin page is down (non-401/200 response)** — contact developer

---

---

## Reconcile Before Reacting

The **Lead Source Reconciliation** panel (below the Today Action Board) is the lens that separates database truth from dashboard noise. Read it before acting on any metric.

### Dashboard Snapshot vs. Database Truth

The Revenue Command Center renders a fresh server-side snapshot on every page load (`force-dynamic`, no caching). Each time you load or reload the page, all counts reflect the current state of the Supabase database. If the page has been open in a browser tab for more than 10 minutes, the reconciliation panel will flag the snapshot as **stale** and recommend a reload. Never act on stale data — reload first.

### Synthetic / Test Residue

The AMM funnel captures one intentional synthetic/test lead at time of pipeline verification. Its email contains `@example.com` or `qa+amm-` markers. The reconciliation panel shows:

- **Synthetic / Test (all)** — all-time count of test leads in Supabase
- **Synthetic in 30 d** — test leads within the snapshot window

These are **already excluded** from the Action Priority Queue and all revenue tracking. Their presence is expected and harmless. Counts > 0 do not mean the funnel is broken — they mean QA ran. Do not delete them (append-only compliance design). Do not contact them.

The reconciliation panel will always show `realLeads = totalLeads − syntheticLeads30d`. If `realLeads = 0` and `syntheticLeads > 0`, this means the pipeline is verified working but real organic traffic has not arrived yet.

### website_widget Real Traffic

The `Widget Leads 7d` counter in the reconciliation panel shows how many leads came via the OTP `website_widget` embed path in the last 7 days. A count of `0` does **not** mean the funnel is broken — the synthetic test lead confirmed the attribution pipeline works end-to-end. Zero real widget leads simply means real organic traffic hasn't arrived through that embed path in the 7-day window.

Do not call the QA synthetic lead a "real widget lead." It is excluded from this count.

### What to Do When Social Preview Is Blocked

The **Social Preview Readiness** card (below the Lead Source Reconciliation panel) shows the current status of the Facebook/OG preview blocker on ourtownproperties.com. While the blocker is in **Pending** state:

- AMM funnel links are **safe** — the UTM pipeline is verified and captures leads correctly
- OTP social sharing (Facebook posts that link to ourtownproperties.com) will **not** render preview cards — wait for the host WAF whitelist before promoting OTP pages via Facebook
- AMM social sharing (posts linking to askmagicmike.com) is **unaffected** — the blocker is host-level on OTP, not on the AMM Vercel app
- The social preview score is **40/42** — only the two Facebook UA tests are failing

To resolve: ask the host administrator (Regency / Liquid Web cPanel) to whitelist `facebookexternalhit` in ModSecurity. No WordPress or code change is required.

### What Not to Do

| Situation | Wrong reaction | Correct reaction |
|---|---|---|
| `realLeads = 0`, syntheticLeads > 0 | Assume funnel is broken | Pipeline verified. Await real traffic. |
| `website_widget 7d = 0` | Declare widget broken | Funnel proven via synthetic. Monitor. |
| Social preview card shows Pending | Try to fix in WordPress | Contact host for ModSecurity whitelist. |
| Stale snapshot warning visible | Act on displayed counts | Reload the page first. |
| Synthetic leads visible in Section 7 | Contact them or delete them | Ignore — they are excluded automatically. |

---

## Production Details

- Admin is protected by HTTP Basic Auth — any username + ADMIN_SECRET
- The page is server-rendered and refreshes on each load (no caching)
- All data is read from Supabase production (mmvvyeypqudywudsndcl)
- No writes occur from this page
- Lead detail links point to `/admin/leads/{id}` — also read-only
