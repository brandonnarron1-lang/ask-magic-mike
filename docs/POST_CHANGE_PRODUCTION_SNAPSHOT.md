# Post-change Production Snapshot

Captured 2026-08-14 after Form 3 activation and the idempotency hotfix.

## Canonical application

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike`
- Production branch: `main`
- Merge: `178bdefd499187d749a22af02762e38aeb6e532d`
- Vercel project: `eyes-up-industries/ask-magic-mike`
- Deployment: `dpl_3AVXKtKCuiqytNqNQXvSKF4YBPCL` (`Ready`)
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

## Reconciled control

The timestamp-bounded pre-fix replay row was found, marked test/suppressed, and
given a dedicated audit record. It has zero notifications and zero analytics
events. No data was deleted. Form 3 is accepted; further forms remain blocked
until individually reviewed.
