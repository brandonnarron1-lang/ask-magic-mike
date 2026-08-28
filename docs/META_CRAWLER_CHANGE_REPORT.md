# Meta Crawler Change Report — Phase 5

Result: **NO FIREWALL CHANGE APPLIED**.

The 2026-08-15 acceptance rerun remains 40 of 42. Facebook's crawler alone is
blocked with HTTP 403 on the two exact public Our Town paths; browser, X,
LinkedIn, Slack, Discord, Googlebot, and Bingbot behavior remains available.
AskMagicMike.com Meta previews pass.

Authenticated WordPress, Wordfence visibility, cPanel, public HTTP behavior,
Apache access/error logs, and readable hosting includes have now been reviewed.
The production-domain cPanel ModSecurity control reports Off. The exact denial
is instead a server-global Apache `authz_core` policy: `facebookexternalhit` is
classified as `bad_bots`, followed by `Require not env bad_bots`. The live error
surface records `AH01630: client denied by server configuration`.

Required hosting-operator action: confirm include order and add a reversible
per-account or per-vhost override below the global classification, limited to
the Facebook crawler user-agent profile, GET/HEAD requests, and only:

- `/ask-mike/`
- `/agents/mike-eatmon/`

Do not edit the shared global include. Do not exempt POST, login, admin, REST
writes, forms, XML-RPC, or any other path. Follow the reviewed change packet in
`META_CRAWLER_HOSTING_OPERATOR_ACTION.md`, run `apachectl configtest`, and use a
graceful reload. The exact approval gate is
`APPROVE NARROW OTP FACEBOOK CRAWLER APACHE OVERRIDE TEST`.

Rollback: remove the exact path/method/source-scoped exception and rerun the
42-check matrix. No application rollback is needed because no app or WordPress
code change was made.
