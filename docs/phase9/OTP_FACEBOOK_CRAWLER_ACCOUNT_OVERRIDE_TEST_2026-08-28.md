# OTP Facebook Crawler Account Override Test — 2026-08-28

## Result

The exact narrow test was approved, executed against the authenticated Our
Town cPanel account, failed its 42/42 acceptance condition, and was completely
rolled back. The public site remained available throughout the test.

The trial proves that a document-root `.htaccess` directive cannot supersede
the earlier server-global `authz_core` decision on this host. The remaining
correction must be installed by a root/WHM hosting administrator in the
supported per-vhost include after the global `facebookexternalhit -> bad_bots`
classifier and before authorization is evaluated.

## Controlled procedure

1. Re-ran the canonical Production social-preview verifier immediately before
   the change: 40/42, with only `/ask-mike/` and
   `/agents/mike-eatmon/` returning 403 to `facebookexternalhit`.
2. Confirmed the account document root was writable and contained no existing
   `facebookexternalhit` or `bad_bots` directive.
3. Created a timestamped byte-for-byte `.htaccess` backup. The original and
   backup SHA-256 were both
   `a610ebc9f25d4020cf20def1e6170d9cdd77b9e0cee242b42abf4d43efe4eee2`.
4. Inserted only the reviewed host/method/user-agent/four-path
   `SetEnvIfExpr ... !bad_bots` rule at the account document root.
5. Verified ordinary requests still returned 200, proving the directive parsed
   without a site-wide Apache syntax failure.
6. Re-ran the social matrix and direct four-path probes. The two HTML pages
   remained 403 to the Facebook crawler; both public image paths returned 200.
7. Restored the timestamped backup immediately because acceptance failed.
8. Reconfirmed the restored file and backup had the same SHA-256, moved the
   retained backup outside the public document root, and reran the matrix.

No raw client IP, cPanel session URL, credential, secret, or private log payload
was retained.

## Post-rollback proof

- canonical social matrix: 40/42, matching the pre-test baseline;
- normal browser: HTTP 200 for the Our Town Ask Mike and Mike-agent pages;
- Facebook crawler: HTTP 403 for both public pages and a non-allowlisted public
  path;
- Facebook crawler: HTTP 403 for `/wp-login.php`, `/wp-admin/`, `/wp-json/`
  POST, and XML-RPC POST;
- Ask Magic Mike `/ask`: normal browser HTTP 200;
- account `.htaccess`: restored to the original SHA-256;
- no Apache reload, cache purge, WordPress edit, database change, Vercel
  deployment, DNS change, email/SMS/Push, external publication, or NellySelly
  action occurred.

## Proven access boundary

The supported cPanel userdata include path exists but is owned by `root:root`
and is not writable by the hosting account. The account therefore cannot
complete the required include-write, `apachectl configtest`, and graceful
reload sequence. This is an access boundary, not a missing application
implementation.

## Remaining action

A root/WHM hosting administrator must follow
[`META_CRAWLER_HOSTING_OPERATOR_ACTION.md`](../META_CRAWLER_HOSTING_OPERATOR_ACTION.md),
then provide:

1. the supported per-vhost include location and reviewed directive;
2. successful `apachectl configtest` output;
3. graceful-reload confirmation;
4. 42/42 social-preview proof;
5. excluded sensitive-route regression proof; and
6. the exact rollback location and removal procedure.

Do not retry `.htaccess`, disable the global bot policy, or broaden the
allowlist.
