# Meta Crawler Hosting-Operator Action

Owner: Our Town Properties hosting provider or managed-WAF operator.

Current evidence: Facebook's validated preview crawler receives HTTP 403 only
on these two public pages; 40 of 42 acceptance checks pass.

- `/ask-mike/`
- `/agents/mike-eatmon/`

Required action: identify the managed ModSecurity/WAF rule ID in the request log
and create one exception limited to validated Meta source ranges, `GET` and
`HEAD`, and the two exact paths above.

Do not disable ModSecurity, trust a user-agent alone, or exempt POST, login,
admin, REST writes, forms, XML-RPC, or any other path.

Verification:

1. Run `pnpm amm:verify:social-preview` and require 42/42.
2. Confirm both Open Graph images return HTTP 200 to the validated crawler.
3. Confirm LinkedIn, X, Slack, Discord, Googlebot, Bingbot, browsers, login,
   admin, and form protections remain unchanged.

Rollback: remove only the new rule-ID/path/method/source exception and rerun the
42-check matrix. No application or WordPress code rollback is required.
