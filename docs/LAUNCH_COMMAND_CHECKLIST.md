# Launch Command Checklist — Ask Magic Mike

**Version:** 1.0 (Sprint V2)  
**Last updated:** 2026-06-25  
**Owner:** Brandon Narron  
**Operator:** Mike Eatmon / Our Town Properties, Wilson NC  

---

## Overview

This checklist covers the full sequence from code-complete to first public lead. Work through each section in order. Do not skip sections. Items marked ⚠️ require human action outside Claude Code.

---

## SECTION 1 — Code & Deploy Prerequisites

### 1.1 Schema

- [ ] Confirm migration 00012 (`listings` table) is applied to production Supabase
  - Run: `supabase db push` or apply via Supabase dashboard
  - Verify: `SELECT COUNT(*) FROM amm_listings` returns without error
  - ⚠️ If missing, apply before any lead capture goes live (hotfix PR #5 degrades safely but listing matches will be absent)

- [ ] Confirm all other migrations (00001–00011, 00013+) are applied
  - Run: `pnpm run amm:verify:funnel` — checks critical table existence

### 1.2 Environment Variables

- [ ] Confirm production Vercel env vars are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_SECRET` (rotated — see admin report secret memory)
  - `VERCEL_AUTOMATION_BYPASS_SECRET` (⚠️ must be re-entered due to CR/LF issue)

- [ ] Confirm SMS flag is intentionally disabled:
  - `NEXT_PUBLIC_ENABLE_SMS=false` (keep false until Twilio integration is live)

- [ ] Confirm email flag is intentionally disabled:
  - `NEXT_PUBLIC_ENABLE_EMAIL=false` (keep false until email provider is wired)

### 1.3 Deployment

- [ ] Run `scripts/amm/verify-production-alias.mjs` before any prod deploy
  - Confirms correct Vercel alias is targeted
  - Prevents out-of-cycle CLI deploy drift (known issue from prior sessions)

- [ ] Confirm main branch build passes CI (all checks green on GitHub)
  - TypeScript: `pnpm typecheck` — zero errors
  - Lint: `pnpm lint` — zero errors
  - Tests: `pnpm test` — all pass
  - Build: `pnpm build` — completes without error

---

## SECTION 2 — Pre-Launch QA

### 2.1 Funnel Smoke Test

Run the automated funnel verifier:
```bash
pnpm run amm:verify:funnel
```

Expected: All routes respond 200, all critical DB tables exist, UTM passthrough verified.

Manual golden path (run in browser):
1. Navigate to `/value` with `?utm_source=launch_qa&utm_medium=organic_social&utm_campaign=launch_day`
2. Click a CTA card → lands on `/ask` with UTMs preserved
3. Complete Step 1 (question/address) → Step 2 (intent/timeline) → Step 3 (contact) → Step 4 (consent) → Step 5 (confirmation)
4. Verify: lead appears in `/admin/leads` within 30 seconds
5. Verify: temperature, score, grade are populated
6. Verify: attribution row links to correct UTMs
7. Verify: NBA card shows correct source path and follow-up angle

### 2.2 Admin Access

- [ ] Confirm `/admin` route requires `x-admin-secret` header (or cookie — check implementation)
- [ ] Confirm locked state renders correctly when `SUPABASE_SERVICE_ROLE_KEY` is missing
- [ ] Confirm synthetic test leads (`+qa@...`) show DO NOT CONTACT warning in lead detail

### 2.3 Social Preview

```bash
pnpm run amm:verify:social-preview || true
```

- [ ] OG image renders at `askmagicmike.com` (not a placeholder)
- [ ] Title: "Ask Magic Mike — Wilson County Real Estate Expert"
- [ ] Description references Mike Eatmon / Our Town Properties
- [ ] Confirm correct image loads in Facebook Sharing Debugger and Twitter Card Validator

### 2.4 Embed Widget

- [ ] Load WordPress widget preview at `/embed/ask`
- [ ] Confirm UTM params from iframe `src` are captured in attribution
- [ ] Confirm lead submitted via widget appears with `utm_medium=website_widget`
- [ ] ⚠️ OTP WordPress deploy required to activate on ourtownproperties.com

### 2.5 Mobile

- [ ] iPhone 14 Pro viewport: `/value` loads without horizontal scroll
- [ ] Step 3 (contact form): inputs are full-width, phone error state uses ruby-400 (not red)
- [ ] Step 5 (confirmation): Mike's headshot visible, score/temperature shown

---

## SECTION 3 — Compliance Gate

Before accepting real leads, confirm:

- [ ] Privacy policy link is present (or placeholder — document which page)
- [ ] TCPA consent language on Step 4 (StepConsent) is accurate and matches current carrier guidance
- [ ] SMS opt-out flag respected: leads with `opt_out_sms` compliance flag cannot be texted
- [ ] Email opt-out flag respected: leads with `opt_out_email` compliance flag cannot be emailed
- [ ] Fair housing disclaimer present on any page that discusses property values or pricing
- [ ] No guaranteed value claims on the value page (verified in compliance tests)
- [ ] `doNotContact` flag blocks follow-up display in admin NBA card

---

## SECTION 4 — Content & Brand

- [ ] Mike's headshot is the approved brand-pack-v2 source image
  - Path: `public/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp`
- [ ] All public copy references "Mike Eatmon" by full name on first mention
- [ ] "Our Town Properties" appears correctly (not "Regency" or any other broker)
- [ ] "Ask Magic Mike" and "AskMagicMike.com" are the canonical brand/URL
  - Never "AskMagicMike", never "Ask MagicMike", never "magic_mike"
- [ ] Wilson County / Eastern NC market focus is accurate in all copy
- [ ] "Licensed Since 1993 — 30+ Yrs" and "$750M+ in Career Sales" stats appear on WhyMike section
- [ ] No emoji in product UI (unless explicitly added post-launch)

---

## SECTION 5 — Traffic Readiness

### 5.1 askmagicmike.com Integration

- [ ] `askmagicmike.com` links to `/value` with correct UTMs
  - Do NOT route through `/ask` directly (bypass value page conversion)
  - Tracked links format: `https://[production-url]/value?utm_source=amm_dot_com&utm_medium=referral`
- [ ] Confirm `askmagicmike.com` Vercel project is separate (not same deployment)
- [ ] Social UTM links built and ready (see `docs/MARKETING_DISTRIBUTION_SYSTEM.md`)

### 5.2 WordPress Widget (Phase 2 activation)

- [ ] Widget code deployed on ourtownproperties.com by OTP team
- [ ] Widget src points to production embed URL (not preview)
- [ ] Test: Submit lead via widget → appears in admin with `website_widget` attribution

---

## SECTION 6 — Launch Day Sequence

Execute in this order on launch day:

1. **Run verify-production-alias** — confirm correct deployment target
2. **Run amm:verify:funnel** — confirm all routes and DB tables
3. **Submit one synthetic test lead** (`+qa` email) — confirm it appears in admin as synthetic
4. **Submit one real test lead** (Mike's own email) — confirm full journey end-to-end
5. **Check admin dashboard** — confirm test leads visible, no errors
6. **Verify social preview** — Facebook Debugger, Twitter Card
7. **Activate trackable link(s)** — post first UTM-tracked link to target channel
8. **Monitor admin dashboard** — check for first real lead within 1 hour of first post

---

## SECTION 7 — Post-Launch (Day 1–7)

- [ ] Check `/admin` daily for new leads
- [ ] Follow up all urgent/hot leads within SLA window (same day / 24h)
- [ ] Review NBA card for every lead before first contact
- [ ] Flag any compliance issues using the compliance flag system
- [ ] Run `pnpm run amm:verify:funnel` every 48 hours until stable
- [ ] Document first lead conversion path for funnel optimization

---

## Known Blockers at Time of Writing

| Blocker | Required Before | Status |
|---------|----------------|--------|
| Migration 00012 (listings table) | Full lead detail | ⚠️ Pending human action |
| VERCEL_AUTOMATION_BYPASS_SECRET CR/LF | CI preview QA | ⚠️ Pending human re-entry |
| WordPress OTP deploy | Widget activation | ⚠️ Pending OTP team |
| FlexMLS export | Listing match engine | ⚠️ P16 prerequisite |
| Email/SMS provider | Outbound follow-up | ⚠️ Not wired, env-gated |
