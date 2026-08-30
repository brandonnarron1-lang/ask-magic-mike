# Phase 9 WordPress homepage CTA restoration packet

Date: 2026-08-29

Mode: authenticated read-only audit plus offline patch preparation

External mutation: none

## Executive decision

Restore the existing homepage Ask Magic Mike CTA in the existing Lead Ops
plugin. Do not create another block, widget, form, bridge, notification, lead
store, or WordPress dashboard.

The CTA markup and tracked destination are already published on WordPress page
149. The only verified visibility blocker is one rule emitted by the active
`ask-magic-mike-lead-ops-social-upgrade` plugin. The separate floating-widget
suppression remains necessary and is not part of this change.

## Authenticated live evidence

The WordPress session was inspected without saving a setting, submitting a
form, sending a notification, purging a cache, or editing a file.

- Plugin: `Ask Magic Mike - Lead Ops & Social Share Upgrade`.
- Deployed version: `2.10.0`.
- Deployed file SHA-256:
  `41de351d57e91b8ecf1d611d8b052381166effaf693319b0f9e8da32f5d8e972`.
- The plugin registers `emit_visual_containment_css()` on `wp_head` at priority
  110.
- Its exact homepage branch emits
  `.amm-cta,.amm-cta--dark{display:none !important;}`.
- A different `filter_homepage()` path emits
  `.amm-widget{display:none !important;}` under
  `amm-leadops-home-suppress`.
- Public page 149 already contains one exact `Start With Your Address` anchor
  and the current tracked `/value` destination. That route reuses the canonical
  home-value implementation; this repair intentionally leaves the href alone.
- The public brokerage number remains `252-243-7700`; no phone value is changed
  or propagated by this packet.

## Existing lead-path ownership

The current systems already contain the required bridge boundary:

- Canonical Bridge version `1.1.0` is enabled only for Gravity Form 3.
- The signing secret is configured in the hosting environment and was not
  displayed or copied.
- The controlled Form 3 acceptance entry reached the canonical API in one
  forwarding attempt and has a canonical lead identifier.
- Form 3's only Gravity Forms `Admin Notification` is inactive. Its BCC field is
  empty. Do not reactivate it: canonical notifications already own internal
  email delivery and reactivation could duplicate alerts.
- Other observed forms are not allowlisted and remain in shadow/no-forward
  states.
- The older Lead Ops panel still exposes a small local `amm_leads` audit store.
  It is not promoted as the canonical database and is not modified here.

No consumer data, recipient address, signing secret, or plugin source is stored
in the restoration manifest.

## Exact proposed change

The reviewed patch is
[`wordpress/patches/ask-magic-mike-lead-ops-v2.10.1-homepage-cta.patch`](../../wordpress/patches/ask-magic-mike-lead-ops-v2.10.1-homepage-cta.patch).

It performs only three substitutions:

1. bump the plugin header from `2.10.0` to `2.10.1`;
2. bump the class version constant from `2.10.0` to `2.10.1`; and
3. remove the single CTA hiding output while documenting that the floating
   widget remains separately suppressed.

The exact reviewed result SHA-256 is
`6b9a30de24e3fbbbac5aa49def7552afd6b2e21b7ede7beafa8ad095d9a9f44c`.
The offline verifier refuses drift, duplicate blocks, a missing widget guard,
an unexpected result hash, or a second application. It never writes the plugin
or calls WordPress.

Run it only against a safely downloaded copy of the live plugin file:

```bash
node scripts/amm/wordpress-homepage-cta-restoration.mjs \
  --source /absolute/path/to/ask-magic-mike-lead-ops-social-upgrade.php
```

For pre-publication layout review, the companion local-preview server fetches
the public homepage read-only, removes exactly the reviewed hide rule in memory,
disables scripts, frames, connections, and form actions with CSP, and serves the
result only on `127.0.0.1`. It does not save a transformed page:

```bash
node scripts/amm/wordpress-homepage-cta-local-preview.mjs --port 4177
```

## Publication gate

No WordPress save is authorized by this packet. Immediately before the exact
plugin save, require:

`APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA VISIBILITY RESTORATION`

That approval may authorize only the reviewed `2.10.0` to `2.10.1` plugin-file
edit after a verified backup and matching source hash. It does not authorize a
page/form/menu edit, Gravity Forms notification change, cache purge, lead
submission, email/SMS/Push send, database action, DNS change, social
publication, spend, deletion, or NellySelly action.

## Acceptance after a separately approved save

1. Verify the saved plugin file hash is the reviewed result hash.
2. Fetch the homepage with a non-identifying cache-busting query and confirm the
   `amm-cta` hiding rule is absent while `amm-widget` suppression remains.
3. Require the protected homepage manifest to report page 149, one exact
   target, zero lookalikes, `targetVisibility=visible_candidate`, zero hidden
   targets, and zero hidden selectors.
4. Verify `Start With Your Address` is visible at desktop and 390-pixel mobile
   widths, keyboard focus is visible, no horizontal overflow appears, and the
   brokerage header, navigation, forms, SEO metadata, and public phone remain
   unchanged.
5. Verify the current tracked href without submitting a lead or writing an
   analytics event.
6. Do not purge a cache unless fresh public evidence remains stale and a
   separate cache-purge approval is provided.

## Rollback

Before the save, download and hash the complete live `2.10.0` plugin file. If
any acceptance check fails, restore those exact bytes through the same plugin
file path, verify the original SHA-256, and recheck that the previous public
state returned. Do not alter page 149, Gravity Form 3, the Canonical Bridge,
lead records, notification records, theme files, or NellySelly as part of this
rollback.
