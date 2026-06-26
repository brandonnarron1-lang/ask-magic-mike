# Controlled Launch Runbook — Ask Magic Mike

**Version:** LC-5 (post-merge-train #44–#50)  
**Code state:** `main` @ `ba7f40f` — launch-ready  
**Audience:** Brandon Narron (operator), Mike Eatmon (broker/BIC)  
**Estimated total time to Go/No-Go:** 60–90 minutes with credentials in hand

**Companion documents:**
- `docs/OWNER_ACTION_PROOF_PACK.md` — evidence capture template for each owner action
- `docs/PRODUCTION_DEPLOY_REHEARSAL.md` — deployment-day minute-by-minute timeline

---

## Launch Status Summary

| Layer | Status |
|---|---|
| Code / funnel | ✅ Launch-ready |
| Visual system | ✅ Launch-ready (LC-1 merged) |
| Conversion polish | ✅ Launch-ready (LC-2 merged) |
| Final audit + docs | ✅ Complete (LC-3 merged) |
| WordPress docs | ✅ Updated to `www.askmagicmike.com` |
| Owner env vars | ⏳ Requires Brandon action |
| DB migrations | ⏳ Requires Brandon verification |
| Admin auth verified | ⏳ Requires Brandon testing on prod |
| End-to-end lead test | ⏳ Requires Brandon execution |
| WordPress CTAs live | ⏳ Requires Brandon / Regency |

**Stop here if any ⏳ item is incomplete. Do not send traffic until all 5 are green.**

---

## Pre-Launch Action Table

| # | Step | Owner | System | Action | Verification | Go/No-Go |
|---|---|---|---|---|---|---|
| 1 | Set required env vars | Brandon | Vercel Dashboard | See §2 below | Health check returns all booleans `true` | ❌ Hard block |
| 2 | Verify DB migrations | Brandon | Supabase Dashboard | See §3 below | All 13 tables present in Table Editor | ❌ Hard block |
| 3 | Verify admin auth | Brandon | Browser | See §4 below | 401 without creds; 200 with creds; no DEV MOCK banner | ❌ Hard block |
| 4 | Run production smoke | Brandon | Terminal | See §5 below | `19 pass / 2 skip / 0 fail` (or all pass) | ❌ Hard block |
| 5 | Submit test lead | Brandon | Browser | See §6 below | Lead appears in `/admin` with correct score/temperature | ❌ Hard block |
| 6 | Verify admin dashboard | Brandon | Browser | See §7 below | Lead visible, no mock data banner, contact display works | ❌ Hard block |
| 7 | Update WordPress CTAs | Brandon / Regency | WordPress Admin | See §8 below | CTAs route to `www.askmagicmike.com/value` with UTMs | Medium |
| 8 | Verify UTM attribution | Brandon | Browser + Supabase | Submit test lead from WP CTA → check `source_attribution` | `utm_source: ourtown_wp` visible in Supabase | Medium |
| 9 | Set `NEXT_PUBLIC_AGENT_LICENSE` | Brandon | Vercel Dashboard | Add NC license number (confirm with Mike) | Visible in consent step copy | Before SMS outreach |
| 10 | TCPA attorney review | Attorney | Legal | Review `src/components/intake/step-consent.tsx` consent language v1 | Attorney sign-off obtained | Before SMS/call outreach |
| 11 | Rate limiter upgrade | Brandon | Upstash + Vercel | See B-01 in KNOWN_BLOCKERS.md | Rate limit test fails correctly | Before high-traffic |

---

## §2 — Vercel Environment Variable Checklist

**Where:** Vercel Dashboard → Project `ask-magic-mike` → Settings → Environment Variables → Production

**Do NOT set these in `.env.local` or commit them to git.**

| Variable | Expected Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-ref].supabase.co` | From Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` anon key | Public — safe to expose client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` service role key | Server-only — NEVER prefix with NEXT_PUBLIC_ |
| `ADMIN_SECRET` | Strong unique password (20+ chars, mixed) | Never `changeme-local`; store in 1Password |
| `NEXT_PUBLIC_SITE_URL` | `https://www.askmagicmike.com` | Must match canonical domain exactly |
| `NEXT_PUBLIC_AGENT_NAME` | `Mike Eatmon` | |
| `NEXT_PUBLIC_BROKERAGE_NAME` | `Our Town Properties` | |
| `NEXT_PUBLIC_MARKET_AREA` | `Wilson, NC` | |
| `NEXT_PUBLIC_AGENT_PHONE` | `+12522454337` | E.164 format |
| `NEXT_PUBLIC_AGENT_LICENSE` | NC license number | Confirm with Mike; appears in consent copy |
| `CRON_SECRET` | Unique random string | Enables Vercel cron auth for `/api/admin/sla/sweep` |

