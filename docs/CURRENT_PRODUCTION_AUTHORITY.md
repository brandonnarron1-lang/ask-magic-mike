# Current Production authority

Status: `LIVE_PRODUCTION`

Verified 2026-09-28 against GitHub, Vercel, public HTTP, and the repository's
read-only Production checks.

## Canonical source

- Repository: `https://github.com/brandonnarron1-lang/ask-magic-mike.git`
- Branch: `main`
- Commit: `a2f3de834830f600df106dbf5836ae4bbde4eb4a`
- Tree: `0065f829fc94f87ab5e0faf596c8e56733be3972`
- Accepted release: PR #247

## Canonical deployment

- Team/project: `eyes-up-industries/ask-magic-mike`
- Project ID: `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`
- Production deployment: `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`
- Generated URL: `https://ask-magic-mike-571exyxlz-eyes-up-industries.vercel.app`
- Canonical URL: `https://www.askmagicmike.com`
- Apex: `https://askmagicmike.com` redirects to the canonical `www` hostname.
- State: Ready
- Runtime: Node 24.x
- Rollback candidate: `dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`

## Canonical data and operations

- Database provider: Neon PostgreSQL
- Project: `bitter-star-20214385`
- Production branch: `br-round-base-auh6h2wd`
- Database: `neondb`
- Public health and readiness: HTTP 200
- Notification mode: Production; email enabled
- Durable rate limit, RBAC, capture, notification, Push, and phone setup
  readiness: true

No NellySelly or What's Your Theme Song identifier is present in the deployed
Ask Magic Mike source boundary. Their projects, databases, domains, and secrets
remain separate.

## Current limitations

- Facebook's crawler receives HTTP 403 on selected Our Town Properties pages
  because of the known server-global Apache `bad_bots` rule. Other tested
  crawlers and Ask Magic Mike pages pass. The bounded hosting fix remains a
  separate live Apache approval.
- No statement in this file authorizes a Production merge, deploy, migration,
  WordPress write, provider activation, or send.
