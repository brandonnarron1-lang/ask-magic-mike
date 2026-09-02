# Phase 9 WordPress owned-demand activation change set

Date: 2026-09-01

Mode: read-only public precondition generation

External mutation: none

## 2026-09-01 seller-page decision correction

Authenticated page-3631 source review found that the earlier proposed
shortcode would have removed its existing headline, explanatory text, and
button label. The proposal now preserves that copy byte-for-byte while adding
the existing `/sell` and owned-demand attribution values.

Page 3631 is not a current publication candidate. The already-established
seller-intent packet still requires an owner/SEO/BIC canonical-page,
capture-owner, duplicate-page, and placement-key decision. Its corrected
manifest therefore returns `seller_intent_decision_required`,
`publicationBlocked=true`, `approvalGate=null`, and
`activationEligible=false` after technical Connector readiness. Its offline
source verifier also requires the approved decision and BIC copy-review
digests. See
`WORDPRESS_PAGE3631_SOURCE_CUTOVER_READINESS_2026-09-01.md`.

## 2026-09-01 Connector capability correction

Authenticated source inspection proved that the active Connector 1.0.0 plugin
stores page 3952 as a shortcode and supports only global source/campaign plus
legacy `source`-as-medium behavior. It cannot generate the reviewed
per-placement `owned_media` link while retaining the placement identifier.
The public pages also expose no Connector version marker.

The v3 candidate therefore supersedes the v2 `legacy_match_ready` page-edit
procedure below until plugin capability is proven. It returns:

- homepage page 149: `hidden_target`;
- Home Value page 3952: `connector_upgrade_required`;
- We Buy Homes page 3631: `connector_upgrade_required`.

The first requestable future gate is the independently backed-up Connector
upgrade:

`APPROVE PHASE 9 WORDPRESS CONNECTOR 1.1.0 PLUGIN UPGRADE`

The Home Value page-publication phrase is not requestable until the public
1.1.0 marker is present, old shortcodes retain their prior links, and a fresh
v3 manifest returns `legacy_match_ready`. See
`WORDPRESS_CONNECTOR_ATTRIBUTION_UPGRADE.md`.

## 2026-08-29 visibility correction

The historical structural audit below correctly identified the homepage href,
but did not prove that its enclosing component was visible. Fresh browser and
source inspection found public CSS suppressing `.amm-cta` and
`.amm-cta--dark` with `display:none !important`. The corrected homepage
manifest now reports `hidden_target`, `targetVisibility=hidden_by_known_css`,
one hidden target, two hidden selectors, and
`publicationBlocked=true`. The current privacy-safe precondition is
`60614f9ce7f7e7fe165a6c3cf0d142a6669faf497fee4f94386aff34827d0638`.

The homepage href-only publication procedure and approval phrase in this
historical packet are superseded until a visible placement, desktop/mobile
acceptance, and page-149 rollback are reviewed. See
`WORDPRESS_HOMEPAGE_VISIBILITY_TRUTH.md`.

## Decision

Do not build another funnel, form, lead store, dashboard, publisher, or analytics
system. Reuse the existing Our Town Properties pages, canonical Ask Magic Mike
routes, owned-demand UTM resolver, protected Distribution Command, Neon lead
backend, and publication-proof ledger.

The immediate constraint is eligible owned demand, not another routing or
scoring feature. Read-only Vercel Production logs showed no public
`POST /api/leads` activity in the reviewed 24-hour window, while health, SLA,
and first-live monitors returned HTTP 200 without server errors. The next safe
step is therefore one precise, measurable CTA activation on an existing
brokerage page.

This change adds a protected JSON readiness manifest for three already-built
WordPress placements. It inspects only the live public page and the public
WordPress page index. It does not log into WordPress, write a post, submit a
form, send a message, change DNS, purge a cache, or touch Production data.

## Current public evidence

Fresh read-only manifest generation and rendered desktop/mobile checks at
2026-09-01 10:08 America/New_York produced:

