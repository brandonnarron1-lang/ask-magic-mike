# Social Preview Acceptance — Phase 5

Command: `node scripts/amm/verify-social-preview.mjs`

- Checks: 42
- Passed: 40
- Failed: 2
- AskMagicMike.com Facebook, X, LinkedIn, Slack, and Discord: pass
- Our Town browser baseline and Open Graph metadata: pass
- Our Town `/ask-mike/` with Facebook crawler: HTTP 403
- Our Town `/agents/mike-eatmon/` with Facebook crawler: HTTP 403
- Other tested crawlers on those pages: pass

Verdict: **CONDITIONALLY ACCEPTED — EXACT HOST APACHE ACTION REMAINS**.
The live lead funnel is unaffected. No broad security exception was created.

Later authenticated 2026-08-28 evidence identified the exact
`facebookexternalhit -> bad_bots` classifier and `Require not env bad_bots`
denial. The current bounded action is in
`FACEBOOK_CRAWLER_FIREWALL_CHANGE.md`; no ModSecurity rule-ID search remains.
