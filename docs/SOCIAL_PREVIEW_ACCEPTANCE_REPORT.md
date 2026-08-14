# Social Preview Acceptance Report

Point-in-time result: **40 of 42 checks pass**.

- AskMagicMike.com public routes and assets pass browser, Google, Bing, LinkedIn, X/Twitter, and Facebook-compatible preview checks.
- OurTownProperties.com `/ask-mike/` and `/agents/mike-eatmon/` return `403` only to the Facebook crawler profile.
- Normal browser access works; other tested crawlers work; Wordfence did not receive the blocked requests; cPanel ModSecurity is enabled.
- No private, admin, or form-write route was made crawlable.

Acceptance remains pending one hosting-operator rule-ID lookup and narrow exception. See `SOCIAL_CRAWLER_FIREWALL_CHANGE.md`.
