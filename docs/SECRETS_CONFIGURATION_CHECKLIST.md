# Secrets Configuration Checklist

- [x] WordPress bridge secret stored in `wp-config.php`, outside source control
- [x] Matching Vercel Production `WORDPRESS_BRIDGE_SECRET` stored encrypted
- [x] Secret value never printed, committed, emailed, or placed in screenshots
- [x] BCC configured as an encrypted environment variable
- [x] Resend provider credential remains server-only
- [x] Neon `DATABASE_URL` remains server-only and isolated from NellySelly
- [x] Remove the local temporary bridge-secret and QA request files after reconciliation
- [ ] Confirm the approved password manager holds recovery metadata

Presence and successful HMAC verification are the only recorded proof. Values
must never be copied into this document.
