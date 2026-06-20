# Ask Magic Mike — Social Launch Readiness

**This is read-only. Running this script does not send any messages or touch any data.**

---

## How to run

```bash
pnpm run amm:verify:social-preview
```

Or directly:

```bash
node scripts/amm/verify-social-preview.mjs
```

---

## What this script checks

For each of the five public URLs below, the script performs:

1. **Browser baseline GET** — confirms the page returns HTTP 200 for a normal browser
2. **Social crawler HEAD checks** — tests FacebookExternalHit, Twitterbot, LinkedInBot, Slackbot, Discordbot
3. **OG tag presence** — parses `og:title`, `og:image`, `og:description` from HTML
4. **Stale Vercel URL detection** — flags any `ask-magic-mike.vercel.app` link in HTML
5. **Canonical ask-mike link** — verifies `ourtownproperties.com/ask-mike` is present (OTP pages only)

### URLs checked

| URL | Purpose |
|---|---|
| `https://www.askmagicmike.com/` | AMM homepage — social share target |
| `https://www.askmagicmike.com/ask` | Ask intake page |
| `https://www.askmagicmike.com/value` | Value/property review page |
| `https://www.ourtownproperties.com/ask-mike/` | OTP WordPress embed page |
| `https://www.ourtownproperties.com/agents/mike-eatmon/` | Mike Eatmon agent profile |

### Crawler user agents tested

| Name | User-Agent string |
|---|---|
| browser | Chrome/124 baseline |
| facebook | `facebookexternalhit/1.1` |
| twitter | `Twitterbot/1.0` |
| linkedin | `LinkedInBot/1.0` |
| slack | `Slackbot-LinkExpanding 1.0` |
| discord | `Discordbot/1.0` |

---

## What PASS means

- `SOCIAL_PREVIEW_VERIFY_PASS` at the end of output
- All five URLs return HTTP 200 for every crawler
- All three OG tags (`og:title`, `og:image`, `og:description`) are present on every page
- No stale `ask-magic-mike.vercel.app` URLs found
- OTP pages contain canonical `/ask-mike/` link

---

## What FAIL means

Anything labeled `FAIL` in the output. Common causes and fixes:

### 403 Crawler Block (most common)

```
FAIL  facebook: HTTP 403 — BLOCKED
```

**What it means:** The host (usually OTP WordPress via Cloudflare) is blocking the crawler's user agent.

**Why it matters:** When Mike or a team member shares a link to `ourtownproperties.com/ask-mike/` on Facebook, LinkedIn, Slack, or Discord, the platform sends its crawler user agent to generate the preview card. If the crawler is blocked, the post shows no preview — reducing click-through significantly.

**Remediation (OTP WordPress / Cloudflare):**

1. Log in to Cloudflare dashboard for `ourtownproperties.com`
2. Navigate to **Security → WAF → Firewall Rules** (or **Bot Fight Mode**)
3. Create an allow rule for these user agent strings:
   - `facebookexternalhit`
   - `Twitterbot`
   - `LinkedInBot`
   - `Slackbot`
   - `Discordbot`
4. If using **Bot Fight Mode**, add these bots to the **Known Bots** allow list
5. If using a different WAF or host security plugin (Wordfence, iThemes), add these user agents to the whitelist
6. Re-run: `pnpm run amm:verify:social-preview`

**Remediation (AMM / Vercel):**

AMM is on Vercel and does not block social crawlers by default. If AMM pages return 403 for crawlers:
1. Check Vercel Edge Config for any middleware rate-limiting or bot protection
2. Check `middleware.ts` — it uses Basic Auth only for `/admin/*`, not public routes

### Missing OG tags

```
FAIL  Missing OG tags: og:title, og:image
```

**What it means:** The page HTML does not include required Open Graph meta tags. Social platforms will not generate a preview card.

**Remediation:**
- For AMM pages: check `src/app/layout.tsx` and the page-level `metadata` export in `src/app/(campaign)/value/page.tsx` etc.
- For OTP WordPress pages: install/configure a plugin like Yoast SEO or Rank Math and set OG image per page

### Stale Vercel URL

```
FAIL  STALE URL: ask-magic-mike.vercel.app found in HTML
```

**What it means:** A link in the HTML still points to the old Vercel preview domain instead of `www.askmagicmike.com`. This is a tracking and trust issue.

**Remediation:** Search page templates and embed configuration for `ask-magic-mike.vercel.app` and update to the canonical domain.

---

## Approved public launch URLs

These are the only URLs that should appear in social posts, QR codes, print materials, or ads:

| Purpose | Canonical URL |
|---|---|
| AMM homepage | `https://www.askmagicmike.com/` |
| AMM ask/intake | `https://www.askmagicmike.com/ask` |
| AMM value page | `https://www.askmagicmike.com/value` |
| OTP Ask Mike embed | `https://www.ourtownproperties.com/ask-mike/` |
| Mike Eatmon profile | `https://www.ourtownproperties.com/agents/mike-eatmon/` |

**Do not share:**
- `ask-magic-mike.vercel.app` (Vercel preview domain — do not share publicly)
- Any `*.vercel.app` preview URL
- `/admin/*` URLs (protected, returns 401)

---

## Do-not-post checklist

Before sharing any Ask Magic Mike link on social media, confirm:

- [ ] The link is one of the approved canonical URLs above
- [ ] `pnpm run amm:verify:social-preview` passes with zero FAIL
- [ ] `pnpm run amm:verify:funnel` passes 15/15
- [ ] OG preview renders correctly in the platform's debug tool:
  - Facebook: https://developers.facebook.com/tools/debug/
  - Twitter/X: https://cards-dev.twitter.com/validator
  - LinkedIn: https://www.linkedin.com/post-inspector/
- [ ] The post copy does not claim: "instant valuation", "guaranteed offer", "appraisal", "binding offer"
- [ ] The post copy does not include: MLS numbers, listing confidential remarks, showing instructions
- [ ] No personal email addresses or phone numbers in the post body
- [ ] Mike has reviewed or approved the post content

---

## Safety confirmation

This script is read-only:
- No data is written
- No leads are created
- No outbound messages are sent
- No Supabase keys are used
- No environment variables are required
- No WordPress is touched
- No DNS changes are made
