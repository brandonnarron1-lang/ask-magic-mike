# WordPress Bridge Rollback

Use only if Form 3 entry storage, bridge signing, canonical capture, or internal
notification fails.

1. In `wp-config.php`, set `AMM_CANONICAL_BRIDGE_ENABLED` to `false` and verify
   the file with `php -l` before changing plugin files.
2. Re-enable the Form 3 Gravity Forms `Admin Notification` so saved entries keep
   their prior administrative email path.
3. Upload and overwrite with
   `output/release/wordpress-canonical-bridge-1.0.0-rollback.zip`.
4. Verify the installed plugin reports 1.0.0 and WordPress has no fatal error.
5. Submit no test lead. Confirm the bridge health page is shadow-only and public
   Form 3 still renders.
6. Preserve all Gravity entries and bridge status evidence.

Hosting backup:
`/home/wilsonho/public_html/wp-config.php.amm-pre-bridge-20260814T1830Z.bak`

Application rollback: promote prior Ready deployment
`dpl_5ukS4Ji1AHH9WHnwyr943x3zZRD9` only if the current application deployment
regresses. The encrypted bridge secret may remain configured because disabled
WordPress forwarding cannot call it.
