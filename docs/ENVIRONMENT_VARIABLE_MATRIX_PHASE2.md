# Phase 2 Environment Variable Matrix

Values are intentionally omitted.

| Variable | Scope | Sensitive | Purpose |
|---|---|---:|---|
| `DATABASE_URL` | Preview + Production | Yes | Canonical Neon connection |
| `ADMIN_SECRET` | Preview + Production | Yes | Current Basic fallback/emergency access |
| `LEAD_CENTER_RBAC_ENABLED` | Preview + Production | No | Per-user cutover gate; default false |
| `BETTER_AUTH_URL` | Preview + Production | No | Identity base URL |
| `BETTER_AUTH_SECRET` | Preview + Production | Yes | Session/cookie signing |
| `WORDPRESS_BRIDGE_SECRET` | Production | Yes | HMAC bridge boundary |
| `CRON_SECRET` | Production | Yes | Vercel SLA cron authentication |
| `RESEND_API_KEY` | Production | Yes | Internal email delivery |
| `LEAD_NOTIFICATION_BCC` | Production | Yes | Hidden audit copy; never document value |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Production | No | Web Push public key |
| `VAPID_PRIVATE_KEY` | Production | Yes | Web Push signing |
