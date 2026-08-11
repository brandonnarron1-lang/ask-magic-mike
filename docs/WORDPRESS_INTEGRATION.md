# WordPress Integration

## Current evidence

`www.ourtownproperties.com` is the authoritative WordPress/SEO site. Public HTML
shows Beaver Builder, Gravity Forms, FlexMLS/IDX, `ask-magic-mike-connector`, and
`ask-magic-mike` plugin assets. Existing pages, titles, listings, agents, rentals,
and IDX behavior are preserved.

## Bridge contract

The WordPress layer may render a tracked CTA, iframe, or versioned loader. It must
forward to the canonical app/API, preserve page URL/referrer/UTMs/click IDs and
placement, and never become a competing source of truth. If Gravity Forms remains
active, its entry is saved first and a signed, idempotent server-to-server forward
reconciles to the canonical lead record. Duplicate Gravity Forms notifications are
disabled only after an owner-approved test proves the canonical alert works.

The August 10/v6 package is a reusable bridge reference. Its local `amm_leads`
table, plugin notifications, and webhook must not be activated alongside the
canonical outbox.

## Safe activation sequence

1. Back up files/database through the existing WordPress/Regency process.
2. Identify exact page IDs, form IDs, notification rules, and current destinations.
3. Add one reversible draft/page-builder CTA or iframe in staging/draft.
4. Test attribution and fallback; verify entry-before-email behavior.
5. Obtain approval, publish only the named page/widget placement, and monitor.

No WP Admin session, plugin activation, form replacement, cache purge, or live
publication was performed in this task.
