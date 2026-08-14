# WordPress Integration Guide

Use the existing isolated plugin in
`wordpress/ask-magic-mike-canonical-bridge/`. Do not create another plugin,
replace indexed pages, or edit the parent theme.

## Current disposition

- Plugin: IMPLEMENTED — ACTIVATION REQUIRED.
- Canonical destination: `https://www.askmagicmike.com/api/leads`.
- Audited Gravity Forms IDs: 1–7; forwarding must still be enabled and proved
  form by form.
- WordPress entry: source/fallback record. Neon lead: canonical record.
- Existing Gravity notifications remain on until canonical delivery is proved;
  then disable duplicates deliberately per approved form.

## Controlled activation

1. Export Gravity Forms settings and back up WordPress files/database.
2. Install version 1.1.0 with `AMM_CANONICAL_BRIDGE_ENABLED=false` and
   `AMM_CANONICAL_BRIDGE_FORM_IDS` empty.
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
