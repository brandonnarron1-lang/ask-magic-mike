# Ask Magic Mike Canonical Lead Bridge

This isolated plugin reuses the existing Gravity Forms and forwards only audited
form IDs 1–7 to `https://www.askmagicmike.com/api/leads`.

## Safety defaults

- Installation/activation alone does **not** forward entries.
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
```

The same 32+ character `WORDPRESS_BRIDGE_SECRET` must be stored as a Sensitive
server-only Vercel environment variable. Do not paste its value into chat, logs,
screenshots, source code, or WordPress options.

## Activation sequence

1. Back up WordPress files/database.
2. Install and activate with `AMM_CANONICAL_BRIDGE_ENABLED=false`.
3. Confirm Settings → AMM Canonical Bridge reports “Shadow only”.
4. Submit one approved `is_test=true` QA record for forms 2, 3, and 7.
5. Configure matching secrets and enable forwarding in a controlled window.
6. Verify one Gravity entry, one Neon lead, one notification, and one canonical ID.
7. Disable the matching Gravity Forms admin notification only after delivery proof.

Rollback is one constant change: set `AMM_CANONICAL_BRIDGE_ENABLED` to `false`.
Gravity Forms continues saving entries and its existing notifications remain intact.
