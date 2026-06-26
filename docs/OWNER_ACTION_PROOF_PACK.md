# Owner Action Proof Pack — Ask Magic Mike

**Version:** LC-5 (post-merge-train #44–#50)  
**Code state:** `main` @ `ba7f40f` — launch-ready  
**Audience:** Brandon Narron (operator)  
**Purpose:** Capture verifiable evidence for each owner-gated launch action. No secrets are recorded here — only screenshots of field names, terminal output summaries, and URL structures.

---

## §1 — Purpose and Rules

This document is a receipt log. Before sending any traffic to `www.askmagicmike.com`, every row in the evidence table below must have a Status of ✅ PASS and a populated Notes column with the evidence captured.

**Rules:**
- Do NOT paste secret values into this file or any document.
- Screenshot env var dashboards showing field names only, with values masked.
- Redact all lead contact info (name, email, phone) before noting anything about test leads.
- If you cannot complete a step, set status to ❌ BLOCKED and document the blocker.
- A single ❌ BLOCKED on a hard-block item = full launch stop.

---

## §2 — Owner-Gated Launch Actions

The following six items were SKIPs in the launch doctor output because they cannot be verified locally without production credentials. All must be resolved before controlled traffic begins.

| # | Owner Action | System | Hard Block? |
|---|---|---|---|
| OA-1 | Set all 11 required env vars in Vercel | Vercel Dashboard | ❌ Yes |
| OA-2 | Verify all 13 Supabase tables exist + RLS enabled | Supabase Dashboard | ❌ Yes |
| OA-3 | Verify admin auth (401 without creds, 200 with creds, no DEV MOCK banner) | Browser + `/admin` | ❌ Yes |
| OA-4 | Run production smoke: 19+ pass / 0 fail | Terminal | ❌ Yes |
| OA-5 | Submit one real test lead; verify it appears in `/admin` with score + temperature | Browser + Supabase | ❌ Yes |
| OA-6 | Activate WordPress CTAs with canonical `www.askmagicmike.com` URLs | WordPress Admin | Medium |

---

## §3 — Evidence Table

Complete this table as you execute each action. Keep a copy of this file in 1Password or a secure note — not in git with values filled in.

| Owner Action | System | Evidence Required | Accept Criteria | Status | Notes |
|---|---|---|---|---|---|
| OA-1: Vercel env vars | Vercel Dashboard | Screenshot of env var names (values hidden) | All 11 var names visible in Production section; no values shown | ⬜ TODO | |
| OA-2: Supabase tables exist | Supabase Dashboard | Screenshot of Table Editor showing all 13 table names | All 13 tables listed: sessions, leads, agents, lead_scores, lead_routing, contacts, consents, source_attribution, audit_logs, compliance_flags, analytics_events, crm_sync_log, listings | ⬜ TODO | |
| OA-2: RLS enabled | Supabase Dashboard | Screenshot of RLS toggle showing enabled on any 3 representative tables | Green enabled toggle on `leads`, `consents`, `source_attribution` | ⬜ TODO | |
| OA-2: Mike Eatmon agent row | Supabase Dashboard | Screenshot of `agents` table showing at least one row with name "Mike Eatmon" | Row visible; no other contact data needs to be shown | ⬜ TODO | |
| OA-3: 401 without creds | Browser incognito | Screenshot of browser auth dialog (or 401 response) when visiting `/admin` | Auth dialog appears immediately; no admin content visible | ⬜ TODO | |
| OA-3: 403/401 with wrong password | Browser incognito | Screenshot showing auth challenge repeated after wrong password | Dialog re-prompts or returns 401; page does not load | ⬜ TODO | |
| OA-3: Admin loads with correct creds | Browser incognito | Screenshot of `/admin` with Recent Leads section visible; any test data redacted | Dashboard visible; no yellow DEV MOCK DATA banner | ⬜ TODO | |
| OA-4: Smoke test pass | Terminal | Paste terminal output summary line only (counts, not URLs with secrets) | Line reads: `Totals: 19 pass · N skip · 0 fail` | ⬜ TODO | |
| OA-5: Test lead submission | Browser | Screenshot of `/ask` confirmation screen (no contact info visible) | "Your request is in" screen appears; "What happens now" 3-step panel visible | ⬜ TODO | |
| OA-5: Test lead in Supabase | Supabase Dashboard | Screenshot of `leads` table row (name/email/phone redacted or cropped) | Row exists; `score` column populated (not null/0); `temperature` column populated | ⬜ TODO | |
| OA-5: Test lead in /admin | Browser | Screenshot of `/admin` Recent Leads row for the test lead (name/contact redacted) | Row visible; temperature badge colored; score number visible | ⬜ TODO | |
| OA-5: Delete test lead | Supabase Dashboard | Note row IDs deleted (sessions, leads, contacts, consents, source_attribution) | All 5 related rows deleted; no personal data persists | ⬜ TODO | |
| OA-6: WordPress CTA URL | Browser | Screenshot of URL bar after clicking CTA on WordPress site | URL shows `www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=...` | ⬜ TODO | |
| OA-6: UTM captured in sessionStorage | Browser DevTools | Screenshot of DevTools → Application → Storage → `amm_attribution` key | `utm_source: ourtown_wp` visible in value | ⬜ TODO | |

---

## §4 — Vercel Env Var Proof Checklist

**Where:** Vercel Dashboard → Project `ask-magic-mike` → Settings → Environment Variables → Production

Check off each variable name as confirmed present. Do NOT record values here.

```
[ ] NEXT_PUBLIC_SUPABASE_URL          — https://[ref].supabase.co
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY     — eyJ... public anon key
[ ] SUPABASE_SERVICE_ROLE_KEY         — eyJ... service role (server-only, never NEXT_PUBLIC_)
[ ] ADMIN_SECRET                      — strong unique password 20+ chars
[ ] NEXT_PUBLIC_SITE_URL              — https://www.askmagicmike.com (exact)
[ ] NEXT_PUBLIC_AGENT_NAME            — Mike Eatmon
[ ] NEXT_PUBLIC_BROKERAGE_NAME        — Our Town Properties
[ ] NEXT_PUBLIC_MARKET_AREA           — Wilson, NC
[ ] NEXT_PUBLIC_AGENT_PHONE           — +12522454337 (E.164 format)
[ ] NEXT_PUBLIC_AGENT_LICENSE         — NC license number (confirm with Mike Eatmon)
[ ] CRON_SECRET                       — unique random string, 32+ chars
```

**After setting env vars:** Trigger a Vercel production redeploy.  
**Verification command** (run after redeploy — does NOT print secret values):

```bash
curl -s -H "x-admin-secret: $ADMIN_SECRET" \
  https://www.askmagicmike.com/api/admin/health | python3 -m json.tool
```

Expected: All boolean presence fields are `true`. No values returned — only booleans.

**Record health check output summary here (boolean fields only, no values):**

```
[ paste health check JSON here — values should all be true/false booleans ]
```

---

## §5 — Supabase Migration Proof Checklist

**Where:** Supabase Dashboard → Project → Table Editor

Verify each table exists. The migration order is 00001 → 00013.

```
[ ] sessions          (migration 00001)
[ ] leads             (migration 00002)
[ ] agents            (migration 00003)
[ ] lead_scores       (migration 00004)
[ ] lead_routing      (migration 00005)
[ ] contacts          (migration 00006)
[ ] consents          (migration 00007)
[ ] source_attribution (migration 00008)
[ ] audit_logs        (migration 00009)
[ ] compliance_flags  (migration 00010)
[ ] analytics_events  (migration 00011)
[ ] crm_sync_log      (migration 00012)
[ ] listings          (migration 00013)
```

**RLS check:** For each of these 3 representative tables, confirm the RLS toggle is enabled:

```
[ ] leads        — RLS: enabled
[ ] consents     — RLS: enabled
[ ] source_attribution — RLS: enabled
```

**Agent seed check:**

```
[ ] agents table has exactly 1 row
[ ] agents.name = "Mike Eatmon"
[ ] agents.is_active = true
```

If any table is missing: apply the migration from `supabase/migrations/` via Supabase Dashboard → SQL Editor → New Query. Do NOT run `DROP`, `TRUNCATE`, or `ALTER TABLE` without engineering review.

---

## §6 — Admin Access Proof Checklist

Run each check in sequence using an **incognito browser window**.

```
[ ] Step 1: Navigate to https://www.askmagicmike.com/admin
            EXPECTED: Browser shows auth challenge (dialog or 401 page)
            FAIL IF: Admin page loads without prompting for credentials

[ ] Step 2: Enter any incorrect password
            EXPECTED: Auth challenge repeats or 401 returned
            FAIL IF: Admin page loads with wrong password

[ ] Step 3: Enter correct ADMIN_SECRET (username: anything)
            EXPECTED: Admin dashboard loads with live data
            FAIL IF: Yellow "DEV MOCK DATA" banner is visible
            FAIL IF: "Admin not configured" message appears
            FAIL IF: No leads table (may be empty table — that's fine)
```

**Record results:**

```
Step 1 — 401 prompt shown:     [ ] YES  [ ] NO
Step 2 — Wrong pw rejected:    [ ] YES  [ ] NO
Step 3 — Dashboard loads:      [ ] YES  [ ] NO
Step 3 — No DEV MOCK banner:   [ ] YES  [ ] NO (visible = FAIL)
```

---

## §7 — Smoke Test Proof Checklist

Run from the terminal where `ADMIN_SECRET` is set:

```bash
# Basic smoke (read-only, no auth needed)
npm run amm:smoke:prod

# With admin secret exported
ADMIN_SECRET=your_secret npm run amm:smoke:prod
```

**Expected output summary line:**

```
Totals: 19 pass · 2 skip · 0 fail
```
or with ADMIN_SECRET set:
```
Totals: 20 pass · 1 skip · 0 fail
```

**Record the actual summary line here (no URLs with secrets, just the Totals line):**

```
Totals: [paste here]
```

**STOP if 0 fail is not achieved.**

---

## §8 — Real Test Lead Proof Checklist

Run this once. Use your own contact info (not Mike's, not a customer's).

```
[ ] Step 1: Open https://www.askmagicmike.com/ask in incognito
[ ] Step 2: Enter question: "Smoke test from launch runbook — do not contact"
[ ] Step 3: Select intent "Just exploring", timeline "Not sure"
[ ] Step 4: First: "Test", Last: "Lead", Email: [your test email], Phone: [your mobile, optional]
[ ] Step 5: Check all consent boxes
[ ] Step 6: Confirmation screen shows "Your request is in"
[ ] Step 7: "What happens now" 3-step panel is visible
[ ] Step 8: Mike's avatar and ETA message appear
[ ] Step 9: Navigate to https://www.askmagicmike.com/admin (with creds)
[ ] Step 10: Test lead appears in Recent Leads table
[ ] Step 11: Temperature badge is colored (not blank/grey)
[ ] Step 12: Score is populated (not 0 or null)
[ ] Step 13: Source attribution shows "direct" or "landing_page"
```

**After verification — delete the test record:**

```
Supabase Dashboard → leads table → find row → Delete
Also delete corresponding rows in:
  sessions        (match by session_id)
  contacts        (match by lead_id)
  consents        (match by lead_id)
  source_attribution (match by session_id or lead_id)
```

**Record test lead proof (no contact info):**

```
Test lead submission: [ ] confirmed
Test lead visible in /admin: [ ] confirmed
Score populated: [ ] YES — value: [just the number, e.g. "72"]
Temperature: [ ] populated — value: [e.g. "warm"]
Test lead deleted from all 5 tables: [ ] confirmed
```

---

## §9 — WordPress CTA Proof Checklist

Reference: `docs/regency-wordpress-handoff.md`

For each of the three target pages on `ourtownproperties.com`:

**Homepage CTA:**

```
[ ] Button visible on homepage
[ ] Click lands on: https://www.askmagicmike.com/value
[ ] URL contains: utm_source=ourtown_wp&utm_medium=homepage_cta
[ ] DevTools → Application → amm_attribution → utm_source = "ourtown_wp"
```

**Mike Eatmon Profile CTA:**

```
[ ] Button visible on profile page
[ ] Click lands on: https://www.askmagicmike.com/value
[ ] URL contains: utm_source=ourtown_wp&utm_medium=mike_profile
```

**Seller / We Buy Homes CTA:**

```
[ ] Button visible on seller page
[ ] Click lands on: https://www.askmagicmike.com/value
[ ] URL contains: utm_source=ourtown_wp&utm_medium=seller_page_cta
```

**Important:** Do NOT complete a fake lead submission from the WordPress CTA. It will create a source_attribution record attributed to `ourtown_wp`. Use the manual test lead procedure in §8 instead.

---

## §10 — Final Controlled Traffic Authorization

Before setting any traffic source to `www.askmagicmike.com`, confirm all of the following:

```
[ ] OA-1 Vercel env vars — all 11 set, health check returns all-true booleans
[ ] OA-2 Supabase — all 13 tables exist, RLS enabled, Mike Eatmon agent row present
[ ] OA-3 Admin auth — 401 without creds, dashboard loads with creds, no DEV MOCK banner
[ ] OA-4 Smoke — 19+ pass / 0 fail
[ ] OA-5 Test lead — submitted, scored, visible in admin, deleted
[ ] OA-6 WordPress CTAs — canonical URLs confirmed in URL bar (optional before first private test)
```

**Authorization signature:**

```
Operator: Brandon Narron
Date: ____________________
All hard-block items complete: [ ] YES
Controlled traffic authorized: [ ] YES / [ ] NO — reason: ____________________
```

---

## §11 — Stop Conditions

Stop immediately and do not send traffic if:

1. Any smoke test returns FAIL (not SKIP — SKIPs are expected).
2. `/admin` loads without a password prompt.
3. DEV MOCK DATA banner is visible on `/admin`.
4. Test lead does not appear in Supabase after submission.
5. `NEXT_PUBLIC_SITE_URL` is not `https://www.askmagicmike.com`.
6. Any required env var (OA-1 list) is missing from Vercel.
7. Any of the 13 Supabase tables is missing.
8. RLS is disabled on any table.

---

## §12 — Evidence Log Template

Copy this block when capturing each screenshot or terminal output:

```
---
Action: [OA-N description]
Date: [YYYY-MM-DD HH:MM UTC]
Operator: Brandon Narron
System: [Vercel / Supabase / Terminal / Browser]
Evidence type: [screenshot filename / terminal output snippet / URL]
Evidence location: [1Password note "AMM Launch Evidence" / local folder]
Result: PASS / FAIL / BLOCKED
Notes: [any deviation, workaround, or follow-up needed]
---
```

Store all screenshots in a secure location (1Password Secure Note: "AMM Launch Proof Pack") — not in the git repository and not in Slack/email.
