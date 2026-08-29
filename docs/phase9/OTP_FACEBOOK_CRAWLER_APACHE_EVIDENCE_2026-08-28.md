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
- Final code-and-copy head
  `4be6088e4a0a58441542f638f388ab9e8886b7ff` passes exact Node 24.18.0
  isolation, 14/14 release safety, 266 test files / 3,340 tests, strict
  typecheck, full lint, optimized Next.js 15.5.21 build with 59 generated
  static pages, and route proof with 95 active / 17 acknowledged duplicate
  routes.
- Release doctor is healthy at 43/43. Production dependency audit reports no
  known vulnerability. Redacted Gitleaks reports no leak across the two-commit
  parent delta (approximately 31.89 KB) or 674-commit repository history
  (approximately 16.36 MB).
- A fresh read-only live verifier run remains 40/42: Ask Magic Mike is fully
  available to every tested crawler, and only the two expected Our Town
  Facebook checks return 403. The verifier now prints the bounded Apache
  action instead of the superseded broad-WAF instructions.
- GitHub Release Gate run `33250286860` passed every step for head
  `4be6088e4a0a58441542f638f388ab9e8886b7ff`. Artifact `9714180289` has
  digest
  `sha256:a269ec98b55a40cb653443bed2a6fa37ca95c34eb08af82e715dc06a62003e6d`.
- Immutable Vercel Preview deployment
  `dpl_6Zv5KKMe8C1fHtqUTjFMUHU7Qf1M` is `READY` at
  `https://ask-magic-mike-4cl6yz9hc-eyes-up-industries.vercel.app` and is
  bound to the same exact code-and-copy head.
- Hosted no-write Preview QA run `33250361995` checked out the exact branch
  head and passed 18 checks with six intentional mutation skips and zero
  failures. Browser E2E passed 4/4 with zero unexpected, flaky, or skipped
  cases. The authority verdict is `PREVIEW_READY`; database mutation, live
  email, and live SMS were all disabled. Artifact `9714213564` has digest
  `sha256:b37b8186884d17a9565a68a936b2e685441ee03debe6610e85324ce2be4ab102`.
- The exact Preview runtime window contains 38 information-level requests:
  31 HTTP 200, four HTTP 204, one HTTP 307, one expected invalid-token 404,
  and one expected fail-closed Preview SLA-sweep 503. There are no warning,
  error, or fatal records and no unexpected 5xx response.
- This repository evidence is intentionally bound to the last behavior-bearing
  head. The subsequent evidence-only seal and its exact-head checks are pinned
  in PR #229 rather than creating an endless evidence-commit loop.
- Production remains on authority commit
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca` and deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`.

## Next controlled action

Have a root/WHM hosting administrator execute the already-reviewed per-vhost
change documented in
[FACEBOOK_CRAWLER_FIREWALL_CHANGE.md](../FACEBOOK_CRAWLER_FIREWALL_CHANGE.md).
Do not repeat the account-root workaround.
