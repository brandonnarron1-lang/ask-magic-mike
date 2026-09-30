# Ask Magic Mike

Ask Magic Mike is the canonical public lead funnel and private Lead Center for
Our Town Properties. The current production stack is Next.js on Vercel with a
single Neon PostgreSQL lead database. OurTownProperties.com remains the
brokerage, listings, and SEO authority and embeds or links into this system.

## Current status

- `VERIFIED LIVE` — `https://www.askmagicmike.com` and the public seller,
  buyer, renter, open-house, widget, privacy, and accessibility routes.
- `VERIFIED LIVE` — durable Neon capture, attribution, consent, deterministic
  scoring/routing, notification outbox, Lead Center, and public health probes.
- `VERIFIED LIVE` — canonical `www` hostname; apex redirects with HTTP 308.
- `VERIFIED LIVE` — signed Form 3 WordPress forwarding into the canonical Neon
  record and authenticated internal email delivery.
- `READY — OWNER ACTIVATION` — free Web Push provider and phone setup; each
  physical device owner must complete permission and `[TEST]` receipt acceptance.
- `OWNER ACTION` — Mike and Brandon must enroll their own phones; authenticated
  internal email remains the active alert path until each device passes QA.
- `DEFERRED — PAID SERVICE` — carrier SMS/MMS; Web Push is the free-first path.
- `VERIFIED LIVE` — PR #280 is accepted at merge
  `fa1d0fb077882309970b801bbdfaa756107c2104` on Vercel deployment
  `dpl_51jpakXn2zav3WPQYfUmAiSBBHqZ`; exact-tree hosted verification,
  read-only monitor/smoke checks, and the canonical aliases pass.
- `PHASE E PREPARATION` — the reviewed Connector 1.1.0 source and rollback
  package are being reconciled from PR #248 onto current `main`. No WordPress
  plugin or page has been changed. The next external action remains the exact,
  independently gated Connector upgrade. PR #238 remains an applied, consumed
  five-migration receipt.

The source-of-truth audit is in
[`docs/CURRENT_STATE_RECONCILIATION.md`](docs/CURRENT_STATE_RECONCILIATION.md).
The accepted Production identity, current review state, and consumed cutover
receipts are in
[`docs/CURRENT_RELEASE_AUTHORITY.md`](docs/CURRENT_RELEASE_AUTHORITY.md).
Documentation precedence and historical-packet handling are in
[`docs/DOCUMENTATION_AUTHORITY.md`](docs/DOCUMENTATION_AUTHORITY.md).
The remaining human gates are in
[`docs/OWNER_APPROVAL_QUEUE.md`](docs/OWNER_APPROVAL_QUEUE.md).

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm lint
pnpm routes:verify
pnpm release:safety
pnpm smoke:prod
pnpm amm:verify:health
pnpm amm:verify:funnel
pnpm amm:verify:isolation
```

Use Node 24.x and pnpm 10.30.3 to match Vercel. Local checks default to mock or
read-only behavior and must not send carrier SMS, email, or customer messages.

## Safe configuration

Copy `.env.example` to an ignored local environment file and provide secrets
only through the approved hosting secret interface. Never commit or print
`DATABASE_URL`, admin credentials, provider keys, VAPID private keys, the audit
BCC, or WordPress bridge secrets.

## Release boundary

Branch work and Preview deployments are allowed for review. Merging to `main`,
production deployment, live database migration, WordPress publication, external
send, DNS change, and paid-service activation remain explicit owner gates.
