# Phase 9 WordPress rental placement readiness

Date: 2026-09-01

Mode: read-only public precondition; no WordPress mutation

## Reuse decision

The rental placement must reuse the existing system:

- Our Town Properties remains the brokerage and SEO surface;
- the existing Connector shortcode remains the visual/link renderer;
- `/rent` remains the canonical Ask Magic Mike renter-readiness funnel;
- `wordpress_rental_to_homeownership` remains the canonical owned-demand
  placement key and `utm_content` value;
- the existing protected Distribution Command manifest route remains the
  operator surface; and
- canonical Neon capture, scoring, routing, audit, and notification services
  remain unchanged.

No new form, plugin, lead store, queue, CRM, notification engine, analytics
store, or parallel WordPress admin is introduced.

## Fresh public evidence

Read-only WordPress REST inspection returned:

| Surface | Page ID | `modified_gmt` | Direct Ask Magic Mike placement | Decision |
| --- | ---: | --- | --- | --- |
| Mike Eatmon profile | 597 | `2026-07-22T15:13:14` | Live source-tagged CTA through `/ask-mike/` | Preserve; do not add or replace another CTA |
| Available Rental Listings | 226 | `2025-06-16T19:09:52` | None | Selected additive-readiness page |
| Short Term Home Rentals | 4120 | `2025-11-26T21:32:57` | None | Excluded from this candidate |

Page 597 currently links to
`https://www.ourtownproperties.com/ask-mike/?utm_source=ourtownproperties&utm_medium=agent_profile_cta&utm_campaign=website_widget`.
That proves Mike's agent-page path is already live. It is not permission to
rewrite its attribution or duplicate its CTA.

Page 4120 contains the existing Short Term Home Rentals workflow. Authenticated
Gravity Forms evidence classifies Form 6 as blocked because it has required
contact fields and no explicit requested-response consent choice. This
candidate therefore excludes page 4120 and does not alter, bridge, suppress,
or duplicate Form 6.

## Prepared rental candidate

The existing owned-demand registry resolves the proposed destination to:

```text
https://www.askmagicmike.com/rent?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_rental_to_homeownership
```

The existing Connector can render the reviewed copy through:

```text
[ask_magic_mike_cta route="/rent" source="rental_to_homeownership" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_rental_to_homeownership" headline="Renting now and planning your next move?" text="Ask Magic Mike for a broker-reviewed rental-to-homeownership readiness conversation. No financing or eligibility decision is promised." button="Review My Next Steps"]
```

The copy makes no financing, eligibility, inventory, value, offer, response-time,
or protected-class claim. It invites a human-reviewed readiness conversation.

## Fail-closed manifest contract

`amm.wordpress_activation_change_set.v4` adds:

- `changeMode=add_new_shortcode`;
- `status=authenticated_source_required` while no exact CTA exists;
- the page-4120/Form-6 `scopeExclusions` record;
- the mutation mode and exclusions in the deterministic precondition hash; and
- a future page-publication phrase that is disclosed but not issued as an
  active `approvalGate`.

The current rental manifest must return:

- `publicationBlocked=true`;
- `publicationAuthorized=false`;
- `approvalRequired=false`;
- `approvalGate=null`;
- `currentHref=null` and `rollbackHref=null`;
- `mutationPerformed=false`; and
- `containsRawPageHtml=false`.

Public rendered HTML can prove page identity and the absence of the exact
placement. It cannot prove the Beaver Builder/editor insertion point, raw
source, page revision, backup, source hash, or rollback. The application must
not invent those values.

## Required next evidence

Before the future publication gate becomes requestable, an authenticated
operator must:

1. capture page 226's exact editor source and revision metadata;
2. create and verify a recoverable page/database backup;
3. select one stable insertion anchor that does not replace the FlexMLS rental
   listings or another working component;
4. prove there is no duplicate Ask Magic Mike CTA or canonical lead form;
5. bind the source, insertion anchor, proposed shortcode, revision, backup, and
   rollback procedure to SHA-256 evidence;
6. verify the reviewed Connector version and run desktop/mobile, keyboard,
   canonical, performance, and no-submit analytics checks; and
7. generate a new exact-source packet.

Only that later packet may request:

```text
APPROVE PHASE 9 RENTAL-TO-HOMEOWNERSHIP CTA WORDPRESS PUBLICATION
```

The phrase is not currently requestable. It cannot authorize a plugin upgrade,
Form 6 change, form submission, lead, message, cache purge, database action,
DNS change, social publication, spend, deletion, or NellySelly action.

## Current result

The candidate organizes and exposes the next safe WordPress step without
changing Production. Mike's existing CTA is preserved, page 226 is the one
bounded rental candidate, page 4120/Form 6 stays held, and no working system is
rebuilt.
