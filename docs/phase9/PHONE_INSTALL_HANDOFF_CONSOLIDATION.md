# Phase 9 iOS Phone Install Handoff Consolidation

Updated 2026-08-22.

## Decision

Consolidate the unique iPhone Home Screen handoff from historical PR #179 onto
the verified PR #193 privacy/KPI-trust stack. Reuse the existing Web Push
provider, VAPID configuration, canonical Neon subscription repository,
notification outbox, service worker, protected phone-registration APIs, and
Lead Center controls. Do not introduce carrier SMS, a second notification
provider, a second database, a second PWA, or device takeover automation.

The consolidation branch is
`codex/phase9-phone-handoff-consolidation-20260822`, refreshed onto exact PR
#193 head `25818cdff887c42955c0c74cae17af5e782e62ab`. Its pre-refresh rescue ref is
`rescue/amm-pr194-pre-exact-base-refresh-20260822-1255`.

## Problem repaired

iPhone Web Push permission is available only to an installed Home Screen web
app. A link opened in Messages or a normal Safari tab cannot complete push
registration, and Basic Auth state is not a reliable credential handoff into
the installed app. The prior setup URL therefore stranded users between the
browser and installed-app cookie contexts.

## Implemented contract

1. An authenticated Lead Center operator mints a bounded, signed, copy-role
   invite only when Brandon is ready to install.
2. The invite points to a private token-scoped install page under
   `/phone-alerts/install/[token]` on an exact Ask Magic Mike origin.
3. The page supplies a token-scoped manifest whose `start_url` exchanges the
   token from inside the installed Home Screen app.
4. The claim route verifies signature, role, expiry, exact origin, IP throttle,
   and a durable one-time nonce guard in canonical Neon.
5. Successful exchange mints a distinct signed session credential, stores only
   that credential in a Secure, HttpOnly, SameSite=Strict cookie, and redirects
   to a token-free setup URL. The invite itself is never accepted as a setup
   cookie.
6. A copied invite cannot be claimed in a second browser/device or pasted into
   the cookie slot to bypass the one-time guard. The already installed app can
   safely reopen only when it presents its matching server-minted HttpOnly
   session.
7. Production fails closed if the one-time claim cannot be durably enforced.
   The failed attempt registers no device and sends no notification.

The durable guard reuses the existing `rate_limit_buckets` table. Its stored
identifier is an HMAC-SHA-256 pseudonym; the raw nonce is not persisted. This
candidate therefore contains no database migration.

## Privacy and indexing

- Install, manifest, claim, and setup responses are private/no-store,
  no-referrer, and noindex.
- The installed-app manifest is restricted to `/phone-alerts/`; it does not
  claim navigation scope over the public funnel or Lead Center.
- `/phone-alerts/` is disallowed in `robots.txt`.
- No token is written to localStorage, sessionStorage, analytics, or a database.
- The bearer token remains visible in the short-lived install URL by design;
  expiry, one-time durable claim, no-referrer, and restricted `copy` authority
  bound the residual URL/log exposure. Operators must not forward or bookmark
  it.
- Lock-screen Push content remains PII-minimized; full lead details remain in
  the authenticated Lead Center.

## Preview and physical-device boundaries

Automated Preview QA uses only a deliberately invalid synthetic token. It
verifies the deployed private/noindex install failure page and rejected manifest
without minting or redeeming a bearer token, touching a rate-limit bucket,
registering a device, sending Push, creating a lead, or touching Production
data. Valid-token signing/claim behavior is covered by isolated tests and the
later physical acceptance. Preview readiness is not accepted unless the
release-authority assertion reaches `PREVIEW_READY`.

Physical Brandon enrollment and one unmistakable `[TEST]` Push receipt remain a
separate owner-controlled action after Production release. Mike must enroll his
own primary device; Brandon's copy-role link cannot impersonate or register
Mike.

## Acceptance evidence

- Draft PR: #194. Post-refresh security repair code-bearing head:
  `b62957ba5f66f98808a9e31536615ab6ea1cbee4`.
- Focused phone/origin/Preview matrix: PASS, 8 files / 86 tests.
- Full local release gate: PASS, 211 files / 2,912 tests, strict typecheck,
  ESLint, optimized Next.js build, 82 active routes, 14/14 safety controls, and
  Ask Magic Mike/NellySelly isolation.
- Production dependency audit: no known vulnerabilities. Redacted full-history
  scan: 507 commits / 14.09 MB, no leak. Candidate diff and migration scans are
  clean.
- The earlier Node 24, Vercel Preview, protected Preview QA, and rendered browser
  evidence belong to the pre-refresh checkpoint and are historical only. Exact
  final-head Node 24, canonical Preview, strict `PREVIEW_READY`, and visual QA
  are mandatory and are recorded on PR #194 before it can leave Draft.

## Merge order and gate

This candidate is stacked after PR #185 and PR #193. It must be refreshed onto
the exact released predecessor and rerun Node 24 CI plus canonical Vercel
Preview verification before release.

Exact future application gate:

`APPROVE PHASE 9 IOS PHONE HANDOFF MERGE AND PRODUCTION DEPLOYMENT`

That gate authorizes only the reviewed application merge and canonical Vercel
deployment. It does not authorize device enrollment, a test Push, carrier SMS,
email, lead submission, database migration, external publication, WordPress,
DNS, spend, provider purchase, deletion, or NellySelly action.

## Rollback

Promote the prior known-good canonical Vercel deployment or set
`AGENT_PUSH_NOTIFICATIONS_ENABLED=false`. No database rollback is required.
Existing subscription/outbox rows remain preserved.
