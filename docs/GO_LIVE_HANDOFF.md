# Go-Live Handoff — Ask Magic Mike
**Production Go-Live Command · 2026-06-27**
**Platform:** Our Town Properties, Inc. · Wilson, NC
**Authorized by:** Ask Magic Mike — Production Go-Live Command

---

## Launch Status

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              PLATFORM LAUNCH STATUS: GO                      ║
║                                                              ║
║  Code gates:            ALL PASS                             ║
║  lint                   EXIT 0 (0 errors)                    ║
║  typecheck              EXIT 0 (0 errors)                    ║
║  tests                  1756 / 1756                          ║
║  build                  EXIT 0 (all routes compiled)         ║
║  amm:verify:funnel      15 / 15 PASS                         ║
║  amm:launch:doctor      26 / 26 PASS (6 owner-env skips)     ║
║                                                              ║
║  Production site:       www.askmagicmike.com LIVE            ║
║  Admin protection:      VERIFIED (auth required)             ║
║  Console errors:        0                                    ║
║                                                              ║
║  Remaining blockers:    0 code   ·   8 owner-action only     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Part 1 — Merge Instructions (Brandon does this)

The Black Diamond code lives across 12 open PRs in a sequential chain. Merge in this exact order. Do NOT squash — use a standard merge commit so the chain history is preserved.

**Before starting:** confirm you have write access to `brandonnarron1-lang/ask-magic-mike` on GitHub.

### Merge sequence

| Step | PR | Title | Base |
|------|-----|-------|------|
| 1 | #55 | Phase 2 Typography | → main |
| 2 | #56 | Phase 3 Component Library | → main |
| 3 | #57 | Phase 4 Motion System | → Phase 3 branch → retarget to main first |
| 4 | #58 | Phase 5 Public Experience | → Phase 4 branch → retarget to main first |
| 5 | #59 | Phase 6 Dashboard Command Center | → Phase 5 branch → retarget to main first |
| 6 | #60 | Phase 7 Marketing System | → Phase 6 branch → retarget to main first |
| 7 | #61 | Phase 8 Analytics Intelligence | → Phase 7 branch → retarget to main first |
| 8 | #62 | Phase 9 Agent Portal | → Phase 8 branch → retarget to main first |
| 9 | #63 | Phase 10 Autonomous Operations | → Phase 9 branch → retarget to main first |
| 10 | #64 | Phase 11 Intelligence Brain | → Phase 10 branch → retarget to main first |
| 11 | #65 | Omega Launch Phase | → Phase 11 branch → retarget to main first |
| 12 | #66 | Black Diamond (final) | → Omega Launch branch → retarget to main first |
| — | #53 | Controlled Traffic Activation | → main (merge independently, any time) |

> **Retargeting PRs #57–#66:** Before merging each PR, go to the PR page on GitHub, click "Edit" next to the base branch selector, change it to `main`, and save. The PR diff will update to show only that phase's changes. Then merge.

> **PR #8 — DO NOT TOUCH.** It has merge conflicts and is explicitly excluded from this chain.

### Step-by-step for each PR

```
1. Open the PR on GitHub
2. If base is NOT main: click the pencil icon next to the base, change to main, confirm
3. Click "Merge pull request" → "Confirm merge"
4. Do NOT delete the source branch until all downstream PRs have been retargeted
5. Move to next PR in sequence
```

### After all 12 PRs merged

Vercel will auto-deploy `main`. The deployment takes 2–4 minutes. The URL `www.askmagicmike.com` will serve the Black Diamond build automatically.

---

## Part 2 — Required Vercel Environment Variables

Set these in: **Vercel Dashboard → ask-magic-mike project → Settings → Environment Variables → Production**

| Variable | Where to Get It | Required |
|----------|----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project → Settings → API → Project URL | CRITICAL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project → Settings → API → service_role (secret) | CRITICAL |
| `ADMIN_SECRET` | Generate: `openssl rand -hex 32` — save it, you need it to log in to /admin | CRITICAL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project → Settings → API → anon (public) | HIGH |
| `NEXT_PUBLIC_SITE_URL` | Set to `https://www.askmagicmike.com` | HIGH |
| `NEXT_PUBLIC_AGENT_LICENSE` | Your NC real estate license number | HIGH |

**Additional optional variables** (already set in .env.example with correct defaults):
- `NEXT_PUBLIC_AGENT_NAME=Mike Eatmon`
- `NEXT_PUBLIC_AGENT_PHONE=+12522454337`

After setting env vars: **redeploy from Vercel dashboard** (Deployments → latest → Redeploy) to pick up the new secrets.

---

## Part 3 — Supabase Migration (CRITICAL — required before first lead)

Migration `00012_canonical_platform.sql` adds the platform tables. Without it, the admin dashboard, lead scoring, tasks, listings, and intelligence systems will 500.

**Run this once in Supabase Dashboard → SQL Editor → New Query:**

```
Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]/editor
Paste: the contents of supabase/migrations/00012_canonical_platform.sql
Click: Run
```

