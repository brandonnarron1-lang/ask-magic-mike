# Phase 9 Preview deployment and visual QA evidence

Date: 2026-08-18 America/New_York  
PR: [#169](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/169)  
Branch: `codex/phase9-growth-intelligence-competitive-moat-2026-08-18`  
QA commit: `43902926d036`  
Decision at Preview completion: **Gate A passed. Gate B subsequently passed on 2026-08-19; Gate C remains closed.**

## Preview deployment

- Project: `eyes-up-industries/ask-magic-mike`
- Target: Preview
- Deployment: `dpl_3TD7hhL2jS8nAGvetwxt4tceaANs`
- Immutable URL: <https://ask-magic-mike-jse4ycgw6-eyes-up-industries.vercel.app>
- Branch alias: <https://ask-magic-mike-git-codex-phase9-growt-4c227b-eyes-up-industries.vercel.app>
- State: `READY`
- Framework/runtime: Next.js / Node.js 24.x

Authenticated Vercel requests returned:

| Route | Result |
| --- | --- |
| `/` | `200` |
| `/ask` | `200` |
| `/value` | `200` |
| `/widget-preview` | `200` |
| `/admin/growth?window=90` without application credentials | `401` with `WWW-Authenticate: Basic realm="Ask Magic Mike Admin"` |

The protected response also returned `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, CSP frame restrictions, HSTS, and `X-Frame-Options: SAMEORIGIN`. Vercel error-log inspection found no errors for this deployment after the route probes.

## Visual QA method

Vercel Deployment Protection correctly blocked anonymous browser access. Visual QA therefore ran against the exact PR worktree in an isolated local Preview harness with:

- `VERCEL_ENV=preview`;
- `PREVIEW_DATA_MODE=disabled`;
- `ALLOW_PREVIEW_DB_MUTATION=false`;
- no `DATABASE_URL`;
- notification processing and provider delivery disabled;
- the existing local-only default admin credential, never a production secret.

The rendered page visibly stated **Preview read-only mode** and honestly reported that canonical Neon was not configured, instead of inventing growth metrics.

## Responsive matrix

The 30-, 90-, and 365-day views were checked at 320, 390, 768, and 1440 CSS pixels: 12 combinations total.

Every combination passed:

- expected Growth Command Center heading;
- selected reporting window;
- Preview read-only banner;
- schema/database-pending message;
- zero document-level horizontal overflow;
- no Next.js error overlay;
- no browser console error.

The first keyboard-focusable navigation link showed a visible 2px cyan focus outline and focus shadow. Window controls navigated correctly between `?window=30`, `?window=90`, and `?window=365`.

## Defect found and repaired

The initial 390px pass exposed 648px of document-level horizontal overflow. A wide server-rendered economics table was correctly scrollable, but its parent CSS-grid item retained the default `min-width:auto` and expanded the page.

The `Panel` primitive in `app/admin/growth/page.tsx` now includes `min-w-0`. This keeps wide tables inside their intentional local horizontal-scroll container. A route-guard regression test asserts both the shrink guard and the deliberate table width.

Post-fix measurements:

| Viewport | `innerWidth` | document width | overflow |
| --- | ---: | ---: | ---: |
| 390 | 390 | 375 | 0 |
| 1440 | 1440 | 1425 | 0 |

The 15px difference is the browser scrollbar gutter, not horizontal overflow.

## Visual evidence

- [Desktop montage](../../output/phase9/visual-qa/PHASE9_GROWTH_DESKTOP_MONTAGE.png)
- [Mobile montage](../../output/phase9/visual-qa/PHASE9_GROWTH_MOBILE_MONTAGE.png)
- [390px 30-day view](../../output/phase9/visual-qa/growth-30d-top-390.png)
- [390px 90-day view](../../output/phase9/visual-qa/growth-90d-top-390.png)
- [390px 365-day view](../../output/phase9/visual-qa/growth-365d-top-390.png)
- [1440px 90-day view](../../output/phase9/visual-qa/growth-90d-top-1440.png)
- [Economics section, 390px](../../output/phase9/visual-qa/growth-90d-economics-390.png)
- [Opportunity section, 390px](../../output/phase9/visual-qa/growth-90d-opportunities-390.png)
- [Closed-loop section, 390px](../../output/phase9/visual-qa/growth-90d-closed-loop-390.png)

## Verification evidence

```text
Targeted Phase 9 tests: 2 files passed; 13 tests passed
Full release gate: PASS
System isolation: PASS
Release safety scan: 14 pass; 0 fail
Full Vitest suite: 177 files passed; 2,660 tests passed
Typecheck: PASS
ESLint: PASS
Next.js production build: PASS
Route manifest: PASS (73 active routes; 16 acknowledged duplicates)
Vercel deployment: READY
Vercel runtime errors after probes: none found
```

The local machine ran Node.js 26.5.1 and emitted the repository's expected engine warning because the project pins Node.js 24.x. The actual Vercel Preview built and runs on Node.js 24.x.

## Safety and authority result

At the time of this Preview QA, no production database migration had been applied. Gate B was completed separately on 2026-08-19 with evidence in `PHASE9_PRODUCTION_DATABASE_MIGRATION_EVIDENCE.md`. No lead, assignment, consent, campaign, provider, email, SMS, Mike notification, paid-media, domain, WordPress, or production-deployment state was changed by Preview QA. NellySelly was not accessed or modified.

Gate A is complete. After the separately recorded Gate B migration, the remaining Phase 9 release action is:

1. `APPROVE PHASE 9 MERGE AND PRODUCTION DEPLOYMENT`
