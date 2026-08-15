# Full-Access Takeover Snapshot

Captured: 2026-08-14, America/New_York

## Canonical assets

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike`
- Branch: `codex/phase3-live-operations-2026-08-14`
- Pull request: `https://github.com/brandonnarron1-lang/ask-magic-mike/pull/143`
- Vercel project: `eyes-up-industries/ask-magic-mike`
- Neon project: `bitter-star-20214385`
- Production Neon branch: `br-round-base-auh6h2wd`
- Isolated Preview Neon branch: `br-morning-paper-aun3378r`

## Production state preserved

- `https://www.askmagicmike.com` remains the canonical public application.
- `https://askmagicmike.com` remains the redirecting apex.
- Production RBAC is active for `/admin`; anonymous requests redirect to the
  per-user login page.
- All six Production RBAC tables and the Push device-label migration are ready.
- Our Town WordPress, Gravity Forms, DNS, SMTP, mailbox settings, public pages,
  and NellySelly were not modified.
- Two owner-only password activation/reset emails were sent to Brandon with no
  BCC; no lead, consumer, Mike, SMS, Push, social, paid-ad, or vendor message was
  triggered.

## Preview acceptance result

- Accepted deployment: `dpl_2Kpchet8VAee8oqoWi2PovznC8ct`
- Readiness: database ready, lead/outbox schema ready, RBAC schema ready.
- Roles proven: administrator, primary lead owner, approved agent, read-only
  analyst, and disabled user.
- Assignment isolation, role denial, sign-out, and stale-session denial passed.
- Cleanup: five banned fictional users, zero active sessions.
- Temporary acceptance endpoint and token removed from the release candidate.
- Production-safe password activation is staged: one-time 60-minute links,
  exact-origin validation, non-enumerating responses, session revocation, no
  BCC, and an independent server-only send gate. No activation email was sent.

## Production cutover result

Brandon administrator acceptance passed and left zero active sessions. Mike is
provisioned as the canonical primary owner with no credential/session. The
newest Brandon reset link remains unused for permanent password selection.
Rollback is `LEAD_CENTER_RBAC_ENABLED=false` plus a redeploy; additive tables
remain in place.
