# Facebook Crawler 403 Root Cause

Verified 2026-08-28 against the live Our Town Properties cPanel/Apache host.

## Exact result

The block is a server-global Apache authorization rule, not WordPress, the Ask
Magic Mike application, Vercel, robots.txt, missing Open Graph metadata, or a
page-specific redirect.

The readable Apache include inventory identifies this exact chain:

```apache
# /etc/apache2/conf.d/includes/pre_virtualhost_global.conf
# mirrored by /usr/local/apache/conf/includes/pre_virtualhost_global.conf

# line 11
SetEnvIfNoCase User-Agent "facebookexternalhit" bad_bots

# line 24
Require not env bad_bots
```

Apache's error surface records `AH01630: client denied by server
configuration` from `authz_core` for the blocked public paths and even the
host's `403.shtml` error document. The live HTTP response is Apache's generic
358-byte 403 page, before PHP or WordPress handles the request.

## Evidence matrix

The current executable check remains 40/42:

| Surface | Browser | Facebook crawler | Other tested social crawlers |
| --- | ---: | ---: | ---: |
| AskMagicMike.com `/`, `/ask`, `/value` | 200 | 200 | 200 |
| OurTown `/ask-mike/` | 200 | 403 | 200 |
| OurTown `/agents/mike-eatmon/` | 200 | 403 | 200 |

Additional read-only evidence:

- The cPanel ModSecurity domain UI reports `ourtownproperties.com` as **Off**.
- The account-level generated ModSecurity include contains rule removals, but
  the matching failure is `authz_core`, not `mod_security`.
- The root WordPress `.htaccess` contains no `facebookexternalhit`, `Facebot`,
  user-agent deny, `Require`, or `Deny` rule that could cause this host-wide
  result. Restrictive plugin-directory `.htaccess` files are scoped to their
  own private directories and are unrelated.
- A caller that merely spoofs the Facebook user agent is also denied. This
  confirms that the global rule is user-agent based rather than verified-Meta
  source validation.

## Consequence

There is no ModSecurity rule ID to suppress. The previous "find the managed
WAF rule ID" instruction is superseded. The change must be made by the hosting
operator in Apache include management, with a vhost/account-scoped override
preferred over editing the shared global include.

No Apache, cPanel, WordPress, DNS, cache, or Production application setting was
changed during this diagnosis.

See [FACEBOOK_CRAWLER_FIREWALL_CHANGE.md](./FACEBOOK_CRAWLER_FIREWALL_CHANGE.md)
for the bounded remediation and rollback contract.
