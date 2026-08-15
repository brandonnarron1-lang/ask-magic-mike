# Meta Crawler Change Report — Phase 5

Result: **NO FIREWALL CHANGE APPLIED**.

The 2026-08-15 acceptance rerun remains 40 of 42. Facebook's crawler alone is
blocked with HTTP 403 on the two exact public Our Town paths; browser, X,
LinkedIn, Slack, Discord, Googlebot, and Bingbot behavior remains available.
AskMagicMike.com Meta previews pass.

Authenticated WordPress, Wordfence visibility, cPanel, ModSecurity controls,
public HTTP behavior, and hosting-layer evidence were reviewed in the prior
phase. The account exposes only a broad domain-level ModSecurity control—not a
managed-rule ID or narrow exception editor. A broad disablement would weaken
login, admin, form, and API protection, so it was not used.

Required hosting-operator action: identify the managed WAF rule that blocks
validated Meta crawler GET/HEAD requests and exempt only:

- `/ask-mike/`
- `/agents/mike-eatmon/`

Do not trust a user-agent alone; validate Meta source ranges at the hosting
layer. Do not exempt POST, login, admin, REST writes, forms, XML-RPC, or any
other path.

Rollback: remove the exact path/method/source-scoped exception and rerun the
42-check matrix. No application rollback is needed because no app or WordPress
code change was made.
