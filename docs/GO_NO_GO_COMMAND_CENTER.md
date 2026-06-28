# Go / No-Go Command Center — Ask Magic Mike

**Version:** LC-7 (post-merge-train #44–#52)  
**Code state:** `main` @ `815a33a` — authority packet complete  
**Launch authority script:** `npm run amm:launch:authority`  
**Operator:** Brandon Narron  
**Companion documents:**
- `docs/CONTROLLED_TRAFFIC_ACTIVATION.md` — private test and limited traffic activation sequence

---

## §1 — Current Launch Status

**CURRENT STATUS: NOT GO — OWNER ACTION REQUIRED**

The codebase is launch-ready. Every code-level gate has passed. The remaining blockers are owner-gated actions that require production credentials (Vercel Dashboard, Supabase Dashboard, browser) that only Brandon can complete.

This status will change to GO only after OA-1 through OA-5 are completed and verified per `docs/OWNER_ACTION_PROOF_PACK.md`.

---

## §2 — What Is Already Complete

| Layer | Status | Evidence |
|---|---|---|
| Code / funnel | ✅ DONE | 1187/1187 tests, build clean, funnel 15/15 |
| Visual system (LC-1) | ✅ DONE | Merged PR #47 @ `4d55923` |
| Conversion polish (LC-2) | ✅ DONE | Merged PR #48 @ `d332468` |
| Final audit + docs (LC-3) | ✅ DONE | Merged PR #49 @ `674edde` |
| Owner action runbook (LC-4) | ✅ DONE | Merged PR #50 @ `ba7f40f` |
| Deploy rehearsal + proof pack (LC-5) | ✅ DONE | Merged PR #51 @ `cd9a83b` |
| Go/No-Go command center (LC-6) | ✅ DONE | This document |
| Controlled traffic activation (LC-7) | ✅ DONE | Merged PR #52 @ `815a33a` |
| Security headers | ✅ DONE | HSTS, X-Content-Type, Referrer-Policy in production |
| Embed CSP frame-ancestors | ✅ DONE | ourtownproperties.com + subdomains permitted |
| Admin auth (401 gate) | ✅ DONE (code) | Requires OA-3 to verify against production |
| No mock data in production | ✅ DONE (code) | Requires OA-3 to confirm no DEV MOCK banner |
| Lead intake → scoring → routing | ✅ DONE | Requires OA-5 to verify end-to-end |
| UTM attribution capture | ✅ DONE | Requires OA-5/OA-6 to verify sessionStorage |
| Stale vercel.app URLs | ✅ DONE | All operational docs cleaned (LC-3) |
| Red-* token violations | ✅ DONE | Fixed in Epsilon (PR #45) |
| MLS/FlexMLS in public source | ✅ DONE | Confined to internal library paths |
| Launch doctor: 0 FAIL | ✅ DONE | 26 PASS / 6 SKIP / 0 FAIL |
| Public CTA check: PASS | ✅ DONE | `npm run amm:public:cta-check` → PUBLIC_CTA_CHECK: PASS |

---

## §3 — What Remains Owner-Gated

All six items below are SKIPs in the launch doctor — not FAILs. The code is correct. Brandon must complete these with production credentials.

| # | Owner Action | Where | Procedure | Evidence Template |
|---|---|---|---|---|
| OA-1 | Set 11 env vars in Vercel | Vercel Dashboard | CONTROLLED_LAUNCH_RUNBOOK.md §2 | OWNER_ACTION_PROOF_PACK.md §4 |
| OA-2 | Verify 13 Supabase tables + RLS + agent seed | Supabase Dashboard | CONTROLLED_LAUNCH_RUNBOOK.md §3 | OWNER_ACTION_PROOF_PACK.md §5 |
| OA-3 | Admin auth: 401 → 200 → no DEV MOCK banner | Browser incognito | CONTROLLED_LAUNCH_RUNBOOK.md §4 | OWNER_ACTION_PROOF_PACK.md §6 |
| OA-4 | Production smoke: 0 fail | Terminal | CONTROLLED_LAUNCH_RUNBOOK.md §5 | OWNER_ACTION_PROOF_PACK.md §7 |
| OA-5 | Submit test lead; verify in admin; delete | Browser + Supabase | CONTROLLED_LAUNCH_RUNBOOK.md §6–§7 | OWNER_ACTION_PROOF_PACK.md §8 |
| OA-6 | WordPress CTAs updated to canonical URLs | WordPress Admin | CONTROLLED_LAUNCH_RUNBOOK.md §8 | OWNER_ACTION_PROOF_PACK.md §9 |

**OA-6 is medium priority.** OA-1 through OA-5 are hard blocks for any traffic. OA-6 is required before directing WordPress visitors, but not before Brandon and Mike privately access the site directly.

---

## §4 — Hard GO Criteria

Every item below must be checked before authorizing any traffic:

```
[ ] OA-1 COMPLETE — All 11 Vercel env vars set; health check returns all-true booleans
[ ] OA-2 COMPLETE — All 13 Supabase tables exist; RLS enabled; Mike Eatmon agent row present
[ ] OA-3 COMPLETE — /admin returns 401 without creds; loads correctly with creds; no DEV MOCK banner
[ ] OA-4 COMPLETE — Production smoke: npm run amm:smoke:prod → 19+ pass / 0 fail
[ ] OA-5 COMPLETE — Test lead submitted, scored, visible in /admin, deleted from all 5 tables
[ ] amm:launch:authority output is NOT NOT_GO_FAILING_CHECKS
[ ] amm:launch:authority output is NOT_GO_OWNER_ACTION_REQUIRED or GO_CONTROLLED_TRAFFIC_READY
```

Only when all 6 OA items are complete and `amm:launch:authority` reports `GO_CONTROLLED_TRAFFIC_READY` is the decision binary: GO.

---

## §5 — Hard NO-GO Criteria

Stop immediately if any of the following are true:

```
[ ] amm:launch:authority reports LAUNCH_AUTHORITY: NOT_GO_FAILING_CHECKS
[ ] npm run amm:launch:doctor reports any FAIL
[ ] npm run amm:smoke:prod reports any FAIL
[ ] /admin loads without a password prompt in production
[ ] DEV MOCK DATA banner is visible on production /admin
[ ] Test lead is submitted but does not appear in Supabase leads table
[ ] NEXT_PUBLIC_SITE_URL is not exactly https://www.askmagicmike.com
[ ] Health endpoint returns false for SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
[ ] Any public route (/, /value, /ask) returns 500 instead of styled error page
[ ] More than 10% of /api/intake/submit calls return 5xx after go-live
```

---

## §6 — Controlled Traffic Definition

**Controlled traffic** means:
- Brandon and/or Mike Eatmon accessing `www.askmagicmike.com` directly via URL
- Sharing the URL privately with Mike for review before any WordPress CTAs go live
- NO public social posting, NO paid traffic, NO WordPress CTA activation until OA-6 is verified
- NO SMS/call outreach until TCPA attorney review is complete (soft blocker B-05)

**NOT controlled traffic:**
- Posting the URL publicly on social media
- Activating WordPress CTAs before OA-6 evidence is captured
- Running any SMS or outbound call campaign
- Paid advertising to the domain

---

## §7 — Launch Command Sequence

Run these in order on launch day. Full procedure: `docs/PRODUCTION_DEPLOY_REHEARSAL.md`.

```bash
# Step 1 — Pre-deploy doctor (static checks)
npm run amm:launch:authority

# Expected: LAUNCH_AUTHORITY: NOT_GO_OWNER_ACTION_REQUIRED
# (will become GO_CONTROLLED_TRAFFIC_READY after env vars are set locally,
#  but the real verification is production behavior below)

# Step 2 — After Vercel redeploy with env vars set
npm run amm:launch:doctor

# Expected: 32 PASS / 0 SKIP / 0 FAIL (if ADMIN_SECRET and others are exported)
# or: 26 PASS / 6 SKIP / 0 FAIL (if env vars not in local shell)

# Step 3 — Production smoke (read-only, no mutations)
npm run amm:smoke:prod
# or with ADMIN_SECRET for admin health check:
ADMIN_SECRET=your_secret npm run amm:smoke:prod

# Expected: Totals: 19 pass · 2 skip · 0 fail
# (or 20 pass · 1 skip · 0 fail with ADMIN_SECRET)

# Step 4 — Funnel verify
npm run amm:verify:funnel

# Expected: 15/15 PASS — CONVERSION_FUNNEL_VERIFY_PASS

# Step 5 — Launch authority final gate
npm run amm:launch:authority

# If GO_CONTROLLED_TRAFFIC_READY: proceed to test lead
# If NOT_GO_*: stop and investigate
```

---

## §8 — Gate Summary Table

| Gate | Current Status | Evidence Source | Required For GO | Owner | Decision |
|---|---|---|---|---|---|
| Code: tests 1187/1187 | ✅ PASS | CI / `npm test` | Controlled traffic | System | GO |
| Code: typecheck clean | ✅ PASS | `npm run typecheck` | Controlled traffic | System | GO |
| Code: build clean | ✅ PASS | `npm run build` | Controlled traffic | System | GO |
| Code: funnel 15/15 | ✅ PASS | `npm run amm:verify:funnel` | Controlled traffic | System | GO |
| Code: launch doctor 0 FAIL | ✅ PASS | `npm run amm:launch:doctor` | Controlled traffic | System | GO |
| OA-1: Vercel env vars | ⏳ NOT DONE | OWNER_ACTION_PROOF_PACK §4 | Controlled traffic | Brandon | NOT GO YET |
| OA-2: Supabase migrations + RLS | ⏳ NOT DONE | OWNER_ACTION_PROOF_PACK §5 | Controlled traffic | Brandon | NOT GO YET |
| OA-3: Admin auth verified | ⏳ NOT DONE | OWNER_ACTION_PROOF_PACK §6 | Controlled traffic | Brandon | NOT GO YET |
| OA-4: Smoke 0 fail | ⏳ NOT DONE | OWNER_ACTION_PROOF_PACK §7 | Controlled traffic | Brandon | NOT GO YET |
| OA-5: Test lead end-to-end | ⏳ NOT DONE | OWNER_ACTION_PROOF_PACK §8 | Controlled traffic | Brandon | NOT GO YET |
| B-01: Rate limiter (Upstash) | ⏳ SOFT BLOCK | KNOWN_BLOCKERS.md B-01 | High-traffic | Brandon | NOT GO for broad |
| B-02: Admin session auth | ⏳ SOFT BLOCK | KNOWN_BLOCKERS.md B-02 | High-traffic | Engineering | NOT GO for broad |
| B-03: NC license # in UI | ⏳ SOFT BLOCK | KNOWN_BLOCKERS.md B-03 | Broad public | Mike Eatmon | NOT GO for broad |
| B-04: Privacy policy /privacy | ⏳ SOFT BLOCK | KNOWN_BLOCKERS.md B-04 | Broad public | Legal | NOT GO for broad |
| B-05: TCPA attorney review | ⏳ SOFT BLOCK | KNOWN_BLOCKERS.md B-05 | Before outreach | Attorney | NOT GO for SMS |
| OA-6: WordPress CTAs | ⏳ MEDIUM | OWNER_ACTION_PROOF_PACK §9 | Before WP traffic | Brandon | SEPARATE STEP |

---

## §9 — Required Evidence Links

Before authorizing traffic, Brandon must have completed and stored (in 1Password Secure Note "AMM Launch Proof Pack"):

| Evidence | Template | Storage |
|---|---|---|
| Vercel env var names screenshot (values masked) | OWNER_ACTION_PROOF_PACK.md §4 | 1Password |
| Supabase table list screenshot | OWNER_ACTION_PROOF_PACK.md §5 | 1Password |
| Admin 401 screenshot (no creds) | OWNER_ACTION_PROOF_PACK.md §6 | 1Password |
| Admin dashboard screenshot (no DEV MOCK banner) | OWNER_ACTION_PROOF_PACK.md §6 | 1Password |
| Smoke test summary line (Totals: N pass · N skip · 0 fail) | OWNER_ACTION_PROOF_PACK.md §7 | Pasted in §7 |
| Confirmation screen screenshot | OWNER_ACTION_PROOF_PACK.md §8 | 1Password |
| Test lead deleted confirmation | OWNER_ACTION_PROOF_PACK.md §8 | Noted in §8 |

---

## §10 — Rollback Authority

**Who can roll back:** Brandon Narron (operator).  
**How:** Vercel Dashboard → Project → Deployments → three-dot menu → Promote to Production (previous deployment).  
**When:** Any NO-GO condition in §5, or if Vercel function logs show >10% 5xx on `/api/intake/submit`.  
**No code changes required** — all LC-6 changes are documentation only. Rolling back to any prior `main` commit is safe.

Full rollback procedure: `docs/PRODUCTION_DEPLOY_REHEARSAL.md` → Rollback Procedure section.

---

## §11 — First 24-Hour Monitoring

After go-live, monitor at these intervals:

| Checkpoint | Time | What to Check | Where |
|---|---|---|---|
| Immediate | T+0 | Re-run smoke, confirm 0 fail | Terminal |
| First real lead | T+varies | Lead in Supabase; score populated; attribution captured | Supabase Dashboard |
| 1 hour | T+1h | Vercel function logs — no 5xx spike | Vercel Dashboard |
| 1 hour | T+1h | Supabase logs — no RLS violations | Supabase Logs |
| 4 hours | T+4h | /admin — all leads scored, no mock data banner | Browser |
| 24 hours | T+24h | Today's Operations panel — no unresolved SLA breaches | /admin |
| 24 hours | T+24h | analytics_events — confirm event types present | Supabase |

Full monitoring cadence: `docs/PRODUCTION_DEPLOY_REHEARSAL.md` → First-Hour Monitoring section.

---

## §12 — Final Sign-Off Block

To be completed by Brandon Narron after all hard-block items pass:

```
Operator: Brandon Narron
Date of sign-off: ____________________

Hard-block gates (OA-1 through OA-5):
  [ ] OA-1 Vercel env vars — complete and verified
  [ ] OA-2 Supabase tables, RLS, agent row — complete and verified
  [ ] OA-3 Admin auth (401/200/no mock) — complete and verified
  [ ] OA-4 Production smoke (0 fail) — complete and verified
  [ ] OA-5 Test lead (submitted, scored, deleted) — complete and verified

Evidence stored in 1Password Secure Note "AMM Launch Proof Pack": [ ] YES

amm:launch:authority output: ____________________

Controlled traffic decision:
  [ ] GO — proceeding to direct URL private testing with Mike Eatmon
  [ ] NO-GO — reason: ____________________

WordPress CTA activation (separate step):
  [ ] OA-6 complete — proceeding to WordPress CTAs
  [ ] OA-6 deferred — reason: ____________________

Controlled traffic activation sequence: docs/CONTROLLED_TRAFFIC_ACTIVATION.md
```
