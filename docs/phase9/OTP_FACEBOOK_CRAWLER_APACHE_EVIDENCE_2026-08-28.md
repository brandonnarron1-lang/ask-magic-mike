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

## Candidate verification — 2026-08-29

- Original PR #229 head
  `0a139e41a565a3ff7a672b0a41a27d7c8a1ea07f` is preserved at
  `rescue/amm-pr229-pre-pr228-exact-seal-20260829-0713`.
- The branch was reconciled by normal merge commit
  `979592187da72e45fe6e3387bba4722e8551e615` onto exact sealed PR #228
  head `b1bd4b2012c037f4a71806b449541cdcfdd758b6`; no rebase or force push
  was used.
- Code-bearing head `f605b7cc972c3b658c808643d960d6c2a71ce008` passes exact Node 24.18.0 isolation, 14/14
  release safety, 266 test files / 3,340 tests, strict typecheck, full lint,
  optimized Next.js 15.5.21 build with 59 generated static pages, and route
  proof with 95 active / 17 acknowledged duplicate routes.
- Release doctor is healthy at 43/43. Production dependency audit reports no
  known vulnerability. Redacted Gitleaks reports no leak across the two-commit
  parent delta (approximately 31.89 KB) or 674-commit repository history
  (approximately 16.36 MB).
- A fresh read-only live verifier run remains 40/42: Ask Magic Mike is fully
  available to every tested crawler, and only the two expected Our Town
  Facebook checks return 403. The verifier now prints the bounded Apache
  action instead of the superseded broad-WAF instructions.
- Exact final GitHub/immutable-Preview evidence is still required after the
  evidence-only seal is pushed. Production remains on authority commit
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.

## Next controlled action

Submit the prepared hosting-operator request or approve the exact narrow test
gate documented in
[FACEBOOK_CRAWLER_FIREWALL_CHANGE.md](../FACEBOOK_CRAWLER_FIREWALL_CHANGE.md).
