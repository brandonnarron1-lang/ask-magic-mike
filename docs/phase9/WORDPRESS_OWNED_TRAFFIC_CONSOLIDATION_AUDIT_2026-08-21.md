# WordPress owned-traffic consolidation audit — 2026-08-21

## Executive decision

Do not build another form system and do not widen the Gravity Forms bridge globally.
The production-safe reuse path is:

1. keep `www.ourtownproperties.com` as the brokerage, SEO, listing, agent, and rental authority;
2. keep Gravity Form 3 as the only proven signed server-to-server forward;
3. use the existing AskMagicMike.com routes and isolated embed for new named placements;
4. keep the legacy WordPress lead store temporarily for historical reconciliation, but do not expand it; and
5. retire duplicate pages, native WordPress AMM capture, and duplicate WordPress email only after page-specific evidence and approval.

No page, form, notification, plugin, redirect, database row, DNS record, email, SMS, or production deployment was changed during this audit.

## Evidence boundary

The public audit was rerun on 2026-08-21 using:

```bash
WORDPRESS_BRIDGE_FORM_IDS=3 node scripts/audit-wordpress-form-placements.mjs
curl -I https://www.askmagicmike.com/value
curl -I https://www.askmagicmike.com/home-value
```

The audit extracts URLs, canonicals, robots state, Gravity Forms IDs, public plugin asset names, canonical app links, UTM completeness, native AMM form field names, embed settings, and public `tel:` targets. It deliberately does not extract WordPress nonces, form values, lead data, cookies, credentials, or private configuration.

Authenticated prior evidence in `docs/WORDPRESS_INTEGRATION.md` and
`docs/FORM3_PRODUCTION_RECONCILIATION.md` remains authoritative for private state.

## Existing systems and disposition

| Existing subsystem | Verified behavior | Disposition |
|---|---|---|
| Gravity Forms | Stores entries before `gform_after_submission`; forms 1–7 are explicitly mapped | Retain |
| Canonical bridge 1.1.0 | HMAC, timestamp, idempotency, bounded retry, reconciliation metadata; no `wp_mail()` | Canonical WordPress bridge |
| Gravity Form 3 | Controlled QA already proved one Gravity entry, one Neon lead, and one canonical alert | Keep enabled; do not repeat QA without a reason |
| Gravity Form 7 | Rendered across most indexed pages, including listing, agent, rental, recruiting, privacy, and thank-you surfaces | Do not allowlist sitewide |
| Legacy `ask-magic-mike` plugin | Native browser form posts to the WordPress REST endpoint; historical local lead table and WordPress email exist | Superseded capture path; preserve history, stop expanding |
| Lead Ops/Social Share 2.10.0 | Adds attribution fields to the legacy native form payload; does not change its endpoint or database | Transitional enrichment only |
| `amm-loader.js` iframe | Sends visitors to the canonical AskMagicMike.com intake and preserves parent-page attribution | Preferred reusable embed |
| Neon production | Canonical lead, attribution, consent, scoring, routing, notification, audit, and Lead Center data | Canonical database |

The legacy native form is not equivalent to the canonical bridge: its public JavaScript has no deterministic idempotency key, no browser-visible durable retry contract, and no exact consent control. Its attribution helper explicitly persists into the existing WordPress payload rather than changing the backend.

## Live surface findings

### Indexed intent-page overlap

All of these URLs were present in the WordPress page sitemap and self-canonical/indexable at the time of inspection:

| Intent | Older or established page | Newer overlapping pages | Publication state |
|---|---|---|---|
| Seller value | `/how-much-is-your-home-worth/` (2023; Gravity Form 3) | `/home-value/`, `/home-evaluation/` (2026) | Review before any redirect/noindex |
| Direct-purchase options | `/we-buy-homes/` (2023) | `/we-buy-houses/` (2026) | Review before any redirect/noindex |
| Ask Mike | `/ask-mike/` (2026-06-06) | `/ask-magic-mike/` (2026-06-18; canonical iframe) | Prefer functionality, then confirm search evidence |

This is a consolidation candidate, not permission to redirect. Search Console landing-page data, backlinks, indexed queries, Regency constraints, a file/database backup, and a redirect rollback map are required first.

### Capture topology

- Form 3 is the only canonical-forwarded Gravity Form.
- Form 7 appears on most public pages and is not in the proven allowlist.
- `/home-value/` exposes a separate native AMM form with address, email, and timeline fields. Its text says Our Town Properties may contact the submitter, but there is no explicit consent control and the canonical consent/version contract is not captured by that browser form.
- `/ask-magic-mike/` already contains the isolated canonical iframe loader, but the embed has source, medium, and campaign only; it needs a placement-specific `utm_content` before publication QA.
- Existing direct AskMagicMike.com links omit `utm_content`, preventing exact placement comparison in the Growth ledger.

