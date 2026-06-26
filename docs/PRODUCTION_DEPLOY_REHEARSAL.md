# Production Deploy Rehearsal — Ask Magic Mike

**Version:** LC-6 (post-merge-train #44–#51)  
**Code state:** `main` @ `cd9a83b` — launch-ready  
**Audience:** Brandon Narron (operator)  
**Estimated total time:** 60–90 minutes with credentials in hand  
**Companion documents:**
- `docs/GO_NO_GO_COMMAND_CENTER.md` — final launch authority decision and gate table
- `docs/CONTROLLED_LAUNCH_RUNBOOK.md` — full procedures for each step
- `docs/OWNER_ACTION_PROOF_PACK.md` — evidence capture template
- `docs/KNOWN_BLOCKERS.md` — outstanding blockers

This document is the deployment-day timeline. Follow it top to bottom. Every row has a Stop If column — if the condition is met, stop and investigate before continuing. Do not skip rows.

---

## Pre-Deploy Gate (complete before starting the clock)

All items below must be true before beginning the timed sequence:

```
[ ] All 11 Vercel env vars are set in Vercel Dashboard (see docs/CONTROLLED_LAUNCH_RUNBOOK.md §2)
[ ] ADMIN_SECRET exported in your local terminal session for smoke test auth
[ ] Supabase project URL and anon key confirmed in a working local .env.local for verification only
[ ] Incognito browser window open to www.askmagicmike.com
[ ] Supabase Dashboard open in a separate tab
[ ] Vercel Dashboard open in a separate tab
[ ] Terminal open in the ask-magic-mike repo directory
[ ] docs/OWNER_ACTION_PROOF_PACK.md open for evidence logging
[ ] docs/CONTROLLED_LAUNCH_RUNBOOK.md §9 rollback steps read and understood
```

---

## Deploy Rehearsal Sequence

| Time | Operator | Action | Command / Location | Expected Result | Stop If |
|---|---|---|---|---|---|
| T-30m | Brandon | Trigger Vercel production redeploy after last env var is set | Vercel Dashboard → Project → Deployments → Redeploy | Deployment state changes to READY | Deployment fails or stays BUILDING beyond 10 minutes |
| T-15m | Brandon | Confirm deployment is live | Vercel Dashboard → Deployments → latest deployment | Status: READY, target: production, aliased to www.askmagicmike.com | Status is ERROR or deployment is not aliased |
| T-10m | Brandon | Run launch doctor | `npm run amm:launch:doctor` | 21 PASS / 6 SKIP (owner env vars) / 0 FAIL — or all 27 PASS if env vars are set locally | Any FAIL output |
| T-5m | Brandon | Run production smoke (read-only) | `npm run amm:smoke:prod` | `Totals: 19 pass · 2 skip · 0 fail` | Any FAIL output |
| T-5m | Brandon | Run production smoke with admin auth | `ADMIN_SECRET=your_secret npm run amm:smoke:prod` | `Totals: 20 pass · 1 skip · 0 fail` | Any FAIL output — especially admin:health or admin:no_mock_data |
| T-3m | Brandon | Run funnel verify | `npm run amm:verify:funnel` | `15/15 PASS — CONVERSION_FUNNEL_VERIFY_PASS` | Any FAIL output |
| T-0 | Brandon | Verify admin access (incognito) | Open https://www.askmagicmike.com/admin in incognito | Browser auth challenge appears immediately | Admin page loads without credentials prompt |
| T-0 | Brandon | Enter correct credentials | Enter ADMIN_SECRET as password in auth dialog | Admin dashboard loads with live data, no yellow DEV MOCK DATA banner | DEV MOCK DATA banner visible, or "Admin not configured" error |
| T+2m | Brandon | Submit one real test lead | Open https://www.askmagicmike.com/ask in incognito (see docs/CONTROLLED_LAUNCH_RUNBOOK.md §6) | Confirmation screen shows "Your request is in"; "What happens now" panel visible | Any error screen or blank page |
| T+3m | Brandon | Verify test lead in Supabase | Supabase Dashboard → Table Editor → leads | Row exists, score and temperature populated, created_at within last 5 minutes | Row missing, score null, temperature null |
| T+4m | Brandon | Verify test lead in /admin | Refresh /admin, find test lead in Recent Leads | Row visible, temperature badge colored, score number visible | Lead missing from admin |
| T+5m | Brandon | Delete test lead from all 5 tables | Supabase → leads, sessions, contacts, consents, source_attribution → delete matching rows | All 5 rows deleted; no PII remains | Any error during deletion — note and continue, do not abort launch |
| T+10m | Brandon | Verify health endpoint | `curl -s -H "x-admin-secret: $ADMIN_SECRET" https://www.askmagicmike.com/api/admin/health \| python3 -m json.tool` | All boolean fields return `true` | Any field returns `false` |
| T+15m | Brandon | Check Vercel function logs | Vercel Dashboard → Project → Functions → Logs | No 5xx errors from the test lead submission | 5xx errors in logs — investigate before sending traffic |
| T+20m | Brandon | Check Supabase logs | Supabase Dashboard → Logs → API/Database | No RLS policy violations or auth errors | RLS violations or unexpected auth failures |
| T+30m | Brandon | WordPress CTA verification (if ready) | Open ourtownproperties.com homepage in incognito → click CTA button | URL bar shows `www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=homepage_cta...` | CTA routes to vercel.app preview URL or missing UTM params |
| T+35m | Brandon | Log go/no-go decision | Record in docs/OWNER_ACTION_PROOF_PACK.md §10 | All hard-block items checked; signature recorded | Any unchecked hard-block item — stop |
| T+40m | Brandon | (Optional) Share URL with Mike Eatmon for private review | Send www.askmagicmike.com link directly to Mike | Mike can access the site and submit a test question | Do not send to broader audience until Mike has reviewed |

---

## First-Hour Monitoring

After the go/no-go decision is recorded and first traffic is received:

| Time | Operator | Action | Command / Location | Expected Result | Stop If |
|---|---|---|---|---|---|
| T+0 real traffic | Brandon | Monitor Vercel function logs | Vercel Dashboard → Functions → Logs → live | `/api/intake/submit` returns 200s; no 5xx spike | More than 10% of intake submit calls return 5xx — roll back immediately |
| T+1h | Brandon | Check lead count in Supabase | Supabase → leads table → count | Rows are being created; scores are populated | Zero rows after confirmed submissions — intake API is failing silently |
| T+1h | Brandon | Run smoke again | `npm run amm:smoke:prod` | Still 19+ pass / 0 fail | Any new FAIL |
| T+1h | Brandon | Check /admin for first real lead | https://www.askmagicmike.com/admin | Lead visible; temperature badge; score; source attribution from entry point | Lead missing; or score 0; or attribution blank |
| T+4h | Brandon | Review all leads submitted | /admin → Recent Leads | No anomalies; scoring looks correct; no DEV MOCK banner has appeared | Any DEV MOCK banner — investigate immediately |
| T+24h | Brandon | Review "Today's Operations" panel | /admin → Today's Operations | Any follow-up due or never contacted alerts are accurate | Operations panel shows error |
| T+24h | Brandon | Check crm_sync_log | Supabase → crm_sync_log | Status: `skipped` for all rows (expected — null CRM adapter) | Status: `error` — investigate |
| T+24h | Brandon | Check analytics_events | Supabase → analytics_events | Event types include: `session_created`, `intake_completed`, `lead_scored` | No events — analytics pipeline is broken |

---

## Rollback Trigger List

Roll back the Vercel deployment immediately if ANY of the following are true:

```
[ ] More than 10% of /api/intake/submit calls return 5xx in Vercel logs
[ ] /admin loads without authentication after go-live
[ ] DEV MOCK DATA banner appears in production /admin
[ ] Leads are submitted but not appearing in Supabase
[ ] Health endpoint returns false for SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
[ ] Any public page returns 500 instead of a styled error page
```

**Rollback procedure (no code changes required):**

```
1. Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment (the one before the current production alias)
3. Click the three-dot menu → "Promote to Production"
4. Wait for deployment state: READY
5. Run: npm run amm:smoke:prod
6. Confirm: 19+ pass / 0 fail
7. Investigate root cause before re-promoting the current deployment
```

---

## Rollback Communication Note

If rollback is triggered:

1. Do NOT post publicly about the rollback.
2. Do NOT tell anyone who submitted a real lead during the window that there was a technical issue.
3. Any leads captured during the window are real — check Supabase to confirm they were saved. If the DB write succeeded before the rollback, the leads are intact.
4. Contact Mike Eatmon privately to let him know the timeline has shifted.
5. Document the root cause and fix before re-attempting go-live.

---

## Final Go/No-Go Decision

Before authorizing any traffic source to point at `www.askmagicmike.com`:

```
Hard blocks (all must be PASS):
[ ] Vercel env vars — all 11 set and health check all-true
[ ] Supabase — 13 tables, RLS enabled, Mike agent row present
[ ] Admin 401 without creds, dashboard loads with creds, no DEV MOCK banner
[ ] Production smoke: 19+ pass / 0 fail
[ ] Test lead appears in Supabase and /admin with score + temperature

Medium (should be done before broad public traffic):
[ ] WordPress CTAs updated to www.askmagicmike.com canonical URLs with UTM params
[ ] NEXT_PUBLIC_AGENT_LICENSE set to Mike's NC license number
[ ] TCPA consent language reviewed by attorney

Owner decision recorded in docs/OWNER_ACTION_PROOF_PACK.md §10.
```