| Placement | Public page | WordPress page ID | Current public href | Proposed canonical href | Status |
| --- | --- | ---: | --- | --- | --- |
| Homepage Ask Magic Mike CTA | `https://www.ourtownproperties.com/` | 149 | `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget` | `https://www.askmagicmike.com/ask?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_homepage_ask_mike` | `hidden_target` |
| Established home-value page CTA | `https://www.ourtownproperties.com/how-much-is-your-home-worth/` | 3952 | `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=home_value_page&utm_campaign=website_widget` | `https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page` | `legacy_match_ready` |
| We Buy Homes CTA | `https://www.ourtownproperties.com/we-buy-homes/` | 3631 | `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=seller_page_cta&utm_campaign=website_widget` | withheld pending seller-intent decision | `seller_intent_decision_required` |

All three public links currently preserve source, medium, and campaign, but
omit placement-level `utm_content` and all route to the generic legacy
`/value` destination. The proposed hrefs come directly from the existing
`resolveOwnedDemandPlacement` registry. They are not separately invented URLs.
The homepage target remains inside the known suppressed CTA container. The
other two targets each render once, are visible at 1440-pixel desktop and
390-pixel mobile widths, and introduce no horizontal overflow.

The live manifest hashes at that observation were:

- homepage: `60614f9ce7f7e7fe165a6c3cf0d142a6669faf497fee4f94386aff34827d0638`;
- home value: `1553a34563b872c41fcf3546d714802ffecf7104afd5b5eeae903084033b46cc`;
- We Buy Homes: `890e4c808e227cf616049b293aefbe18c01b824e2b670b9ebe43f409c95d6c73`.

These hashes are evidence, not reusable write authority. A fresh manifest must
match immediately before any publication because the status, page modification
time, page ID, current href, proposed href, placement, matching-link count,
total Ask Magic Mike link count, and rejected lookalike/insecure-link count are
all part of the precondition.

## Implemented boundary

The protected endpoint is:

`GET /api/admin/distribution/wordpress-change-set/{placementKey}`

It requires Lead Center `report:view` permission and accepts only:

- `wordpress_homepage_ask_mike`;
- `wordpress_home_value`; and
- `wordpress_we_buy_homes`.

Every response is private, `no-store`, same-origin, no-referrer, non-indexable,
and downloaded as JSON. The manifest contains only structural evidence:

- exact source page and reviewed page ID;
- current and proposed href;
- rollback href;
- page modification timestamp;
- matching occurrence counts;
- deterministic SHA-256 precondition;
- status, blockers, ordered verification steps, and exact approval phrase.

Even a ready manifest always emits `publicationAuthorized=false` and
`approvalRequired=true`; readiness can never grant its own publication gate.

It does not retain raw HTML, page copy, telephone numbers, form values,
credentials, cookies, tokens, database data, or lead PII.

The loader validates HTTPS, exact hostnames, no credentials, no nonstandard
port, every redirect hop, content type, response status, and a 3 MB streaming
response limit with a 20-second timeout. It requires an explicit published
WordPress index status and fails closed for an unknown placement, duplicate href,
duplicate page record, missing target, page-ID drift, unsafe link, fetch error,
or already-canonical placement.

## Stack and interface acceptance

This candidate is deliberately stacked after PR #197 and PR #195 instead of
re-implementing either feature against `main`. Its pre-stack head is preserved
at `rescue/amm-pr198-pre-pr197-stack-refresh-20260822-2247`. The application
merge was conflict-free; only cumulative release-history evidence needed
reconciliation.

The named brokerage placement card spans the existing two-column command grid
at desktop widths so its exact links and three readiness controls use the
available workspace. The established single-column mobile presentation is
unchanged. Counted 1440×1000 and 390×844 browser sessions used synthetic local
Basic Auth, no database configuration, disabled notification providers, and
pre-navigation interception of every known application write endpoint. They
recorded no application POST, console finding, overflow, or framework overlay.

## Historical first page candidate — currently held

The homepage was the historical recommended first action based on structural
href evidence. The 2026-08-29 visibility correction supersedes that
recommendation while the component remains hidden. An href-only homepage edit
remains prohibited.

