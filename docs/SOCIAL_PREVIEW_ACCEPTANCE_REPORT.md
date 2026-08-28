# Social Preview Acceptance Report

Point-in-time result: **40 of 42 checks pass**.

- AskMagicMike.com public routes and assets pass browser, Google, Bing, LinkedIn, X/Twitter, and Facebook-compatible preview checks.
- OurTownProperties.com `/ask-mike/` and `/agents/mike-eatmon/` return `403` only to the Facebook crawler profile.
- Normal browser access works; other tested crawlers work; Wordfence did not receive the blocked requests; authenticated 2026-08-28 diagnostics identify an Apache `authz_core` global `bad_bots` rule while the production-domain cPanel ModSecurity control reports Off.
- No private, admin, or form-write route was made crawlable.

Acceptance remains pending the prepared per-vhost/account Apache override. No ModSecurity rule-ID lookup remains. See `FACEBOOK_CRAWLER_FIREWALL_CHANGE.md`.
