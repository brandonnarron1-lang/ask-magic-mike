# Canonical Production Stack

This document defines the single authoritative source of truth for Ask Magic Mike's production infrastructure. All deploys, config changes, and domain operations must reference these entries.

---

## Repository

| Field | Value |
|-------|-------|
| Canonical repo | `brandonnarron1-lang/ask-magic-mike` |
| Primary branch | `main` |
| Branch protection | GitHub Ruleset ID 17291635 (require PRs + status checks on `main`) |
| Bypass procedure | See `docs/PRODUCTION_RELEASE_LOG.md` — Merge Procedure section |

---

## Vercel Project

| Field | Value |
|-------|-------|
| Canonical Vercel project | `ask-magic-mike` |
| Canonical production domain | `www.askmagicmike.com` |
| Vercel project ID | `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8` |
| Apex redirect | `askmagicmike.com` → `www.askmagicmike.com` (308, managed by Vercel) |
| Framework | Next.js 15 (App Router) |
| Node version | 24.x |
| Automatic Git deployments | Enabled; Ignored Build Step command is empty |

Current accepted Production release: PR #247 merge
`a2f3de834830f600df106dbf5836ae4bbde4eb4a`, exact tree
`0065f829fc94f87ab5e0faf596c8e56733be3972`, deployment
`dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`. Deployment
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` is the immediate application rollback.
PR #248 is the only active reviewed application candidate at reviewed content
head `32e3ac7157f9ecdd75fe63c4faafbab4f85cb48f`, exact tree
`d0842ec5ae23d1eaddbddc691bbeaaa704b18e77`, with hosted Release Gate
`33528697047` and Ready immutable Preview
`dpl_51JjPVTZizxPJZu1GAiWjVpFTaZn`. It has zero migrations or environment
changes. Its application release authority does not authorize a WordPress
plugin/page action. PR #238 is a consumed five-migration cutover receipt. See
[`CURRENT_RELEASE_AUTHORITY.md`](./CURRENT_RELEASE_AUTHORITY.md).

### Verification command

```bash
# Confirm canonical alias is active
node scripts/amm/verify-production-alias.mjs
```

---

## Domains

| Domain | Role | Target |
|--------|------|--------|
| `www.askmagicmike.com` | **Canonical production** | Vercel project `ask-magic-mike` |
| `askmagicmike.com` | Permanent apex redirect | → `www.askmagicmike.com` |

### Separate products

| Project | Status | Notes |
|---------|--------|-------|
| NellySelly | **Strictly isolated** | Different repository, Vercel project, domains, database, and environment variables. Ask Magic Mike release checks reject NellySelly project identifiers. |

## Canonical database

| Field | Value |
|-------|-------|
| Provider | Neon PostgreSQL |
| Project | `bitter-star-20214385` |
| Production branch | `br-round-base-auh6h2wd` |
| Production endpoint | `ep-proud-bonus-autwv60g` |
| Preview branch | `br-morning-paper-aun3378r` |
| Preview endpoint | `ep-billowing-paper-au4tdhz8` |
| Application credential | `DATABASE_URL` — server-only, never in client code or logs |
| Migrations | Versioned SQL under `supabase/migrations/` (legacy directory name; applies to canonical PostgreSQL) |
| Runtime schema access | Explicit least-privilege grants; application requests do not execute DDL |

---

## Environment Variables

Required in Vercel production environment. See `docs/PRODUCTION_LAUNCH_GATE.md` Section 1 for the full list.

**Never commit secrets.** `DATABASE_URL`, VAPID private keys, email provider keys,
and admin credentials are server-only and must never appear in a client bundle.

---

## Embed Surface

The `/embed/*` route tree is allowed to be framed by `ourtownproperties.com` and its subdomains via `Content-Security-Policy: frame-ancestors`. No other routes are embeddable by third parties (enforced via `X-Frame-Options: SAMEORIGIN` on all routes). See `next.config.ts` → `headers()`.

---

## Pre-deploy checklist

Before every production deploy:

1. Run `node scripts/amm/verify-production-alias.mjs` — confirm canonical alias
2. Run `pnpm run amm:verify:funnel` — confirm funnel integrity
3. Confirm the deploy targets `ask-magic-mike` project, not any legacy project

---

## Out-of-scope systems (do not touch without owner approval)

- WordPress / cPanel / DNS (ourtownproperties.com)
- hosting Apache / Regency-Liquid Web configuration
- Production Vercel environment-variable changes without their exact gate
- Neon role or connection-string rotation
- MLS / FlexMLS data exports
- Outbound email / SMS / social posting
