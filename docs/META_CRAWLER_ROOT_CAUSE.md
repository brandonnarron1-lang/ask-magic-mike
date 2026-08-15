# Meta Crawler Root Cause — Phase 5

Current result: **40 of 42 social-preview checks pass**.

Only `facebookexternalhit/1.1` receives HTTP 403 from these public WordPress
pages:

- `https://www.ourtownproperties.com/ask-mike/`
- `https://www.ourtownproperties.com/agents/mike-eatmon/`

Normal browsers, Googlebot, Bingbot, LinkedIn, X/Twitter, Slack, and Discord
receive the expected public content. AskMagicMike.com Facebook previews pass.
The affected pages expose valid canonical and Open Graph metadata to allowed
clients.

Authenticated WordPress and cPanel inspection places enforcement upstream of
WordPress in the host-managed ModSecurity/WAF layer. Wordfence did not observe
the generated requests, and the cPanel account exposes only a broad per-domain
on/off control. The exact managed-rule ID and narrow exception editor are not
available to this account. The Phase 5 rerun on 2026-08-15 reproduced the same
two failures and no others: 40 of 42 checks passed.

No firewall was weakened. The only safe remaining correction is a hosting-side,
rule-ID-specific exception for validated Meta crawler GET/HEAD requests to the
two exact public paths. Do not disable ModSecurity, trust a user-agent alone, or
exempt login, admin, REST writes, forms, or XML-RPC.
