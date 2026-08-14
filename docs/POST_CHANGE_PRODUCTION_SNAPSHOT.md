# Post-change Production Snapshot

Captured 2026-08-14 after Form 3 activation and the idempotency hotfix.

## Canonical application

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike`
- Production branch: `main`
- Merge: `2a9ee23c2aedc6bad5a69a1ea0d15f4ee8cd14a3`
- Vercel project: `eyes-up-industries/ask-magic-mike`
- Deployment: `dpl_HzxCrWNSrK491qTddxqKBMcZxvSL` (`Ready`)
- Canonical host: `https://www.askmagicmike.com`
- Apex: HTTP 308 to `www`
- Database: Neon project `bitter-star-20214385`
- Runtime health: production Postgres, email enabled

## WordPress

- Canonical bridge: active version 1.1.0
- HMAC secret: configured on both systems; value never displayed
- Global mode: enabled
- Allowlist: Form 3 only
- Forms 1, 2, and 4–7: not allowlisted
- Form 3 legacy `Admin Notification`: Inactive after duplicate-path proof
- Form 3 entry storage: retained and verified

## Controlled evidence

- Gravity entry: `1549`
- Canonical lead: `70f63f35-2478-4738-b84c-bc1a89b8482c`
- Bridge attempt: 1, forwarded
- Internal canonical email: one delivered to Mike
- Hidden audit copy: receipt confirmed
- Consumer email: suppressed
- SMS: suppressed
- Corrected replay: HTTP 200, `X-AMM-Idempotent-Replay: 1`, same lead

## Open control

Audit the timestamp-bounded row created during the pre-fix controlled replay.
If it exists, mark it as test and suppress it; do not delete production data.
Further form activation is held until this reconciliation is recorded.
