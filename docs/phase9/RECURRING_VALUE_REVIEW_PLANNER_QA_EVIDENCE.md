# Phase 9.4 Review Planner QA Evidence

Run date: 2026-08-19

Evidence cutoff: 2026-08-19 19:18 EDT / 23:18 UTC

Branch: `codex/phase9-recurring-value-command-2026-08-19`

Base: `origin/main` at `1c9c4eedae4de3d993def32dc6d646c1be2908ca`

Validated implementation commits: `6b4dae3a36b867431c80cd818b29d2da75dccc3c`, `447d7bcb720de35c179344a353ba3eb85ecaa6eb`, `a58fe407846d048ce8207203f4d9c516f835c503`, `4cf5fde0f19214bf088646b2e41481b7121eb8c9`

PR: [#173](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/173)

Verified Preview: [Phase 9.4 `/plan`](https://ask-magic-mike-fm770qgh8-eyes-up-industries.vercel.app/plan)

Production mutation: none

## Result

PASS for the Phase 9.4 planner scope — the final mobile correction, isolated Vercel Preview, GitHub Node 24 release gate, and deployed visual/interaction QA all passed. Production sequencing still requires the commercial-email compliance and owned-demand releases to deploy first. No production deployment, database migration, lead creation, provider activation, email, SMS, push, call, subscription, or public publication occurred during this verification.

## Automated evidence

| Check | Command | Result |
|---|---|---|
| Dependency install | `pnpm install --frozen-lockfile` | PASS; lockfile unchanged; 665 packages restored. Local shell warned that Node 26.5.1 differs from the repository's required Node 24.x. |
| Phase 9.4 focused tests | `pnpm exec vitest run tests/recurring-value` | PASS; 3 files, 12 tests. |
| Strict typecheck | `pnpm typecheck` | PASS. |
| Lint | `pnpm lint` | PASS. |
| Full regression | `pnpm test` | PASS; 187 files, 2,711 tests. |
| Production build | `pnpm build` | PASS; Next.js 15.5.21; `/plan` prerendered static at 8.41 kB / 129 kB first load after the mobile correction. |
| Canonical route verification | `pnpm routes:verify` | PASS; 76 active routes and 16 acknowledged root/src duplicates. |
| Release safety scan | `pnpm release:safety` | PASS; 14/14 controls. |
| Ask Magic Mike / NellySelly isolation | `pnpm amm:verify:isolation` | PASS; deployable code contains no NellySelly project identifiers. |
| Production dependency audit | `pnpm audit --prod` | PASS; no known vulnerabilities. |
| Patch hygiene | `git diff --check` | PASS. |
| GitHub release gate | [Actions run 32287453070](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32287453070) | PASS in Node 24; release doctor, safety, 2,711 tests, typecheck, lint, build, route/cron assertion, release report, launch authority, and artifact upload all passed in 2m54s. |
| Final GitHub release gate | [Actions run 32312039155](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32312039155) | PASS in Node 24 at commit `4cf5fde`; completed in 2m46s. |
| Initial Vercel Preview | deployment `dpl_Cvxu3DT7hxFa8KoTwimJKnymtE4b` | PASS; deployed commit `447d7bc` reached `READY`. |
| Final Vercel Preview | [commit `4cf5fde` Preview](https://ask-magic-mike-hoe9clc44-eyes-up-industries.vercel.app/plan) / GitHub deployment `5992676046` | PASS; Vercel reported successful deployment and the protected page returned the expected planner through the signed-in browser session. |
| Final protected Preview workflow | [Actions run 32312320453](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/32312320453) | Planner build and verification PASS; repository-wide remote contract remained blocked by six inherited current-base expectations already corrected in PR #177. `SAFE_DB_WRITE=false`; six mutation probes skipped and no data changed. |

The initial `pnpm routes:assert` correctly refused to infer routes before `.next` existed. It was replaced by the documented build-backed `pnpm routes:verify`, which passed. This was a command-order issue, not a product defect.

## New test coverage

- deterministic task generation across every allowed goal, horizon, and focus combination;
- unique task IDs and mandatory human-review step;
- canonical UTM-tagged handoff URLs;
- strict version, enum, timestamp, and completed-task validation;
- unknown-property stripping and PII-field exclusion;
- malformed/obsolete-state fail-closed behavior;
- 30-day freshness boundary;
- valuation, offer, inventory, and steering-copy guardrails;
- device persistence, reload restoration, progress updates, and local reset;
- no contact/address/narrative controls;
- no lead, listing, phone-alert, subscription, send, provider, credential, or direct fetch path;
- `/plan` registration in the App Router, sitemap, header, footer, and canonical route manifest; and
- four non-contact planner events in the existing server allowlist.

## Browser and visual QA

Targets:

- local optimized production build at `http://127.0.0.1:4319/plan`;
- initial deployed Vercel Preview at `https://ask-magic-mike-fm770qgh8-eyes-up-industries.vercel.app/plan`; and
- final corrected Vercel Preview at `https://ask-magic-mike-hoe9clc44-eyes-up-industries.vercel.app/plan`.

Desktop default viewport:

- title resolved to `Real Estate Review Planner | Ask Magic Mike`;
- existing Black Diamond header, logo, typography, gold/cyan hierarchy, spacing, and footer rendered coherently;
- `Plan` appeared in desktop navigation;
- private-by-design and organizer-only boundaries were visible before interaction;
- `Create my plan` was visible and enabled;
- plan creation rendered the deterministic seller plan;
- progress began at `0` and `No contact data sent` was visible;
- completing `seller-outcome` changed `aria-pressed` to `true` and progress to `14` percent;
- reload restored `Continue your saved plan` and retained the completed task.

Mobile viewport `390 × 844`:

- viewport confirmed as `390 × 844` with `width=device-width, initial-scale=1`;
- builder cards stacked without horizontal overflow;
- selected state, long descriptions, and final CTA remained readable;
- active-plan progress, status badges, task cards, and human-review handoff stacked correctly;
- the three active-plan status badges use a one-column mobile layout before returning to a wrapping flex row at the `sm` breakpoint;
- `No contact data sent` remained fully visible at 390 px (`left=41`, `right=238.90`, viewport `390`);
- footer links wrapped cleanly; and
- full-page screenshots were visually inspected for both builder and saved-plan states.

The deployed Previews repeated plan creation, task completion, 14-percent progress, reload restoration, a second task update to 29 percent, the restored-plan live-region announcement, the canonical UTM handoff, title/canonical route, desktop layout, and `390 × 844` mobile layout checks. The final corrected Preview additionally proved that the status container renders as a mobile grid, `No contact data sent` is fully visible (`left=41`, `right=238.91`, viewport `390`), document width remains `375` with no horizontal overflow, and 14-percent progress survives reload. Browser console check: zero `error` or `warning` entries on the final corrected Preview.

The current-base refresh corrected two Preview findings before release: privacy copy now discloses that allowlisted non-contact planner events may record controlled selections, progress, campaign attribution, and device context, and a restored plan now announces updated progress after the next task interaction. A final cumulative-release rehearsal then exposed narrow-screen clipping in the third status chip; the mobile status area now uses a one-column grid with intrinsic-width chips, and a UI assertion prevents regression.

The temporary viewport override was reset and the local QA tab/server were closed after verification.

The protected repository-wide Preview workflow successfully accepted the secure Vercel bypass, returned HTTP 200 for the public surfaces, passed health secret-leak and listing-field checks, and intentionally skipped all six mutation probes. It then reported six inherited current-base contract failures: three stale WordPress CTA-copy expectations, two legacy admin-route expectations, and one cron-health expectation. Those exact contract repairs are already green in prerequisite PR #177; no planner route, planner interaction, visual, persistence, privacy, accessibility, or analytics check failed.

## Accessibility evidence

- semantic `fieldset` and `legend` groups for all plan choices;
- real buttons with `aria-pressed` for choices and task completion;
- labeled progressbar with current numeric value;
- polite status announcement for restored/progress state;
- no color-only completion indicator;
- visible global focus styles retained;
- mobile touch controls use substantial card or pill targets; and
- reduced-motion rules remain inherited from the existing visual system.

Automated semantic and interaction coverage passed in jsdom. A dedicated third-party WCAG scanner was not added to avoid a new dependency; Preview should still receive a final browser accessibility scan before the production gate.

## Privacy and system-boundary proof

The serialized local record contains only:

```text
version, goal, horizon, focus, completedTaskIds, generatedAt, updatedAt
```

The planner has no `/api/leads`, `/api/listings`, `/api/phone-alerts`, database credential, SMTP credential, provider-send, subscription, or direct `fetch` reference. It uses the existing analytics helper for controlled event enums only. Handoff links open existing canonical public funnels and do not transfer planner state.

## Rollback verification

Rollback is source-only: revert the Phase 9.4 commit and redeploy the prior verified production commit. No schema, provider, secret, queue, lead, or server-side planner record exists to reverse. Device-local records become inert and contain no contact or property information.

## Production sequence

The PR, GitHub CI, Vercel Preview, deployed desktop/mobile visual QA, interaction checks, and no-migration/no-provider/no-messaging diff review are complete. Preserve the verified order:

1. `APPROVE PHASE 9 COMMERCIAL EMAIL COMPLIANCE MERGE AND PRODUCTION DEPLOYMENT`
2. `APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT`
3. refresh PR #173 onto the deployed chain, rerun its protected Preview QA, then use `APPROVE PHASE 9.4 REVIEW PLANNER MERGE AND PRODUCTION DEPLOYMENT`.
