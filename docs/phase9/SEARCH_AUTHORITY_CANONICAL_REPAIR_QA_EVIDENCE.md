# Phase 9.5 — Search Authority Canonical Repair QA Evidence

Date: 2026-08-19

Branch: `codex/phase9-search-authority-2026-08-19`

Base production commit: `a9784d5686ee6bd93136f4e9a4995304db28496f`

Status: local release candidate verified; Vercel Preview and CI evidence pending

Production mutation: none

Production approval gate: `APPROVE PHASE 9.5 SEARCH AUTHORITY MERGE AND PRODUCTION DEPLOYMENT`

## Pre-change production evidence

Read-only checks on 2026-08-19 showed `/home-value`, `/sell`, `/buy`, `/rent`, and `/ask` inheriting the homepage title and canonical `https://www.askmagicmike.com`. Production `robots.txt` disallowed `/ask`, and the sitemap did not include it. No form was submitted and no production data or configuration was changed.

## Local optimized-build metadata matrix

Validated against `next start` at `http://127.0.0.1:4321` after a clean production build:

| Path | Canonical | Robots | Open Graph URL |
|---|---|---|---|
| `/` | `https://www.askmagicmike.com` | `index, follow` | homepage |
| `/home-value` | `/home-value` | `index, follow` | `/home-value` |
| `/sell` | `/sell` | `index, follow` | `/sell` |
| `/buy` | `/buy` | `index, follow` | `/buy` |
| `/rent` | `/rent` | `index, follow` | `/rent` |
| `/ask` | `/ask` | `index, follow` | `/ask` |
| `/value` | `/home-value` | `index, follow` | `/home-value` |
| `/we-buy-houses` | `/sell` | `index, follow` | `/sell` |
| `/thank-you` | none | `noindex, nofollow, nocache` | none |
| `/widget` | none | `noindex, nofollow, nocache` | none |
| `/lead-center-login` | none | `noindex, nofollow, nocache` | none |

All relative entries above resolved to the canonical `https://www.askmagicmike.com` origin in emitted HTML. Titles were route-specific. Local `robots.txt` allowed `/ask`, retained `/admin` and `/api/` disallows, and referenced the canonical sitemap. Local `sitemap.xml` contained `https://www.askmagicmike.com/ask`.

## Structured-data evidence

The homepage emitted one valid JSON-LD graph with:

- `Organization#organization`;
- `WebSite#website`; and
- `WebPage#webpage`.

The payload parsed as JSON. A source and rendered-output scan confirmed it contained no telephone, address, rating, or review fields. The component escapes `<` before inserting JSON into the script element.

## Commands and results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | pass; local Node 26 emitted the expected engine warning because CI/Vercel use the repository-required Node 24 |
| focused Phase 9.5 Vitest suite | 8/8 pass |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` | 179 files, 2,668 tests pass |
| `pnpm build` | pass; Next.js 15.5.21, 50 generated pages |
| `pnpm routes:verify` | pass; 73 active routes, 16 acknowledged root/src duplicates |
| `pnpm release:safety` | 14 checks pass, 0 fail |
| `pnpm amm:verify:isolation` | pass; deployable Ask Magic Mike code contains no NellySelly project identifiers |
| `git diff --check` | pass |

The first full-test run correctly exposed one stale assertion that required a root-layout canonical. That assertion encoded the defect being repaired. It was updated to require a global metadata base and a homepage-scoped canonical, then the entire suite passed.

## Local browser evidence

Desktop and 390×844 mobile inspections covered `/home-value` and `/ask` using the optimized local server. Both routes rendered their existing responsive visual systems, correct headings, functional form controls, and route-specific document titles. The mobile viewport was reset after inspection. Browser console issues: 0.

No lead, email, SMS, push notification, appointment, analytics mutation, database write, WordPress change, or external publication occurred during QA.

## Preview and CI evidence

Pending branch publication. This section must be updated with the draft PR, final commit, Vercel Preview URL, GitHub release-gate result, Preview metadata matrix, and deployed desktop/mobile inspection before production approval is requested.

## Rollback rehearsal

Rollback is code-only: revert the Phase 9.5 commit and redeploy the previously verified production commit. No database, secret, provider, DNS, domain mapping, lead, queue, WordPress page, or external campaign rollback is required.

## Gate

Do not merge or deploy from this evidence file. The exact approval required after Preview and CI are green is:

`APPROVE PHASE 9.5 SEARCH AUTHORITY MERGE AND PRODUCTION DEPLOYMENT`