The migration is fully idempotent (`IF NOT EXISTS` everywhere). Running it twice is safe.

**Also apply migration 00013** (source attribution + lead deduplication index):
```
File: supabase/migrations/00013_source_attribution_lead_unique.sql
Same process: paste and run in SQL Editor.
```

**Verify migration applied:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leads' AND column_name = 'lead_type';
-- Should return one row
```

---

## Part 4 — WordPress Widget Setup

### Link-first CTAs (install these now)

Add these button links in Beaver Builder on the pages below. Open in new tab (`target="_blank"`).

**Homepage seller CTA:**
```
https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
```
- Headline: `Ask Magic Mike what your Wilson-area home may be worth.`
- Button text: `Start With Your Address →`
- Button style: gold `#D4A017` background, dark `#0A0A0A` text

**Mike Eatmon profile page:**
```
https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike
```
- Headline: `Have a real estate question for Magic Mike?`
- Button text: `Ask Magic Mike →`

**Seller / "We Buy Homes" page:**
```
https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike
```
- Headline: `Thinking about selling but not sure where to start?`
- Button text: `Get Local Guidance →`

### Optional iFrame embed (install after direct links confirmed working)

```html
<div style="border-radius:12px; overflow:hidden; border:1px solid rgba(212,160,23,0.2);">
  <iframe
    src="https://www.askmagicmike.com/embed/ask"
    width="100%"
    height="650"
    style="border:none; display:block; background:#0A0A0A;"
    loading="lazy"
    title="Ask Magic Mike — Home Value &amp; Real Estate Guidance"
    allow="clipboard-write"
  ></iframe>
</div>
<p style="font-size:0.7rem; color:#888; text-align:center; margin-top:0.5rem;">
  Powered by <a href="https://www.askmagicmike.com" style="color:#888;">Ask Magic Mike</a>
  · Our Town Properties · Lic. #226434
</p>
```

---

## Part 5 — Vercel Cron Setup (SLA Sweep)

Requires **Vercel Pro** plan. This triggers the SLA breach checker every hour.

**Step 1: Generate a cron secret**
```bash
openssl rand -hex 32
```
Save the output as `CRON_SECRET` in Vercel environment variables.

**Step 2: Create `vercel.json` in the repo root:**
```json
{
  "crons": [
    {
      "path": "/api/admin/sla/sweep",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Step 3:** The cron job authenticates via `Authorization: Bearer <CRON_SECRET>`. Vercel sends this header automatically. No code changes needed — the route already reads `process.env.CRON_SECRET`.

**If not on Vercel Pro:** Manually trigger the SLA sweep from `/admin/automation/queue` → "Run SLA Sweep" button (requires `ADMIN_SECRET`).

---

## Part 6 — Post-Deploy Smoke Test

Run these immediately after Vercel finishes deploying:

```bash
# From this repo:
pnpm run amm:smoke:prod

# Then:
pnpm run amm:verify:funnel
```

Expected: all checks PASS. Any FAIL = rollback (see Part 8).

### Manual smoke test checklist

- [ ] `https://www.askmagicmike.com` loads — dark background, gold headline
- [ ] `https://www.askmagicmike.com/ask` loads — intake widget visible
- [ ] `https://www.askmagicmike.com/value` loads — campaign page correct
- [ ] Complete a test lead submission on `/ask` (use your own phone/email)
- [ ] Go to `https://www.askmagicmike.com/admin` — enter `ADMIN_SECRET` when prompted
- [ ] Confirm your test lead appears in the admin inbox
- [ ] Check lead detail — score, temperature, intent fields all populated
- [ ] Go to `/admin/intelligence` — confirm signals load (may show zeros until real traffic)
- [ ] Go to `/agent` — agent portal loads, protected by agent token
- [ ] Check browser console on `/` and `/ask` — must be 0 errors

---

## Part 7 — 48-Hour Monitoring Checklist

### Hour 0–4 (immediately post-launch)

- [ ] Admin inbox: confirm new leads are appearing (real or test)
- [ ] Lead scores: check temperature fields are populated (A/B/C/D)
- [ ] SLA clock: confirm `sla_breached = false` on fresh leads
- [ ] Console errors: none on public pages
- [ ] Supabase Dashboard → Logs: no 500 errors

### Hour 4–24

- [ ] Check source attribution on leads (`utm_source`, `referrer_type` fields in lead detail)
- [ ] Agent portal: confirm agents can log in and see their assigned leads
- [ ] Intelligence signals: `/admin/intelligence` shows non-zero counts after real traffic
- [ ] Run `pnpm run amm:verify:funnel` again — confirm still 15/15

### Hour 24–48

- [ ] Revenue dashboard (`/admin/revenue`): pipeline value calculating correctly
- [ ] Analytics page (`/admin/analytics`): lead count trending
- [ ] Run a manual SLA sweep: `POST /api/admin/sla/sweep` with `Authorization: Bearer <ADMIN_SECRET>`
- [ ] Review any SLA-breached leads — assign agents and contact immediately
- [ ] Confirm WordPress CTAs are driving traffic (check UTM sources in lead list)

