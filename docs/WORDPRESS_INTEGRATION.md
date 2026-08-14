# WordPress Integration

## Current evidence (authenticated 2026-08-11 audit)

`www.ourtownproperties.com` is the authoritative WordPress/SEO site. Authenticated
inspection confirms WordPress 7.0.3, Beaver Builder child theme/Pro/Themer, Gravity
Forms 2.10.5, FlexMLS/IDX, Constant Contact, WP Super Cache, Wordfence, the legacy
`ask-magic-mike` plugin, Lead Ops/Social Share, and `ask-magic-mike-connector`.
Existing pages, titles, listings, agents, rentals, entries, and IDX behavior remain
preserved.

Gravity Forms IDs 1–7 cover Contact Us, Cash Offer, Home Value, Join Our Team,
Rental Property Search, Short Term Home Rentals, and property alerts. They store
entries locally and have one active admin notification each. No native Consent field
was found. See `COMBINED_SYSTEM_AUDIT_2026-08-11.md` for the exact field mapping.

## Bridge contract

The WordPress layer may render a tracked CTA, iframe, or versioned loader. It must
forward to the canonical app/API, preserve page URL/referrer/UTMs/click IDs and
placement, and never become a competing source of truth. If Gravity Forms remains
active, its entry is saved first and a signed, idempotent server-to-server forward
reconciles to the canonical lead record. Duplicate Gravity Forms notifications are
disabled only after an owner-approved test proves the canonical alert works.

The implementation package is `wordpress/ask-magic-mike-canonical-bridge/` and a
reviewable install archive is generated at
`output/release/ask-magic-mike-canonical-bridge-1.1.0.zip`. Version 1.1.0 is disabled
unless `AMM_CANONICAL_BRIDGE_ENABLED === true` and an explicit approved subset is
configured with `AMM_CANONICAL_BRIDGE_FORM_IDS`. The shared
HMAC secret is read only from `AMM_CANONICAL_BRIDGE_SECRET` or the hosting
environment and must match server-side `WORDPRESS_BRIDGE_SECRET`.

The bridge allowlists form IDs 1–7, runs after Gravity Forms stores the entry,
signs `timestamp.entryId.rawBody` with HMAC-SHA256, and uses
`gf:{formId}:{entryId}` as the canonical idempotency key. It retries at bounded
intervals and stores only reconciliation metadata in WordPress. It does not call
`wp_mail`, disable existing Gravity Forms notifications, create a second PII lead
table, or activate itself.

The August 10/v6 package is a reusable bridge reference. The currently active
legacy plugin already has a local `wp_amm_leads` table, public REST intake, `wp_mail`
notification, local dashboard, and unsigned optional webhook. These must remain
unchanged during shadow testing, then be reconciled and deliberately reduced after
the canonical bridge is proven.

## Safe activation sequence

1. Back up files/database through the existing WordPress/Regency process.
2. Identify exact page IDs, form IDs, notification rules, and current destinations.
3. Add one reversible draft/page-builder CTA or iframe in staging/draft.
4. Test attribution and fallback; verify entry-before-email behavior.
5. Obtain approval, publish only the named page/widget placement, and monitor.

6. During the first shadow test, keep existing Gravity Forms notifications active,
   submit only an unmistakable QA entry, verify one canonical lead/outbox record,
   and check bridge status before considering any duplicate-notification change.

Authenticated inspection and a prior connector-only configuration/cache refresh
occurred. No form, notification, legacy plugin, live page content, historic entry,
or lead record was changed during the 2026-08-11 combined-system audit.
PHP CLI is not installed in the local workstation. WordPress successfully
unpacked, installed, and activated the package, which provides the production PHP
parse/load proof; forwarding remains disabled.

## Production shadow installation — 2026-08-11

- Active and retained: Ask Magic Mike `1.0.0`, Ask Magic Mike Lead Ops & Social
  Share Upgrade `2.10.0`, Ask Magic Mike Connector `1.0.0`, Gravity Forms
  `2.10.5`, and the existing Constant Contact integration/exclusion plugins.
- The existing connector already targets the canonical Ask Magic Mike hostname
  with `/value` and `/widget/v1`. The site-wide floating launcher remains off.
- Gravity Form 5 has one active admin notification and no local BCC. Leave it
  enabled until an exact-form canonical forwarding test proves one Gravity entry,
  one Neon lead, and one canonical alert.
- The legacy WordPress lead store contains six historical records and reports
  four uncontacted. Do not bulk import, merge, suppress, or delete them without a
  reviewed identity/dedupe reconciliation.
- Canonical bridge `1.0.0` is installed and active. Its health page proves
  `Shadow only — no forwarding`; the initial installation showed no observed
  entries and no displayed secrets.
- Forwarding remains impossible until both Vercel `WORDPRESS_BRIDGE_SECRET` and
  hosting-level WordPress secret/enable configuration are supplied securely.

## Live re-audit — 2026-08-14

- The installed 1.0.0 bridge has observed entries from forms 6 and 7 in shadow
  mode, proving the post-save hook is active without forwarding PII.
- Authenticated editor inspection reconfirmed the exact field IDs used by all
  seven mappings. No form has a Gravity Forms Consent field.
- Every form still shows one active legacy admin notification and no local BCC.
- Version 1.1.0 adds a mandatory per-form activation allowlist. Upgrade to 1.1.0
  before forwarding so one controlled form can be proved without enabling all
  seven forms simultaneously.
