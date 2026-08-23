# Phase 9 WordPress owned-demand activation change set

Date: 2026-08-22

Mode: read-only public precondition generation

External mutation: none

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

Final read-only checks at 2026-08-22 21:27 America/New_York produced:

| Placement | Public page | WordPress page ID | Current public href | Proposed canonical href | Status |
| --- | --- | ---: | --- | --- | --- |
| Homepage Ask Magic Mike CTA | `https://www.ourtownproperties.com/` | 149 | `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget` | `https://www.askmagicmike.com/ask?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_homepage_ask_mike` | `legacy_match_ready` |
| Established home-value page CTA | `https://www.ourtownproperties.com/how-much-is-your-home-worth/` | 3952 | `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=home_value_page&utm_campaign=website_widget` | `https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page` | `legacy_match_ready` |
| We Buy Homes CTA | `https://www.ourtownproperties.com/we-buy-homes/` | 3631 | `https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=seller_page_cta&utm_campaign=website_widget` | `https://www.askmagicmike.com/sell?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_we_buy_homes` | `legacy_match_ready` |

All three public links currently preserve source, medium, and campaign, but
omit placement-level `utm_content` and all route to the generic legacy
`/value` destination. The proposed hrefs come directly from the existing
`resolveOwnedDemandPlacement` registry. They are not separately invented URLs.

The live manifest hashes at that observation were:

- homepage: `d744602ca060fa12bd4e9cfd811477ed1ae22db3414e265e63a2a4f57253600a`;
- home value: `27521753db7cf6bd1dae2943ab9547357416493058d817ba6d5992a1b81bdb99`;
- We Buy Homes: `d02ed7b91a345f357b768e8fb279b6da0f99c68d9a4dc9507414086f90b6584b`.

These hashes are evidence, not reusable write authority. A fresh manifest must
match immediately before any publication because the page modification time,
page ID, current href, proposed href, placement, and occurrence count are all
part of the precondition.

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
port, every redirect hop, content type, response status, response size, and a
20-second timeout. It fails closed for an unknown placement, duplicate href,
duplicate page record, missing target, page-ID drift, unsafe link, fetch error,
or already-canonical placement.

## First publication candidate

Only the homepage CTA is the recommended first action. It is the broadest
existing owned-traffic entry point, changes one href on one established page,
preserves all page content and current public brokerage contact details, and
routes general intent to the canonical `/ask` funnel with complete placement
attribution.

The other two manifests prove readiness but do not authorize a bulk edit. They
remain separate later decisions after homepage acceptance and initial demand
measurement.

## Publication procedure and rollback

Immediately before a future homepage edit:

1. download a fresh homepage manifest from the authenticated Distribution
   Command;
2. require `status=legacy_match_ready`, page ID 149, one current href
   occurrence, a non-null rollback href, and an unchanged SHA-256 precondition;
3. create and verify a recoverable WordPress page revision or backup;
4. receive the exact homepage publication approval below;
5. replace only that one href—no page, form, menu, theme, plugin, phone number,
   or copy replacement;
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
- The later homepage publication requires this exact separate phrase:

`APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`

That phrase authorizes only the one reviewed homepage href replacement after a
fresh matching manifest and verified revision. It does not authorize another
page, form, menu, widget, cache purge, lead submission, email/SMS/Push send,
social/GBP publication, database migration, DNS change, spend, deletion, or
NellySelly action.

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
