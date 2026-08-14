# Lead Center RBAC Implementation

Status: **implemented behind a disabled production feature gate; awaiting roster and migration approval**.

## Decision

The Lead Center now has a free, maintained per-user identity implementation using Better Auth 1.6.29 and the canonical Neon PostgreSQL database. Shared Basic Auth remains the current production boundary and emergency fallback. It is not removed by this release.

## Controls implemented

- Email/password sign-in with public sign-up disabled.
- Better Auth password hashing; passwords never enter application tables or client code.
- Eight-hour database-backed sessions, one-hour refresh interval, secure production cookies, and session revocation.
- Database-backed rate limit: five email sign-in attempts per 15 minutes.
- Roles: `administrator`, `primary_lead_owner`, `approved_agent`, `read_only_analyst`.
- Server-side page, Server Action, route, permission, and assigned-lead checks.
- Assigned-agent filtering in Neon inbox/detail queries.
- Assigned-agent filtering for action-queue items and individual hot-lead reporting cards.
- Administrator-only assignment, routing, notification management, raw export policy, and user management.
- Read-only analyst access limited to non-sensitive reporting.
- Separate auth table names prevent collision with public lead sessions.
- Feature gate fails closed when enabled without `DATABASE_URL`, `BETTER_AUTH_SECRET`, or `BETTER_AUTH_URL`.

## Cutover gate

1. Approve the roster workbook.
2. Apply `20260814190000_lead_center_rbac.sql` to an isolated Neon Preview branch first.
3. Enter `BETTER_AUTH_SECRET` through Vercel's sensitive-variable interface for Preview only.
4. Provision one verified administrator without sending an invitation to an unverified address.
5. Verify login, expiry, revocation, role denial, assigned-lead isolation, exports, and rollback in Preview.
6. Set `LEAD_CENTER_RBAC_ENABLED=true` in Preview. Request a separate production migration and feature-flag approval only after acceptance.

Until all six pass, Production remains on the verified Basic Auth boundary.
