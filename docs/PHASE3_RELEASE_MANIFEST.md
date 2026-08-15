# Phase 3 Release Manifest

Generated: 2026-08-14

## Reviewable source

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike`
- Pull request: `https://github.com/brandonnarron1-lang/ask-magic-mike/pull/143`
- Branch: `codex/phase3-live-operations-2026-08-14`
- Final staged commit: pending final branch commit after accepted RBAC cleanup
- Base branch: `main`
- Production commit remains: `27b9e5422bee8078afe7cd54231c291458f6aacb`

## Deployments

- Canonical Vercel project: `eyes-up-industries/ask-magic-mike`
- Project ID: `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`
- Current Production deployment remains:
  `dpl_DTLUBvTFL8jwQtzaFrsHmRdUWmWu`
- Accepted RBAC Preview deployment:
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`
- Preview URL:
  `https://ask-magic-mike-czivxzahi-eyes-up-industries.vercel.app`
- Preview state: Ready; database and RBAC schema ready; anonymous admin HTTP
  401; no error-level logs returned in the inspected interval.

## Database boundaries

- Neon project: `bitter-star-20214385`
- Production branch: `br-round-base-auh6h2wd` - unchanged
- Preview branch: `br-morning-paper-aun3378r`
- RBAC migration: applied on Preview only
- Web Push device-label migration: applied on Preview only
- Production migration/deploy: not performed

## Authoritative verification

- GitHub Actions run: `31850872440`
- Job: `94926265435`
- Result: pass
- Vercel Preview check: pass
- Local release gate: 155 files / 2,565 tests, strict TypeScript, ESLint,
  41-page build, 60 active routes, and 14/14 release-safety checks
- Chromium: 13/13
- Dependency audit: no known vulnerabilities
- Gitleaks: 326 commits, no leaks

## Release order

Preview RBAC acceptance is complete and the temporary bootstrap surface is
removed. PR 143 must remain unmerged until the Production device-label migration
is applied before code deployment. Production RBAC remains a separate,
roster-gated cutover with shared Basic Auth retained as rollback.
