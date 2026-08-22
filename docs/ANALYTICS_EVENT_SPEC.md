# Analytics Event Specification

## Persistence rules

First-touch is captured on the first landing/session and never overwritten. Last-touch
updates on each trusted page/placement touch. UTM values and click IDs are persisted
server-side on the lead/attribution record. Raw name, email, phone, full message, and
unhashed IP never enter analytics properties.

The public event routes accept at most 4 KiB of strict JSON and no more than 40
scalar properties. Event names and property names are explicit allowlists;
internal scoring, routing, delivery, and administrative events cannot be
manufactured through the public browser endpoint. Email/phone/secret-shaped
values, nested objects, arbitrary keys, sensitive query parameters, unknown
paths, and raw browser signatures are discarded. Neon repeats the same property
and attribution filtering at the final write boundary. User agents are reduced
to `browser|automation` plus `mobile|tablet|desktop|unknown`; request IP is used
only for abuse control and is not forwarded to the analytics ledger.

## Event taxonomy

`page_view`, `funnel_started`, `address_submitted`, `intent_selected`,
`timeline_selected`, `contact_submitted`, `consent_accepted`, `lead_created`,
`thank_you_viewed`, `appointment_cta_clicked`, `phone_click`, `email_click`,
`widget_opened`, `widget_step_completed`, `widget_lead_created`,
`notification_queued`, `notification_delivered`, `notification_failed`.

Browser ingest accepts only consumer interaction/funnel events. Notification
queue/delivery/failure, scoring, routing, and administrative events use trusted
server/provider paths and are rejected if submitted through a public analytics
route.

Events carry only event-safe fields: event version, funnel/intent, source label,
placement, page path, referrer classification, UTM fields, approved click-ID
presence (not arbitrary query strings), device class, lead ID for internal events,
and `is_test`/traffic-exclusion flags.

Browser `dataLayer`, PostHog compatibility, custom DOM events, iframe
`postMessage`, and server-ledger payloads all use the same minimized property
contract. Full attribution URLs, query strings, click IDs, contact fields, free
text, and lead details are not copied into those browser analytics channels.

## Stable UTM convention

`utm_source` is the traffic owner (`ourtownproperties`, `google`, `facebook`,
`instagram`, `qr`, `email`); `utm_medium` is `referral`, `organic`, `social`,
`email`, `qr`, or approved paid medium; `utm_campaign` names the offer and date;
`utm_content` names the placement; `utm_term` is reserved for search keyword data.

Cross-domain GA4 linking, Search Console, and GTM changes are prepared only after
the owner confirms the existing measurement IDs and property ownership.
