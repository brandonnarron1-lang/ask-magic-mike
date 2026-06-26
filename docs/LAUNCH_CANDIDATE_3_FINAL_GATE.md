# Launch Candidate 3 — Final Launch Gate

**Branch:** `launch-candidate-3-final-launch-gate`  
**Base:** `main` @ `d332468` (post-LC-2)  
**Sprint type:** Final launch gate, live QA, routing proof, deployment readiness  
**Date:** 2026-06-26  
**Auditor:** Claude Code (LC-3 sprint)

---

## Merge Train State (entering LC-3)

| PR | Title | Status | Commit |
|---|---|---|---|
| #44 Delta | Launch Gate Hardening | ✅ Merged | `f1d344a` |
| #45 Epsilon | Product Hardening | ✅ Merged | `aae43cf` |
| #46 Zeta | Admin UX + Lead Routing | ✅ Merged | `c552ab2` |
| #47 LC-1 | Premium Visual System | ✅ Merged | `4d55923` |
| #48 LC-2 | Public Conversion Polish | ✅ Merged this sprint | `d332468` |
| #8 V8 | V8 Value Page | ❌ CONFLICTING — stale 30+ days | — |

**Main HEAD:** `d332468`  
**Ruleset bypass_actors:** `[]` (verified clean after each merge)

---

## Public Product Audit

