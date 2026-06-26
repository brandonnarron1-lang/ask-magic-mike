# Controlled Traffic Activation — Ask Magic Mike

**Version:** LC-7  
**Code state:** `main` @ `815a33a` — authority packet complete  
**Audience:** Brandon Narron (operator)  
**Authority gate:** `npm run amm:launch:authority` must end with `NOT_GO_OWNER_ACTION_REQUIRED` — not FAILING_CHECKS  
**Companion documents:**
- `docs/GO_NO_GO_COMMAND_CENTER.md` — single-page authority decision
- `docs/CONTROLLED_LAUNCH_RUNBOOK.md` — full procedure detail for each step
- `docs/OWNER_ACTION_PROOF_PACK.md` — evidence capture template
- `docs/PRODUCTION_DEPLOY_REHEARSAL.md` — deployment-day timeline

This document converts launch authority into the exact private-test and limited-traffic activation sequence. Follow each stage in order. Do not advance to the next stage until the current stage's Stop If column is clear.

---

## §1 — Purpose and Scope

This is the execution document for moving from "code is ready" to "real people can reach www.askmagicmike.com." It covers:

- Private test by operator (Brandon) and broker (Mike Eatmon) only
- Confirmation of first real lead in production database
- Activating the three WordPress CTAs on ourtownproperties.com
- 24-hour monitoring window before any broader traffic

It does NOT cover:
- Paid advertising — separate approval required
- Mass email / SMS outreach — separate compliance review required
- Social media announcement — separate content review required
- MLS / IDX data integration — separate broker board approval required

---

## §2 — Prerequisites

All five owner actions must be complete before Stage 1. Verify each in `docs/OWNER_ACTION_PROOF_PACK.md` before starting.

| Owner Action | Required For | Verification |
|---|---|---|
| OA-1: Vercel env vars set | Every stage | `docs/OWNER_ACTION_PROOF_PACK.md` §3 row OA-1 = ✅ PASS |
| OA-2: Supabase tables + RLS verified | Every stage | §3 row OA-2 = ✅ PASS (all 13 tables, RLS enabled) |
| OA-3: Admin auth verified | Every stage | §3 row OA-3 = ✅ PASS (401 without creds, 200 with creds, no mock banner) |
| OA-4: Production smoke passed | Every stage | §3 row OA-4 = ✅ PASS (`19+ pass · 0 fail`) |
| OA-5: One real test lead submitted and confirmed | Stage 2+ | §3 row OA-5 = ✅ PASS (lead in Supabase + /admin) |

Run `npm run amm:launch:authority` before starting. Authority must be `NOT_GO_OWNER_ACTION_REQUIRED` (OA-1–OA-5 incomplete) or — after all five are done — `GO_CONTROLLED_TRAFFIC_READY`.

**If authority is `NOT_GO_FAILING_CHECKS`, stop. Do not proceed to any stage.**

---

## §3 — Activation Stage Table

| Stage | Action | Owner | Evidence | Stop If | Status |
|---|---|---|---|---|---|
| S1: Private test | Redeploy Vercel after all env vars set; verify site loads at www.askmagicmike.com | Brandon | Vercel Dashboard: deployment READY, aliased to www.askmagicmike.com | Deployment fails or is not aliased | ⬜ TODO |
| S1: Smoke | `npm run amm:smoke:prod` passes | Brandon | Terminal: `19 pass · 2 skip · 0 fail` (or better) | Any FAIL | ⬜ TODO |
| S1: Admin verified | `/admin` 401 without creds; dashboard loads with live data, no mock banner | Brandon | Screenshot (mask credentials) | Mock banner visible; page loads without auth | ⬜ TODO |
| S1: Mike private review | Send www.askmagicmike.com link to Mike Eatmon via direct message — NOT social/email | Brandon → Mike | Mike confirms site loads and looks correct | Mike reports issues or cannot access | ⬜ TODO |
| S2: Real test lead | Submit one real test lead via /ask (operator email/phone only; see §5) | Brandon | Confirmation screen captured | Error screen; no confirmation | ⬜ TODO |
| S2: Lead in Supabase | Test lead appears in leads table with score + temperature populated | Brandon | Supabase Dashboard screenshot (redact contact info) | Lead missing; score null; temperature null | ⬜ TODO |
| S2: Lead in /admin | Test lead visible in Recent Leads with temperature badge and score | Brandon | /admin screenshot (redact name/contact) | Lead missing from admin | ⬜ TODO |
| S2: Delete test lead | Delete all 5 related rows (sessions, leads, contacts, consents, source_attribution) | Brandon | Note row IDs deleted | Deletion errors — note and continue | ⬜ TODO |
| S3: WP CTAs live | Update three WordPress CTA buttons to www.askmagicmike.com/value?utm_source=ourtown_wp... URLs | Brandon / Regency | Browser: CTA click routes to correct URL with UTM params | CTA routes to vercel.app preview URL; UTM params missing | ⬜ TODO |
| S3: UTM captured | UTM params captured in sessionStorage on landing | Brandon | DevTools → Application → Storage → amm_attribution shows utm_source: ourtown_wp | Key missing or empty | ⬜ TODO |
| S4: 1h monitor | 1 hour after first real traffic: check Vercel function logs, Supabase, /admin | Brandon | No 5xx errors; leads appearing; scores populated | >10% of intake submit calls return 5xx — pause immediately | ⬜ TODO |
| S4: 24h monitor | Next morning: review all leads, crm_sync_log, analytics_events | Brandon | /admin shows correct leads; crm_sync_log status: skipped; events include intake_completed | Any 5xx pattern; DEV MOCK banner appearance | ⬜ TODO |

