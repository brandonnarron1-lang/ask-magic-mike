# Facebook Crawler 403 Root Cause

Verified 2026-08-14 against the live Our Town Properties host.

## Result

`facebookexternalhit/1.1` is blocked with HTTP 403 before WordPress handles the
request. Normal browsers, Googlebot, Bingbot, Twitter/X, LinkedIn, Slack, and
Discord receive HTTP 200 from the two public pages.

The block is host-wide for that user agent, not limited to page content:

| Request | Browser | Facebook crawler |
| --- | ---: | ---: |
| `/ask-mike/` | 200 | 403 |
| `/agents/mike-eatmon/` | 200 | 403 |
| public Open Graph image | 200 | 403 |
| `/wp-login.php` | 200 login surface | 403 |
| `/wp-admin/` | redirect/login boundary | 403 |
| `/wp-json/gf/v2/forms/3` | protected endpoint | 403 |

Wordfence Live Traffic did not record the matching request in the prior
authenticated inspection, while cPanel ModSecurity is enabled. The defensible
root-cause classification is therefore **hosting ModSecurity or an equivalent
upstream managed WAF rule**. The exact managed-rule ID is not visible in the
available WordPress session and must be taken from the hosting audit log.

This is not caused by robots.txt, canonical tags, the Ask Magic Mike app,
Vercel, a WordPress redirect, or missing Open Graph metadata. Both affected
pages contain valid canonical and Open Graph tags. AskMagicMike.com returns 200
to the Facebook crawler.

No firewall protection was disabled or broadened during this investigation.
