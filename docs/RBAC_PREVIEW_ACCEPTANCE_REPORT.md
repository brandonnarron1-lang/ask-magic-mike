# RBAC Preview Acceptance Report

Status: **PASS — ACCEPTANCE COMPLETE**
Date: 2026-08-14

## Environment isolation

| Control | Result |
| --- | --- |
| Neon project | `bitter-star-20214385` |
| Production branch | `br-round-base-auh6h2wd` — unchanged |
| Preview branch | `br-morning-paper-aun3378r` (`preview`) |
| Preview RBAC schema | PASS — all six additive identity/audit tables ready |
| Accepted Vercel deployment | `dpl_2Kpchet8VAee8oqoWi2PovznC8ct` |
| Accepted URL | `https://ask-magic-mike-czivxzahi-eyes-up-industries.vercel.app` |
| Preview readiness | PASS — database and RBAC schema ready |
| Outbound delivery | Disabled; no email, SMS, Push, or consumer acknowledgment sent |
| Production bootstrap route | HTTP 404 |
| One-use bootstrap token | Removed from branch-scoped environment after acceptance |

## Defect found and corrected

The first live login probe returned HTTP 404 because the browser client used
`/api/lead-center-auth` while Better Auth retained its default `/api/auth`
server base path. Commit `9c6ed47` aligned the server, client, and App Router
handler on `/api/lead-center-auth` and added a regression assertion.

## Acceptance matrix

| Test | Result | Evidence |
| --- | --- | --- |
| Administrator login | PASS | HTTP 200; `/admin/leads` HTTP 200 |
| Primary lead owner login | PASS | HTTP 200; assigned-lead inbox HTTP 200 |
| Approved agent login | PASS | HTTP 200; assigned-lead inbox HTTP 200 |
| Analyst login | PASS | `/admin/reporting` HTTP 200 |
| Analyst lead-inbox denial | PASS | `/admin/leads` HTTP 307 to generic forbidden login state |
| Object-level assignment isolation | PASS | Primary fixture excluded agent fixture; agent fixture excluded primary fixture |
| Disabled-user denial | PASS | Login HTTP 403; no session cookie |
| Logout/revocation | PASS | Sign-out HTTP 200; reused session received HTTP 307 |
| Secure credential handling | PASS | Random credentials existed only in process memory; no values logged or committed |
| Production isolation | PASS | Production bootstrap path HTTP 404; Production database and deployment unchanged |

## Acceptance cleanup

Five `example.test` fictional identities remain as an auditable Preview-only
acceptance record. All five are banned and all acceptance sessions are revoked.
The final Neon query returned `qa_users=5`, `banned_users=5`, and
`active_sessions=0`. The two assignment fixtures remain `is_test=true`,
communication-suppressed, and marked `INTERNAL QA — DO NOT CONTACT`.

The temporary bootstrap route, helper, test, `.env.example` entry, and Vercel
token were removed before the release candidate. No reusable credential was
retained.

## Classification

`IMPLEMENTED — PREVIEW ACCEPTANCE PASSED`

Production cutover is now blocked only by the verified Production roster,
Production additive migration, Production secrets/flag, and controlled
post-deploy verification. Shared Basic Auth remains the rollback boundary until
that cutover is complete.
