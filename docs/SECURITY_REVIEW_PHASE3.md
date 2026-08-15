# Security Review - Phase 3

Date: 2026-08-14
Scope: staged PR 143 plus read-only Production verification

## Result

No open critical or high-severity code defect was found. The required Push
device-label migration preceded deployment, PR 143 merged, and Production RBAC
administrator acceptance passed. A follow-up hardening patch explicitly pins
the auth database connection to `sslmode=verify-full` to remove a future `pg`
compatibility warning without weakening TLS.

This review is an engineering security assessment, not a penetration test or
legal opinion.

## Controls verified

- Canonical lead/reporting mutations fail closed without Neon and do not fall
  back to Supabase, even when legacy compatibility variables are present.
- Public capture stores before notification; test/suppressed records remain
  excluded from ordinary business reporting and delivery paths.
- Admin pages, actions, reporting, exports, notes, assignment, notification
  retry, SLA sweep, and Push routes enforce server-side authorization.
- The exact `hub.ourtownproperties.com` host is only a no-store/no-referrer/
  noindex redirect to the canonical protected `/admin` surface. Incoming path
  and query are discarded.
- RBAC schema changes remain additive. Production contains only the approved
  administrator and linked primary lead owner; Mike remains credentialless.
- Web Push subscriptions are server-only, endpoint-unique, role-constrained,
  revocable, and never displayed as raw endpoints. The device-label migration
  passed on Preview only.
- Carrier SMS remains disabled. No consumer message, Push, external email,
  social post, DNS change, or firewall change occurred during this stage.
- The Facebook crawler issue was reduced to an upstream host rule. The prepared
  exception is path/method/crawler scoped and explicitly excludes login, admin,
  REST, AJAX, XML-RPC, and form submission.
- Deployable code contains no NellySelly project identifier and the isolation
  test passes.

## Verification evidence

| Check | Result |
| --- | --- |
| Release safety | 14/14 pass |
| Unit/integration tests | 155 files, 2,566 tests pass |
| Chromium E2E | 13/13 pass |
| Strict TypeScript | pass |
| ESLint | pass |
| Production build | pass, 41 static pages |
| Route manifest | pass, 60 active routes |
| Production dependency audit | zero known vulnerabilities |
| Gitleaks | 326 commits, no leaks found |
| Public smoke | 19 pass, 2 protected/write skips, 0 fail |
| Live funnel | 15/15 pass |
| Health | 2/2 public probes pass |
| Point-in-time monitor | 9/9 pass |
| Synthetic monitor | 6 pass, 1 protected skip, 0 fail |
| Production error logs, last hour | no error-level logs returned |
| NellySelly isolation | pass |

Local verification used Node 26.5.1 while the project declares and Vercel uses
Node 24.x. The engine warning is recorded; TypeScript, tests, lint, and build all
passed. CI remains the authoritative Node 24 check after the final branch push.

## Unresolved controlled risks

1. The Our Town Facebook-user-agent block remains upstream; no broad security
   reduction is acceptable.
2. Forms 1, 2, 5, 6, and 7 lack required approved consent/routing evidence and
   remain outside the canonical bridge. Form 4 remains recruiting-only.
3. Mike's dormant account requires owner-controlled activation and an
   assigned-lead-only acceptance check before personal use.
