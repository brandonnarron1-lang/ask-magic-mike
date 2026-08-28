# Facebook Crawler Apache Change Sheet

Status: **NOT APPLIED — EXACT DIRECTIVE FOUND; HOST-LEVEL CHANGE STILL
REQUIRED**.

## Exact cause

The server-global Apache include classifies `facebookexternalhit` as
`bad_bots`, then denies that environment class with `Require not env bad_bots`.
The relevant directives are lines 11 and 24 of
`/etc/apache2/conf.d/includes/pre_virtualhost_global.conf` (mirrored under
`/usr/local/apache/conf/includes/`).

This is an Apache `authz_core` denial. It is not a ModSecurity transaction and
does not have a ModSecurity rule ID.

## Preferred hosting-operator action

Use the host's managed vhost/account include mechanism to unset `bad_bots`
only when every condition below is true:

- host is `ourtownproperties.com` or `www.ourtownproperties.com`;
- method is `GET` or `HEAD`;
- user agent begins with `facebookexternalhit/`; and
- request path is exactly one of:
  - `/ask-mike/`
  - `/agents/mike-eatmon/`
  - `/wp-content/plugins/ask-magic-mike-lead-ops-social-upgrade/assets/social/02_open_graph_card_1200x630_safe_zone.jpg`
  - `/wp-content/uploads/amm_og_card_1200x630.jpg`

Apache 2.4's supported `SetEnvIfExpr` syntax permits a later matching directive
to unset an environment variable with `!bad_bots`. The hosting operator must
confirm include order on this cPanel build and run `apachectl configtest`
before a graceful reload. A representative operator-reviewed expression is:

```apache
SetEnvIfExpr "tolower(req('User-Agent')) =~ m#^facebookexternalhit/# && %{REQUEST_METHOD} =~ m#^(GET|HEAD)$# && %{REQUEST_URI} =~ m#^/(?:ask-mike/?|agents/mike-eatmon/?|wp-content/plugins/ask-magic-mike-lead-ops-social-upgrade/assets/social/02_open_graph_card_1200x630_safe_zone\.jpg|wp-content/uploads/amm_og_card_1200x630\.jpg)$#" !bad_bots
```

This snippet is a change specification, not a command to paste blindly. The
host must place it in the supported per-account/per-vhost include after the
global classifier and before authorization is evaluated.

## Prohibited shortcuts

- Do not disable a firewall, ModSecurity, or the entire `bad_bots` policy.
- Do not edit a cPanel-generated include directly.
- Do not exempt arbitrary paths, methods, hosts, or all bots.
- Do not exempt `/wp-admin`, `/wp-login.php`, `/wp-json`, `admin-ajax.php`,
  XML-RPC, form submissions, or any REST write.
- Do not treat user-agent text as proof that the caller is Meta. The bounded
  path/method scope is required even if the host cannot perform supported
  source verification.

The hosting operator may instead remove the global `facebookexternalhit`
classification only if it owns that server-wide policy and deliberately wants
the result for every virtual host. That broader decision is outside this
project's authority.

## Acceptance

1. Run `pnpm run amm:verify:social-preview`; require 42/42.
2. Verify all four allowlisted paths return 200 for `GET` and `HEAD` with the
   Facebook crawler user agent.
3. Verify a non-allowlisted public path with the same spoofable user agent
   remains denied under the host's current policy.
4. Verify `/wp-login.php`, `/wp-admin/`, `/wp-json`, XML-RPC, form submits, and
   REST writes receive the same protection as before.
5. Verify normal browsers and the already-passing LinkedIn, X, Slack, and
   Discord crawlers remain unchanged.
6. Use Meta's Sharing Debugger to request a fresh scrape and confirm the title,
   description, and image render correctly.
7. Inspect Apache error/access logs for the exact test window; no unrelated
   authorization behavior may change.

## Rollback

Remove only the new per-vhost/account override, run `apachectl configtest`,
gracefully reload Apache through the host's supported process, and rerun the
same matrix. Do not alter WordPress or Ask Magic Mike application code for this
rollback.

## Approval gate

No live hosting change is authorized by this document. The exact approval
phrase for the prepared test is:

`APPROVE NARROW OTP FACEBOOK CRAWLER APACHE OVERRIDE TEST`
