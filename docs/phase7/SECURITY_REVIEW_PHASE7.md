# Security review — Phase 7

Controls reviewed: server-side RBAC, object-level lead scope, same-origin mutation checks, Zod input validation, UUID validation, parameterized SQL, no-store admin responses, Sensitive environment variables, raw-body webhook verification, constant-time QA bearer comparison, idempotency, minimized webhook storage, no PII in general logs, and fail-closed feature flags.

High-risk paths have explicit controls:

- QA override requires test + suppressed and exact recipient allowlist.
- Resend events require valid Svix signature before database access.
- Consumer sends and carrier SMS are off.
- AI key stays server-side; model output has no mutation authority.
- Sequence transitions use RBAC, scope, compare-and-update, and audit.

The 2026-08-16 accessibility-polish diff was also reviewed against the JavaScript, React, and Next.js secure-coding baselines. It adds no HTML injection sink, dynamic navigation, credential storage, client-side secret access, cross-origin messaging, server mutation, or authorization change. `pnpm audit --prod --audit-level high` reported no known vulnerabilities, and the repository release-safety scan passed all 14 controls.

The additive Phase 7 migration is already applied on the canonical Neon Production branch and was verified without changing live lead rows. Remaining deployment checks: configure the Resend webhook secret securely before enabling webhook ingestion, inspect Vercel logs after the polish release, and replay signed duplicate events when that signing secret is available. No NellySelly project/domain/database variable may be introduced.
