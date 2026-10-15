# Ask Magic Mike Connector

## Optional seller-options link support — 1.2.0

Existing shortcodes, saved options, CSS, JavaScript, embeds and floating CTA
defaults are unchanged. The CTA shortcode alone accepts `seller_option` with
one of `as-is`, `compare`, or `guidance`, and only on `/sell` or
`/we-buy-houses`. Missing/unknown values are omitted, never forwarded as arbitrary
query data. The selection is a request preference, not consent, an offer,
eligibility or independently verified property information.

Example (publish only after application support is accepted and the individual
page has a fresh authenticated backup/rollback and visible insertion point):

```text
[ask_magic_mike_cta route="/sell" seller_option="compare" source="seller_page_cta" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_we_buy_homes" headline="Explore your selling options." text="Compare listing with an as-is option. Request a property review with Our Town Properties." button_text="Review selling options"]
```

The existing bridge is a separate component. This connector never forwards a
form or sends email. Do not enable another Gravity Forms path. The packaged
1.1.0 artifact remains an exact connector recovery option; the actual installed
source/options must also be backed up before replacement. First roll back any
new placement that depends on this optional attribute. Never alter existing
Home Value/rental pages simply to match a version number.

`php tests/wordpress/connector-url-runtime.php` executes the real URL/shortcode
functions under narrow isolated WordPress stubs; it is not live WordPress,
Beaver, installation, page-render or delivery evidence. Hosted CI also runs
native PHP syntax lint. Installed versions and actual server PHP remain
authenticated operational evidence, not inferred from this package.

This directory source-controls the existing Our Town Properties Connector rather
than creating another lead backend. The plugin renders CTA/embed links only. It
does not store leads, send email or SMS, call the lead API, or contain secrets.

## Historical observed baseline — September 1, 2026

- Plugin: `ask-magic-mike-connector/ask-magic-mike-connector.php`
- Observed live version: `1.0.0`
- Captured: `2026-09-01T14:40:22Z`
- Source SHA-256:
  `2938f47cca5e667a5b65b39fecfd32bb492f7b8f579179ac2ad3105957095a8f`
- CSS SHA-256:
  `3b6e6291bc6bf7c8e754c2ea1ace936526921904f3eb9d61bc1e493c58dd043e`
- JavaScript SHA-256:
  `8c01ac0914bfec29435785ae6e5a5f9a9a2a96ba91c6843dcb449b3f6bb09290`

The exact live PHP baseline is retained as a non-executable `.source.txt`
rollback artifact. The candidate intentionally preserves the live CSS and
JavaScript byte-for-byte.

## Historical version 1.1.0 package

- Candidate PHP SHA-256:
  `700c78b77b24b0038078e45c6526908078dac46cf1a591b73dd0f13a6d840ec8`
- Install ZIP:
  `output/release/ask-magic-mike-connector-1.1.0.zip`
- Install ZIP SHA-256:
  `56934bdcc9a8685493609ffbe76938f7889ef24a01e69d5f73bd1720eed7d4fa`
- Rollback ZIP:
  `output/release/ask-magic-mike-connector-1.0.0-rollback.zip`
- Rollback ZIP SHA-256:
  `cd1d9171ff40ccc28740e5e59380bf373cacd4ebe5a853fdeabee45cc9d5d261`

Version 1.1.0 keeps every existing shortcode valid and adds optional,
per-instance `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`
attributes. Empty overrides fall back to the legacy `source`/`content`
attributes and saved global settings.

It also:

- defaults new installs to `https://www.askmagicmike.com`;
- retains the historical Vercel alias for saved-option compatibility;
- rejects non-HTTPS, credentialed, port-qualified, query-bearing, or unowned
  base URLs;
- accepts only relative route paths;
- sanitizes and caps public attribution dimensions;
- emits `data-amm-connector-version="1.1.0"` for public, non-sensitive
  readiness verification; and
- changes no lead, notification, form, database, or consent behavior.

The first reviewed shortcode candidate is:

```text
[ask_magic_mike_cta route="/home-value" source="home_value_page" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_home_value_page" button_text="Ask Magic Mike"]
```

Expected rendered destination:

```text
https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page
```

## Activation boundary

Building or reviewing this directory does not authorize a WordPress edit.
Before activation:

1. re-read the live plugin source and require the baseline SHA-256 above;
2. export the active plugin directory and relevant WordPress options;
3. verify the candidate archive and file hashes;
4. require native `php -l` on the exact candidate source;
5. obtain the exact plugin-upgrade approval gate;
6. replace only the Connector plugin files;
7. verify old shortcodes render the prior destinations;
8. verify the public connector-version marker; and
9. roll back immediately if layout, routes, links, or site health drift.

Updating page 3952 is a separate later action and requires its own fresh source
snapshot, exact shortcode precondition, preview, approval, publication, and
post-publication proof.

## Rollback

Restore the captured 1.0.0 PHP source and the unchanged CSS/JavaScript files,
then verify the plugin is active and the current public CTA hrefs match their
pre-upgrade values. Do not restore an old page revision as a plugin rollback.
