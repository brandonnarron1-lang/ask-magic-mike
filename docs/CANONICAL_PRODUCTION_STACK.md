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

Current accepted Production release: PR #246 merge
`98a91f752c4c53dc0ae300dfc320f47b53e32820`, deployment
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe`. This is an environment-only redeploy of
the same verified source after secure replacement of Production `DATABASE_URL`;
`dpl_E3Pob3TjWdxN9u4VK9xHZC61667g` is the immediate immutable application
rollback. PR #247 is the only reviewed application candidate; its exact gate
authorizes only an owner-approved same-tree application merge/deployment and
does not authorize WordPress publication. PR #238 is a consumed five-migration
cutover receipt. See
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
