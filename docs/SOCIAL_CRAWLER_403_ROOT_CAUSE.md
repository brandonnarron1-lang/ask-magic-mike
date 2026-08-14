# Social Crawler 403 Root Cause

## Evidence

- Normal browsers, Twitter, LinkedIn, Slack, and Discord receive HTTP 200 from
  the two affected Our Town pages.
- `facebookexternalhit/1.1` receives HTTP 403 from `/ask-mike/` and
  `/agents/mike-eatmon/`.
- The same Facebook crawler receives HTTP 200 from AskMagicMike.com.
- Both affected WordPress pages render complete Open Graph and canonical tags to
  allowed clients.
- Wordfence 9.0.0 is active, but its security-only Live Traffic did not record
  the just-generated Facebook requests.
- cPanel reports ModSecurity enabled for `ourtownproperties.com` and exposes only
  an all-domain or per-domain on/off switch.

## Root cause

The request is rejected upstream of WordPress by the hosting ModSecurity/WAF
layer. It is not an application middleware, robots, canonical, or Wordfence
rule. The exact managed-rule ID is not visible to the cPanel account.

## Safe correction

The hosting operator must inspect the ModSecurity audit event for the two
requests and exempt only the triggering managed-rule ID for public GET/HEAD
requests to the affected public paths after validating Meta crawler ownership.
Admin, login, REST write, form-submit, and XML-RPC paths must remain excluded
from the exception.

Do not disable ModSecurity for the domain and do not trust a Facebook-looking
user-agent by itself. Until the narrow host rule is available, share
AskMagicMike.com URLs on Facebook; those previews already pass.
