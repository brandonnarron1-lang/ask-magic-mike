# Final Owner Actions — Ask Magic Mike

**Produced:** 2026-06-28  
**Autonomous operator:** Claude Code  
**Purpose:** Definitive list of actions only Brandon can take. Everything else is done.

---

## What Is Already Done (No Action Needed)

| Item | Status |
|---|---|
| All 13 Black Diamond PRs (#54–#66) merged to main | ✅ |
| Production deployed — Black Diamond SHA live | ✅ |
| GitHub Ruleset 17291635 — `required_approving_review_count: 1`, enforcement active | ✅ |
| All 10 Vercel production env vars confirmed present (no values printed) | ✅ |
| Vercel cron config — `/api/admin/sla/sweep` at `0 * * * *` in `vercel.json` | ✅ |
| SLA sweep route protected — Bearer CRON_SECRET + admin secret auth | ✅ |
| WordPress `/ask-mike/` embed page — live with `amm-loader.js` + UTMs | ✅ |
| OTP homepage "Ask Mike" nav link — live | ✅ |
| OTP homepage CTA button — live with `utm_source=ourtownproperties&utm_medium=homepage_cta` | ✅ |
| WP install packet + CTA snippets doc created | ✅ |
| UTM attribution in WP snippets doc — fixed | ✅ |
| "Broker-Reviewed Local Guidance" compliance copy — fixed in WP snippets | ✅ |
| `pnpm lint` — EXIT 0 | ✅ |
| `pnpm typecheck` — EXIT 0 | ✅ |
| `pnpm test` — 1793/1793 (85 test files) | ✅ |
| `pnpm build` — clean | ✅ |
| `amm:verify:funnel` — 15/15 PASS | ✅ |
| `amm:launch:doctor` — 26/26 PASS (6 SKIP = env vars, requires Vercel dashboard) | ✅ |
| `amm:public:cta-check` — 16/16 PASS | ✅ |
| Curl smoke — 9/9 routes correct | ✅ |
| Browser smoke — 0 console errors across all reachable routes | ✅ |
| PR #8 (stale V8 content) — closed | ✅ |
| PR #69 (`final-launch-completion-report`) — open, CI SUCCESS, awaiting review | ⏳ |

---

## Action 1 — Approve and Merge PR #69 (HIGHEST PRIORITY)

**What:** PR #69 (`docs/final-launch-completion-report`) contains the final launch report documenting everything completed autonomously. It's docs-only, CI passed, branch protection requires your 1 approval.

**Why this can't be done autonomously:** The branch ruleset requires `required_approving_review_count: 1` with no bypass actors (by design — the agent itself restored this protection).

**How:**
```bash
gh pr review 69 --approve
gh pr merge 69 --squash
```

Or via GitHub UI: open PR #69 → Review → Approve → Squash and merge.

---

## Action 2 — Run End-to-End Lead Submission Test (HIGH)

**What:** Verify the full intake-to-admin pipeline works in production. There is no test mode — `shouldUseDevStorage()` returns `false` in production — so this must be a real submission.

**Procedure:**
1. Open `https://www.askmagicmike.com/ask` in an **incognito** window
2. Complete the form:
   - Name: your name (you'll delete this row)
   - Email: brandonnarron1@gmail.com (so you can confirm it appears)
   - Question: `SMOKE_TEST_DO_NOT_CONTACT — final owner verification`
   - Consent: check all boxes (ensures consent row is written)
3. Submit — confirm the success/thank-you screen appears
4. Check Supabase Dashboard → `leads` table — row exists with composite score and temperature
5. Check `https://www.askmagicmike.com/admin` (requires ADMIN_SECRET) — lead appears in Recent Leads
6. Confirm `utm_source` is `null` (direct incognito visit) or matches the UTM you appended
7. **Delete the test rows** from Supabase: `leads`, `contacts`, `lead_scores`, `consents`, `source_attribution` where `session_id` matches

**Why this can't be done autonomously:** The security constraints prohibit submitting real leads to production, and there is no safe test mode.

---

## Action 3 — Install WordPress CTA on Mike Eatmon Profile Page (MEDIUM)

**What:** Add the broker bio CTA block to the Mike Eatmon agent profile page on `ourtownproperties.com`.

**How:** WP Admin → Pages → Mike Eatmon (or Agents/Team) → Launch Beaver Builder → Add HTML module → paste **Snippet B** from `docs/WORDPRESS_INSTALL_PACKET.md`.

**UTM:** `utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike`

**QA after install:** Load the page in incognito → confirm button renders → click it → confirm URL contains UTMs.

---

## Action 4 — Install WordPress CTA on "We Buy Houses" / Seller Page (MEDIUM)

**What:** Add the seller-focused CTA block to any seller landing page on `ourtownproperties.com`. The nav confirms a "We Buy Houses" page exists at `/we-buy-houses/`.

**How:** WP Admin → Pages → We Buy Houses → Launch Beaver Builder → Add HTML module → paste **Snippet C** from `docs/WORDPRESS_INSTALL_PACKET.md`.

**UTM:** `utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike`

---

## Action 5 — Confirm Vercel Pro Plan (MEDIUM)

**What:** Vercel Cron (the hourly SLA sweep at `/api/admin/sla/sweep`) requires Vercel Pro or higher. The `vercel.json` cron config is correct, but it will silently not fire on the Hobby plan.

**How:** Log into [vercel.com/eyes-up-industries](https://vercel.com/eyes-up-industries) → Settings → Billing → confirm plan is Pro or higher.

If on Hobby: upgrade to Pro ($20/mo) to enable cron jobs.

---

## Action 6 — Create 1200×628 OG Banner Image (LOW)

**What:** The current `og:image` is a 1024×1024 Mike headshot. Twitter's `summary_large_image` card crops this 2:1, which looks poor in social sharing previews. A proper banner would improve LinkedIn/Twitter click-through.

**Spec:** 1200×628 px · PNG or WebP · dark background · Mike headshot left, AMM wordmark right, tagline "Wilson NC Real Estate by Our Town Properties"

**How:** Have Mike or a designer create the asset → save as `public/og-banner.png` → update `src/app/layout.tsx` `openGraph.images` to point to it → deploy via PR.

---

## Remaining Monitoring (First 7 Days)

| When | What to check |
|---|---|
| Day 1 | Vercel Functions log — any 5xx after first real traffic? |
| Day 1 | Supabase `leads` table — real leads appearing with scores? |
| Day 2 | Admin dashboard — temperatures populated, crm_sync_log has no `error` rows |
| Day 3 | Install Mike profile + seller page CTAs (Actions 3 & 4 above) |
| Day 3–5 | Monitor `/admin` daily — any SLA breach flags appearing? |
| Day 7 | Review all leads — routing assignments and source attribution correct? |
| Day 7 | Check `analytics_events` for `intake_completed` — confirms funnel fires end-to-end |

---

## Quick Reference

| Resource | URL |
|---|---|
| Production | https://www.askmagicmike.com |
| Admin dashboard | https://www.askmagicmike.com/admin (ADMIN_SECRET required) |
| Supabase dashboard | supabase.com → your project |
| Vercel dashboard | vercel.com/eyes-up-industries |
| GitHub repo | github.com/brandonnarron1-lang/ask-magic-mike |
| WP admin | https://www.ourtownproperties.com/wp-admin |
| WP install packet | `docs/WORDPRESS_INSTALL_PACKET.md` |
| WP snippets | `docs/wordpress-cta-snippets.md` |
| Launch completion report | `docs/FINAL_LAUNCH_COMPLETION_REPORT.md` |

---

*No code changes are required. All blockers are owner-only manual steps documented above.*
