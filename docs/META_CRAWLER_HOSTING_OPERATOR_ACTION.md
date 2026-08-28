# Meta Crawler Hosting-Operator Action

Owner: Our Town Properties hosting provider / Apache administrator.

## Ticket summary

Our Town Properties' public Open Graph pages return HTTP 403 only to
`facebookexternalhit`; browser and LinkedIn/X/Slack/Discord checks return 200.
The production acceptance matrix is 40/42.

Authenticated cPanel and Apache diagnostics have located the exact cause:

```text
/etc/apache2/conf.d/includes/pre_virtualhost_global.conf:11
SetEnvIfNoCase User-Agent "facebookexternalhit" bad_bots

/etc/apache2/conf.d/includes/pre_virtualhost_global.conf:24
Require not env bad_bots
```

The live error log records `AH01630: client denied by server configuration`
from `authz_core`. cPanel reports the production domain's ModSecurity control
as Off, and the account's root `.htaccess` has no matching user-agent or
authorization deny. This is therefore not a WordPress, plugin, robots.txt,
Vercel, or ModSecurity-rule-ID issue.

## Requested change

Please add a supported **per-account/per-vhost** override that unsets
`bad_bots` only for `GET`/`HEAD`, `facebookexternalhit/`, and these exact public
paths:

- `/ask-mike/`
- `/agents/mike-eatmon/`
- `/wp-content/plugins/ask-magic-mike-lead-ops-social-upgrade/assets/social/02_open_graph_card_1200x630_safe_zone.jpg`
- `/wp-content/uploads/amm_og_card_1200x630.jpg`

Please do not disable the global bot policy, edit a cPanel-generated file,
exempt POST/admin/login/REST/form/XML-RPC routes, or make an all-path
user-agent exception. Confirm the include order, run `apachectl configtest`,
and use a graceful reload.

## Acceptance and rollback

- We will rerun `pnpm run amm:verify:social-preview` and require 42/42.
- The four exact public paths must return 200 to the crawler.
- Non-allowlisted paths and all sensitive routes must retain their prior
  behavior.
- Rollback is removal of only the new per-vhost/account override, followed by
  config test, graceful reload, and the same verification matrix.

Full technical contract:
[FACEBOOK_CRAWLER_FIREWALL_CHANGE.md](./FACEBOOK_CRAWLER_FIREWALL_CHANGE.md).
