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
- Vercel production deployment `dpl_GJkS5dRAtzakPdtVJRiNAUWbWSKp` is Ready
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
- PR #137 release gate, merge, production deployment, and post-release checks:
  PASS.
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

## WordPress bridge v1.1.0 and toolchain rerun — 2026-08-14 11:42 EDT

No production lead, email, SMS, push notification, consumer acknowledgment,
database mutation, form submission, or WordPress setting was created or changed.
Authenticated read-only inspection reconfirmed the exact field IDs for Gravity
Forms 1–7. Every form lacks a native Consent field and retains one active legacy
admin notification with no local BCC. The installed bridge remains version 1.0.0
in shadow mode; it has observed saved entries from forms 6 and 7 with attempt 0
and no canonical lead ID.

The reviewed v1.1.0 package adds a mandatory per-form allowlist and remains
fail-closed if the global flag is on without an approved form ID. Package:
`output/release/ask-magic-mike-canonical-bridge-1.1.0.zip`; SHA-256:
`a6a985c3cc7a4c5f357c16cb5937c407044d07071a09f6a3ae9d757085dc5633`.

| Check | Result |
| --- | --- |
| Focused WordPress/signature tests | PASS — 2 files / 10 tests |
| `pnpm test` | PASS — 148 files / 2,539 tests on Vitest 3.2.6 |
| `pnpm run typecheck` | PASS |
| `pnpm run lint` | PASS |
| `pnpm run routes:verify` | PASS — production build / 54 routes |
| `pnpm run release:safety` | PASS — 14/14 |
| `pnpm run amm:verify:isolation` | PASS |
| `pnpm run test:e2e` | PASS — 13/13 Chromium tests |
| `pnpm audit --audit-level high` | PASS — no known vulnerabilities |
| ZIP integrity | PASS — 3 archive entries, no errors |

The workstation used Node 26.5.1 while Vercel remains pinned to the authoritative
Node 24.x runtime. No PHP CLI is installed locally; production WordPress load is
therefore the final PHP parse/plugin-upgrade proof and remains an activation gate.
The read-only canonical Vercel environment-name audit did not find
`WORDPRESS_BRIDGE_SECRET`; matching server secrets must be entered through Vercel
and the WordPress hosting configuration in the same controlled activation window.

## Form 3 production bridge acceptance — 2026-08-14 15:58–16:14 EDT

The reviewed bridge package SHA-256 was
`a6a985c3cc7a4c5f357c16cb5937c407044d07071a09f6a3ae9d757085dc5633`.
Production WordPress now runs bridge 1.1.0 with a matching HMAC secret and only
Home Value Form 3 allowlisted. Forms 1, 2, and 4–7 remain blocked.

The controlled public submission used `INTERNAL QA DO NOT CONTACT`, a fictional
address, a 555 test number, explicit internal-QA UTMs, and denied communication
consent. Gravity Forms created entry `1549`; the bridge forwarded it on attempt
1 to canonical lead `70f63f35-2478-4738-b84c-bc1a89b8482c` with correlation ID
`2256b664-5b7b-42e9-bf45-4ab13ba436d3`. The public form redirected to the live
thank-you page only after Gravity Forms accepted the entry.

One canonical `[TEST] HOME VALUE LEAD` alert was delivered through Resend from
the authenticated `notify.askmagicmike.com` sender to Mike. The hidden audit BCC
receipt was independently confirmed without recording its private value.
SPF, both DKIM signatures, and DMARC passed at Gmail. The delivered transport
Message-ID is
`<010001a001daae23-116109d3-9bae-49cb-a007-367a88d1d504-000000@email.amazonses.com>`.
No consumer acknowledgment and no carrier SMS appeared in the audit mailbox or
test workflow. Gravity Forms also logged its legacy `Admin Notification` as sent,
so only that exact Form 3 notification was changed from Active to Inactive.

A signed replay exposed a pre-existing Neon edge case: non-UUID WordPress keys
generated a new session before enrichment collided with the stored key. Production
returned one controlled HTTP 500 with `neon_enrichment_failed`; no second canonical
email was sent. PR #139 fixed this with deterministic sessions and a
fingerprint-checked Neon preflight. Merge `2a9ee23c2aedc6bad5a69a1ea0d15f4ee8cd14a3`
deployed as `dpl_HzxCrWNSrK491qTddxqKBMcZxvSL`. The same signed replay then returned
HTTP 200, `X-AMM-Idempotent-Replay: 1`, and the original lead ID. Gmail still
contained exactly one canonical alert.

| Check | Result |
| --- | --- |
| Release safety | PASS — 14/14 |
| Unit/integration tests | PASS — 149 files / 2,547 tests |
| Typecheck | PASS |
| ESLint | PASS |
| Route manifest | PASS — 56 active routes / 15 acknowledged root/src duplicates |
| Production build | PASS |
| GitHub Node 24 release gate | PASS |
| Production `/api/health/live` | PASS — Postgres and email enabled |
| Corrected signed replay | PASS — same lead, no second email |

One final data audit is intentionally open: the controlled pre-fix failure may
have committed an additional duplicate row before enrichment failed. The correct
Neon owner session is required to identify that timestamp-bounded QA row and mark
it `is_test=true`/suppressed if present. Do not delete it and do not activate a
second Gravity Form until that audit is complete.

The follow-up release candidate also restores the canonical App Router listing
compatibility endpoints that the synthetic monitor and existing documentation
already expected. They return a bounded, no-store, public-safe degraded result
while the live IDX/FlexMLS authority remains on Our Town Properties; no private
MLS provider or field is exposed. The candidate adds nested WordPress
`attribution.click_ids` normalization. Focused tests pass 37/37, the complete
suite passes 149 files / 2,547 tests, typecheck and ESLint pass, release
verification and the 56-route manifest pass, and the production build includes `/api/listings/search`
and `/api/listings/[id]`.
