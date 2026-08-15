# Facebook Crawler Firewall Change Sheet

Status: **NOT APPLIED - EXACT HOST RULE ID REQUIRED**.

## Hosting-operator action

In the Our Town Properties hosting ModSecurity audit log, reproduce one blocked
`HEAD` request using `facebookexternalhit/1.1`, capture the exact managed-rule
ID, and suppress only that rule when all of these conditions are true:

- method is `GET` or `HEAD`;
- verified Meta crawler condition follows the host's supported IP/rDNS
  validation procedure; and
- request path is exactly one of:
  - `/ask-mike/`
  - `/agents/mike-eatmon/`
  - `/wp-content/plugins/ask-magic-mike-lead-ops-social-upgrade/assets/social/02_open_graph_card_1200x630_safe_zone.jpg`
  - `/wp-content/uploads/amm_og_card_1200x630.jpg`

Do not exempt `/wp-admin`, `/wp-login.php`, `/wp-json`, `admin-ajax.php`, XML-RPC,
form submissions, arbitrary paths, arbitrary methods, or a caller that merely
spoofs the user-agent string. Do not disable ModSecurity for the domain.

## Acceptance

After the host change, run `pnpm run amm:verify:social-preview` and the focused
matrix documented in `SOCIAL_PREVIEW_ACCEPTANCE_PHASE3.md`. Target: 42/42 in the
standard matrix; public pages and images return 200 to the validated crawler;
admin, login, REST writes, and form-submit routes remain outside the exception.

## Rollback

Remove only the rule-ID/path/method exception, leave the managed ruleset enabled,
purge only the affected public-page/image cache if the host requires it, and
rerun the matrix. AskMagicMike.com social links remain the safe fallback.
