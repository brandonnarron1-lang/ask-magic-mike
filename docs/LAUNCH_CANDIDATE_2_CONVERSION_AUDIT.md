# Launch Candidate 2 — Public Conversion Polish Audit

**Branch:** `launch-candidate-2-public-conversion-polish`  
**Base:** `main` @ `4d55923` (post-LC-1, post-Epsilon, post-Zeta)  
**Auditor:** Claude Code (LC-2 sprint)  
**Date:** 2026-06-26

---

## Scope

Public-facing surfaces only. Admin routes, embed frame, and broker intelligence panel are out of scope for this sprint.

| Surface | Route | Audit status |
|---|---|---|
| Homepage | `/` | ✅ Audited |
| Home Value funnel | `/value` | ✅ Audited |
| Intake flow | `/ask` | ✅ Audited |
| Widget preview | `/widget-preview` | ✅ Audited (no issues found) |
| Embed frame | `/embed/ask` | ✅ Audited (shares IntakeFlow — same gaps) |
| Root metadata / OG | `src/app/layout.tsx` | ✅ Audited |
| `/value` metadata | `src/app/(campaign)/value/page.tsx` | ✅ Audited |
| `/ask` metadata | `src/app/(intake)/ask/page.tsx` | ⚠️ Gap found — fixed |

---

## Findings

### F-01 — No clear path from homepage to `/value` structured seller flow [HIGH]

**Surface:** `/` — `src/components/landing/hero-section.tsx`  
**Finding:** The homepage CTAChips pre-fill a question into `/ask` (open-ended flow), but there is no direct link to the structured `/value` seller flow (ConversionPanel + address field + path cards). A seller arriving at the homepage who wants to "enter my address and see a value range" has no obvious affordance.  
**Impact:** Sellers who aren't comfortable typing a free-form question may bounce. The `/value` page is the higher-conversion structured path for this audience.  
**Fix:** Added "Home Value →" link in desktop nav + secondary CTA text link below CTAChips pointing to `/value`.

---

### F-02 — No `/ask` page metadata (OG/SEO blind spot) [HIGH]

**Surface:** `/ask` — `src/app/(intake)/ask/page.tsx`  
**Finding:** The `/ask` route uses `"use client"` at the page level; Next.js cannot extract metadata from it. There is no `layout.tsx` for the `(intake)` group, so `/ask` gets only the root metadata. Share links to `/ask` show the generic homepage title and the homepage OG card.  
**Impact:** Any direct link to `/ask` (CPC ads, social, email campaigns) shares generic metadata. No canonical tag. No intake-specific OG description.  
**Fix:** Created `src/app/(intake)/ask/layout.tsx` with intake-specific metadata and canonical URL.

---

### F-03 — StepConfirmation lacks "while you wait" guidance [MEDIUM]

**Surface:** `/ask` step 5 — `src/components/intake/step-confirmation.tsx`  
**Finding:** After submission, the confirmation shows a temperature-based message and ETA, but no concrete "what to expect while you wait" mini-list. The only post-confirmation CTAs are "Call Mike" and "Visit Our Town Properties." There is no reinforcement of what Mike received or what the user should watch for.  
**Impact:** Users who submitted may feel uncertain whether their request was complete. A brief "what happens now" list reduces post-form anxiety and lowers the chance of repeat inquiries.  
**Fix:** Added a 3-step "what happens now" section above the assignment card, using the same numbered-step pattern as the QuestionInput panel.

---

### F-04 — Footer has no quick nav links to funnel pages [LOW]

**Surface:** `/` — `src/components/landing/footer.tsx`  
**Finding:** Footer columns are Brand, Contact, Disclosures. No quick links to `/ask` or `/value` for users who scroll to the bottom deciding whether to engage.  
**Impact:** Minor. Users at the footer are already on the page and can scroll back up. Low conversion lift expected.  
**Fix:** Added "Quick Links" sub-section to the Contact column with links to `/ask` (Ask a Question) and `/value` (Home Value Estimate).

---

### F-05 — Mobile nav has no access to `/value` route [MEDIUM]

**Surface:** `/` mobile — `src/components/landing/hero-section.tsx`  
**Finding:** Desktop nav shows contact info + "Call Mike" button. Mobile nav shows only logo + "Call Mike". Sellers on mobile who scroll past the hero have no affordance to reach the `/value` page until the CTAChips or MikeCard section.  
**Fix:** Added a "Home Value" text-link in the desktop nav. Mobile will surface `/value` via the CTAChips "What's my home worth?" chip (routes to `/ask?chip=home_worth`) — acceptable for this sprint; a dedicated mobile nav link can be LC-3.

---

## What Was NOT Changed

| Item | Reason |
|---|---|
| `CTAChip` label text | Covered by integration tests; chip IDs are used by analytics attribution — rename = test refactor |
| `StepQuestion` `canProceed` logic (allows address-only) | Intentional: address-only path is the seller "home value" shortcut |
| `/embed/ask` surface | Shares IntakeFlow; improvements to StepConfirmation apply automatically |
| `StepIntent` `canProceed` logic | Intentional: `unknown` intent is valid (Mike routes generically) |
| Homepage stats strip values | All verified factual — no change |
| Trust strip copy | Already strong; `brand-pack-assets.ts` QC intact |
| Any admin routes | Out of scope |

---

## Brand / Compliance QC

- ✅ No `red-*` Tailwind tokens added
- ✅ No fake stats, fake testimonials, or invented awards introduced
- ✅ No appraisal claims, guaranteed value language, or genie/lamp copy
- ✅ No Vercel preview URLs in user-facing copy
- ✅ Concept expression assets (`thinkingHandsConcept`, `answerAppearsConcept`) remain restricted to BrandKitShowcase
- ✅ All new copy follows "broker-reviewed guidance, not an appraisal" framing
- ✅ All `/value` links use internal Next.js `href="/value"` (no external URL construction)

---

## Implementation Summary

| File | Change | Finding |
|---|---|---|
| `src/app/(intake)/ask/layout.tsx` | Created — intake-specific metadata | F-02 |
| `src/components/landing/hero-section.tsx` | Added "Home Value" desktop nav link + secondary `/value` CTA below chips | F-01, F-05 |
| `src/components/intake/step-confirmation.tsx` | Added "what happens now" 3-step section | F-03 |
| `src/components/landing/footer.tsx` | Added Quick Links sub-items in Contact column | F-04 |
| `docs/LAUNCH_CANDIDATE_2_CONVERSION_AUDIT.md` | This document | — |
| `docs/PRODUCTION_RELEASE_LOG.md` | Added PR #45, #46, #47 merge entries | — |
| `docs/KNOWN_BLOCKERS.md` | Updated PR #8 status | — |

---

## Asset Usage (no new assets added)

No new brand assets introduced in LC-2. All changes are copy and layout additions using existing design tokens.

---

## Validation

After implementation:

```
typecheck   ✅ tsc --noEmit
lint        ✅ next lint
test        ✅ 1137/1137 (vitest)
build       ✅ next build
funnel      ✅ 15/15 (amm:verify:funnel)
```
