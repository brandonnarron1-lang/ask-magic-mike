# Public UX Visual Completion Audit

Post-AdminOps production-completion audit for public Ask Magic Mike surfaces. This was a read-only production and repository audit. No production forms were submitted, no `/api/leads` production POST was made, no admin actions were used, and no production deployment occurred.

Artifacts are local only under `.amm-run/public-ux-visual-completion-v1/` and must not be committed.

## Production Status Sweep

| Route | Production status | Notes |
| --- | ---: | --- |
| `/` | 200 | Premium homepage live. Strong first fold, but homepage was carrying several full conversion surfaces and needed clearer state treatment. |
| `/value` | 404 before this PR | Legacy/campaign URL expected by older docs/tests. Added a safe alias to the home-value surface. |
| `/home-value` | 200 | Canonical home-value intake route. |
| `/sell` | 200 | Canonical seller-options route. |
| `/we-buy-houses` | 404 before this PR | Common cash-offer campaign URL. Added a safe alias to the seller-options surface. |
| `/ask` | 200 | Chat route live. Needed explicit loading, error, retry, and handoff states. |
| `/widget` | 200 | Widget route live. Needed stronger accessible tab semantics and heading structure. |
| `/embed/ask` | 200 | Legacy embed route live and shares widget UI. |
| `/widget-preview` | 200 | Parent-site simulation live. |
| `/social-preview` | 200 | Feed/story preview live. |
| `/integrations/ourtownproperties` | 200 | Live, but mobile screenshot showed horizontal overflow from the code snippet panel. |

## Route Inventory

| Route | Purpose | Primary CTA | Status | Visual quality | Mobile quality | Conversion issue | Accessibility issue | Performance issue | Missing state | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Homepage and route hub | Get My Home Value | Live | Strong cinematic Black Diamond direction | Good, long page | Too many complete surfaces on one page can dilute path choice | Needed stronger reusable focus/state system | Social images could appear late in full-page capture | Form/chat state clarity | Keep visual direction, consolidate tokens, improve shared states |
| `/home-value` | Home-value intake | Request Valuation | Live | Good, premium | Good | Thank-you needed clearer next steps | Form errors needed alert semantics | No issue found | Success detail | Improve form state and appointment handoff |
| `/value` | Legacy/campaign home-value URL | Get My Home Value | 404 before PR | N/A | N/A | Dead campaign path | N/A | N/A | Missing route | Add alias to `/home-value` surface |
| `/sell` | Seller strategy / options | Send Seller Details | Live | Good | Good | Success state was too quiet | Form status needed live region | No issue found | Appointment handoff | Improve success/error state |
| `/we-buy-houses` | Cash-offer style seller campaign URL | Send Seller Details | 404 before PR | N/A | N/A | Dead common seller URL | N/A | N/A | Missing route | Add alias to `/sell` surface |
| `/ask` | Ask Mike chat | Send Question | Live | Good | Good | No retry or explicit handoff on failure | Missing error/retry state | No issue found | Loading/error/retry | Add loading, retry, and contact-handoff states |
| `/widget` | Embeddable widget app | Get My Home Value | Live | Compact premium | Good | Header lacked explicit heading | Tabs lacked tab semantics | No issue found | Loading/error inherited from panels | Add heading/tab semantics and shared states |
| `/embed/ask` | Legacy iframe-compatible widget route | Get My Home Value | Live | Compact premium | Good | Same as widget | Same as widget | No issue found | Same as widget | Inherits widget upgrades |
| `/widget-preview` | Parent-site widget simulation | Open launcher | Live | Adequate | Good | No direct lead CTA by design | No issue found | No issue found | N/A | No code change needed |
| `/social-preview` | Feed/story ad preview | View creative | Live | Good | Good | No lead CTA by design | No issue found | Below-fold images could appear late in automated capture | N/A | Prioritize social preview images in homepage support section |
| `/integrations/ourtownproperties` | Widget install instructions | Open Widget Preview | Live | Good | Overflow before PR | Snippet overflow hurt mobile trust | Code block could exceed viewport | No issue found | N/A | Wrap code panel and constrain overflow |
| Not-found | Unknown public paths | Home Value / Ask Mike | Generic before PR | Weak | Basic | Dead-end | Generic route lacked helpful navigation | No issue found | Branded recovery | Add branded public not-found surface |

## Production Browser Findings

Read-only Playwright navigation captured desktop and mobile screenshots, console errors, failed requests, and overflow checks.

- `/value` and `/we-buy-houses` returned 404 before this PR.
- `/integrations/ourtownproperties` showed mobile horizontal overflow before this PR.
- Public 200 routes had no console errors in the audited production browser pass.
- No authenticated admin routes were visited.
- No forms were submitted.
- No production API POST was made.

## What Changed

- Added `/value` as a safe public alias to the home-value intake.
- Added `/we-buy-houses` as a safe public alias to the seller-options surface.
- Added a branded public `not-found` surface with direct recovery paths.
- Added shared public visual-system utilities in `app/globals.css`.
- Improved form focus, error, busy, success, and appointment handoff states.
- Improved chat loading, error, retry, and property-specific handoff states.
- Improved widget heading/tab semantics and launcher focus behavior.
- Fixed mobile overflow on the OurTown integration code panel.
- Improved social support image loading for automated and user-visible captures.

## Remaining Known Issues

- The homepage still includes several full conversion surfaces below the first fold. It is usable, but a future phase could reduce homepage density and push users into dedicated routes sooner.
- `/widget-preview` is a simulation page, not a public acquisition route.
- Social ad pages provide HTML overlay previews, not exported creative files.
- Any live lead-submission QA requires explicit owner approval.

## Safety Statement

No production data was mutated. No leads were submitted. No admin actions were used. No Supabase schema, Vercel environment variable, DNS, WordPress, secret, or production integration change was made. No production deployment was performed.
