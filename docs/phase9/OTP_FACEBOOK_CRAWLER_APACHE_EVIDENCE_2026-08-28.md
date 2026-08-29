# OTP Facebook Crawler Apache Evidence — 2026-08-28

## Outcome

The exact denial is proven and no Production change was made.

`facebookexternalhit` is classified as `bad_bots` by a server-global Apache
include, and `authz_core` rejects that class. The previous hypothesis that an
unknown ModSecurity rule needed discovery is superseded.

## Read-only checks performed

1. Ran the canonical social-preview verifier against Production.
   - 42 checks
   - 40 pass
   - 2 fail, both Our Town public pages with the Facebook crawler
2. Compared normal-browser and Facebook-crawler HTTP responses.
   - normal browser: HTTP 200, WordPress HTML
   - Facebook crawler: HTTP 403, Apache generic error body
3. Inspected authenticated cPanel ModSecurity status.
   - production domain control reports Off
   - no setting was changed
4. Inspected account `.htaccess` files read-only.
   - no root user-agent/authz rule matches this denial
   - plugin-directory deny rules are path-local and unrelated
5. Correlated the request in cPanel's web-server error diagnostics.
   - `AH01630: client denied by server configuration`
   - module: `authz_core`
6. Located the readable global Apache directives.
   - line 11 maps `facebookexternalhit` to `bad_bots`
   - line 24 applies `Require not env bad_bots`

No raw client IP, cPanel session URL, secret, credential, or private log payload
is retained in this evidence file.

## Why the remediation is bounded

Apache documents that `SetEnvIf` directives are applied in order and that a
later matching directive may unset an environment variable with a leading
`!`. Apache also warns that User-Agent access control is unreliable because a
caller may choose any User-Agent string. The proposed override therefore does
not grant broad trust to the name; it is constrained to two public pages, two
public images, and `GET`/`HEAD` only.

Primary references:

- Apache 2.4 `mod_setenvif` / `SetEnvIfExpr` syntax and ordered evaluation:
  <https://httpd.apache.org/docs/current/mod/mod_setenvif.html>
- Apache 2.4 access-control guidance and User-Agent warning:
  <https://httpd.apache.org/docs/2.4/howto/access.html>

## Production boundary

- No Apache include or `.htaccess` was edited.
- No service was reloaded.
- No cache was purged.
- No WordPress page, plugin, form, notification, or database was changed.
- No Ask Magic Mike or NellySelly deployment/configuration was changed.

## Next controlled action

Submit the prepared hosting-operator request or approve the exact narrow test
gate documented in
[FACEBOOK_CRAWLER_FIREWALL_CHANGE.md](../FACEBOOK_CRAWLER_FIREWALL_CHANGE.md).