**After setting:** Trigger a new production deployment from Vercel Dashboard → Deployments → Redeploy.

**Verification:** After redeploy, run:
```bash
curl -s -H "x-admin-secret: $YOUR_ADMIN_SECRET" \
  https://www.askmagicmike.com/api/admin/health | python3 -m json.tool
```
All env var presence fields should be `true`. No values are returned — only booleans.

---

## §3 — Supabase Migration Verification

**Where:** Supabase Dashboard → Project → Table Editor

**Do NOT execute `DB_SECURITY_PERF_FIXES.sql` or any ad-hoc SQL without engineering review.**

### Tables that must exist

Check each in Table Editor → Tables list:

| Table | Migration | Purpose |
|---|---|---|
| `sessions` | 00001 | Intake session tracking |
| `leads` | 00002 | Lead records |
| `agents` | 00003 | Agent roster (Mike's row) |
| `lead_scores` | 00004 | AI scoring output |
| `lead_routing` | 00005 | Agent assignment |
| `contacts` | 00006 | Contact details |
| `consents` | 00007 | TCPA consent records (immutable) |
| `source_attribution` | 00008 | UTM + referrer capture |
| `audit_logs` | 00009 | Admin actions |
| `compliance_flags` | 00010 | Compliance markers |
| `analytics_events` | 00011 | Funnel event log |
| `crm_sync_log` | 00012 | CRM adapter status |
| `listings` | 00013 | Listing data (broker-only) |

If any table is missing, apply the missing migration via **Supabase Dashboard → SQL Editor → New Query** — paste the migration file content from `supabase/migrations/`.

**Agent seed check:** Table Editor → `agents` → must have one row with `name: "Mike Eatmon"`. If missing, apply migration 00010.

### RLS Check

Supabase Dashboard → Table Editor → select any table → RLS toggle must show **enabled** (green). If any table shows RLS disabled, enable it from the dashboard before any traffic.

---

## §4 — Admin Auth Verification

Run all three checks from an **incognito browser window** against `https://www.askmagicmike.com`:

```
1. Navigate to https://www.askmagicmike.com/admin
   EXPECTED: Browser auth dialog (401 + WWW-Authenticate header)
   FAIL IF: Page loads without a password prompt

2. Enter wrong password in the auth dialog
   EXPECTED: Dialog re-prompts or returns 401
   FAIL IF: Admin page loads with wrong password

3. Enter correct ADMIN_SECRET as the password (username can be anything)
   EXPECTED: Admin dashboard loads with live data
   FAIL IF: Yellow "DEV MOCK DATA" banner is visible
   FAIL IF: No leads table appears (may be empty — that's OK)
   FAIL IF: "Admin not configured" (503) — means ADMIN_SECRET missing from Vercel
```

---

## §5 — Production Smoke Command Sequence

Run after Vercel deployment is complete and env vars are set.

```bash
# Step 1 — Basic smoke (read-only, no auth needed)
npm run amm:smoke:prod

# Expected output:
# Totals: 19 pass · 2 skip · 0 fail
# (skips are normal when ADMIN_SECRET is not exported locally)

# Step 2 — With admin health check (requires ADMIN_SECRET exported)
ADMIN_SECRET=your_secret npm run amm:smoke:prod

# Expected: admin:health check now passes instead of skipping
# Total: 20 pass · 1 skip · 0 fail (session:create skip is normal without --write)

# Step 3 — Funnel verify (checks live OTP site + no stale URLs)
npm run amm:verify:funnel

# Expected: 15/15 PASS  CONVERSION_FUNNEL_VERIFY_PASS

# STOP if any check FAILS. Do not send traffic.
```

---

## §6 — Manual Real Test Lead Procedure

**Important:** This creates a real database record. Do not use real customer contact info.

```
1. Open https://www.askmagicmike.com/ask in an incognito window
2. Step 1 (Question): Type "This is a smoke test from the launch runbook"
3. Step 2 (Intent): Select "Just exploring" → timeline "Not sure"
4. Step 3 (Contact): First: "Test", Last: "Lead", Email: your test email,
                     Phone: your own mobile (optional)
5. Step 4 (Consent): Check all three boxes
6. Step 5 (Confirmation): Confirm "Your request is in" screen appears
                           Confirm "What happens now" 3-step panel is visible
                           Confirm Mike's avatar and ETA message appear
```

**After submission, delete the test record:**  
Supabase Dashboard → leads table → find the record → delete row.  
Also delete the corresponding `sessions`, `contacts`, `consents`, `source_attribution` rows.

---

## §7 — Admin Verification Procedure

After the test lead is submitted:

```
1. Navigate to https://www.askmagicmike.com/admin (with credentials)
2. Confirm:
   [ ] Test lead appears in the Recent Leads table
   [ ] Temperature badge is colored (not blank)
   [ ] Score is populated (not 0 or null)
   [ ] Lead name and contact method display correctly
   [ ] "Last contact" shows "never" (not an error)
   [ ] No yellow DEV MOCK DATA banner
   [ ] No red error banners
   [ ] "Attention Required" or "All clear" displays correctly

3. Click the lead row to open detail page:
   [ ] Question text visible
   [ ] Intent and timeline visible
   [ ] Contact info visible
   [ ] Score breakdown visible
   [ ] Source attribution shows landing_page / direct (or utm_source if from WP)
```

---

## §8 — WordPress CTA Activation Procedure

**Reference:** `docs/regency-wordpress-handoff.md` (updated in LC-3 to use `www.askmagicmike.com`)

The three CTAs to activate or verify on `ourtownproperties.com`:

| Page | CTA URL |
|---|---|
| Homepage | `https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike` |
| Mike Eatmon profile | `https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike` |
| We Buy Homes / Seller page | `https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike` |

**Per-page verification:**
1. Open page in incognito
2. Click the CTA button
3. Confirm URL bar shows `www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=...`
4. Complete steps 1–2 of the intake form (stop before submitting contact info)
5. Confirm UTMs are preserved in sessionStorage (DevTools → Application → Storage → `amm_attribution`)

**Do NOT complete a fake lead from the WordPress CTA** — it will create a source_attribution record. Use the manual real-test-lead procedure in §6 only once.

---

## §9 — Rollback Plan

The production deployment is a Vercel deployment. No database schema changes are in this sprint.

### If the Vercel deployment is broken:

```
1. Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click the three-dot menu → "Promote to Production"
4. Verify smoke passes on the rolled-back deployment
```

### If a database row causes issues:

```
1. Do NOT run ad-hoc SQL without engineering review
2. Use Supabase Dashboard → Table Editor to inspect and delete rows
3. Never drop tables or disable RLS
```

### If WordPress CTAs need to be reverted:

```
1. WP Admin → Pages → [page] → Beaver Builder
2. Change the button URL back to the prior URL
3. Save and publish
```

There is no code to revert in this sprint — all changes are in `main` and the Vercel deployment is a snapshot.

---

## §10 — Go / No-Go Criteria

### GO (controlled traffic authorized):

- [ ] All 6 pre-launch hard-block steps complete (§2–§7)
- [ ] Production smoke: 19+ pass / 0 fail
- [ ] Funnel verify: 15/15 PASS
- [ ] Test lead appears in `/admin` with score and temperature
- [ ] `/admin` returns 401 without credentials
- [ ] No DEV MOCK DATA banner on prod
- [ ] WordPress CTA URLs updated to `www.askmagicmike.com`

### NO-GO (stop, do not send traffic):

- Any production smoke FAIL
- `/admin` accessible without password
- DEV MOCK DATA banner visible in production
- Test lead does not appear in Supabase after submission
- `NEXT_PUBLIC_SITE_URL` is NOT `https://www.askmagicmike.com` (use canonical domain)

---

## §11 — Post-Launch First 24 Hours Monitoring

| Time | Action | System | What to Check |
|---|---|---|---|
| T+0 | Immediately after go-live | Terminal | `npm run amm:smoke:prod` — should pass |
| T+0 | After first real lead | Supabase | Lead row exists, score populated, source_attribution captured |
| T+0 | After first real lead | `/admin` | Lead visible, temperature badge correct |
| T+1h | 1 hour after go-live | Vercel | Check function invocation logs for any 5xx errors |
| T+1h | 1 hour after go-live | Supabase | Check Supabase logs for any RLS policy violations or failed queries |
| T+4h | 4 hours after go-live | `/admin` | Review all leads submitted; confirm no scoring anomalies |
| T+24h | Next morning | `/admin` | Check "Today's Operations" panel for any SLA-breached leads |
| T+24h | Next morning | Supabase | Verify `crm_sync_log` status (should be `skipped` until CRM is configured) |
| T+24h | Next morning | `analytics_events` | Verify event types: `session_created`, `landing_page_viewed`, `cta_click`, `intake_completed`, `lead_scored` |

**Escalation:** If any 5xx errors appear in Vercel logs and are not transient — do not ignore. Check the error details in Vercel → Functions → Logs.

**First 24h hard stop condition:** If more than 10% of `/api/intake/submit` calls return 5xx, roll back the Vercel deployment and investigate before resuming.
