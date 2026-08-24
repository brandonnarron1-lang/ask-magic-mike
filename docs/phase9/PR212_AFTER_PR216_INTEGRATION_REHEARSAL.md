# PR #212 after PR #216 integration rehearsal

Date: 2026-08-24

## Purpose

Prove that the existing consent-gated cross-domain measurement candidate can
follow the sealed application train through PR #216 without replacing the
canonical lead API, Neon database, attribution model, server-owned conversion
ledger, WordPress bridge, notification systems, or private Lead Center.

This rehearsal is not a release vehicle. It does not alter PR #212, `main`,
Production, Vercel configuration, Neon, WordPress, GTM, GA4, or NellySelly.

## Exact inputs

- Downstream application head: PR #216
  `253480326312d42a159323176d69e87f47262921`.
- Independent measurement head: PR #212
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a`.
- Common released base:
  `b450b41c66c6740bd20571cdbe7d8caf82e92d5e`.
- Rehearsal branch:
  `codex/phase9-pr212-after-pr216-rehearsal-20260824`.

## Reconciliation result

Git identified 12 textual conflicts. Six were cumulative operating ledgers.
The six executable/test conflicts were reconciled as one system:

1. `app/api/events/route.ts` keeps PR #216 Web Vitals validation and protected
   funnel UUID handling while excluding known automation before rate limiting,
   body parsing, or persistence.
2. `app/layout.tsx` keeps the existing Black Diamond shell, explicit smooth
   scroll behavior, Production-only Web Vitals reporter, and the default-off
   external-analytics consent manager.
3. `app/lib/analytics.ts` keeps browser-visible success signals, sends a valid
   submission UUID only to the first-party ledger, preserves server ownership
   of canonical conversion outcomes, and suppresses automated first-party
   writes.
4. Client/API analytics tests retain PR #216 identity and server-authority
   coverage plus PR #212 automation and consent exclusions.
5. The widget Preview suite keeps the shared PR #216 fail-closed interception
   helper for funnel scenarios. The external-analytics isolation scenario
   separately blocks every mutating request and strips Vercel bypass headers
   from cross-origin requests.
6. Release ledgers preserve both candidates and explicitly keep completed
   Production approvals exhausted.

The external GTM publication boundary independently rechecks consent, canonical
host, route, automation, internal-QA classification, exact approved container,
registered event name, privacy-allowlisted properties, and `is_test` exclusion.
It does not become another durable conversion authority.

## Ordered release boundary

The application train remains:

`PR #209 -> PR #210 -> PR #211 -> PR #213 -> PR #214 -> PR #215 -> PR #216`

PR #212 remains separate and on HOLD. It may be refreshed onto accepted `main`
only after the application train is released in order and the live brokerage
consent boundary is repaired and verified.

## Live HOLD

The read-only brokerage preflight currently reports:

- approved GTM container `GTM-KZMCSLTJ`;
- destination `G-RQRBB1G270`;
- Basic Consent gate absent;
- legacy GTM head bootstrap present;
- legacy GTM noscript present; and
- Ask/Nelly container collision absent.

The blocking codes are:

- `brokerage_basic_consent_gate_missing`;
- `brokerage_basic_gate_not_before_cookie_choice_provider`;
- `brokerage_legacy_gtm_bootstrap_present`; and
- `brokerage_legacy_gtm_noscript_present`.

No code path in this rehearsal bypasses that HOLD.

## Verification

The resolved pre-commit merge tree was exercised with Node `v24.18.0` and pnpm
`10.30.3` after a frozen-lockfile install:

- focused integration: 18 files / 111 tests passed;
- complete Vitest suite: 241 files / 3,163 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 static pages;
- route manifest: 84 active routes / 17 acknowledged root-source duplicates;
- release safety: 14/14 passed;
- release doctor: healthy, 42 passed and one expected nonblocking dirty-tree
  result before the merge commit;
- Ask Magic Mike / NellySelly deployable-source isolation: passed;
- Production dependency audit: no known vulnerabilities;
- staged diff integrity: passed;
- bridge package checksum: passed,
  `6fdab89876c297e376c7e957436b97aa782c8df628c89225edc4cadad6ee6b54`; and
- the bridge PHP blob is inherited byte-for-byte from exact PR #212 source
  (`7867e82b912c5a7b25917056999be4c3b4bcf844`). Local PHP is not installed, so
  this rehearsal did not repeat PHP syntax lint; PR #212's recorded PHP 8.1
  proof remains source evidence rather than new exact-head evidence.

The current read-only live cross-domain preflight repeated the documented HOLD
with the four blocker codes listed above, tag-inert Ask server HTML, and no
NellySelly identity collision.

Replacement protected Preview browser evidence remains pending until the
harness repair is committed and deployed as an immutable non-Production
Preview. It must run only against that exact rehearsal head and retain the
shared no-write safeguards.

### Superseded first exact-Preview attempt

Merge commit `c3103bb6746bbeab3d23133b73f889ffe633787c` passed GitHub Release
Gate run `32767472474` and deployed READY as Preview
`dpl_4x8iAdJKqBNxEqQndHuRFYvgHeRP`. Protected run `32767829945` passed the
read-only HTTP gate and its genuine-automation external-analytics isolation
scenario, then failed six public-behavior scenarios because PR #212's client
automation suppression correctly emitted no `/api/events` requests for the
older interceptor-based identity assertions.

The mismatch did not expose a runtime write: the shared route handler remained
fail-closed, the browser suite reported zero captured event requests rather
than an escaped request, and the dedicated isolation scenario observed no
application mutation or Google runtime.

The replacement harness keeps runtime automation suppression intact. Public
funnel scenarios now opt into an ordinary-browser simulation only after the
shared POST/PUT/PATCH/DELETE interceptor is active; the dedicated automation
scenario remains unmodified. Exact-head GitHub, immutable Preview, and
protected no-write reruns are mandatory before this repair is accepted.

## Rollback and authority

Rollback for this rehearsal is branch-only: do not merge it. Preserve the
branch and evidence; deletion would require separate approval. No live rollback
exists because no live system changed.

The immediate Production gate remains:

`APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`

The separate live WordPress consent gate remains:

`APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA`

Only after that gate passes, the ordered application train is accepted on
`main`, PR #212 is refreshed and reproved, and authenticated GTM/GA4 and Vercel
configuration are reviewed may a separate application release gate be issued.

## Non-action statement

No Production deployment, environment change, database migration or write,
lead/event submission, email/BCC, SMS/MMS, Push, consumer acknowledgment,
WordPress/GTM/GA4 mutation, DNS/cache change, publication, spend, deletion, or
NellySelly action occurred.
