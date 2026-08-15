# Social Preview Acceptance - Phase 3

Date: 2026-08-14

## Current result

- Standard automated matrix: **40 pass / 42 checks**.
- AskMagicMike.com homepage, `/ask`, and `/value`: all tested crawlers receive
  200; Open Graph title, description, image, and canonical URL are present.
- Our Town `/ask-mike/` and `/agents/mike-eatmon/`: browser and four other
  social crawlers receive 200; Facebook receives 403.
- Googlebot and Bingbot receive 200 from `/ask-mike/`.
- The Facebook crawler also receives 403 from the two required Open Graph image
  paths, confirming an upstream user-agent rule.
- No after-state is claimed because the exact host rule has not been changed.

## Commands

```bash
pnpm run amm:verify:social-preview
curl -I -A 'facebookexternalhit/1.1' https://www.ourtownproperties.com/ask-mike/
curl -I -A 'Googlebot/2.1' https://www.ourtownproperties.com/ask-mike/
curl -I -A 'bingbot/2.0' https://www.ourtownproperties.com/ask-mike/
```

The exact remaining action is in `FACEBOOK_CRAWLER_FIREWALL_CHANGE.md`. Until it
is performed by the host operator, share AskMagicMike.com links where a Facebook
preview is required.
