# WordPress Capture Consolidation Reconciliation — 2026-09-01

## Decision

Do not add another WordPress form, lead table, notification engine, or visual
plugin. The live site already contains the required pieces. The next work is a
controlled consolidation of the existing Connector, Canonical Lead Bridge,
Gravity Forms, and legacy Ask Magic Mike surfaces into the canonical Neon lead
path.

This reconciliation was read-only. No plugin, form, notification, page,
database, secret, cache, DNS record, lead, or message was changed.

## Authenticated live inventory

| Component | Live state | Canonical disposition |
| --- | --- | --- |
| Ask Magic Mike | Active, version 1.0.0 | Existing legacy public assistant/floating-form owner; consolidate, do not clone |
| Constant Contact Page Exclusion | Active, version 1.0.0 | Retain only where its page-specific suppression remains required |
| Lead Ops & Social Share Upgrade | Active, version 2.10.0 | Existing visual/native-form layer; do not activate the four inactive visual replacement plugins |
| Canonical Lead Bridge | Active, version 1.1.0 | Canonical Gravity Forms forwarding boundary |
| Connector | Active, version 1.0.0 | Exact reviewed PR #248 upgrade target |

Four older visual override plugins are installed but inactive. They were not
activated or deleted. Their presence is an archive-cleanup decision, not a
reason to build a sixth visual system.

## Source and configuration proof

- The active Connector PHP is 15,124 characters and has SHA-256
  `2938f47cca5e667a5b65b39fecfd32bb492f7b8f579179ac2ad3105957095a8f`.
  It matches the repository's captured 1.0.0 baseline byte-for-byte.
- The reviewed Connector 1.1.0 candidate remains
  `700c78b77b24b0038078e45c6526908078dac46cf1a591b73dd0f13a6d840ec8`.
  It changes attribution and readiness proof only; it does not store or send a
  lead.
- The active Canonical Lead Bridge is version 1.1.0. Its health panel reports a
  configured signing secret without displaying the value and forwarding
  enabled only for Form 3.
- The bridge uses an exact Form 1–7 map, HMAC signing, idempotency, bounded
  retries, UTM/click-ID capture, and no `wp_mail()` path. Legacy form
  communication permissions fail closed: email, call, and SMS permissions are
  false under `wordpress_gravity_forms_unverified_v1`.
- The health ledger shows one prior successful Form 3 canonical forward. Forms
  1 and 7 remain shadow-only in the observed ledger.

## Notification reconciliation

| Form | Public purpose | Canonical bridge | Native Gravity notification | Current duplicate-send risk |
| --- | --- | --- | --- | --- |
| 3 | Home Value | Enabled | Inactive | Controlled: canonical notification owns the path |
| 7 | Sitewide “Never miss a property” / contact form | Shadow only | Active | Enabling the bridge now would create duplicate internal alerts |

No Form 7 notification was disabled. Subscription/notification changes require
a separate action-time confirmation and must follow controlled end-to-end QA.

## Rendered public placement evidence

| Page | Existing capture surfaces | Current canonical handoff |
| --- | --- | --- |
| Homepage | Sitewide Form 7; hidden legacy Ask CTA | Hidden `/value` CTA with incomplete UTMs |
| Home Worth | Form 3 plus sitewide Form 7 | Visible `/value` CTA with legacy UTMs |
| We Buy Homes | No page Gravity form | Visible `/value` CTA with legacy UTMs |
| Ask Magic Mike | Sitewide Form 7 plus canonical Ask iframe | Iframe lacks placement-level UTM content |
| Ask Mike | Legacy native form, sitewide Form 7, and canonical Ask iframe | Three live capture surfaces compete on one intent page |
| Mike Eatmon agent page | Sitewide Form 7 | No explicit canonical Ask link observed |

The sitewide Form 7 is a real below-fold form, not merely inert source markup.
On the inspected 1,280×720 rendering it was 589×531 pixels and appeared later
in document flow. Public-source coverage observed it on 39 of 42 sitemap pages.

## Exact consolidation order

1. Release PR #248 as a Connector-only, same-tree deployment. Do not edit a
   WordPress page in the same action.
2. Verify the exact 1.1.0 public version marker and legacy shortcode
   compatibility, retaining the captured 1.0.0 rollback archive.
3. Separately preview and approve page 3952 and page 3631 CTA replacements so
   `/home-value` and `/sell` receive complete placement UTMs.
4. Treat Form 7 as its own consent and notification cutover. Add/verify exact
   consent language first, run one unmistakable test through the public form,
   prove one Gravity entry and one canonical lead/alert, and only then request
   action-time approval to disable its native Gravity notification.
5. Choose one Ask intent capture on `/ask-mike/`. The canonical iframe is the
   retained target; the legacy native form must not be removed until its
   rollback snapshot, source attribution, and no-loss test are complete.
6. Keep Forms 1, 4, and 6 shadow-only until each field map, consent state,
   current notification, assignee, and source placement has its own acceptance
   proof.

## Rollback boundaries

- Connector rollback restores only the captured 1.0.0 plugin package.
- Page rollback restores only the exact saved revision for that page.
- Bridge rollback removes only the affected form ID from
  `AMM_CANONICAL_BRIDGE_FORM_IDS`; Gravity Forms continues storing the entry.
- Notification rollback re-enables only the previously active notification for
  the exact form.
- No rollback may restore or activate an older visual override plugin.

## Current release gate

The next application release gate remains:

`APPROVE PHASE 9 CONNECTOR READINESS APPLICATION PR 248 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`

That gate authorizes only the reviewed application/Connector package release.
It does not authorize WordPress installation, page publication, Form 7
forwarding, notification changes, cache purge, or a Production test message.
