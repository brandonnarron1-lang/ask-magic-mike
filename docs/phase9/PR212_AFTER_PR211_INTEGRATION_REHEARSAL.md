# PR #212 after PR #211 integration rehearsal

Date: 2026-08-24

## Purpose

Prove that the consent-gated cross-domain measurement candidate can follow the
ordered PR #209 -> PR #210 -> PR #211 application train without replacing the
canonical lead API, Neon database, attribution model, WordPress bridge, or
internal Web Vitals pipeline.

This rehearsal is not a release vehicle. PR #209 remains the sole immediate
Production candidate. The live Our Town consent-order hold and its separate
WordPress gate remain unchanged.

## Exact inputs

- Downstream application head: PR #211
  `6eacc33d16e34897c97288e48cd736433a3d9e15`.
- Independent measurement head: PR #212
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a`.
- Rehearsal branch:
  `codex/phase9-pr212-after-pr211-rehearsal-20260824`.
- Original pre-merge rescue ref:
  `rescue/amm-pr212-after-pr211-premerge-20260824-0500`.
- Pre-current-parent-refresh rescue ref:
  `rescue/amm-pr212-rehearsal-pre-pr211-ledger-sync-20260824-0649`.

## Current sealed-parent refresh

The rehearsal now includes exact sealed PR #211 head
`6eacc33d16e34897c97288e48cd736433a3d9e15`, whose exact parent is sealed PR
#210 head `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`.

The current merge found one content conflict, limited to punctuation in the
completed-release section of `docs/OWNER_APPROVAL_QUEUE.md`. Resolution keeps
the accepted Production commit/deployment, fresh read-only verification counts,
and completed-gate exhaustion language. No application, analytics, lead,
database, provider, WordPress, or executable test conflict occurred in this
refresh.

The actual PR #212 branch remains unchanged at
`758154ca73b64f24f2df8f183ba8b3f6f82f769a`. This rehearsal remains a separate
compatibility branch and cannot be used as release authority.

## Reconciliation result

Git identified eight textual conflicts. Six were append-only operating
ledgers. The two executable conflicts were additive:

1. `app/api/events/route.ts` retains canonical-Production Web Vitals
   validation and adds the known-browser-automation exclusion.
2. `app/layout.tsx` renders both the consent-gated external analytics manager
   and the privacy-minimized first-party Web Vitals reporter.

The combined public-events test initially exposed one contract mismatch. The
integrated contract now:

- rejects a genuine Web Vital outside canonical Production;
- acknowledges known automation with HTTP 202 while persisting nothing;
- performs no rate-limit-store write for known automation; and
- preserves the existing 400 rejection for malformed, private-route, or
  relabeled Web Vital payloads.

This keeps automated QA out of KPIs and avoids turning expected browser checks
into retry traffic.

## Prior integrated verification

Executed with Node `v24.18.0` and pnpm `10.30.3`:

- focused integration: 11 files / 74 tests passed;
- complete Vitest suite: 235 files / 3,113 tests passed;
- strict TypeScript: passed;
- ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 static pages;
- route manifest: 83 active routes / 17 acknowledged root-source duplicates;
- release safety: 14/14 passed;
- release doctor: healthy, 42 passed and one expected nonblocking dirty-tree
  result before this rehearsal commit;
- Ask Magic Mike / NellySelly deployable-source isolation: passed; and
- Production dependency audit: no known vulnerabilities.

These results belong to the prior rehearsal parent and are historical after
the current sealed-parent refresh. Fresh exact-head verification is recorded
below before this rehearsal is treated as current compatibility evidence.

## Current exact-head verification

The resolved refreshed tree was exercised under Node `v24.18.0` and pnpm
`10.30.3` before creation of the merge commit:

- focused integration: 14 files / 99 tests passed; and
- complete Vitest suite: 235 files / 3,119 tests passed.

The final rehearsal merge commit must repeat the complete release gate,
optimized build, release doctor, dependency audit, secret scan, and protected
no-write Preview acceptance before it can be cited as current compatibility
evidence. Those checks do not grant release authority.

## Boundaries

No Vercel environment value, merge to an existing release branch, Production
deployment, database migration or write, lead/event submission, email/BCC,
SMS, Push, consumer acknowledgment, WordPress/GTM/GA4 mutation, DNS/cache
change, publication, spend, deletion, or NellySelly action occurred.

The exact immediate Production gate remains:

`APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`

The WordPress consent bridge remains separately gated by:

`APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA`

Only after the live brokerage consent-order hold is resolved, the complete
application train is accepted on `main`, PR #212 is refreshed and reproved, and
authenticated Google/Vercel configuration is reviewed may the separate Ask
application gate become requestable:

`APPROVE PHASE 9 CROSS-DOMAIN MEASUREMENT CONFIGURATION, ENVIRONMENT ENTRY, MERGE, AND PRODUCTION DEPLOYMENT`
