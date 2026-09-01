# Owned-Demand Readiness Mainline QA Evidence

Updated 2026-09-01. This evidence contains aggregate traffic, public-page
structure, repository identifiers, and verification results only. It contains
no lead PII, database credential, provider token, private BCC value, session
secret, or raw WordPress page body.

## Executive result

The existing protected Distribution Command now consumes the existing bounded
WordPress readiness manifests before choosing the next owned-demand placement.
The clean implementation lives in reviewed PR #247, based directly on accepted
Production PR #246. It does not merge stale stacked PRs #244/#245 and does not
create another funnel, widget, publisher, form, database, CRM, campaign manager,
notification service, or analytics store.

The current live homepage placement is held because its exact Ask Magic Mike
CTA remains hidden by known public CSS. The established home-value page is the
first reviewed visible WordPress candidate. A recommendation remains an
operator decision packet—not publication proof or publication authority.

## Baseline authority

| Item | Exact identity |
| --- | --- |
| Repository | `brandonnarron1-lang/ask-magic-mike` |
| Accepted Production PR | `#246` |
| Accepted merge | `98a91f752c4c53dc0ae300dfc320f47b53e32820` |
| Production deployment | `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` (same accepted PR #246 source) |
| Immediate rollback | `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` |
| Canonical app | `https://www.askmagicmike.com` |
| Neon | project `bitter-star-20214385`, branch `br-round-base-auh6h2wd`, database `neondb` |
| Reviewed candidate | PR `#247`, branch `codex/owned-demand-readiness-main-20260901` |
| Code-bearing head | `6eb2d37f7dc2c116e92ba7ee7e7c2ea4f2482e99` |
| Reviewed content head/tree | `f4503dc68b0f2c07a1e9c82827c27ffb5479e9f4` / `f1023e295332b939d21313ed626a9b3a8b2d5483` |

Canonical readiness and liveness returned HTTP 200. GitHub Release Gate run
`33504917995`, post-deploy run `33505043074`, manual monitor runs
`33505253029` and `33505284828`, and scheduled monitor run `33508066082` all
passed on accepted Production.

The approved secure Production `DATABASE_URL` replacement was applied through
the Neon and Vercel protected interfaces without printing or committing the
value. Vercel deployment `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` redeployed exact
accepted commit `98a91f752c4c53dc0ae300dfc320f47b53e32820`. It required zero
migrations and zero database writes. At `2026-09-01T13:32:46.626Z`, the
canonical no-write monitor passed 11/11 contracts on its first attempt;
read-only smoke passed 19 with two intentional skips and zero failures;
readiness returned HTTP 200; and Vercel's cutover-window runtime-error query
returned none. The credential/redeploy approval is consumed.

## Demand evidence motivating the change

A read-only, explicit-test-excluded 14-day Production aggregate observed on
2026-09-01 contained:

- 52 `page_view` events across 30 sessions;
- 25 `/ask` views carrying the owned-demand campaign identity;
- 6 `/embed/ask` views attributed to the Our Town website widget;
- 9 direct `/ask` views, 5 `/buy`, 4 `/home-value`, and smaller `/sell`, `/rent`,
  and `/plan` samples;
- no eligible `lead_created` event and no contactable live prospect.

This proves low real traffic and a conversion opportunity. It does not prove a
conversion rate, channel winner, or genuine lead. Synthetic/test records remain
excluded and are never relabeled.

## Exact public WordPress evidence

Read-only public checks were repeated at `2026-09-01T12:53:37Z`.

| Placement | Page ID | Public structure | Readiness | Selection |
| --- | ---: | --- | --- | --- |
| Homepage Ask Magic Mike | 149 | one Ask Magic Mike href inside one `.amm-cta`; one exact known hidden-CSS rule | `hidden_target` / `hidden_by_known_css` | Hold |
| Home Value | 3952 | one Ask Magic Mike href and one `.amm-cta`; no known hidden-CSS match | `legacy_match_ready` / `visible_candidate` | First reviewed visible candidate |
| We Buy Homes | 3631 | one Ask Magic Mike href and one `.amm-cta`; no known hidden-CSS match | `legacy_match_ready` / `visible_candidate` | Eligible after review |

All page-index rows were published. Every generated manifest is read-only,
reports `publicationAuthorized=false`, `approvalRequired=true`, and
`mutationPerformed=false`, and contains no raw page HTML.

## Implementation boundary

- `loadWordPressActivationChangeSets` shares one allowlisted page-index fetch
  across the three exact reviewed pages.
- Every page read retains exact-host validation, redirect checks, response-size
  bounds, content-type validation, and an abort timeout.
- `toOwnedDemandPlacementReadiness` treats only an exact visible
  `legacy_match_ready` or `already_exact` target as selection-eligible.
- Hidden, missing, ambiguous, mismatched, unresolved, and fetch-failed targets
  fail closed.
- The activation loop skips held and already-measured placements and returns no
  false next action when every remaining placement is held.
- The protected operator UI discloses readiness-hold counts and status without
  exposing raw page content or weakening server-side RBAC.

## Verification

| Check | Result |
| --- | --- |
| Exact runtime | Node `24.18.0` |
| Full Release Gate | passed |
| Deployable-source isolation | passed; no NellySelly project identifiers |
| Release safety | 14/14 passed; 604 source files scanned for client-side secret reads |
| Full Vitest | 282 files / 3,418 tests passed |
| Strict TypeScript | passed |
| ESLint | passed |
| Next.js Production build | passed; 60 pages generated |
| Route manifest | passed; 100 active / 22 acknowledged root-source duplicates |
| Targeted authority/readiness Vitest | 3 files / 23 tests passed after the runtime-redeploy receipt |
| `git diff --check` | passed |
| Dependency audit | no known vulnerabilities at `high` threshold |
| Gitleaks Git history | 730 commits / 18.85 MB; no leaks |
| Gitleaks exact review patch | 138.10 KB plus 6.37 KB untracked evidence; no leaks |
| Production monitor | 11/11 contracts passed on attempt 1 |
| Read-only Production smoke | 19 passed / 2 intentionally skipped / 0 failed |
| Production runtime errors | none in the cutover window |
| Database/public mutation probes | none; smoke ran without `--write` |

A diagnostic scan of the generated `.next` directory warned on 11 matches
limited to Git-ignored Next build metadata/compiler cache: generated manifest
keys and compiled fixture/document private-key markers. No matched value was
printed. Those warnings are not represented as a clean scan; they are excluded
from Git, while the exact source patch and full Git history both passed. Hosted
Release Gate, immutable Preview identity, and protected Preview visual/runtime
QA remain pending until the final Draft PR commit is pushed. A local pass is not
represented as hosted proof.

## Rollback

PR #247 has no schema, environment, provider, WordPress, or data delta. Before
merge, rollback is to close the Draft and leave accepted Production unchanged.
After a separately approved release, application rollback is to retain PR #246
or promote `dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` after reinspection. Do not alter
Neon rows, the recovered `DATABASE_URL`, WordPress pages, lead records,
notifications, or proof history as part of application rollback.

## Authority boundary

No WordPress save, plugin edit, page replacement, cache purge, database write,
lead submission, email/SMS/Web Push send, consumer acknowledgment, DNS/domain
change, social/GBP/email publication, spend, purchase, deletion, or NellySelly
action occurred. PR #247 is sealed only for the exact owner-approved
application merge and same-tree deployment. Its gate does not authorize any of
the excluded WordPress, data, message, provider, publication, or NellySelly
actions above.
