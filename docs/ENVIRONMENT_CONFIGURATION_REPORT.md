# Environment Configuration Report

Captured: 2026-08-14

No values are recorded in this report.

## Branch-scoped Preview configuration

| Variable | Scope | Classification | Status |
| --- | --- | --- | --- |
| `DATABASE_URL` | Preview | Sensitive, inherited project value | Runtime database ready |
| `ADMIN_SECRET` | Preview | Sensitive, inherited project value | Existing fallback only |
| `BETTER_AUTH_SECRET` | Preview, PR 143 branch | Sensitive | Configured |
| `BETTER_AUTH_URL` | Preview, PR 143 branch | Sensitive | Configured to stable branch alias |
| `LEAD_CENTER_RBAC_ENABLED` | Preview, PR 143 branch | Sensitive | `true` |
| `DATABASE_ENV` | Preview, PR 143 branch | Sensitive | `preview` |
| `PREVIEW_DATA_MODE` | Preview, PR 143 branch | Sensitive | `enabled` |
| `ALLOW_PREVIEW_DB_MUTATION` | Preview, PR 143 branch | Sensitive | `true` |
| `RBAC_PASSWORD_RESET_EMAIL_ENABLED` | Preview/Production | Server-only feature gate | Remains `false` until an approved account activation send |

`RBAC_PREVIEW_BOOTSTRAP_TOKEN` was one-use, branch-scoped, and removed after
acceptance. It is absent from the final branch environment inventory.

## Delivery state

- Preview Push/provider/phone setup: disabled.
- Production email settings: unchanged.
- Production SMS: disabled/not provisioned.
- No secret value was read back, logged, committed, placed in a URL, or written
  to an artifact.

## Production cutover requirements

Before enabling Production RBAC, configure Production-only values for
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://www.askmagicmike.com`, and
`LEAD_CENTER_RBAC_ENABLED`, but keep the flag false until the additive migration
and verified user provisioning are complete. Never reuse the Preview secret.
Password activation additionally requires the existing authenticated Resend
configuration plus `RBAC_PASSWORD_RESET_EMAIL_ENABLED=true`; reset links are
never copied to the lead-alert BCC.
