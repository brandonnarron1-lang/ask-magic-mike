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
  `ffcaa9dd389c36a63ce3382dc4b9862dd976df86`.
- Independent measurement head: PR #212
  `758154ca73b64f24f2df8f183ba8b3f6f82f769a`.
- Rehearsal branch:
  `codex/phase9-pr212-after-pr211-rehearsal-20260824`.
- Pre-merge rescue ref:
  `rescue/amm-pr212-after-pr211-premerge-20260824-0500`.

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

## Verification

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

## Boundaries

No Vercel environment value, merge to an existing release branch, Production
deployment, database migration or write, lead/event submission, email/BCC,
SMS, Push, consumer acknowledgment, WordPress/GTM/GA4 mutation, DNS/cache
change, publication, spend, deletion, or NellySelly action occurred.

The exact immediate Production gate remains:

`APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`

The WordPress consent bridge remains separately gated by:

`APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA`

