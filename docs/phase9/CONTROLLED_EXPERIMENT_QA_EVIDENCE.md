# Phase 9.6 — Controlled Experiment QA Evidence

Date: 2026-08-19

Branch: `codex/phase9-experiment-command-2026-08-19`

Base: `a9784d5686ee6bd93136f4e9a4995304db28496f`

## Safety assertions

- Production migration applied: no.
- Production experiment activated: no.
- Production consumer lead submitted: no.
- Email, SMS, push, call, or external publication sent: no.
- NellySelly modified: no.
- Default `/home-value` copy changed when dormant: no.
- Test and suppressed leads accepted as conversions: no.

## Focused verification

The focused suite passed 25 tests across:

- registry validation and deterministic allocation;
- fail-closed runtime behavior;
- approval and registry-match gates;
- idempotent assignment and event writes;
- test/suppressed lead exclusion;
- origin, payload, and rate-limit route controls;
- draft migration pending-only safety;
- protected aggregate command view and route manifest.

Commands:

```bash
pnpm exec vitest run tests/adminops/experiment-command.test.ts tests/persistence/neon-public-experiment-repository.test.ts tests/api/public-experiment-event-route.test.ts tests/db/phase9-experiment-draft-migration-safety.test.ts tests/adminops/growth-intelligence.test.ts
pnpm typecheck
pnpm lint
```

Results:

- Focused Vitest: pass, 5 files / 25 tests.
- TypeScript: pass.
- ESLint: pass.
- Local runtime warning: workstation Node 26; repository and deployment runtime require Node 24.

## Full release evidence

Commands and results:

```bash
pnpm test
pnpm build
pnpm routes:verify
pnpm release:safety
pnpm amm:verify:isolation
git diff --check
```

- Full Vitest: pass, 181 files / 2,678 tests.
- Next.js optimized build: pass; `/admin/experiments` and `/api/experiments/event` emitted.
- Active route manifest: pass, 75 active routes and 16 acknowledged root/src duplicates.
- Release safety: pass, 14/14 controls.
- Ask Magic Mike / NellySelly isolation: pass.
- Patch whitespace: pass.

Local browser/runtime checks:

- `/home-value` rendered the exact existing control headline and description.
- No `data-experiment` or `data-variant` attribute was emitted while dormant.
- Horizontal overflow: 0 pixels at the active browser viewport.
- Browser console: no errors.
- Approved-origin event request returned `202`, `active=false`, `recorded=false`, and no variant.
- Unauthenticated protected command request did not render operator data; local no-auth runtime returned fail-closed `503`.

Vercel Preview and post-deploy Production evidence are recorded in the pull request checks and deployment verification before the release is accepted.

## Production invariants after deployment

The deployment is acceptable only if:

1. `/home-value` serves the existing control copy with no experiment attributes while the master switch is off.
2. `POST /api/experiments/event` returns a dormant response and performs no canonical write while the master switch is off.
3. `/admin/experiments` remains protected by server-side RBAC.
4. Production health, canonical domains, lead capture, email delivery infrastructure, and NellySelly isolation remain unchanged.

## Separate unexecuted gates

- Draft database registration migration.
- Production master-switch activation.
- Canonical row approval/running transition.
- Variant promotion or permanent public-copy adoption.
