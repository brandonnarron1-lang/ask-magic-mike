# Analytics Event Specification

## Persistence rules

Analytics is a metrics ledger, not a second lead store. First-touch and
last-touch attribution, click IDs, exact source URL/referrer, consent evidence,
and submitted lead context belong on the canonical lead/attribution records.
The analytics table receives only controlled dimensions and aggregate-friendly
identifiers.

Both public ingestion paths—`POST /api/events` and
`POST /api/analytics/event`—enforce exact event allowlists, origin policy,
bounded JSON bodies, rate limiting, scalar-only properties, and event-specific
property allowlists. The Neon repository applies the general privacy allowlist
again before every durable write.

## Browser-authorized events

The current public registry includes page/session, funnel, address, intent,
timeline, contact, consent, CTA, chat, appointment-request, widget, lead-created
count, thank-you, and private review-planner events used by the live interfaces.
An automated contract test proves every browser event exported by
`app/lib/constants.ts` remains accepted except the trusted notification lifecycle
events listed below.

Public callers cannot associate an event with a canonical lead ID or agent ID.
Server-side lead creation, routing, notification, and admin operations write
their own lead-associated events after authorization and durable persistence.

### Field-experience event

`web_vital_observed` is a special Production-only browser event. It accepts
only LCP, INP, or CLS from an exact canonical Ask Magic Mike origin and a
registered public route. Its server-normalized properties are `metric_code`,
random bounded `metric_id`, rounded `metric_value`, server-derived `rating`,
`navigation_type`, normalized `route`, `device_category`, and the fixed
`public_production` traffic class.

This event always has null lead/session association and no attribution. Preview,
automation, known internal QA, private routes, dynamic property identifiers,
query strings, and raw user agents are excluded. The protected Growth Command
deduplicates metric IDs and calculates bounded P75 aggregates; it does not treat
browser telemetry as authenticated transaction evidence.

## Trusted server/provider events

`notification_queued`, `notification_delivered`, and `notification_failed` are
never accepted from a browser. They are generated only by the canonical lead
and provider lifecycle paths. Internal scoring, routing, CRM, SLA, assignment,
delivery, listing, and admin events likewise bypass the public endpoint and use
the server ledger directly.

## Property privacy

- Raw name, email, phone, address, question/message, note, IP, cookie, token,
  provider message ID, click ID, and full user-agent strings are discarded.
- Browser and server writes use named scalar dimensions only, capped at 40
  properties and bounded lengths/numeric ranges.
- URLs lose query strings; dynamic open-house routes normalize to
  `/open-house/[property-or-id]`; admin/private paths are rejected.
- Public UTM source/medium/campaign and placement values must match the
  registered operational vocabulary after syntax/PII checks. Unregistered
  values are discarded from analytics, while full attribution and click IDs
  remain only in the protected canonical lead record.
- User agent persists only as `browser|automation` plus
  `desktop|mobile|tablet|unknown`.
- Public listing IDs may be retained as bounded identifiers; arbitrary internal,
  routing, task, or provider identifiers are not analytics dimensions.

## Stable UTM convention

`utm_source` identifies the traffic owner (`ourtownproperties`, `google`,
`facebook`, `instagram`, `qr`, `email`); `utm_medium` identifies the distribution
method (`referral`, `organic`, `social_organic`, `email`, `qr`, or an approved
paid medium); `utm_campaign` names the approved offer/flight; `utm_content`
identifies the exact placement or creative. Sensitive lead data never belongs
in a UTM value. Register a newly approved public source, medium, campaign, or
placement in the privacy boundary before expecting it in the analytics ledger.

Cross-domain GA4/GTM activation and external publication remain separate
approval-controlled actions. The server-side ledger works independently of
those tools.
