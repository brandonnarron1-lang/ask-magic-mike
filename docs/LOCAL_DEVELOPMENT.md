# Local Development — Ask Magic Mike

Ask Magic Mike / Our Town Properties, Inc.

This document is authoritative for local setup, validation, and release verification.
CI and Vercel are the production sources of truth; local instructions here align to them.

---

## Runtime requirements

| Tool | Version | Source of truth |
|------|---------|-----------------|
| Node | 20 (LTS) | `.nvmrc`, CI `node-version: "20"` |
| pnpm | 10.x | `packageManager` in `package.json`, `pnpm-lock.yaml` |

Vercel auto-detects pnpm from `pnpm-lock.yaml` and uses pnpm for all production builds.
CI uses `pnpm install --frozen-lockfile`. Local must match.

### Set up Node via nvm

```sh
nvm install    # reads .nvmrc (Node 20)
nvm use
```

If you do not have nvm: https://github.com/nvm-sh/nvm

### Enable pnpm via corepack (recommended)

```sh
corepack enable pnpm
```

Or install directly:

```sh
npm install -g pnpm@10
```

---

## Install dependencies

Always use the lockfile. Do not run bare `npm install` or `pnpm install` without `--frozen-lockfile`.

```sh
pnpm install --frozen-lockfile
```

---

## One-command local validation

```sh
npm run verify
```

Runs: `typecheck → tests → lint → build`. Same steps as CI.

Individual steps:

```sh
npm run typecheck   # tsc --noEmit
npm run test        # vitest run (447 tests as of PR #14)
npm run lint        # next lint
npm run build       # next build
```

---

## Production smoke (read-only)

Verifies live metadata, canonical/og:url, robots, sitemap, admin health (if `ADMIN_SECRET` set).
Makes no writes to the database.

```sh
npm run smoke:prod
```

Which expands to:

```sh
TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs
```

### Write-mode smoke (opt-in only)

Creates one session via `POST /api/session/create` tagged `AMM_SMOKE_DO_NOT_CONTACT`.
Sessions expire naturally — no manual DB cleanup required.

```sh
TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs --write
```

**Never use `--write` against production unless explicitly authorized.**
Do not create real leads. Do not send outbound SMS/email.

### Smoke against a preview URL

```sh
TARGET_URL=https://<preview>.vercel.app npm run smoke:target
```

---

## Full release preflight (local gate)

```sh
npm run release:preflight
```

Runs: `release:doctor → release:gate → release:report → launch:authority`

**Required before opening a PR that touches product code.**

---

## Environment

See `docs/ENVIRONMENT.md` for the full env var reference.
See `docs/PRODUCTION_LAUNCH_GATE.md` for the production launch checklist.

### Local `.env.local`

`.env.local` is gitignored. It is never committed, never printed, never shared.
Its location must never appear in git diffs, commit messages, or screenshots.

---

## Dirty worktree safety

This repo has a known-dirty main worktree (pre-existing uncommitted amm-run files).
**Never run `git add .` or `git add -A`.**
Always stage files by name:

```sh
git add docs/LOCAL_DEVELOPMENT.md src/app/layout.tsx
```

Use a clean sibling worktree for all release-branch work:

```sh
git worktree add ../amm-<branch-slug> origin/main
cd ../amm-<branch-slug>
git switch -c feat/<branch-name>
```

---

## MLS / confidential data

MLS exports (FlexMLS, RETS, IDX) are confidential participant-only material.
They are NOT public content source material unless separately sanitized, authorized,
and reviewed by the broker. Do not include them in:
- public pages or API responses
- test fixtures
- generated marketing copy
- screenshots or documentation

Files at `.amm-run/_inbox_flexmls/` are confidential source material and must
never be committed, shared publicly, or used as direct page content.

---

## Scripts reference

| Script | What it does |
|--------|--------------|
| `pnpm install --frozen-lockfile` | Install exact locked versions |
| `npm run verify` | typecheck + test + lint + build |
| `npm run typecheck` | TypeScript strict check |
| `npm run test` | Vitest unit test suite |
| `npm run lint` | ESLint via next lint |
| `npm run build` | next build (production) |
| `npm run smoke:prod` | Read-only prod smoke (www.askmagicmike.com) |
| `npm run smoke:target` | Smoke against `TARGET_URL` env var |
| `npm run release:doctor` | Fast local preflight checks |
| `npm run release:gate` | safety + test + typecheck + lint + build |
| `npm run release:preflight` | Full local gate before opening a PR |
| `npm run monitor:synthetic` | Read-only GET-path synthetic monitor |
