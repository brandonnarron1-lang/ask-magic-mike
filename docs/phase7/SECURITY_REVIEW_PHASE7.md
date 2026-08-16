# Security review — Phase 7

Controls reviewed: server-side RBAC, object-level lead scope, same-origin mutation checks, Zod input validation, UUID validation, parameterized SQL, no-store admin responses, Sensitive environment variables, raw-body webhook verification, constant-time QA bearer comparison, idempotency, minimized webhook storage, no PII in general logs, and fail-closed feature flags.

High-risk paths have explicit controls:

- QA override requires test + suppressed and exact recipient allowlist.
- Resend events require valid Svix signature before database access.
- Consumer sends and carrier SMS are off.
- AI key stays server-side; model output has no mutation authority.
- Sequence transitions use RBAC, scope, compare-and-update, and audit.

Residual deployment checks: configure webhook secret securely, apply the additive migration on Preview before Production, run dependency audit, inspect Vercel logs, and replay signed duplicate events. No NellySelly project/domain/database variable may be introduced.

