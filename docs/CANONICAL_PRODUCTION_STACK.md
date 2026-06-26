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
| Apex redirect | `askmagicmike.com` → `www.askmagicmike.com` (301, managed by Vercel) |
| Framework | Next.js 15 (App Router) |
| Node version | 20.x |

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
| `askmagicmike.com` | Apex redirect | → `www.askmagicmike.com` |

### Known legacy / separate apps

| Project | Status | Notes |
|---------|--------|-------|
| `AskMagicMike.com` Vercel app (separate Next.js project) | **Do not integrate** | Separate funnel; does not feed `amm_leads`; integrate only via tracked UTM links; deploy gated on owner approval. See memory: `askmagicmike-com-vercel-domain`. |

---

## Supabase

| Field | Value |
|-------|-------|
| Project | Production project configured via `NEXT_PUBLIC_SUPABASE_URL` |
| Auth method | Service role key (`SUPABASE_SERVICE_ROLE_KEY`) — server-only, never in client bundle |
| Migrations | 13 files, `00001` → `00013` (see `supabase/migrations/`) |
| RLS | Required on all tables before production traffic |

---

## Environment Variables

Required in Vercel production environment. See `docs/PRODUCTION_LAUNCH_GATE.md` Section 1 for the full list.

**Never commit secrets.** Never set `NEXT_PUBLIC_` prefix on service-role keys. `SUPABASE_SERVICE_ROLE_KEY` must never appear in any client-side bundle.

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
- WAF / Regency
- Vercel environment variables (set only via Vercel dashboard, not CLI)
- Supabase service role key rotation
- MLS / FlexMLS data exports
- Outbound email / SMS / social posting
