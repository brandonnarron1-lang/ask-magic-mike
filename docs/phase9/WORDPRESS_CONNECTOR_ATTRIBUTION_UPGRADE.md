# Phase 9 WordPress Connector attribution upgrade

Date: 2026-09-01

Mode: offline candidate plus read-only public verification

External mutation: none

## Decision

Upgrade the existing `Ask Magic Mike Connector`; do not add another plugin,
form, lead database, notification engine, widget host, or publisher.

The active 1.0.0 shortcode uses:

- global `utm_source`;
- the shortcode `source` value as `utm_medium`;
- global `utm_campaign`; and
- optional shortcode `content` as `utm_content`.

It cannot render the reviewed owned-demand convention where the placement
identifier remains `source="home_value_page"` while `utm_medium` is the
separate stable value `owned_media`. Editing page 3952 to the proposed URL
without first closing that capability gap would either preserve stale
attribution or replace the existing shortcode with an unrelated literal-link
implementation.

## Exact live baseline

Authenticated, read-only plugin inspection at `2026-09-01T14:40:22Z`
identified:

- plugin:
  `ask-magic-mike-connector/ask-magic-mike-connector.php`;
- version: `1.0.0`;
- PHP source SHA-256:
  `2938f47cca5e667a5b65b39fecfd32bb492f7b8f579179ac2ad3105957095a8f`;
- CSS SHA-256:
  `3b6e6291bc6bf7c8e754c2ea1ace936526921904f3eb9d61bc1e493c58dd043e`;
- JavaScript SHA-256:
  `8c01ac0914bfec29435785ae6e5a5f9a9a2a96ba91c6843dcb449b3f6bb09290`.

The canonical repository now retains the exact PHP baseline as a
non-executable `.source.txt` rollback asset and the two public assets
byte-for-byte. No live plugin file or option was changed.

## Read-only public observation

At `2026-09-01T15:16:33Z`, all three reviewed pages returned HTTP 200:

| Placement | Ask Magic Mike links | Connector version markers | Current state |
| --- | ---: | ---: | --- |
| Homepage page 149 | 1 | 0 | hidden by known public CSS |
| Home Value page 3952 | 1 | 0 | visible legacy link; plugin capability unproven |
| We Buy Homes page 3631 | 1 | 0 | visible legacy link; plugin capability unproven |

The visible pages still render the three-parameter legacy `/value` links.
Neither page exposes a public Connector version marker. The v3 readiness
candidate therefore returns `connector_upgrade_required` for Home Value and
We Buy Homes and continues returning `hidden_target` for the homepage.

## 1.1.0 candidate

The source-controlled candidate:

- preserves both shortcode names and all legacy attributes;
- leaves empty new attributes on the old fallback path;
- adds optional per-instance `utm_source`, `utm_medium`, `utm_campaign`,
  and `utm_content`;
- sanitizes each attribution value and caps it at 120 characters;
- accepts only exact owned HTTPS browser destinations;
- accepts only relative route paths;
- defaults new installs to the canonical `www` hostname and
  `/home-value`, while preserving saved live options;
- leaves the live CSS and JavaScript unchanged;
- emits a non-sensitive
  `data-amm-connector-version="1.1.0"` readiness marker; and
- contains no lead API call, email, SMS, database, secret, or form-forwarding
  subsystem.

Candidate and package identity:

- PHP SHA-256:
  `700c78b77b24b0038078e45c6526908078dac46cf1a591b73dd0f13a6d840ec8`;
- install ZIP:
  `output/release/ask-magic-mike-connector-1.1.0.zip`;
- install ZIP SHA-256:
  `56934bdcc9a8685493609ffbe76938f7889ef24a01e69d5f73bd1720eed7d4fa`;
- rollback ZIP:
  `output/release/ask-magic-mike-connector-1.0.0-rollback.zip`; and
- rollback ZIP SHA-256:
  `cd1d9171ff40ccc28740e5e59380bf373cacd4ebe5a853fdeabee45cc9d5d261`.

Both deterministic ZIPs contain only the Connector PHP file and the two
byte-preserved public assets. Archive extraction hashes match the source tree.
Local `php-parser` 3.2.5 accepts the candidate. Native `php -l` is deliberately
mandatory in the hosted release gate and again on the target host before any
WordPress replacement; the current local machine has no native PHP executable.

The reviewed page-3952 shortcode is:

```text
[ask_magic_mike_cta route="/home-value" source="home_value_page" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_home_value_page" button_text="Ask Magic Mike"]
```

Expected destination:

```text
https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page
```

## Application boundary

`amm.wordpress_activation_change_set.v3` adds:

- `requiredConnectorVersion`;
- `observedConnectorVersions`;
- `connectorVersionReady`;
- `proposedShortcode`;
- `pagePublicationApprovalGate`; and
- `connector_upgrade_required`.

The public parser trusts the version marker only on the existing
`.amm-cta`, `.amm-embed`, or `.amm-floating-cta` surfaces. A random
attribute elsewhere on the page cannot satisfy readiness. Connector version,
visibility, page identity, current/proposed hrefs, and occurrence counts all
enter the deterministic precondition hash.

When any WordPress readiness manifests are supplied to the owned-demand loop,
every other WordPress placement without its own bounded live manifest now
fails closed as `readiness_unavailable`; it cannot become a fallback
recommendation merely because a reviewed placement is held.

## Two separate future gates

### Gate 1 — plugin capability

`APPROVE PHASE 9 WORDPRESS CONNECTOR 1.1.0 PLUGIN UPGRADE`

This future gate may authorize only replacement of the reviewed Connector
plugin files after an exact baseline recheck, plugin/options backup, candidate
archive hash verification, native PHP lint, and rollback rehearsal. It must not authorize a
page edit, cache purge, form submission, lead, notification, database, DNS,
social, spend, deletion, or NellySelly action.

### Gate 2 — page 3952 placement

`APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION`

This later gate is not requestable until the public page proves Connector
1.1.0, old shortcode destinations remain unchanged, a fresh v3 manifest
returns `legacy_match_ready`, and the exact current page source and postmeta
have a verified rollback. It authorizes only the one reviewed shortcode
replacement on page 3952.

## Rollback

Plugin rollback restores the exact 1.0.0 PHP baseline and the unchanged
CSS/JavaScript, then verifies prior hrefs and layout. Page rollback is separate
and restores the exact source/postmeta snapshot for page 3952. An old page
revision is not a substitute for a plugin backup, and a plugin rollback is not
a substitute for a page-source rollback.
