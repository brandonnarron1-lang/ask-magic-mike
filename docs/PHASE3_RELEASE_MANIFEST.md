# Phase 3 Release Manifest

Generated: 2026-08-14

## Reviewable source

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike`
- Pull request: `https://github.com/brandonnarron1-lang/ask-magic-mike/pull/143`
- Branch: `codex/phase3-live-operations-2026-08-14`
- RBAC acceptance and secure-activation implementation commit: `3192b9f`
- Base branch: `main`
- Production merge commit: `10eefde10563b4eb83292453595eec97ec92cd30`

## Deployments

- Canonical Vercel project: `eyes-up-industries/ask-magic-mike`
- Project ID: `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`
- RBAC-enabled Production deployment:
  `dpl_46R7PQfBPH8N5BPymTQPmeenfYd5`
- Accepted RBAC Preview deployment:
  `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`
- Preview URL:
  `https://ask-magic-mike-czivxzahi-eyes-up-industries.vercel.app`
- Preview state: Ready; database and RBAC schema ready; anonymous admin HTTP
  401; no error-level logs returned in the inspected interval.
- Final code-bearing Preview deployment:
  `dpl_FE63usgk8JmTYRS4aPyyGPA2euJa`
- Final code-bearing Preview URL:
  `https://ask-magic-mike-48ux3e60x-eyes-up-industries.vercel.app`
- Final probes: live 200; ready 200 with `rbac_schema_ready=true`; login,
  password-help, and set-password pages 200; removed bootstrap route 404.

## Database boundaries

- Neon project: `bitter-star-20214385`
- Production branch: `br-round-base-auh6h2wd`
- Preview branch: `br-morning-paper-aun3378r`
- RBAC migration: applied on Preview and Production
- Web Push device-label migration: applied on Preview and Production before deploy
- Production deployment and administrator acceptance: pass

## Authoritative verification

- GitHub Actions run: `31855717441`
- Job: `94939988948`
- Result: pass
- Vercel Preview check: pass
- Local release gate: 155 files / 2,566 tests, strict TypeScript, ESLint,
  41-page build, 60 active routes, and 14/14 release-safety checks
- Chromium: 13/13
- Dependency audit: no known vulnerabilities
- Gitleaks: 326 commits, no leaks

## Release order

Preview and Production RBAC acceptance are complete and the temporary bootstrap
surface is removed. Future users remain individually approval-gated. Application
rollback is `LEAD_CENTER_RBAC_ENABLED=false` followed by redeploy; database
tables remain additive.
