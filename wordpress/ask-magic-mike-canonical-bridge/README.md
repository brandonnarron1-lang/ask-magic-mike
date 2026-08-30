# Ask Magic Mike Canonical Lead Bridge

Version 1.2.0 extends the existing isolated bridge in place. It continues to
forward an explicit approved subset of audited Gravity Forms IDs 1–7 to
`https://www.askmagicmike.com/api/leads` and can independently provide the
brokerage site's consent-safe Google measurement loader. It does not create a
second WordPress plugin, lead store, analytics property, or cookie-choice UI.

## Safety defaults

- Installation/activation alone does **not** forward entries.
- The global enable flag and a non-empty per-form allowlist are both required.
- Shadow mode records only form ID, entry ID, status, attempt, canonical lead ID,
  correlation ID, timestamp, and a safe error code. It does not duplicate entry PII.
- It never calls `wp_mail()` and never sends a consumer acknowledgment.
- Existing Gravity Forms notifications remain untouched until exact-form QA passes.
- Secrets are read from `wp-config.php` or the process environment, never WordPress
  options or the admin screen.
- Google measurement is independently disabled by default. The loader accepts
  only the existing provider cookie `vv_cookieconsent_status=allow`; missing,
  denied, dismissed, malformed, and unknown values stay tag-inert.
- The loader is pinned to the audited container `GTM-KZMCSLTJ`. It contains no
  alternate container, advertising grant, noscript iframe, browser secret, or
  arbitrary remote URL.
- A later consent withdrawal sends a denied Consent Mode update, expires only
  recognized Google measurement cookies, and detaches the injected GTM script.
  It does not clear brokerage/session cookies or load a second GTM runtime if
  the visitor changes the choice again on the same page.

## Secure configuration

Add through the approved hosting secret/configuration interface, not the page editor:

```php
define('AMM_CANONICAL_BRIDGE_SECRET', getenv('WORDPRESS_BRIDGE_SECRET'));
define('AMM_CANONICAL_BRIDGE_URL', 'https://www.askmagicmike.com/api/leads');
define('AMM_CANONICAL_BRIDGE_ENABLED', false);
define('AMM_CANONICAL_BRIDGE_FORM_IDS', array());
define('AMM_GOOGLE_MEASUREMENT_ENABLED', false);
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

## Basic Consent measurement activation

Lead forwarding and Google measurement are separate capabilities. Enabling one
does not enable the other.

1. Back up WordPress files/database and preserve the current head/noscript GTM
   source before any live edit.
2. Install version 1.2.0 with `AMM_GOOGLE_MEASUREMENT_ENABLED=false` and verify
   the existing Form 3 lead-forwarding state is unchanged.
3. Remove the exact legacy `GTM-KZMCSLTJ` inline head bootstrap and its matching
   `<noscript>` iframe. Do not remove the existing cookie-choice provider.
4. Set `AMM_GOOGLE_MEASUREMENT_ENABLED=true` through `wp-config.php` or the
   approved hosting configuration interface.
5. Confirm Settings → AMM Canonical Bridge reports
   `Enabled — explicit allow only` and the public source has one
   `data-amm-consent-gate="basic-v1"` marker before the cookie provider.
6. In a clean browser, prove missing, Decline, and dismiss states create no
   Google request, `dataLayer`, `_ga*` cookie, or GTM noscript request. Then
   separately choose Allow and prove exactly one request to
   `gtm.js?id=GTM-KZMCSLTJ`. Withdraw consent and prove the runtime receives a
   denied update, the injected script and only Google cookies are removed, and
   a same-page re-allow does not create a duplicate runtime. A normal next page
   load may initialize once under the then-current explicit choice.
7. Run `pnpm run amm:verify:cross-domain`; `REVIEW_READY` permits the separate
   authenticated GTM/GA4 review but is not by itself a Production release.

Measurement rollback is independent: set
`AMM_GOOGLE_MEASUREMENT_ENABLED=false` and leave the noncompliant legacy
pre-consent snippet removed. Reinstall the preserved 1.1.0 package only if a
plugin-code rollback is required; do not restore the legacy GTM bootstrap as an
automatic rollback step. Disabling measurement does not disable or alter lead
forwarding.
