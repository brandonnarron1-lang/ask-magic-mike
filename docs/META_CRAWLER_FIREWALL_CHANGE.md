# Meta Crawler Firewall Change Sheet

Status: **HOSTING OPERATOR ACTION REQUIRED — NOT APPLIED**.

Ask the hosting operator to inspect the current ModSecurity audit entries for
`facebookexternalhit/1.1` requests to `/ask-mike/` and
`/agents/mike-eatmon/`, validate Meta crawler ownership using the host's
supported IP/rDNS process, and identify the exact managed-rule ID.

Apply only a rule-ID-and-path-specific exception for public `GET` and `HEAD`.
Keep `/wp-admin`, `/wp-login.php`, REST writes, form submissions, XML-RPC, and
all unrelated paths protected. Do not disable the domain firewall.

Acceptance: rerun `pnpm amm:verify:social-preview`; require 42/42, valid Open
Graph image/canonical data, continued Google/Bing/LinkedIn/X success, protected
admin/form endpoints, and a blocked malicious-bot control.

Rollback: remove only the rule-specific exception and rerun the complete matrix.