| Area | Status | Evidence | Risk | Action Taken | Remaining Owner Action |
|---|---|---|---|---|---|
| `/` Homepage | ✅ PASS | HeroSection, MarketPulse ticker, HowItWorks, SoldSection, WhyMike, MikeCard, FaqStrip, Footer all present and rendering | Low | LC-1 visual polish applied; LC-2 added /value nav link + seller CTA | Manual smoke on prod after deploy |
| `/value` Home value funnel | ✅ PASS | ConversionPanel, MikeTrustCard, ProofStrip, PATH CARDS, HowItWorks, final trust block, ComplianceFooter | Low | LC-1 gold-rule accent; LC-2 no changes (already clean) | None |
| `/ask` Intake flow | ✅ PASS | 5-step flow: StepQuestion → StepIntent → StepContact → StepConsent → StepConfirmation; progress bar; back nav; MikeTrustCard compact on every step | Low | LC-2 added /ask layout.tsx metadata + "what happens now" on confirmation | End-to-end live test with real Supabase required |
| `/embed/ask` Embed frame | ✅ PASS | Shares IntakeFlow; EmbedShell; UTM passthrough from iframe URL; attribution captured via useEffect | Low | None (shares StepConfirmation improvement from LC-2) | Cross-origin test from WordPress ourtownproperties.com |
| `/widget-preview` BrandKit | ✅ PASS | BrandKitShowcase only; concept assets restricted here; not indexed | Low | None required | None |
| Metadata / OG / social cards | ✅ PASS | Root layout.tsx: full OG/Twitter metadata, opengraph-image path; /value page.tsx: full OG + JSON-LD RealEstateAgent schema; /ask layout.tsx: OG + JSON-LD ContactPage (index:false); /admin: no OG (correct) | Low | LC-2 created /ask layout.tsx | Verify OG card renders at `www.askmagicmike.com` in social preview tool |
| robots.txt | ✅ PASS | Disallows `/admin`, `/api/`, `/ask`, `/widget-preview`, `/embed/` — all non-public surfaces blocked; sitemap pointed to `NEXT_PUBLIC_SITE_URL` | Low | None | None |
| sitemap.xml | ✅ PASS | Contains `/` (priority 1.0) and `/value` (priority 0.8) only; excludes all intake/admin/embed routes | Low | None | None |
| Mobile first fold | ✅ PASS | Hero is `grid-cols-1 lg:grid-cols-[...]`; portrait hides on mobile; CTAChips wrap; trust strip wraps; QuestionInput full-width | Low | None | Manual viewport test at 375px on prod |
| CTA links — homepage | ✅ PASS | QuestionInput → `/ask?q=...`; CTAChips → `/ask?chip=...`; "Home Value" nav → `/value`; seller deep link → `/value`; "Call Mike" → `tel:` | Low | LC-2 added /value links | Verify each chip routes with correct params |
| CTA links — /value | ✅ PASS | ConversionPanel → `/ask`; OptionCards → `/ask?chip=...`; "Call Mike directly" → `tel:` | Low | None | None |
| Footer links | ✅ PASS | ourtownproperties.com, tel: links, Quick Links (Ask a Question → /ask, Home Value Estimate → /value) | Low | LC-2 added Quick Links | None |
| Source attribution preservation | ✅ PASS | `captureAttribution()` runs on hero mount and /value first paint; UTMs pass through to /ask via URL params; `/embed/ask` captures from iframe URL params via `useEffect` | Low | None | Test UTM passthrough from WordPress → /value → /ask in live env |
| Stale vercel.app URLs in src/ | ✅ PASS | `src/lib/site-config.ts` vercelAlias is internal config only (not user-facing); `src/lib/brand/visual-system.ts` entries are blocklist validators; `src/lib/admin/utm-link-builder.ts` entries are rejection rules | Low | LC-3 fixed 4 docs with stale vercel.app URLs | None remaining in src/ |
| Stale vercel.app URLs in docs | ✅ FIXED | `regency-wordpress-handoff.md`, `ask-magic-mike-wordpress-visual-brief.md`, `ask-magic-mike-funnel-qa.md`, `vercel-cron-sla-sweep.md` all updated to `www.askmagicmike.com` | Medium → Low | LC-3 updated all 4 docs | Brandon/Regency must re-copy embed snippets from updated doc |
| No genie/lamp copy | ✅ PASS | `amm-lockup.tsx` comment says "No lamp glyph anymore" (code comment, correct); no user-facing genie/lamp language found | None | None | None |
| No unsupported claims | ✅ PASS | "Not an appraisal" present on hero, trust strip, proof strip, question input, widget preview, FAQ; all guarantee mentions are in disclaimers ("not a guarantee of market value") | None | None | None |
| No MLS/FlexMLS markers | ✅ PASS | Funnel verify check `homepage:no_mls_markers` PASS; smoke check confirms | None | None | None |
| No red-* tokens | ✅ PASS | grep across src/ TSX/TS: 0 matches | None | None (S-04 resolved in Epsilon/PR #45) | None |

---

## Admin and Ops Audit

| Area | Status | Evidence | Risk | Action Taken | Remaining Owner Action |
|---|---|---|---|---|---|
| Admin routes protected | ✅ PASS | `src/middleware.ts` gates all `/admin/:path*` behind Basic Auth; missing/default ADMIN_SECRET returns 503 in production; smoke test `admin:health` is skipped without ADMIN_SECRET (correct) | Low | None | Set strong `ADMIN_SECRET` in Vercel production env if not already set |
| `/api/admin/health` | ✅ PASS | Requires x-admin-secret or Bearer CRON_SECRET; never echoes values; returns build identity, env presence booleans, DB reachability, migration table presence, safety flags | Low | None | Verify `ADMIN_SECRET` is set so health check is not 503 in prod |
| Lead list filters | ✅ PASS | `LeadListFilters` interface includes `urgentOnly` and `slaBreach` boolean flags (added in Zeta/PR #46) | Low | None | None |
| Last contact display | ✅ PASS | `formatContactAge(isoString)` in `src/lib/admin/lead-contact-format.ts` (added in Zeta/PR #46) | Low | None | None |
| Webhook failure visibility | ⚠️ PARTIAL | Webhook routes exist for `/api/webhooks/email/events` and `/api/webhooks/sms/inbound`; logging uses `console.error` not structured logger in some paths | Low-Medium | None (out of scope for LC-3) | Owner: adopt `createLogger` in webhook routes before high-traffic launch |
| Logger adoption in API routes | ⚠️ PARTIAL | `src/lib/observability/logger.ts` (Epsilon/PR #45) exists with PII scrubber; only 4 usages in `/api` routes found | Low | None (not a launch blocker) | Owner: adopt `createLogger` in lead intake and scoring routes before high-traffic launch |
| Smoke test script | ✅ PASS | `npm run amm:smoke:prod` runs 19 checks / 2 skips / 0 failures in LC-3 sprint | Low | None | Run after prod deploy; investigate any new failures |
| Production launch docs | ✅ PASS | `PRODUCTION_LAUNCH_GATE.md`, `ADMIN_OPERATIONS_GUIDE.md`, `PRODUCTION_RELEASE_LOG.md`, `KNOWN_BLOCKERS.md` all current | Low | LC-2 + LC-3 updated all four | Review PRODUCTION_LAUNCH_GATE.md checklist items before going live |

---

## Repo / Release Hygiene Audit

| Area | Status | Evidence | Risk | Action Taken | Remaining Owner Action |
|---|---|---|---|---|---|
| `PRODUCTION_RELEASE_LOG.md` current | ✅ PASS | Entries through PR #48 (merged 2026-06-26, commit d332468) | None | LC-3 added PR #48 entry | None |
| `KNOWN_BLOCKERS.md` current | ✅ PASS | S-01 (PR #8 expanded), S-02 (CRM inactive), S-03 (migration 00012), S-04 (resolved in Epsilon); hard blockers B-01 through B-04 unchanged | None | LC-2 updated S-01/S-04 | None |
| `PRODUCTION_LAUNCH_GATE.md` current | ✅ PASS | Accurate checklist; env vars table correct; not revised in LC-3 (no structural changes) | None | None | Owner must complete all unchecked items before controlled traffic |
| `ADMIN_OPERATIONS_GUIDE.md` current | ✅ PASS | References `askmagicmike.com/admin` (canonical domain); accurate for current dashboard state | None | None | None |
| `VISUAL_ASSET_REQUIREMENTS.md` current | ✅ PASS | Created in LC-1; covers all brand assets including prohibited assets list | None | None | None |
| PR #8 documented as unsafe | ✅ PASS | `KNOWN_BLOCKERS.md` S-01: PR #8 is CONFLICTING, 30+ days stale, conflicts with value-hero.tsx (LC-1 modified), requires dedicated rebase sprint | None | Confirmed and expanded in LC-2/LC-3 | Do not merge PR #8 without a dedicated rebase sprint and product review |
| No accidental artifacts staged | ✅ PASS | `git status --short` shows only intentional LC-3 files staged; untracked artifacts (`.playwright-mcp/`, screenshots, `reports/`, `RUN_STATE.md`) are not staged | None | None | None |

---

## No-Risk Fixes Implemented (Phase 5)

| Fix | File(s) | Why |
|---|---|---|
| Stale `ask-magic-mike.vercel.app` URLs → `https://www.askmagicmike.com` | `docs/regency-wordpress-handoff.md`, `docs/ask-magic-mike-wordpress-visual-brief.md`, `docs/ask-magic-mike-funnel-qa.md`, `docs/vercel-cron-sla-sweep.md` | WordPress team copy-pastes from these docs; stale vercel.app URLs in live CTAs break tracking and brand trust |
| Migration-complete note in WordPress brief | `docs/ask-magic-mike-wordpress-visual-brief.md` | Note said "until domain migration runs" — migration is complete; note is confusing and incorrect |
| PR #48 merge entry | `docs/PRODUCTION_RELEASE_LOG.md` | Log was missing the most recent merged PR |

---

## What Was Intentionally NOT Changed

| Item | Reason |
|---|---|
| Rate limiter (`B-01`) | Requires `@upstash/ratelimit` (paid dependency) — owner must approve |
| Admin auth (`B-02`) | Full session auth rewrite — not a no-risk fix |
| Logger adoption in API routes | Wide refactor — not a launch blocker for controlled traffic |
| Redis / CRM implementation | External credentials + paid dependencies — owner action |
| Production SQL / migrations | Never in-scope per safety rules |
| PR #8 (V8 value page) | CONFLICTING — requires dedicated sprint; not touched |

---

## Validation Results (Phase 6)

```
typecheck      ✅  0 errors
lint           ✅  0 new errors (5 pre-existing warnings in admin/viral-post-builder.ts)
tests          ✅  1137/1137 passing (74 files)
build          ✅  clean
funnel verify  ✅  15/15 PASS (CONVERSION_FUNNEL_VERIFY_PASS)
social preview ⚠️  FAIL — external OTP/WAF blocks social crawlers; not a code issue
smoke:prod     ✅  19 pass / 2 skip / 0 fail
```

Social preview failure is an external infrastructure issue (WAF/Vercel Edge Config). The smoke script documents the remediation path.

---

## Launch Readiness Estimate

**Controlled traffic: READY with owner actions complete.**

The code, funnel, routing, compliance, and visual systems are launch-ready. The following owner actions must be complete before sending paid or public traffic:

### Owner Actions Required Before Traffic

| # | Action | Owner | Blocker? |
|---|---|---|---|
| 1 | Verify all migrations (00001–00013) applied to production Supabase | Brandon | ✅ Hard blocker |
| 2 | Confirm `ADMIN_SECRET` is set to a strong unique value in Vercel prod | Brandon | ✅ Hard blocker |
| 3 | Confirm all required env vars set (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, agent vars) | Brandon | ✅ Hard blocker |
| 4 | Complete end-to-end intake test on live prod: submit → appear in /admin | Brandon | ✅ Hard blocker |
| 5 | Confirm `/admin` returns 401 without credentials in prod | Brandon | ✅ Hard blocker |
| 6 | Confirm no DEV MOCK DATA banner visible on prod /admin | Brandon | ✅ Hard blocker |
| 7 | Update WordPress CTA snippets on ourtownproperties.com using updated handoff docs (now pointing to `www.askmagicmike.com`) | Brandon / Regency | Medium |
| 8 | Test UTM passthrough: WordPress → /value → /ask → confirm source_attribution in Supabase | Brandon | Medium |
| 9 | Legal review of TCPA consent language in step-consent.tsx | Attorney | Hard blocker before any SMS outreach |
| 10 | Rate limiter upgrade to Upstash Redis (`B-01`) | Brandon (owner approval required — paid dep) | Before high-traffic launch |
| 11 | NEXT_PUBLIC_AGENT_LICENSE set in Vercel (NC license number in consent copy) | Brandon | Before high-traffic launch |

---

## Remaining External Blockers

| ID | Blocker | Owner | ETA |
|---|---|---|---|
| B-01 | Rate limiter is in-memory only — not shared across Vercel instances | Brandon (paid dep approval) | Before high-traffic |
| B-02 | Admin auth is Basic Auth only — no session expiry, no CSRF | Engineering | Before high-traffic |
| B-03 | `NEXT_PUBLIC_AGENT_LICENSE` not confirmed set in prod | Brandon | Before any traffic |
| B-04 | TCPA consent language not attorney-reviewed | TBD attorney | Before SMS/call outreach |
| S-01 | PR #8 (V8 value page) — stale, CONFLICTING, needs dedicated rebase sprint | Brandon | Dedicated sprint |
| S-02 | CRM adapter inactive (null adapter — no FUB/kvCORE sync) | Mike Eatmon | When CRM account ready |
| S-03 | `listings` table migration (00012) — verify applied to prod | Brandon | Before broker panel |

---

## PR #8 Assessment (Final)

**Do not merge.** GitHub reports `CONFLICTING`. Last CI check: 2026-06-06 (20+ days stale). Main has received 5 major PRs since then. Confirmed conflict in `src/components/campaign/value-hero.tsx` (LC-1 modified this file; PR #8 also modifies it heavily). Merging without a dedicated rebase sprint risks overwriting LC-1/LC-2 visual improvements and breaking the funnel.

**Required before PR #8 can merge:**
1. `git checkout visual/v8-product-page-buildpack && git rebase main`
2. Resolve conflicts (value-hero.tsx is the primary hotspot; expect additional conflicts in landing components and docs)
3. Run full validation: typecheck / lint / 1137 tests / build / funnel
4. Product review of what V8 changes still apply vs. what LC-1/LC-2 already solved
5. Open a fresh PR against current main

---

## Exact Next Move

1. ✅ Merge LC-3 PR after this sprint (do not merge without explicit instruction)
2. Brandon completes all items in "Owner Actions Required Before Traffic" table
3. After owner actions complete → deploy main to Vercel production
4. Run `npm run amm:smoke:prod` against production URL
5. Submit one test lead from production → verify in /admin
6. When confirmed clean → send first controlled traffic (WordPress CTAs)
