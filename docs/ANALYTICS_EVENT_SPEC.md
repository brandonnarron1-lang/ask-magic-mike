# Analytics Event Specification

## Persistence rules

First-touch is captured on the first landing/session and never overwritten. Last-touch
updates on each trusted page/placement touch. UTM values and click IDs are persisted
server-side on the lead/attribution record. Raw name, email, phone, full message, and
unhashed IP never enter analytics properties.

## Public events

`page_view`, `funnel_started`, `address_submitted`, `intent_selected`,
`timeline_selected`, `contact_submitted`, `consent_accepted`, `lead_created`,
`thank_you_viewed`, `appointment_cta_clicked`, `phone_click`, `email_click`,
`widget_opened`, `widget_step_completed`, `widget_lead_created`,
`notification_queued`, `notification_delivered`, `notification_failed`.

Events carry only event-safe fields: event version, funnel/intent, source label,
placement, page path, referrer classification, UTM fields, approved click-ID
presence (not arbitrary query strings), device class, lead ID for internal events,
and `is_test`/traffic-exclusion flags.

## Stable UTM convention

`utm_source` is the traffic owner (`ourtownproperties`, `google`, `facebook`,
`instagram`, `qr`, `email`); `utm_medium` is `referral`, `organic`, `social`,
`email`, `qr`, or approved paid medium; `utm_campaign` names the offer and date;
`utm_content` names the placement; `utm_term` is reserved for search keyword data.

Cross-domain GA4 linking, Search Console, and GTM changes are prepared only after
the owner confirms the existing measurement IDs and property ownership.
