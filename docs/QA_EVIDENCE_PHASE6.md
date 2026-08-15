# QA Evidence - Phase 6

Evidence timestamp: 2026-08-15 America/New_York

## Local results

| Check | Result | Evidence |
| --- | --- | --- |
| Phase 6 unit set | Pass | 5 files, 21 tests |
| ESLint | Pass | `pnpm lint` |
| Strict TypeScript | Pass | `pnpm typecheck` |
| Full repository tests | Pass | 166 files, 2,606 tests including the Neon-compatible migration safety gate |
| Production build | Pass | Next.js 15.5.21, 44 static pages generated |
| New routes | Pass build | `/api/admin/copilot`, `/api/admin/qa/email`, `/admin/message-previews` |
| Canonical route manifest | Pass | 64 active routes, 15 acknowledged root/src duplicates |
| Dependency audit | Pass | No known high-or-greater Production vulnerabilities |
| Preview deployment | Ready | `dpl_DeTnRQW2t5bo3N6QhiKfkZFZQk7e`, commit `9a3246d1378722e8d4cceeaeb521de34d4d2a8df`, Node.js 24.x |
| Preview live health | Pass | Environment `preview`; Neon configured; notifications disabled; email disabled |
| Preview ready health | Pass | Database, capture function, leads, notifications, RBAC, and push schema ready |
| Preview runtime errors/warnings | None observed | No error or warning logs after controlled health requests |
| Public capture | Preserved | Existing `/api/leads` suite passes |
| Messaging policy | Pass | permission, template, sequence/orchestration, SMS tests |
| AI safety | Pass | injection, redaction, delimiter, fallback tests |
| Production deployment | Ready | `dpl_BxCt1Yvq2T4hQqBUnnyPcqc4FNwq`, merge commit `509b54fa8def73d48169970868338ca66c28793f` |
| Production smoke | Pass | 19 pass, 2 intentional skips, 0 fail |
| Funnel verification | Pass | 15 pass, 0 fail |
| Production monitor | Pass | 9 pass, 0 fail |
| Lead-pipe health | Pass | 9 routes healthy |
| NellySelly isolation | Pass | canonical project verified; deployable code contains no NellySelly identifiers |
| Brandon QA email provider acceptance | Pass | Resend ID `fb4fdd9d-d421-482d-b062-5c2bbf6bce1c` |
| Brandon Gmail inbox receipt | Pass | Exact prefixed subject received at 3:56 PM America/New_York |
| Sender alignment | Pass | mailed-by `send.notify.askmagicmike.com`; signed-by `notify.askmagicmike.com`; TLS |
| Responsive message-preview layout | Pass | 1,152px desktop content canvas; 335px mobile column; no horizontal overflow |
| Neon environment identity | Pass | Authenticated console: Preview `br-morning-paper-aun3378r`; Production `br-round-base-auh6h2wd` |
| Phase 6 Preview migration | Pass | 7/7 tables, 7/7 RLS, 0 `anon`/`authenticated` grants, 0 new rows |
| Production migration hold | Pass | Read-only Production precheck reports 0/7 Phase 6 tables |
| Post-release errors/warnings | None observed | No Production error or warning log entries returned for the observed 30-minute window |

## Correctly non-passing or not yet executed

- Authenticated Preview runtime E2E remains to be rerun against the merged
  migration commit; database identity and schema acceptance now pass.
- Phase 6 Neon migration: not applied to Production.
- Reply action: intentionally not sent; destination behavior remains a separate acceptance item.
- Native mobile Gmail-app rendering: unavailable; responsive component viewport QA passed, while actual Gmail desktop rendering and inbox receipt were captured.
- Carrier SMS: intentionally disabled; mock preview only.
- Mike delivery: intentionally not tested in Phase 6.
- Consumer delivery: intentionally disabled.
- Sensitive Preview `DATABASE_URL` remains intentionally non-exportable through
  the CLI. Distinct branch identity was instead proven in the authenticated Neon
  console, and the additive migration was applied only to Preview.

The initial Preview transaction failed safely at an unconditional revoke of the
nonexistent Neon `anon` role. It was explicitly rolled back, the migration was
made provider-compatible, and the corrected transaction then passed. No partial
DDL or data mutation survived the failed attempt.

Intentional skips are not counted as passes.

## Existing production baseline

Phase 5 production commit: `1dd8f35cb1ab1adcacd1292262ca6c01580eb370`
Deployment: `dpl_Ft1cwDHRGe6hCnzTboxqkLxvnit8`
Live prospects: 0 at snapshot
Suppressed QA: 6 at snapshot
Mike account: dormant
Brandon administrator: active
