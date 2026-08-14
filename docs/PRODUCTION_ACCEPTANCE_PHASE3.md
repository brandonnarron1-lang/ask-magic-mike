# Production Acceptance - Phase 3

Date: 2026-08-14
Decision: **STAGED / NOT YET PRODUCTION-ACCEPTED**

## Current Production result

Production is healthy and unchanged by the staged Phase 3 release:

- public funnel, canonical Neon persistence, and WordPress Form 3 bridge remain
  verified live;
- 0 live Neon leads, 6 suppressed test leads, 0 unsuppressed tests;
- 0 unassigned live leads, 0 live duplicate suspicions, 0 queued notification
  deliveries, and 0 failed notification deliveries;
- one canonical WordPress form is active: Form 3 Home Value;
- shared Basic Auth remains active and anonymous `/admin` receives HTTP 401;
- carrier SMS remains disabled and Web Push has zero enrolled devices;
- scheduled GitHub monitoring and the hourly Vercel SLA cron are active.

Form 7 entry 1550 is classified `GENUINE - CONSENT RESTRICTED OR UNCLEAR` and
was preserved without consumer contact, marketing enrollment, canonical
creation, or test reclassification.

## Staged Phase 3 acceptance

| Area | Result |
| --- | --- |
| Neon-only production reads/writes | accepted in code and automated tests |
| Additive RBAC schema | accepted on isolated Neon Preview only |
| Interactive RBAC application flow | pending secure Preview configuration |
| Production RBAC | not enabled; roster and Preview acceptance required |
| Form 1 / Form 6 audit | complete; both held for consent design |
| Forms 2 / 5 / 7 | held for placement, routing, consent, or brokerage decisions |
| Form 4 | recruiting-only; excluded from consumer routing |
| Web Push device labels | accepted on Preview only |
| Lead Center subdomain | code ready; Vercel domain and DNS not applied |
| Facebook crawler | root cause narrowed; host rule not changed |
| Monitoring | scheduled and point-in-time checks pass |

## Release gate

The staged branch passes 153 test files / 2,558 tests, strict TypeScript,
ESLint, a 41-page build, 58-route manifest, 14/14 release-safety checks, 13/13
Chromium tests, dependency audit, 326-commit secret scan, public smoke, funnel,
health, monitoring, and isolation checks. Social preview is the documented
exception at 40/42 because Facebook receives HTTP 403 on two Our Town pages.

## Production hold

Do not merge/deploy PR 143 until all of the following are true:

1. Configure the isolated Preview RBAC secret and branch flag securely.
2. Pass fictional login, role, object-level access, export, revoke/deactivate,
   open-redirect, CSRF, enumeration, and Basic Auth rollback acceptance.
3. Review the Production device-label migration and take the pre-change
   snapshot.
4. Apply `20260814210000_staff_push_device_label.sql` to Production **before**
   deploying code that reads `device_label`.
5. Re-run readiness, protected Push-route checks, public smoke, funnel, monitor,
   and Production error-log review.

Production RBAC is a later cutover and must remain disabled until the approved
staff roster and first verified administrator are available.
