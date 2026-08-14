# RBAC Preview Acceptance Report

Status: in progress
Date: 2026-08-14

## Environment isolation

| Control | Result |
| --- | --- |
| Neon project | `bitter-star-20214385` |
| Production branch | `br-round-base-auh6h2wd` — unchanged |
| Preview branch | `br-morning-paper-aun3378r` (`preview`) |
| Production RBAC tables before/after | absent / unchanged |
| Preview RBAC tables before migration | absent |
| Preview migration | PASS — additive migration applied successfully, 13 statements |
| Preview RBAC tables after migration | PASS — users, sessions, accounts, verifications, rate limits, auth audit all present |
| Preview user/session counts after migration | 0 / 0 |
| Production notifications | unchanged |

## Application status

The branch includes the Neon-only persistence reconciliation and authenticated audit actor propagation. Vercel Preview deployment `dpl_7tfvdECySRg49XtkTQUkDNWTuGdh` built successfully with database readiness true and outbound notifications disabled. The next deployment adds a safe `rbac_schema_ready` probe to prove the existing Preview `DATABASE_URL` resolves to the migrated branch. A Preview-only `BETTER_AUTH_SECRET` and feature flag are still required before interactive acceptance.

## Acceptance matrix

| Test | Status | Evidence / note |
| --- | --- | --- |
| RBAC policy unit tests | PASS | Included in full 2,553-test suite |
| Migration on isolated branch | PASS | Schema query after migration returned all six tables and zero users/sessions |
| Production schema untouched | PASS | Migration executed only in `preview` branch |
| Fictional user creation/login/logout | pending Preview deployment | Do not use real staff identities in Preview |
| Password hashing/provider auth | pending Preview deployment | Verify account password is hashed and never returned |
| Secure cookies/session expiry | pending Preview deployment | Browser acceptance required |
| Rate limiting/failed-login throttle | pending Preview deployment | Automated and browser proof required |
| Revoke/deactivate/role changes | pending Preview deployment | Must invalidate old session |
| Object-level lead authorization | pending fictional seed | Agent must not read another agent’s lead |
| Mutation/export/report permissions | pending fictional seed | Analyst mutation and raw PII export must fail |
| CSRF/open redirect/enumeration | pending Preview deployment | Negative tests required |
| Emergency Basic Auth rollback | pending Preview deployment | Toggle off RBAC and prove protected access recovery |

## Current classification

`IMPLEMENTED — PREVIEW APPLICATION ACCEPTANCE IN PROGRESS`

Production cutover is not authorized by this result. It remains blocked on completed Preview acceptance and the approved staff roster.
