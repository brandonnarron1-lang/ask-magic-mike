# askmagicmike.com — Domain Migration Plan

This is a runbook, not an automation. Nothing here executes automatically;
DNS, Vercel domains, and env vars are flipped by a human after review.

Production at the time of writing: `https://ask-magic-mike.vercel.app`
(commit `ecf59c9 feat: fully integrate ask magic mike brand kit visuals`).

## 1. Pre-flight

- Confirm registrar access for `askmagicmike.com`.
- Confirm Vercel project: `eyes-up-industries/ask-magic-mike`.
- Confirm GitHub deploy hooks still point at the project.
- Snapshot of working WordPress CTAs (utm_source=ourtown_wp ...).
- Confirm `tests/compliance/value-copy.test.ts` is green on the latest
  preview.

## 2. Vercel domain attach

In the Vercel project:

1. Settings → Domains → Add Domain → `askmagicmike.com`.
2. Add `www.askmagicmike.com` as a redirect.
3. Vercel will surface either a CNAME, ALIAS, or A record requirement.
4. Decide canonical:
   - **Recommended:** apex `askmagicmike.com` is canonical; `www` 301s.

## 3. DNS records checklist

At the registrar:

| Host | Type | Value | TTL |
| --- | --- | --- | --- |
| `@` (apex) | A | `76.76.21.21` (Vercel default) | 300 |
| `@` (apex) | AAAA | (optional, Vercel will indicate) | 300 |
| `www` | CNAME | `cname.vercel-dns.com` | 300 |

If the registrar supports ALIAS/ANAME at the apex, prefer:

| Host | Type | Value | TTL |
| --- | --- | --- | --- |
| `@` | ALIAS | `cname.vercel-dns.com` | 300 |

Optional but recommended:

- CAA records: `0 issue "letsencrypt.org"` and `0 issue "amazon.com"` (if AWS used).
- DMARC / SPF / DKIM if email is sent from the domain.

## 4. Vercel env var flips (preview first, then production)

After the domain is attached and TLS issues are clear:

```
NEXT_PUBLIC_SITE_URL=https://askmagicmike.com
PUBLIC_SITE_URL=https://askmagicmike.com
ADMIN_BASE_URL=https://askmagicmike.com/admin
```

Existing `metadataBase` in `src/app/layout.tsx` reads `NEXT_PUBLIC_SITE_URL`,
so OG / Twitter / canonical URLs flip with the env var.

## 5. Canonical URL + OG checks

Smoke test on staging then production:

```
curl -sI https://askmagicmike.com/value | grep -i ^Location
curl -s  https://askmagicmike.com/value | grep -oE '<meta[^>]*"og:image"[^>]*>'
curl -s  https://askmagicmike.com/value | grep -oE '<meta[^>]*"twitter:image"[^>]*>'
curl -s  https://askmagicmike.com/value | grep -oE '<link[^>]*"canonical"[^>]*>'
```

Expect:

- HTTPS resolves, no `Location` redirect on root canonical.
- `og:image` and `twitter:image` resolve to the absolute brand-pack
  headshot URL on `askmagicmike.com`.
- `<link rel="canonical">` if/when added points at `askmagicmike.com`.

## 6. Sitemap + robots

This repo doesn't ship a sitemap today. When it does:

- `/sitemap.xml` should advertise `askmagicmike.com` URLs only.
- `/robots.txt` should set `Host: askmagicmike.com`.
- `/widget-preview` and `/admin/**` must remain `noindex`.

## 7. WordPress CTA UTMs

No change to UTMs. The three live routes stay on
`utm_source=ourtown_wp`:

- homepage_cta
- mike_profile
- seller_page_cta

The CTA URL host flips from `ask-magic-mike.vercel.app` to
`askmagicmike.com` after the new domain is verified. See
`docs/ask-magic-mike-wordpress-visual-brief.md` for exact snippets.

## 8. Smoke tests (one-pass)

```
for path in / /ask /value /widget-preview /admin /embed/ask; do
  echo "== $path =="
  curl -sI "https://askmagicmike.com${path}" | head -5
done

# Public API smoke
curl -sX POST "https://askmagicmike.com/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Test",
    "email": "smoke+post@example.com",
    "phone": "+12525550100",
    "lead_type": "buyer",
    "source": "wordpress_cta",
    "utm_source": "ourtown_wp",
    "utm_medium": "homepage_cta",
    "utm_campaign": "ask_magic_mike",
    "consent": {"sms": true, "email": true}
  }'
```

Expected: `201 Created` with `ok: true`. The lead lands in `/admin/leads`.

## 9. Rollback plan

If anything is wrong after DNS propagation:

1. Revert env vars back to `https://ask-magic-mike.vercel.app`.
2. In Vercel → Domains, remove `askmagicmike.com` (the Vercel-issued
   `*.vercel.app` URL is unaffected).
3. Leave DNS as-is for the time it takes to debug — Vercel-issued
   domains continue to work in parallel.
4. Re-run the smoke tests in §8 against `ask-magic-mike.vercel.app`.

The DB is unchanged by domain flips; the only thing in flight is HTTP
egress + OG resolution. Rollback is non-destructive.

## 10. After-migration TODO

- Update `docs/ask-magic-mike-wordpress-visual-brief.md` CTA hosts.
- Add `/sitemap.xml` + `/robots.txt`.
- Open Graph regression sweep with the new absolute URLs.
- Update social ad templates' on-image URL stub.

## 11. What this doc explicitly does NOT do

- Execute any DNS change.
- Modify Vercel env vars from a script.
- Touch the WordPress site.
- Promote production. (`vercel promote …` is a separate human step.)
