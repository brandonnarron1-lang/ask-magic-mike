# Phase 9 open-house QR registration packet

Date: 2026-09-01

Status: stacked Draft application candidate; no Production or distribution
authority

## Decision

Extend the existing protected Distribution Command instead of creating another
form, QR service, campaign database, shortlink provider, publisher, or CRM.

The public `/open-house/[propertyOrId]` intake and canonical `/api/leads`
storage path already existed. The owned-demand command also called for one
Friday open-house QR placement, but its QR export could only point to the
generic `/ask` route. An operator therefore had no bounded way to prepare a
property-specific registration QR while preserving the existing attribution,
review, and publication boundaries.

This candidate closes that seam with a deterministic review packet. It makes
no lead, analytics, database, notification, email, SMS, Push, WordPress,
provider, publication, print, DNS, spend, deletion, or NellySelly mutation.

## Reused architecture

- protected `/admin/distribution` operator surface;
- Better Auth/RBAC `report:view` permission;
- existing error-correction-H QR renderer and four-module quiet zone;
- canonical `amm_owned_demand_2026` campaign vocabulary;
- public `/open-house/[propertyOrId]` registration route;
- existing buyer/open-house intake component, consent contract, canonical lead
  API, idempotency, scoring, routing, notification outbox, and Lead Center;
- current `qr` / `owned_media` source and medium; and
- public-safe no-store shortlink behavior already used by owned-demand assets.

No new capture store or delivery system was added.

## Exact packet contract

The operator enters one public-safe event or listing reference such as:

```text
quinn-drive-september-open-house
```

The client normalizes spaces and punctuation to a bounded lowercase slug. It
rejects URLs, paths, query strings, email-shaped values, control characters,
reserved placeholders, and values outside 4–72 canonical characters. Packet
and shortlink routes accept only the canonical result; they do not accept an
arbitrary destination. The existing public intake safely normalizes bounded
mixed-case, space, or underscore identifiers so established property links do
not break.

The packet binds:

- schema `amm.open_house_registration_packet.v1`;
- canonical reference and display label;
- public registration path;
- exact full UTM destination;
- deterministic short path and short URL;
- placement and property identifiers;
- source, medium, campaign, and content;
- property-fact and two-device-scan requirements;
- `publicationAuthorized=false`;
- `mutationPerformed=false`;
- `leadSubmitted=false`; and
- `notificationSent=false`.

The full destination is:

```text
https://www.askmagicmike.com/open-house/{reference}
  ?utm_source=qr
  &utm_medium=owned_media
  &utm_campaign=amm_owned_demand_2026
  &utm_content=open_house_registration
  &placement_id=open-house:{reference}
  &property_id={reference}
```

The QR contains the shorter deterministic URL:

```text
https://www.askmagicmike.com/go/open-house/{reference}
```

That route accepts no destination query and returns only a no-store 307 to the
packet's exact canonical destination. Unknown or malformed references return
404.

## Protected downloads

After a valid reference is entered, Distribution Command exposes:

- the tracked registration link;
- the short QR link;
- a protected high-error-correction SVG download; and
- a protected JSON review packet.

Both downloads require `report:view`, are private/no-store, same-origin,
noindex, `nosniff`, no-referrer, and CSP-sandboxed. The asset route reads no
database, accepts no arbitrary URL or image input, and performs no provider
fetch.

## Public intake hardening

The public open-house route now uses the same bounded reference normalizer. A
malformed path no longer flows into the displayed label or canonical lead
context; it returns the normal application 404, while safe legacy casing and
underscore variants normalize to the same canonical identifier. Valid requests retain the
existing human-confirmation copy, contact-or-email requirement, exact consent,
honeypot, canonical lead API, and truthful appointment boundary.

## Controlled operator workflow

1. Confirm the event or listing is approved for public promotion.
2. Open the protected Distribution Command.
3. Enter a public-safe reference with no consumer identity or contact data.
4. Inspect the generated registration route and exact attribution.
5. Download the JSON packet and QR SVG.
6. Verify the property, host, date, time, availability, access instructions,
   and any agent mapping against the approved public source.
7. Scan the final QR on two independent devices and confirm the canonical host,
   reference, and full redirected UTMs.
8. Obtain the exact QR publication/distribution approval.
9. Only then print, place, post, or send the asset.
10. Retain the packet JSON and two-device scan reference with the exact event
    evidence after the external state is observed. Do not collapse the
    event-specific URL into a generic static publication-proof row.

Preparing or downloading a packet is not publication proof and cannot grant
its own approval.

Exact `qr / owned_media / amm_owned_demand_2026 / open_house_registration`
lead signals are counted in the owned-demand KPI and shown as an
instance-specific QR class. They are subtracted from the generic QR placement
in the static activation loop, preventing both double-counting and a false
claim that one generic proof represents every event URL.

## Security, privacy, and compliance boundary

- No contact name, email, phone, free-form note, secret, token, database URL,
  or provider key belongs in the reference.
- The asset makes no event-time, property-availability, host, appointment,
  valuation, offer, financing, appraisal, or response-time claim.
- Property and event facts require human verification before distribution.
- No protected trait or proxy enters the packet, targeting, scoring, or
  routing path.
- The route remains `noindex`; it is a direct registration destination, not a
  duplicate SEO page.
- No NellySelly hostname, asset, project, variable, database, or identifier is
  imported or referenced.

## Verification and release boundary

Focused acceptance covers normalization, malformed and reserved references,
exact attribution, no-authority fields, shortlink redirect, unknown-reference
404, RBAC denial, private/no-store JSON and SVG downloads, arbitrary-
destination rejection, command-center reuse, and public-route validation.

The candidate remains stacked behind PR #256 and cannot leapfrog PR #248, the
only currently requestable application release. No new approval phrase is
requestable from this Draft. A later release must be refreshed onto accepted
`main`, receive complete exact-head CI/Preview/browser/log proof, and use a
separately reviewed application gate. QR printing, placement, publication, or
sending always remains an independent action.

Rollback before release is to close the Draft. After a separately approved
application release, revert its merge or restore the immediately preceding
Ready Vercel deployment. There is no database, provider, WordPress, or printed
state to unwind from the application code alone.
