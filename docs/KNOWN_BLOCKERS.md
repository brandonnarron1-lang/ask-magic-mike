# Known Launch Blockers

Hard stops — launch is blocked until every item here is resolved and removed from this list.

See `docs/PRODUCTION_LAUNCH_GATE.md` for the full pre-launch checklist.

---

## Hard blockers (launch cannot proceed)

### B-01 — Rate limiter is in-memory only

**File:** `src/lib/security/rate-limit.ts`  
**Impact:** Rate limits reset on every cold start and are not shared across Vercel instances. An attacker can bypass all limits by waiting for a cold start or routing to a new instance.  
**Fix:** Migrate to Upstash Redis (`@upstash/ratelimit`). Requires owner approval (paid dependency).  
**Plan:** `docs/RATE_LIMITING_DURABILITY_PLAN.md`  
**Owner:** TBD · **ETA:** Before launch

---

### B-02 — Admin auth is Basic Auth (not session-based)

**File:** `src/lib/admin/auth.ts`  
**Impact:** Basic Auth credentials are sent on every request in base64. No session expiry, no CSRF protection, no audit of failed login attempts. Acceptable for closed beta; not acceptable for high-traffic production.  
**Fix:** Implement session-based auth (e.g., iron-session or Supabase Auth with admin role).  
**Owner:** Engineering · **ETA:** Before high-traffic launch

---

### B-03 — NC agent license number not set

**Variable:** `NEXT_PUBLIC_AGENT_LICENSE`  
**Impact:** License number placeholder in UI is blank. Required for NC § 93A compliance.  
**Fix:** Confirm Mike Eatmon's license number and set the env var in Vercel.  
**Owner:** Mike Eatmon · **ETA:** Before launch

---

### B-04 — Privacy policy page missing

**Route:** `/privacy`  
**Impact:** TCPA consent form references a privacy policy. If the page is 404, the consent flow has a broken link.  
**Fix:** Create `/privacy` route with attorney-reviewed policy text.  
**Owner:** TBD (legal) · **ETA:** Before launch

---

### B-05 — TCPA consent language not attorney-reviewed

**File:** `src/components/intake/step-consent.tsx`  
**Impact:** Consent copy has not been reviewed by a licensed attorney. TCPA non-compliance can result in statutory damages ($500–$1,500 per violation).  
**Fix:** Legal review and approval of current consent language.  
**Owner:** TBD (attorney) · **ETA:** Before launch

---

## Soft blockers (advisable before high-traffic launch)

### S-01 — PR #8 (V8 value page) needs rebase before it is safe to merge

**PR:** #8 (`feat: integrate v8 value page experience`)  
**Impact:** Branch is 30+ days stale; 179 files changed, main now at 1137 tests (was ~370). `MERGESTATE: UNKNOWN` (GitHub cannot auto-check). Confirmed conflicts with `src/components/campaign/value-hero.tsx` (LC-1 modified this file heavily) and multiple doc files.  
**Assessment (LC-2 sprint, 2026-06-26):** NOT safe to merge without a dedicated rebase sprint. A rebase will surface real conflicts in value-hero.tsx and potentially other landing components. Full rebase, conflict resolution, validation, and product review are required.  
**Fix:** Dedicate a branch sprint: checkout PR #8 branch, `git rebase main`, resolve conflicts (value-hero.tsx is the likely hotspot), re-run full validation (typecheck/lint/1137 tests/build/funnel), get product review, then open a new PR against current main.  
**Owner:** Brandon · **ETA:** Dedicated sprint — not in LC-2

---

### S-02 — CRM adapter inactive (null adapter only)

**Impact:** No leads are synced to Follow Up Boss or kvCORE until credentials are configured.  
**Fix:** Set `FUB_API_KEY` (or `KVCORE_API_KEY` + `KVCORE_BASE_URL`) in Vercel and verify `crm_sync_log` entries.  
**Owner:** Mike Eatmon · **ETA:** When CRM account is ready

---

### ~~S-04 — YouTube badge uses prohibited red-* token~~ ✅ RESOLVED

Fixed in PR #45 (Epsilon), merged 2026-06-26. `bg-ruby-400/[0.14] text-ruby-300` is now on main.

---

### S-03 — listings table migration (00012) not yet applied to prod

**Context:** See memory: `listings-table-not-in-prod`. Migration 00012 was not in prod when last checked (lead API 500'd, hotfix PR #5 degraded safely). Verify via Supabase dashboard that 00012 and 00013 are applied.  
**Fix:** Apply pending migrations via Supabase dashboard or CLI.  
**Owner:** Brandon · **ETA:** Before broker panel goes live
