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

### Form 7 consent-contract candidate — 2026-09-01

Bridge 1.3.0 is the current source candidate; live WordPress remains 1.1.0 and
Form 7 remains outside the allowlist. Version 1.3.0 adds no new plugin or store.
It requires `AMM_CANONICAL_BRIDGE_CONSENT_CONTRACTS` (or JSON
`WORDPRESS_BRIDGE_CONSENT_CONTRACTS`) before Form 7 can forward. Each approved
channel pins the actual native Gravity Forms Consent field ID, required state,
version, and normalized displayed-copy SHA-256. Wrong type, hidden/admin-only
state, required-state drift, text drift, or absent required consent records a
safe `consent_contract_blocked` status and performs no network request. The
release-owned Form 7 channel set is exactly `email`; configuration cannot add
call or SMS permission without another reviewed code release.

The application API accepts source-specific copy only after the existing HMAC
bridge verification. Ordinary public forms always store the server-owned Ask
Magic Mike version/text, and malformed signed evidence denies email, call, and
SMS. It additionally requires the signed entry header, normalized
`gf:{form}:{entry}` idempotency key, and `gravity_forms_{form}` consent source
to identify the same submission; mismatch fails before persistence. It stores
the normalized Gravity entry creation time as the consent timestamp and denies
all channels if a granted signed submission lacks a valid source timestamp.
The plugin accepts only `https://www.askmagicmike.com/api/leads` as its outbound
lead endpoint, so a drifted URL cannot send brokerage lead PII to another host
or application. Form 7's
live field, notification, retention, privacy, Constant Contact, and allowlist
readiness is executable via:

```bash
pnpm run amm:wordpress:form7-readiness -- --allow-hold
```

The current snapshot must remain `HOLD`; see
`phase9/WORDPRESS_FORM7_CONSENT_CUTOVER_READINESS_2026-09-01.md`. The reviewed
1.3.0 archive is
`output/release/ask-magic-mike-canonical-bridge-1.3.0.zip`. Do not install,
configure, allowlist Form 7, alter privacy settings, or disable its native
notification without the named production action approval and rollback backup.

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

## Controlled Form 3 activation — 2026-08-14

- Bridge 1.1.0 is active with matching HMAC configuration and only Form 3
  allowlisted. Forms 1, 2, and 4–7 remain blocked.
- Form 3 entry 1549 forwarded on attempt 1 to canonical lead
  `70f63f35-2478-4738-b84c-bc1a89b8482c`.
- One `[TEST]` internal alert reached Mike and the hidden audit inbox. Consumer
  email and carrier SMS remained suppressed.
- The exact duplicate Form 3 `Admin Notification` is now Inactive. No other form
  notification was changed.
- PR #139 corrected WordPress-style idempotency on Neon; the production replay
  returns the original lead and creates no second canonical email.
- Further forms remain held until the timestamp-bounded pre-fix QA row is audited
  in the correct Neon owner session.

## Historical local-store dry-run

The existing `pnpm reconcile-wordpress-leads` path now supports an optional
Production-attested `--legacy-csv` mode. It parses a separately approved local
`amm_leads` export in memory, ignores names/messages/notes, compares only normalized
email/phone identities with canonical candidates, uses property address only as
corroboration, and emits a PII-free decision packet. The database transaction is
read-only and the command has no import, merge, suppression, deletion, assignment,
or message capability. See `WORDPRESS_LEGACY_LEAD_RECONCILIATION.md`.
