# Ask Magic Mike Canonical Lead Bridge

This isolated plugin reuses the existing Gravity Forms and can forward an explicit
approved subset of audited form IDs 1–7 to
`https://www.askmagicmike.com/api/leads`.

## Safety defaults

- Installation/activation alone does **not** forward entries.
- The global enable flag and a non-empty per-form allowlist are both required.
- Shadow mode records only form ID, entry ID, status, attempt, canonical lead ID,
  correlation ID, timestamp, and a safe error code. It does not duplicate entry PII.
- It never calls `wp_mail()` and never sends a consumer acknowledgment.
- Existing Gravity Forms notifications remain untouched until exact-form QA passes.
- Secrets are read from `wp-config.php` or the process environment, never WordPress
  options or the admin screen.

## Secure configuration

Add through the approved hosting secret/configuration interface, not the page editor:

```php
define('AMM_CANONICAL_BRIDGE_SECRET', getenv('WORDPRESS_BRIDGE_SECRET'));
define('AMM_CANONICAL_BRIDGE_URL', 'https://www.askmagicmike.com/api/leads');
define('AMM_CANONICAL_BRIDGE_ENABLED', false);
define('AMM_CANONICAL_BRIDGE_FORM_IDS', array());
```

The same 32+ character `WORDPRESS_BRIDGE_SECRET` must be stored as a Sensitive
server-only Vercel environment variable. Do not paste its value into chat, logs,
screenshots, source code, or WordPress options.

## Activation sequence

1. Back up WordPress files/database.
2. Install and activate with `AMM_CANONICAL_BRIDGE_ENABLED=false` and an empty
   `AMM_CANONICAL_BRIDGE_FORM_IDS` array.
3. Confirm Settings → AMM Canonical Bridge reports “Shadow only”.
4. Configure matching secrets and set `AMM_CANONICAL_BRIDGE_FORM_IDS` to only the
   one approved form ID for the controlled QA window.
5. Enable forwarding and submit one unmistakable `is_test=true` QA record through
   that live public form.
6. Verify one Gravity entry, one Neon lead, one notification, and one canonical ID.
7. Repeat deliberately for forms 2, 3, and 7; do not widen the allowlist implicitly.
8. Disable the matching Gravity Forms admin notification only after delivery proof.

Rollback is one constant change: set `AMM_CANONICAL_BRIDGE_ENABLED` to `false`.
For a single-form rollback, remove only that ID from
`AMM_CANONICAL_BRIDGE_FORM_IDS`.
Gravity Forms continues saving entries and its existing notifications remain intact.
