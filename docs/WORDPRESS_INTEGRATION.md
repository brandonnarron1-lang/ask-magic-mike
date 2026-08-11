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
`output/release/ask-magic-mike-canonical-bridge-1.0.0.zip`. It is disabled unless
`AMM_CANONICAL_BRIDGE_ENABLED === true` is defined in `wp-config.php`. The shared
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
PHP CLI is not installed in the local workstation, so the plugin has static
contract coverage but still requires `php -l` on WordPress staging before upload.