---

## §4 — Stage 1: Private Test Deployment

**Trigger:** All OA-1–OA-4 complete. OA-5 not yet required.

```bash
# 1. Confirm deployment is live
# Vercel Dashboard → Project → Deployments → confirm latest is READY + aliased to www.askmagicmike.com

# 2. Run smoke (read-only, no credentials needed)
npm run amm:smoke:prod

# 3. Run launch authority report
npm run amm:launch:authority

# 4. Run public CTA final check
npm run amm:public:cta-check

# 5. Run funnel verify
npm run amm:verify:funnel
```

After all pass, send the URL to Mike Eatmon via direct message. Do not post publicly. Do not send to leads. Ask Mike to confirm the site loads, copy reads correctly, and CTAs work.

**Stop conditions:**
- Any smoke FAIL
- Mike reports the site does not load or looks wrong
- `amm:public:cta-check` ends with `PUBLIC_CTA_CHECK: FAIL`

---

## §5 — Stage 2: First Real Lead Confirmation

**Trigger:** Stage 1 complete. Mike confirmed site looks correct.

Submit one real lead using operator credentials (Brandon's email and phone number only). Do not use fake contact info — the lead will create a real database record that must be deleted afterward.

```
URL:   https://www.askmagicmike.com/ask
Name:  Brandon Narron (operator test)
Email: brandonnarron1@gmail.com
Phone: your mobile (optional)
Question: "This is a launch verification test from the operator. Please disregard."
Intent:   "Just exploring"
Timeline: "Not sure"
Consent:  Check all three boxes
```

**After submission:**
1. Confirm "Your request is in" screen appears
2. Confirm "What happens now" 3-step panel is visible
3. Check Supabase leads table — row should appear within 30 seconds
4. Verify score and temperature are populated (not null/0)
5. Check /admin — lead visible in Recent Leads within 60 seconds
6. Delete all 5 related rows from Supabase (leads, sessions, contacts, consents, source_attribution)

Record each step in `docs/OWNER_ACTION_PROOF_PACK.md` §3 rows OA-5.

**Stop conditions:**
- Confirmation screen does not appear
- Lead does not appear in Supabase within 2 minutes
- Score is null or 0 after 2 minutes

---

## §6 — Stage 3: WordPress CTA Activation

**Trigger:** Stage 2 complete. Test lead confirmed and deleted.

**What to activate:** The three WordPress CTAs on ourtownproperties.com. These are the only traffic source for controlled launch. No paid advertising. No social posts.

| Page | Button Label | Target URL |
|---|---|---|
| Homepage | (Mike's CTA button) | `https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike` |
| Mike Eatmon profile page | (profile CTA button) | `https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike` |
| We Buy Homes / Seller page | (seller CTA button) | `https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike` |

**Verification per CTA:**
1. Open the WordPress page in incognito
2. Click the CTA button
3. Confirm URL bar shows `www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=...`
4. Open DevTools → Application → Storage → Local/Session Storage → confirm `amm_attribution` key has `utm_source: ourtown_wp`
5. Do NOT complete a fake lead submission from the WordPress CTA

Record WordPress CTA evidence in `docs/OWNER_ACTION_PROOF_PACK.md` §3 rows OA-6.

---

## §7 — Stage 4: 24-Hour Monitoring

After WordPress CTAs are live, monitor for 24 hours before any additional traffic sources.

| Time | Action | Check | Stop If |
|---|---|---|---|
| T+15m | Vercel function logs | `/api/intake/submit` returns 200s | More than 10% 5xx — pause immediately |
| T+1h | Supabase leads table | Rows being created; scores populated; source attribution `utm_source: ourtown_wp` | Zero rows after real traffic — intake failing silently |
| T+1h | Run smoke | `npm run amm:smoke:prod` → 19+ pass / 0 fail | Any new FAIL |
| T+1h | /admin | First real lead visible; temperature badge; score; no DEV MOCK banner | Mock banner appears |
| T+4h | /admin | All leads look correct; no anomalies | Scoring 0 on all leads; or any DEV MOCK appearance |
| T+24h | crm_sync_log | Status: `skipped` for all rows (null CRM adapter, expected) | Status: `error` — investigate |
| T+24h | analytics_events | Event types include `session_created`, `intake_completed`, `lead_scored` | No events at all |

---

## §8 — What Is NOT Activated Here

The following require separate approvals and are explicitly out of scope for controlled traffic activation:

| Channel | Status | Required Before Activation |
|---|---|---|
| Paid advertising (Google, Facebook, etc.) | ❌ Not activated | Separate approval + budget decision |
| Mass email / SMS outreach | ❌ Not activated | TCPA attorney review + DNC scrub |
| Social media announcement posts | ❌ Not activated | Content review by Mike Eatmon |
| MLS / IDX live listing data | ❌ Not activated | IDX agreement from MLS board |
| CRM adapter (Follow Up Boss / kvCORE) | ❌ Not activated | API key setup + CRM account |
| Rate limiter (Upstash Redis) | ❌ Not activated | Upstash account + UPSTASH_REDIS_REST_URL env var |

Do not claim TCPA consent, Redis rate limiting, or MLS/IDX compliance are complete — they are not, and attempting to activate those channels without completing the required steps is a hard stop.

---

## §9 — Escalation and Pause Procedure

If any Stop If condition in §3 is triggered, pause immediately:

```
1. Do not send additional traffic to www.askmagicmike.com
2. Do not post publicly about the issue
3. Do not tell leads or visitors that there is a technical problem
4. Investigate the root cause using:
   - Vercel Dashboard → Functions → Logs
   - Supabase Dashboard → Logs → API / Database
   - npm run amm:smoke:prod (if site is reachable)
5. Document the issue in docs/KNOWN_BLOCKERS.md
6. Fix the root cause before resuming
```

---

## §10 — Hard Stop Conditions

Any one of these = immediate rollback of WordPress CTAs + Vercel deployment:

```
[ ] More than 10% of /api/intake/submit calls return 5xx in Vercel logs
[ ] /admin loads without authentication in production
[ ] DEV MOCK DATA banner appears in production /admin
[ ] Real leads submitted but not appearing in Supabase after 5 minutes
[ ] Health endpoint returns false for SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
[ ] Any public page returns 500 instead of a styled error page
```

**Rollback procedure:**
1. WordPress CTAs: revert CTA buttons to prior URLs or remove buttons in WP Admin
2. Vercel: Dashboard → Project → Deployments → find prior known-good → Promote to Production
3. Run `npm run amm:smoke:prod` on rolled-back deployment to confirm recovery
4. Contact Mike Eatmon privately with a timeline for the fix — do not communicate publicly

---

## §11 — Traffic Pause Diagnostic Commands

Run these if issues are suspected (all read-only, no mutations):

```bash
# Full smoke against production
npm run amm:smoke:prod

# Funnel structure verify
npm run amm:verify:funnel

# Launch authority report
npm run amm:launch:authority

# Launch doctor (static code check)
npm run amm:launch:doctor

# Public CTA static check
npm run amm:public:cta-check

# Health endpoint (requires ADMIN_SECRET exported)
curl -s -H "x-admin-secret: $ADMIN_SECRET" \
  https://www.askmagicmike.com/api/admin/health | python3 -m json.tool
```

---

## §12 — Sign-Off Block

Complete this block before advancing to Stage 3 (WordPress CTAs live):

```
Operator:           Brandon Narron
Date:               _______________
Stage 1 complete:   [ ] Private test passed; Mike confirmed site
Stage 2 complete:   [ ] Test lead submitted, confirmed in Supabase + /admin, deleted
Authority at sign:  [ ] NOT_GO_OWNER_ACTION_REQUIRED (OA items complete) or GO_CONTROLLED_TRAFFIC_READY
Code state:         main @ 815a33a
Decision:           [ ] AUTHORIZED — activate Stage 3 (WordPress CTAs)
```

Evidence for each completed stage is in `docs/OWNER_ACTION_PROOF_PACK.md`.  
Go/No-Go authority decision is in `docs/GO_NO_GO_COMMAND_CENTER.md`.
