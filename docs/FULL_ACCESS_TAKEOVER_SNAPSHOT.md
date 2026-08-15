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
- Production remains on shared Basic Auth for `/admin`.
- Production RBAC tables and feature flag were not changed during Preview
  acceptance.
- Our Town WordPress, Gravity Forms, DNS, SMTP, mailbox settings, public pages,
  and NellySelly were not modified.
- No email, SMS, Push, consumer acknowledgment, social post, paid ad, or vendor
  purchase was triggered.

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

## Remaining production decision

Do not create a Production administrator from public profiles or a guessed
email. Confirm the exact administrator login identity, then follow
`RBAC_MIGRATION_RUNBOOK.md` with Basic Auth retained as break-glass rollback.
