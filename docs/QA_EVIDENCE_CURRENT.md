# Current QA Evidence

Audit date: 2026-08-14. No live lead, email, SMS, push notification, database
mutation, or customer contact was created during this audit.

## Baseline result

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 144 files, 2,525 tests before this branch |
| `pnpm routes:verify` | PASS — 54 active routes, 13 acknowledged root/src duplicates |
| `pnpm release:safety` | PASS — 14/14 |
| `pnpm build` | PASS |
| `pnpm audit --prod` | PASS — no known production vulnerabilities |
| `pnpm smoke:prod` | PASS — 19, SKIP — 2, FAIL — 0 |
| `pnpm amm:verify:funnel` | PASS — 15/15 |
| `pnpm amm:verify:isolation` | PASS |
| `pnpm amm:verify:health` | PASS — live/readiness; protected detail safely skipped without local secret |

Vercel builds with Node 24.x. The audit workstation used Node 26.5.1, so Node
24.x remains the authoritative release runtime.

## Live read-only proof

- `www.askmagicmike.com` and required public routes returned HTTP 200.
- Apex `askmagicmike.com` returned HTTP 308 to the canonical `www` host.
- `/api/health/live` and `/api/health/ready` reported the Neon lead pipe ready.
- Unauthenticated `/admin` access returned HTTP 401.
- Vercel production deployment `dpl_4krvUvVDvgK4owaQmaHHfXyWAEke` is Ready
  and serves the canonical aliases.
- Vercel production error search found no error-level events in the prior 24h.
- Desktop 1440x1000 and mobile 390x844 browser checks showed a responsive,
  keyboard-labelled lead experience with no console error.
- Ask Magic Mike social-preview checks passed. Facebook's crawler received 403
  on the Our Town `/ask-mike/` and `/agents/mike-eatmon/` pages; other crawlers
  passed. This is a WordPress/host firewall issue, not an Ask app render issue.

## Branch remediation proof

- Health verifier tests cover current Neon and retained legacy response shapes.
- Public `/api/events` now accepts only the approved event registry.
- Launch doctor scans both active `app/` and preserved `src/` trees and checks
  Neon/push/email/BCC environment names.
- Admin responses set no-store and frame protection.

## Final branch matrix

- `pnpm test`: PASS — 146 files, 2,531 tests.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm routes:verify`: PASS — production build and 54-route manifest.
- `pnpm release:safety`: PASS — 14/14.
- `pnpm audit --prod`: PASS — no known vulnerabilities.
- `pnpm smoke:prod`: PASS — 19; SKIP — 2 protected/write checks; FAIL — 0.
- `pnpm amm:verify:funnel`: PASS — 15/15.
- `pnpm amm:verify:health`: PASS — 2/2 public probes; protected detail skipped.
- `pnpm amm:verify:isolation`: PASS.
- `pnpm amm:verify:social-preview`: Ask Magic Mike PASS; overall BLOCKED —
  HUMAN ACTION because Facebook crawler still receives 403 on two Our Town pages.
- Draft PR #137 release gate and all Vercel checks: PASS.
- Canonical Preview `dpl_GX79R6BkfrmiCXFSzjzpDRphZzwz`: Ready;
  live/readiness probes PASS with Preview Neon and outbound email/push disabled;
  unauthenticated `/admin` returns 401.

During Preview inspection, Vercel CLI auto-linking created an empty project named
`ask-magic-mike-free-first-2026-08-14`. Read-only inspection proved it had zero
deployments; it was removed immediately and its local link files were deleted.
The canonical project, domains, deployments, and data were not changed.

## Privileged-route hardening rerun — 2026-08-14 10:40 EDT

No production deployment, database mutation, lead submission, email, SMS, push,
or WordPress change occurred during this rerun.

| Check | Result |
| --- | --- |
| Focused admin-push/phone/appointment tests | PASS — 4 files / 18 tests |
| `pnpm run amm:verify:isolation` | PASS |
| `pnpm run release:safety` | PASS — 14/14 |
| `pnpm test` | PASS — 148 files / 2,538 tests |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm routes:verify` | PASS — production build, 54 active routes, 13 acknowledged duplicates |
| `pnpm test:e2e` | PASS — 13/13 Chromium tests |
| `pnpm audit --prod` | PASS — no known vulnerabilities |
| `gitleaks detect --source . --redact` | PASS — 315 commits, no leaks |
| `git diff --check` | PASS |

The workstation used Node 26.5.1 while the project requests Node 24.x. Canonical
Vercel Preview `dpl_BZNVfpM6yFxMsNgve9mu2aKSSVm2` is Ready on Node 24.x. Using
an authenticated, temporary local link to the existing canonical Vercel project,
`/`, `/api/health/live`, and `/api/health/ready` returned HTTP 200; anonymous
`/admin` returned 401; a synthetic Preview appointment POST returned 503 before
mutation; and anonymous `/admin/api/push/subscriptions` returned 401. GitHub's
independent `local-release-gate` and all Vercel status checks passed.

Run the final command matrix recorded in the draft PR after every requested
change. Production end-to-end messaging remains covered by the controlled QA
evidence in `QA_EVIDENCE.md`; this audit deliberately did not resend it.