---

## Part 8 — Rollback Plan

If the Black Diamond deploy causes issues, roll back to Phase 1 (the current stable deploy):

**Option A — Vercel instant rollback (30 seconds):**
1. Vercel Dashboard → Deployments
2. Find the deployment tagged as "Phase 1" / last successful before this merge
3. Click the three-dot menu → "Promote to Production"
4. Done — no code changes needed

**Option B — Git revert (if Vercel rollback unavailable):**
```bash
git revert --no-commit <first-bad-commit>..<HEAD>
git commit -m "chore: revert to Phase 1 stable"
git push origin main
```

Vercel will auto-deploy the revert.

**Database:** The migrations are additive and never destructive. No data rollback needed — the old code will simply ignore the new columns.

---

## Part 9 — Owner Daily Responsibilities

See `docs/BROKER_DAILY_WORKFLOW.md` for the full morning brief protocol. Minimum daily:

1. **Morning:** Open `/admin` — review new leads from overnight
2. **Check SLA:** Any leads showing `SLA BREACHED` — contact immediately
3. **Lead grades:** A+ and A leads → contact within 15 minutes of arrival
4. **Weekly:** Review `/admin/revenue` pipeline value and conversion rate
5. **Monthly:** Review `/admin/analytics` source attribution to optimize WordPress CTAs

---

## Part 10 — Agent Onboarding

When onboarding a new agent:

1. Go to `/admin/routing`
2. Add agent: name, email, phone, capacity (max daily leads)
3. Set notification preferences (email, SMS)
4. Share the agent portal URL: `https://www.askmagicmike.com/agent`
5. Agent authenticates with their assigned token (set in Supabase `agents` table: `portal_token` column)
6. Agent sees only their assigned leads — no admin access

See `docs/AGENT_DAILY_WORKFLOW.md` for agent training materials.

---

## Part 11 — Known Limitations

See `docs/KNOWN_LIMITATIONS.md` for the complete list. Key items for day-one context:

- **Email/SMS notifications** are not yet wired to a real provider (Phase 17). Agents are notified through the portal only.
- **FlexMLS API sync** is not live (Phase 16). Import listings manually via CSV from `/admin/listings`.
- **PDF document generation** is not live (Phase 18). Document templates are shown as guides; export to PDF manually.
- **Mobile admin portal** is not optimized (Phase 22). Use desktop for admin/broker work.
- **Real-time push notifications** are not live (Phase 19). Refresh portal to see new leads.

None of these block the core lead capture → agent contact workflow.

---

## Part 12 — Key Links

| Resource | URL / Path |
|----------|-----------|
| Production site | https://www.askmagicmike.com |
| Admin portal | https://www.askmagicmike.com/admin |
| Agent portal | https://www.askmagicmike.com/agent |
| Intake widget | https://www.askmagicmike.com/ask |
| Campaign page | https://www.askmagicmike.com/value |
| Broker daily workflow | docs/BROKER_DAILY_WORKFLOW.md |
| Agent daily workflow | docs/AGENT_DAILY_WORKFLOW.md |
| Known limitations | docs/KNOWN_LIMITATIONS.md |
| Post-launch roadmap | docs/ROADMAP_POST_LAUNCH.md |
| Launch checklist | docs/LAUNCH_CHECKLIST.md |
| Black Diamond certification | docs/black-diamond/PRODUCTION_SIGNOFF.md |
| Design system reference | docs/DESIGN_SYSTEM_OMEGA.md |

---

## Validation Run (2026-06-27)

| Gate | Command | Result |
|------|---------|--------|
| Lint | `pnpm lint` | ✅ EXIT 0 — 0 errors (warnings pre-existing, documented) |
| Typecheck | `pnpm typecheck` | ✅ EXIT 0 — 0 errors |
| Tests | `pnpm test` | ✅ 1756 / 1756 passed (84 files) |
| Build | `pnpm build` | ✅ EXIT 0 — all routes compiled |
| Funnel | `pnpm run amm:verify:funnel` | ✅ 15 / 15 PASS |
| Doctor | `node scripts/amm/launch-readiness-doctor.mjs` | ✅ 26 / 26 PASS (6 owner-env SKIPs) |
| Production site | Playwright: www.askmagicmike.com | ✅ 200, 0 console errors |
| Admin protection | Playwright: /admin | ✅ Auth required, access denied |

**Two bugs fixed during this validation run** (committed `275123a`):
1. `admin/automation/templates/page.tsx` — unescaped quotes (ESLint `react/no-unescaped-entities`)
2. `memory-timeline.tsx` (client) → `memory-engine.ts` → `next/headers` — broke production build; fixed by extracting constants to `src/lib/intelligence/memory-constants.ts`

---

*This handoff document is the single source of truth for production launch. All referenced documentation lives in the `docs/` directory of this repository.*
