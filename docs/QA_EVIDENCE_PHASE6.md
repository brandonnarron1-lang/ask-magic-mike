# QA Evidence - Phase 6

Evidence timestamp: 2026-08-15 America/New_York

## Local results

| Check | Result | Evidence |
| --- | --- | --- |
| Phase 6 unit set | Pass | 5 files, 21 tests |
| ESLint | Pass | `pnpm lint` |
| Strict TypeScript | Pass | `pnpm typecheck` |
| Full repository tests | Pass | 164 files, 2,600 tests |
| Production build | Pass | Next.js 15.5.21, 43 static pages generated |
| New routes | Pass build | `/api/admin/copilot`, `/admin/message-previews` |
| Public capture | Preserved | Existing `/api/leads` suite passes |
| Messaging policy | Pass | permission, template, sequence/orchestration, SMS tests |
| AI safety | Pass | injection, redaction, delimiter, fallback tests |

## Correctly non-passing or not yet executed

- Preview E2E: not executed until Preview deployment exists.
- Phase 6 Neon migration: not applied to Production.
- Brandon-only provider email: not sent yet.
- Inbox receipt/reply/link checks: not executed yet.
- Carrier SMS: intentionally disabled; mock preview only.
- Mike delivery: intentionally not tested in Phase 6.
- Consumer delivery: intentionally disabled.

Intentional skips are not counted as passes.

## Existing production baseline

Phase 5 production commit: `1dd8f35cb1ab1adcacd1292262ca6c01580eb370`
Deployment: `dpl_Ft1cwDHRGe6hCnzTboxqkLxvnit8`
Live prospects: 0 at snapshot
Suppressed QA: 6 at snapshot
Mike account: dormant
Brandon administrator: active
