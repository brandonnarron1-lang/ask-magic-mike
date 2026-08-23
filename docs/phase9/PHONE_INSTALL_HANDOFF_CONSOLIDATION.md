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
`codex/phase9-phone-handoff-consolidation-20260822`, refreshed onto released PR
#193 merge `9b82afb609674bb0209b73f8ac9622ab02733e2a`. Its immediately preceding state
is preserved at `rescue/amm-pr194-pre-pr193-refresh-20260822-1841`.

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
   Production detection covers both Vercel (`VERCEL_ENV=production`) and an
   owned/self-hosted fallback (`NODE_ENV=production` when Vercel metadata is
   absent). The failed attempt registers no device and sends no notification.
8. Scoped copy enrollment refuses to relabel an existing Mike/primary endpoint.
   When RBAC is enabled, the legacy secret-header invite endpoint is disabled;
   link creation requires the protected Lead Center permission. The optional QA
   Push is durably one-shot per setup session and copy subscription in
   Production.

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

## Released acceptance evidence

- PR #194 final reviewed head:
  `851ebe530ac6a91a4e410f26538d29c1bf43f1c6`; released-main base:
  `c08abe1168840b99ccba07866bbec8cf7a6752fb`.
- Portable Production fail-closed repair:
  `f979d808fd76a1dba82b0a7f2b922f04c75af483`.
- Full exact Node 24 release gate: PASS, 214 files / 2,949 tests, strict
  typecheck, ESLint, optimized Next.js build, 82 active routes, 14/14 safety
  controls, 43/43 doctor checks, and Ask Magic Mike/NellySelly isolation.
- Production dependency audit: no known vulnerabilities. The redacted
  full-history scan covers approximately 14.14 MB and reports no leak.
  Candidate diff and migration scans are clean.
- Exact Node 24 run `32606142473`, canonical Ready Preview deployment
  `dpl_7nhaV5tpS4YArtgKVV9PfVBRHq4H`, and protected Preview QA run
  `32606286620` pass. The protected run records 17 passes, six intentional
  write skips, zero failures, two expected browser tests, 43/43 doctor checks,
  and strict `PREVIEW_READY`.
- Approved head was merged as
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6` and accepted on Production
  deployment `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. Read-only acceptance passed
  conversion 15/15, smoke 19 pass / two skips / zero failures, private invalid
  install/manifest behavior, canonical readiness, and zero deployment errors.

## Released boundary

The exact application gate was received and exhausted by the reviewed merge and
canonical Vercel deployment above. It did not authorize device enrollment, a
test Push, carrier SMS, email, lead submission, database migration, external
publication, WordPress, DNS, spend, provider purchase, deletion, or NellySelly
action. Those boundaries remain intact.

## Rollback

Promote the prior known-good canonical Vercel deployment or set
`AGENT_PUSH_NOTIFICATIONS_ENABLED=false`. No database rollback is required.
Existing subscription/outbox rows remain preserved.