The established Home Value page remains the first reviewed page candidate:
its page ID is 3952, its one exact legacy CTA is visible on desktop and mobile,
its rollback href is present, and its current manifest is
`connector_upgrade_required` under the corrected v3 contract. It cannot
become page-publication-ready until the reviewed Connector 1.1.0 capability is
installed and publicly proven. This ordering reuses the existing deterministic
owned-demand placement priority; it does not infer demand or conversion from
readiness.

The We Buy Homes manifest is held by the existing seller-intent and BIC
decision boundary. It is not independently ready and must not be combined with
Home Value in one approval or bulk edit. Homepage visibility restoration also
remains a separate plugin-file decision.

## Publication procedure and rollback

The following procedure applies only after the separate Connector upgrade has
passed and a fresh v3 manifest proves `connectorVersionReady=true`. It then
applies only to the one Home Value CTA candidate.
Immediately before any future edit:

1. download a fresh `wordpress_home_value` manifest from the authenticated
   Distribution Command;
2. require `status=legacy_match_ready`, `targetVisibility=visible_candidate`,
   page ID 3952, one current href occurrence, a non-null rollback href, and an
   unchanged SHA-256 precondition;
3. run `amm:wordpress:page3952-readiness` against the freshly captured page
   source and require the expected source digest, exactly one reviewed current
   shortcode, Connector 1.1.0, a verified postmeta-backup SHA-256, and a
   revision whose source SHA-256 matches the current page source;
4. receive the exact Home Value publication approval below;
5. replace only the exact current shortcode identified by the contract—no
   page-wide rewrite and no page, form, menu, theme, plugin, phone number, or
   copy replacement;
6. publish and verify public status, destination, UTM values, canonical tags,
   desktop/mobile layout, keyboard behavior, and analytics without submitting
   a lead; and
7. if any acceptance check fails, restore `rollbackHref` from the verified
   revision and recheck the public page.

WordPress documents that revisions preserve saved or published versions and
can restore a prior version. The REST page-revisions reference is also useful
for evidence, but no REST write endpoint is implemented here:

- [WordPress revisions](https://wordpress.org/documentation/article/revisions/)
- [WordPress page revisions API](https://developer.wordpress.org/rest-api/reference/page-revisions/)
- [WordPress REST API reference](https://developer.wordpress.org/rest-api/reference/)

Google Analytics documents `utm_content` as the manual content dimension used
to distinguish campaign content. The proposed URLs use the existing canonical
UTM builder and one stable campaign vocabulary:

- [GA4 traffic-source dimensions and manual tagging](https://support.google.com/analytics/answer/11242870?hl=en_U)
- [Google campaign URL builder guidance](https://support.google.com/analytics/answer/10917952?hl=en-uk)

## Separate approval gates

Application release and WordPress publication are different actions.

- The application PR may be reviewed, merged, and deployed without changing
  WordPress.
- The Connector 1.1.0 upgrade is a separate, earlier external action requiring
  this exact phrase:

`APPROVE PHASE 9 WORDPRESS CONNECTOR 1.1.0 PLUGIN UPGRADE`

That phrase authorizes no page save or publication.
- The first visible Home Value link publication requires this exact separate
  phrase only after the Connector postflight is green:

`APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION`

That phrase authorizes only the one reviewed page-3952 href replacement after
a fresh matching manifest and verified revision. It does not authorize the
homepage, We Buy Homes, another page, form, menu, widget, cache purge, lead
submission, email/SMS/Push send, social/GBP publication, database migration,
DNS change, spend, deletion, or NellySelly action.

- The hidden homepage requires a separately reviewed visibility restoration
  and its own later phrase:

`APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`

That homepage phrase is not currently requestable while the manifest remains
`hidden_target`; it cannot be used for an href-only edit.

## Non-goals

- no sitewide widget injection;
- no Gravity Forms allowlist expansion;
- no duplicate WordPress lead database or email notification engine;
- no page redesign or AI-generated replacement creative;
- no public phone-number change;
- no Search Console, DNS, Vercel-domain, SMTP, or provider change;
- no synthetic lead presented as genuine demand; and
- no inference that publication or a lead occurred merely because a manifest
  is ready.
