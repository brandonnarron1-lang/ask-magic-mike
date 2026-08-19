# Phase 9.3 Database Revival QA Evidence

## Release candidate

- Branch: `codex/phase9-database-revival-command-2026-08-19`
- Commit: `bd3926167c5c17a64838541bff810e21b2747160`
- Draft PR: `https://github.com/brandonnarron1-lang/ask-magic-mike/pull/172`
- Vercel deployment: `dpl_8TPmfqS4o6HBirgLm8h9JX3Ty9eS`
- Preview artifact: `https://ask-magic-mike-jmd08vh8l-eyes-up-industries.vercel.app`
- Production changed: no
- Database migration or mutation: no
- Consumer or internal message sent: no

## Automated evidence

Run on 2026-08-19 from the release-candidate worktree:

```text
pnpm vitest run tests/adminops/database-revival.test.ts tests/adminops/admin-revival-route-guards.test.ts
17 tests passed across 2 files

pnpm release:gate
Ask Magic Mike / NellySelly isolation: PASS
Release safety: 14 pass, 0 fail
Full Vitest suite: 2,677 tests passed across 179 files
Strict typecheck: PASS
ESLint: PASS
Next.js 15.5.21 production build: PASS
Route manifest: PASS, 74 active routes
```

The local machine used Node 26.5.1 while the repository declares Node 24.x.
GitHub Actions then reran the canonical release gate on the supported CI runtime
and passed. Vercel built the Preview successfully.

## Security and authority evidence

- Anonymous requests to `/`, `/admin/revival`, and `/api/health/ready` on the
  branch alias redirect to Vercel SSO.
- The route also calls `requireLeadCenterPermission("report:view")` before the
  Neon read.
- Lead-level rows are available only to `lead:view_all` roles or a
  `lead:view_assigned` role with an agent ID.
- Assigned-owner scope is applied in SQL.
- Aggregate-only roles receive totals with no candidate identifiers.
- A missing principal fails closed to aggregate-only output.
- The query does not select names, contact values, street addresses, raw
  questions, consent text, message bodies, or provider payloads.
- Tests, suppressed records, duplicates, duplicate children, and terminal
  records are excluded before ranking.
- No relevant permitted destination produces an internal permission-review
  note, never email- or SMS-shaped consumer copy.
- Property-alert permission is isolated to buyer property-alert preference
  review and never becomes general marketing permission.
- The route contains no form, server action, mutating request, enrollment, or
  delivery control.

## Preview and visual evidence

Vercel reports the deployment `Ready` and identifies `bd39261` as its source.
The authenticated Vercel `Visit` flow loaded the Preview public shell with the
expected Ask Magic Mike navigation, conversion surfaces, consent copy, and
brand visuals. Anonymous direct requests remain protected.

Authenticated screenshot-level QA of `/admin/revival` remains pending. The
Vercel Preview session did not carry the separate Lead Center session, and the
controlled browser rejected direct deep-link navigation to the protected
deployment. No deployment protection, authentication control, or cookie scope
was weakened to work around that boundary.

## Known limitations and next gate

- Production remains on `a9784d5686ee6bd93136f4e9a4995304db28496f`.
- No candidate counts have been claimed from Preview because protected route
  rendering has not been authenticated there.
- No database-revival message, sequence, enrollment, task, provider request, or
  consent mutation is authorized by this release candidate.
- The exact merge and Production gate is:

  `APPROVE PHASE 9.3 DATABASE REVIVAL COMMAND MERGE AND PRODUCTION DEPLOYMENT`

- After that gate, verify the route using the existing Production Lead Center
  session, inspect desktop and mobile layouts, confirm canonical Neon counts,
  and retain the prior deployment as the immediate rollback target.
