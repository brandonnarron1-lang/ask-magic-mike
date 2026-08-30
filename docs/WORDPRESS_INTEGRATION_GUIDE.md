# WordPress Integration Guide

Use the existing isolated plugin in
`wordpress/ask-magic-mike-canonical-bridge/`. Do not create another plugin,
replace indexed pages, or edit the parent theme.

## Current disposition

- Plugin: version 1.1.0 ACTIVE for the approved Form 3 bridge; version 1.2.0
  consent-gate upgrade is PREPARED, NOT INSTALLED.
- Canonical destination: `https://www.askmagicmike.com/api/leads`.
- Audited Gravity Forms IDs: 1–7; forwarding must still be enabled and proved
  form by form.
- WordPress entry: source/fallback record. Neon lead: canonical record.
- Existing Gravity notifications remain on until canonical delivery is proved;
  then disable duplicates deliberately per approved form.

## Controlled activation

1. Export Gravity Forms settings and back up WordPress files/database.
2. For a fresh installation, install version 1.2.0 with
   `AMM_CANONICAL_BRIDGE_ENABLED=false` and
   `AMM_CANONICAL_BRIDGE_FORM_IDS` empty. For the current 1.1.0 → 1.2.0 upgrade,
   preserve the already-approved Form 3 enable/allowlist values exactly and
   add only `AMM_GOOGLE_MEASUREMENT_ENABLED=false` before replacing the plugin.
3. Set the same 32+ character `WORDPRESS_BRIDGE_SECRET` in WordPress hosting and
   Vercel using secure secret interfaces.
4. Confirm the plugin health screen reports shadow mode and no pending error.
5. Add only the one approved form ID to `AMM_CANONICAL_BRIDGE_FORM_IDS`, enable
   forwarding for the controlled window, and submit an unmistakable `is_test=true`,
   `INTERNAL QA — DO NOT CONTACT` record through that public form.
6. Prove one Gravity entry maps to
   one Neon lead, consent/attribution, one outbox record, and one canonical ID.
7. Remove the form ID immediately if proof fails. Repeat per form only after the
   previous mapping is accepted.
8. Only then disable the exact duplicate Gravity notification.

Rollback: set `AMM_CANONICAL_BRIDGE_ENABLED=false`. Do not delete Gravity entries,
bridge audit rows, or Neon records during rollback.

## Brokerage measurement gate

Version 1.2.0 reuses this same plugin for one independent, fail-closed Basic
Consent loader. `AMM_GOOGLE_MEASUREMENT_ENABLED` defaults off and does not
change `AMM_CANONICAL_BRIDGE_ENABLED` or the Form 3 allowlist. The loader is
same-origin, pinned to `GTM-KZMCSLTJ`, and activates only when the existing
cookie provider records the exact value `vv_cookieconsent_status=allow`.

The controlled live change must be atomic:

1. capture a file/database backup plus the exact current GTM head and noscript
   snippets;
2. install 1.2.0 with measurement disabled and verify Form 3 bridge health;
3. remove only the audited legacy GTM bootstrap and matching noscript iframe;
4. enable the measurement constant;
5. require source-level, clean-browser network, consent-state, and PHP/runtime
   proof before leaving the gate enabled.

If any check fails, disable only `AMM_GOOGLE_MEASUREMENT_ENABLED` and restore
the preserved plugin files if needed, but leave the legacy pre-consent GTM
head/noscript bootstrap removed. Do not disable Gravity forwarding, delete
WordPress entries, alter the cookie provider, purge lead data, or touch
NellySelly as part of measurement rollback.
