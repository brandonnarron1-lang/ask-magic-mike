# AskMagicMike.com Domain Readiness

## Status: Code ready — Vercel dashboard step pending

All code changes for `https://www.askmagicmike.com` as the canonical production domain are merged. One manual step remains: adding the domain in the Vercel project dashboard and configuring DNS at the registrar. That step is gated on user authorization and cannot be done from code.

---

## What was changed (code only)

| File | Change |
|------|--------|
| `src/lib/site-config.ts` | New — single source of truth for canonical URL, brand names, phone, market |
| `src/app/layout.tsx` | Updated `metadataBase`, title, description, OG metadata to use `siteConfig` |
| `src/app/sitemap.ts` | New — generates `/sitemap.xml` driven by `siteConfig.canonicalSiteUrl` |
| `src/app/robots.ts` | New — generates `/robots.txt` driven by `siteConfig.canonicalSiteUrl` |
| `src/lib/mikePlatformAssets.ts` | New — registry for all six platform-ready Mike crops |
| `src/components/landing/hero-section.tsx` | Our Town logo, eyebrow text, phone from `siteConfig`, no gold sparks |
| `.env.example` | Added `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_AGENT_PHONE` |
| `src/types/env.d.ts` | Declared `NEXT_PUBLIC_SITE_URL?: string` and `NEXT_PUBLIC_AGENT_PHONE` |
| `tests/compliance/value-copy.test.ts` | Updated layout tests; added site-config, sitemap, robots, hero brand tests |

---

## Environment variables required in Vercel

Set these in **Vercel → Project Settings → Environment Variables** for the Production environment:

```
NEXT_PUBLIC_SITE_URL=https://www.askmagicmike.com
NEXT_PUBLIC_AGENT_PHONE=+12522454337
```

The fallback for `NEXT_PUBLIC_SITE_URL` is `https://www.askmagicmike.com` (hardcoded in `site-config.ts`), so metadata is correct even before the env var is set — but explicit assignment is required to confirm it for CI and future overrides.

---

## Vercel dashboard steps (manual — cannot be automated from code)

1. Go to **Vercel → ask-magic-mike project → Settings → Domains**
2. Add `www.askmagicmike.com` as a **Production Domain**
3. Optionally add `askmagicmike.com` (apex) with a redirect to `www`
4. Configure DNS at the registrar:
   - `www CNAME cname.vercel-dns.com` (or the CNAME Vercel provides)
   - For apex: use Vercel's A-record IPs or their ALIAS/ANAME support
5. Vercel will auto-provision a TLS certificate once DNS propagates

The Vercel deployment alias (`ask-magic-mike.vercel.app`) continues to work as-is; it is no longer the public-facing default once `www.askmagicmike.com` is active.

---

## Preview / staging behavior

Preview deployments will have `NEXT_PUBLIC_SITE_URL` set to their Vercel preview URL automatically if the env var is scoped to Production only. The `site-config.ts` fallback (`https://www.askmagicmike.com`) applies to production builds without the env var.

---

## Compliance notes

- `metadataBase` is set to `siteConfig.canonicalSiteUrl`, so all OG image paths resolve absolutely from `https://www.askmagicmike.com`.
- `/robots.txt` disallows `/admin`, `/api/`, `/ask`, `/widget-preview`, `/embed/` — intake, admin, and preview surfaces are not indexed.
- `/sitemap.xml` includes only `/` and `/value` (the consumer-facing content surfaces).
