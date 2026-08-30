# Current Release Authority Truth — QA Evidence

- Date: 2026-08-29
- Branch: `codex/phase9-release-authority-truth-20260829`
- Parent: `7a1dc828ea353cd76e13ca0c7a3078c46433dd06`

## Defect proven

Draft PR #238 was already sealed as the single cumulative PR #210–#237
application candidate, but active operator records and the protected Growth
capability ledger still said to release PR #210 first. Both statements could
not safely remain actionable. An operator following the older instruction
could select an obsolete component gate instead of the reviewed cumulative
release.

## Correction

- Added `config/current-release-authority.json` as the singular machine-readable
  authority record.
- Added a typed server-side adapter at
  `app/lib/growth/current-release-authority.ts`.
- Updated the protected Growth capability ledger to consume the manifest and
  present PR #238 as the only cumulative candidate.
- Reconciled active runbooks, implementation status, owner approval queue,
  blockers, limitations, rollback, architecture, consolidation, asset, and
  documentation-authority records.
- Preserved PRs #210–#237 as historical lineage and PR #239 as dependent,
  read-only post-candidate tooling.
- Added regressions that reject active PR #210-first guidance and recompute the
  four migration SHA-256 values from source.

## Bound release identity

- Accepted Production: PR #209, merge
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`, deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.
- Cumulative candidate: Draft PR #238, head
  `de67db6e1183b2a47d329d4a9a11993d48d1992a`, tree
  `75abbbbe6767092e1d31b225014dd1bf574acda1`.
- Existing hosted evidence: Release Gate run `33286824049`; protected Preview
  QA run `33286951924`; immutable Preview deployment
  `dpl_4vstQQGaY6HxsgjNB8UrDkB2bX6t`.
- Exact approval remains:

  ```text
  APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
  ```

## Migration integrity

Tests read each reviewed SQL file and recompute these expected SHA-256 values:

| Migration | SHA-256 |
| --- | --- |
| `20260824193000_marketing_spend_ingress.sql` | `9640e5807622d88c0ca3b1074ea3a0f4d304ca493dbe9ab1d573243e858ee6a1` |
| `20260824220000_organic_search_ingress.sql` | `4d1ec2947134145a75a8b82e2edef71fcd7d8b0974ebfb909d838d1378e81626` |
| `20260825033000_local_profile_performance_ingress.sql` | `68f292f8e1773c9d2b999c61311362576848020176c5dbdeaf0550ba4795047c` |
| `20260825060000_local_demand_metric_truth_guard.sql` | `705fa33d1516451e721cd30d9991084ff3dae987849a2f47981eaeff762a561a` |

## Verification

Executed with Node `24.18.0` and pnpm `10.30.3`:

```text
pnpm exec vitest run tests/adminops/growth-capability-ledger.test.ts tests/scripts/current-release-authority-docs.test.ts
PASS — 2 files / 29 tests

pnpm run typecheck
PASS — strict TypeScript

pnpm exec eslint app/lib/growth/capability-ledger.ts app/lib/growth/current-release-authority.ts tests/adminops/growth-capability-ledger.test.ts tests/scripts/current-release-authority-docs.test.ts
PASS

pnpm run release:gate
PASS — deployable-source isolation
PASS — 14/14 release safety
PASS — 275 files / 3,401 tests
PASS — strict TypeScript
PASS — full ESLint
PASS — Next.js 15.5.21 optimized build / 59 pages
PASS — 95 active routes / 17 acknowledged duplicates
```

The final fully documented tree is re-run before commit. Exact-head hosted CI
and Preview identity are then pinned in the Draft PR comment rather than
written into the commit and changing its own head.

## Safety boundary

No Production database query or migration, merge, deployment, Vercel
environment or secret change, WordPress read/write, lead export/import/access,
email/SMS/Web Push send, provider mutation, DNS change, publication, spend,
deletion, or NellySelly action occurred. No live PII was processed.
