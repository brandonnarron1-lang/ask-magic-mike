# Social Preview Acceptance — Phase 4

Date: 2026-08-15

- Result: **40 passed / 42 total**.
- AskMagicMike.com tested pages and crawlers: pass.
- Our Town `/ask-mike/` and `/agents/mike-eatmon/`: Facebook crawler returns
  403; other tested crawler and browser paths pass.
- Root cause: server-global Apache `authz_core` rule assigning
  `facebookexternalhit` to `bad_bots`, proven by later authenticated 2026-08-28
  evidence.
- Change: none; broad disablement was rejected.
- Remaining action: the exact one-page hosting action in
  `FACEBOOK_CRAWLER_FIREWALL_CHANGE.md`.

This issue is isolated and does not block lead intake, Neon persistence, email,
RBAC, or Form 3. Use AskMagicMike.com links for Meta sharing until the hosting
operator completes and verifies the narrow exception.
