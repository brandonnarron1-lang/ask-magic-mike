# OTP Facebook Crawler Apache Evidence — 2026-08-28

## Diagnostic outcome

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

## Approved follow-up test

The subsequently approved account-root `.htaccess` trial was completed and
rolled back on 2026-08-28. It proved that the account layer cannot supersede
the earlier server-global authorization decision. Current Production behavior
and the original `.htaccess` hash are restored. See
[`OTP_FACEBOOK_CRAWLER_ACCOUNT_OVERRIDE_TEST_2026-08-28.md`](./OTP_FACEBOOK_CRAWLER_ACCOUNT_OVERRIDE_TEST_2026-08-28.md).

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
- Apache 2.4 expression variables and `req_novary` behavior:
  <https://httpd.apache.org/docs/current/expr.html>
- Apache 2.4 access-control guidance and User-Agent warning:
  <https://httpd.apache.org/docs/2.4/howto/access.html>

## Production boundary

- No Apache include or `.htaccess` was edited.
- No service was reloaded.
- No cache was purged.
- No WordPress page, plugin, form, notification, or database was changed.
- No Ask Magic Mike or NellySelly deployment/configuration was changed.

## Candidate verification — 2026-08-29

- Original PR #229 head
  `0a139e41a565a3ff7a672b0a41a27d7c8a1ea07f` is preserved at
  `rescue/amm-pr229-pre-pr228-exact-seal-20260829-0713`.
- A later PR #228 hardening required a second parent refresh. The current exact
  sealed PR #228 parent `3c01eeb2dc133d6463d2ce19904ac3a08f56284c`
  was reconciled by normal merge
  `1757c696af05ec35730f7e9f716ccb58ec7dc1f2`. The previous PR #229 head is
  preserved at
  `rescue/amm-pr229-pre-pr228-parent-refresh-20260829-140600`; no rebase,
  reset, force push, or history deletion was used.
- The verifier's known-cause classifier now requires the exact two expected
  Our Town paths, Facebook crawler, and HTTP 403 result. Any partial,
  different-path, or different-status failure remains unknown and receives
  generic investigation guidance.
- The representative host expression now makes the two allowed hostnames an
  explicit condition and uses `req_novary` for Host and User-Agent so the
  access-control check does not fragment response caches by those headers.
- Focused no-network regression coverage passes 111 tests across the verifier,
  Traffic readiness, and Launch Control modules.
- A fresh read-only live verifier run remains 40/42: Ask Magic Mike is fully
  available to every tested crawler, and only the two expected Our Town
  Facebook checks return 403. The verifier now prints the bounded Apache
  action instead of the superseded broad-WAF instructions.
- Earlier green Release Gate, immutable Preview, protected no-write QA, and
  clean runtime evidence remains historical proof for the pre-hardening
  candidate. Final exact-head runs, immutable deployment, artifacts, digests,
  and runtime evidence are pinned in PR #229 after push rather than creating a
  self-referential evidence-only commit.
- Production remains on authority commit
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.

## Next controlled action

Have a root/WHM hosting administrator execute the already-reviewed per-vhost
change documented in
[FACEBOOK_CRAWLER_FIREWALL_CHANGE.md](../FACEBOOK_CRAWLER_FIREWALL_CHANGE.md).
Do not repeat the account-root workaround.