### Mobile visual QA

Chromium screenshots at a 390 × 844 viewport confirmed that the site remains
usable and the existing black-and-gold Mike creative is worth preserving. They
also confirmed consumer-visible duplication:

- `/home-value/` shows the polished legacy native home-value form and later the
  global Form 7 property-alert form;
- `/ask-magic-mike/` shows the canonical AskMagicMike.com iframe and later the
  same global Form 7; and
- the homepage's long mobile path culminates in Form 7 without placement-specific
  consent or canonical forwarding.

The audit now reports `multiple_capture_systems_on_same_page` so this condition
can be checked after each page-specific change. The remediation is to preserve
the approved visual sections while reducing each intent page to one durable
capture path.

### Public phone preservation

The audited pages expose three intentional-looking public `tel:` targets: the
sitewide mobile header uses `252-243-7700`, a Raleigh Road Parkway callout uses
`252-243-7867`, and Debbie Reason's profile lists `252-230-0282`. The current
labels and numbers remain unchanged. Do not introduce `252-245-4337` into new
assets until the owner verifies the intended voice line and page labels.

## No-redo activation matrix

The Growth command center now supplies this channel as `ourtown_wordpress` with
source `ourtownproperties`, medium `owned_media`, campaign
`amm_owned_demand_2026`, and exact offer-specific content values.

| Existing placement | Canonical destination | `utm_content` | Reuse action |
|---|---|---|---|
| Homepage Ask Magic Mike | `/ask` | `wordpress_homepage_ask_mike` | Replace only the named CTA/link after backup |
| Established home-value page | `/home-value` | `wordpress_home_value_page` | Keep Form 3; update the direct AMM next-step link only |
| We Buy Homes | `/sell` | `wordpress_we_buy_homes` | Preserve conditional, human-reviewed language |
| Mike agent page | `/ask` | `wordpress_mike_agent_page` | Preserve the already-live source-tagged CTA through `/ask-mike/`; do not add a duplicate or rewrite attribution without a separate exact-source packet |
| Featured/listing surfaces | `/buy` | `wordpress_listing_buyer` | Use approved listing/agent identifiers only when verified |
| Available Rental Listings, page 226 | `/rent` | `wordpress_rental_to_homeownership` | Prepare one additive readiness-review CTA only after authenticated raw source, backup, insertion-anchor, and rollback proof; no financing or eligibility promise |
| Short Term Home Rentals, page 4120 / Form 6 | — | — | Excluded from the rental CTA candidate until explicit requested-response consent is approved and stored |
| Ask Magic Mike page iframe | `/embed/ask` through existing loader | `wordpress_ask_magic_mike_embed` | Add `data-utm-content`; do not add another form |

Exact generated URLs and copy buttons are available in the authenticated
`/admin/distribution` WordPress channel packet. They use only the canonical
AskMagicMike.com hostname, `utm_source=ourtownproperties`,
`utm_medium=owned_media`, and `utm_campaign=amm_owned_demand_2026`. This keeps
link construction, normalization, measurement, publication proof, and copy
controls in one existing operator surface.

## Recommended gated sequence

1. Capture a WordPress file/database backup and the exact page-builder revisions for the first named page.
2. Review Search Console and Regency constraints before choosing canonical redirects for overlapping pages.
3. Activate one homepage or home-value tracked CTA using the generated WordPress channel URL.
4. Verify destination, mobile layout, keyboard behavior, analytics, and source/medium/campaign/content without submitting a lead.
5. After separate approval, submit one controlled QA lead only if the changed surface modifies capture behavior; a link-only change does not justify another email.
6. Monitor the canonical Growth ledger for exact placement attribution.
7. Expand one named placement at a time.
8. Disable legacy native capture and its WordPress email only after no public page depends on it and historical local records are reconciled.

## Explicit stop gates

Separate approval remains required before:

- publishing or replacing any WordPress page, form, widget, menu, or CTA;
- changing a Gravity Forms notification or canonical bridge allowlist;
- redirecting or noindexing an indexed page;
- deactivating either legacy plugin;
- sending a QA email/SMS or consumer acknowledgment; or
- importing, merging, suppressing, or deleting historical WordPress lead data.

Rollback for the first activation is page-specific: restore the captured Beaver Builder revision or remove the one named CTA/embed, then verify cache-independent public HTML. The bridge rollback remains `AMM_CANONICAL_BRIDGE_ENABLED=false` or removal of only the affected form ID.
