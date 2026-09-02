# Phase 9 WordPress seller-intent decision packet

Date: 2026-08-29

Mode: protected, read-only public evidence

External mutation: none

## Outcome

The live WordPress seller path does not need another funnel. It needs one
explicit canonical-page and capture-owner decision before the existing Ask
Magic Mike `/sell` funnel can safely replace parallel capture paths.

This candidate extends the existing protected Distribution Command and its
WordPress manifest route. It does not create a new publisher, form, lead store,
database table, notification engine, analytics vocabulary, or dashboard.

The new protected packet is available at:

`GET /api/admin/distribution/wordpress-change-set/wordpress_seller_intent_decision`

It requires Lead Center `report:view`, is private and `no-store`, and downloads
privacy-minimized JSON. It performs no WordPress, database, email, SMS, Push,
lead, provider, DNS, or deployment mutation.

## Live structural evidence

Read-only public inspection on 2026-08-29 found:

| Surface | Public URL | Page ID | Canonical/index state | Capture state | Canonical AMM link |
| --- | --- | ---: | --- | --- | --- |
| We Buy Homes | `https://www.ourtownproperties.com/we-buy-homes/` | 3631 | self-canonical, published index candidate | existing tracked legacy CTA | one |
| We Buy Houses | `https://www.ourtownproperties.com/we-buy-houses/` | 4364 | self-canonical, published index candidate | legacy native AMM form plus Gravity Form 7 | none |

The 42-page WordPress public-surface audit also found three duplicate seller
value pages, two duplicate direct-purchase pages, four legacy native-capture
pages, five multiple-capture pages, and Gravity Form 7 rendered on 39 pages.
That existing audit remains the broad inventory. The new packet does not repeat
it; it turns the specific seller-intent conflict into a fail-closed operator
decision boundary.

Playwright inspected `/we-buy-houses/` at 1440×1000 and 390×844 without
submitting a form. The mobile DOM had a 390 px document width, no horizontal
overflow, a 310 px form container, and 268 px visible controls. The public page
still rendered both the page-specific native intake and the global Gravity
Form 7. No browser warning or error was observed.

## Packet contract

The packet records only structural facts:

- exact allowlisted source URLs and expected WordPress page IDs;
- public page modification timestamps from the WordPress page index;
- canonical-link count and whether each page is self-canonical;
- public `robots` noindex state;
- exact-host Ask Magic Mike link count and rejected lookalike count;
- native AMM form count and Gravity Form IDs;
- capture-system labels and count;
- a deterministic SHA-256 evidence hash;
- blockers and ordered decision steps.

It never retains raw page HTML, page copy, form values, names, telephone
numbers, emails, cookies, credentials, tokens, database rows, or lead PII.

The contract always emits:

- `publicationBlocked=true`;
- `publicationAuthorized=false`;
- `publicationGateIssued=false`;
- `trackedPublicationHref=null`;
- all mutation/send/submission flags `false`.

The stable consumer funnel candidate is
`https://www.askmagicmike.com/sell`, but no tracked publication href is issued
until the source page and placement key are approved. This prevents attribution
from silently reusing `wordpress_we_buy_homes` for a different page or forcing
an unnecessary database migration before the SEO decision exists.

## Decision required before any WordPress publication

The owner/SEO/BIC review must resolve four exact values:

1. canonical source page: `/we-buy-homes/` or `/we-buy-houses/`;
2. canonical capture owner: Ask Magic Mike or a deliberately retained bridge;
3. duplicate-page disposition: preserve, redirect, canonicalize, or noindex
   based on Search Console, inbound-link, Regency, and SEO evidence; and
4. stable placement key for the retained public CTA and publication ledger.

No phrase in this document authorizes that decision or a live edit. After those
values are recorded, a later candidate may generate one exact href-level change
set, backup requirement, acceptance test, rollback, and separate publication
gate.

## Page 3631 enforcement update — 2026-09-01

Authenticated editor inspection pinned page 3631 at 2,480 UTF-8 bytes with
SHA-256
`2c6c4a1b75afd133b92840d0f846f2a82f059b25f73aa0b2914d97d02ab1b8df`
and one current Ask Magic Mike shortcode. The earlier proposed shortcode would
have dropped the live headline, explanatory text, and button label. The
corrected proposal preserves all three and changes only the routing/attribution
attributes.

That technical correction does not resolve this packet. The page-3631
activation manifest now emits `seller_intent_decision_required`,
`publicationBlocked=true`, `approvalGate=null`, and
`activationEligible=false`. Its exact-source verifier additionally requires a
digest of the approved decision artifact and a BIC/compliance copy-review
artifact before a later page-publication gate can be requested. Full evidence
is in
[`WORDPRESS_PAGE3631_SOURCE_CUTOVER_READINESS_2026-09-01.md`](./WORDPRESS_PAGE3631_SOURCE_CUTOVER_READINESS_2026-09-01.md).

## Rollback and isolation

This application candidate is additive and read-only. Its rollback is to
restore the prior Ask Magic Mike deployment. Because it changes no WordPress
state, WordPress rollback is not applicable at this stage.

NellySelly is outside every hostname, page, database, environment variable,
deployment, and route in this packet. No NellySelly resource is read or
modified.
