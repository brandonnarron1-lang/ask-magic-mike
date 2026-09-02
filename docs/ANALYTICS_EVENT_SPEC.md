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

The current browser registry includes page/session, funnel, address, intent,
timeline, contact, consent, CTA, chat, appointment-request, widget,
browser-visible conversion, thank-you, privacy-safe lead-submit failure, and
private review-planner events used by the live interfaces. `lead_submit_failed` records only the
registered `funnel_name`, `lead_source_surface`, and `step_name`; the browser
cannot attach an error string, contact detail, address, provider response, or
canonical lead identifier.
An automated contract test proves every browser event exported by
`app/lib/constants.ts` remains accepted except the trusted notification lifecycle
events listed below.

Public callers cannot associate an event with a canonical lead ID or agent ID.
Server-side lead creation, routing, notification, and admin operations write
their own lead-associated events after authorization and durable persistence.

### Funnel identity and conversion authority

Home Value, seller, buyer/renter/open-house, consented Ask follow-up, and
appointment actions reuse the cryptographically random UUID already used by
the matching lead submission. Ask questions use that pseudonymous session for
funnel continuity but do not become leads. The UUID is sent only as top-level
first-party request context. It is not exposed in the browser analytics
properties, PostHog payload, data layer, URL, or widget parent message.

`POST /api/events` validates the UUID and passes it to the Neon repository as
protected context. The repository injects it into
`properties.funnel_session_id` after the normal property allowlist. It never
pre-creates `public.sessions`; successful atomic lead capture later reuses the
same UUID as canonical `sessions.id`. Aggregate funnel queries may join on
`COALESCE(session_id::text, properties->>'funnel_session_id')`.

The identifier is pseudonymous operational data and becomes linkable to a lead
only after that lead is durably stored. It is not unique-person, consent, or
prospect proof and follows the protected analytics retention/deletion policy.
Historical null-session events are not backfilled or reclassified.

`lead_created`, `widget_lead_created`, `lead_qualified`, and
`appointment_requested` may remain visible to approved browser integrations
after a successful response, but the client does not post them to the canonical
event endpoint. The endpoint also rejects direct browser-authored attempts.
Only `POST /api/leads` writes canonical `lead_created`, after durable lead
storage and with the protected lead/session association. Only
`POST /api/appointments/request` writes canonical `appointment_requested`, and
only after the existing atomic appointment/lifecycle/audit/follow-up function
returns a new durable request. Both use the protected lead/session association;
an idempotent replay creates no additional conversion row. Qualification and
appointment truth therefore remain server-owned records.

For Ask, `chat_started` and `chat_message_sent` prove only a question
interaction. `contact_submitted` and `consent_accepted` occur only when the
separate local-follow-up form passes client validation. The canonical
`lead_created` event remains server-owned and exists only after the consented,
contactable follow-up is durably stored.

### Field-experience event

`web_vital_observed` is a special Production-only browser event. It accepts
only LCP, INP, or CLS from an exact canonical Ask Magic Mike origin and a
registered public route. Its server-normalized properties are `metric_code`,
a domain-separated SHA-256 `metric_id` digest, rounded `metric_value`, server-derived `rating`,
`navigation_type`, normalized `route`, `device_category`, and the fixed
`public_production` traffic class.

The browser-generated metric identifier is never stored raw; its deterministic
digest supports duplicate suppression without retaining the high-entropy source
value. This event always has null lead/session association and no attribution. Preview,
automation, known internal QA, private routes, dynamic property identifiers,
query strings, and raw user agents are excluded. The protected Growth Command
deduplicates metric IDs and calculates bounded P75 aggregates; it does not treat
browser telemetry as authenticated transaction evidence.

## Trusted server/provider events

`notification_queued`, `notification_delivered`, and `notification_failed` are
never accepted from a browser. They are generated only by the canonical lead
and provider lifecycle paths. Public ingestion also rejects qualification and
appointment-request outcomes. Internal scoring, routing, CRM, SLA, assignment,
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
- A validated funnel UUID is retained only as repository-injected protected
  context. Public properties cannot supply or override it.

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

## Public owned-referral handoff

The homepage's generic referral handoff emits only
`referral_share_handoff` or `referral_link_copied`, with the registered
`surface=homepage` and `share_method=native|clipboard` dimensions. A native
handoff means the browser accepted the share request; it is not delivery,
publication, recipient, click, or referral proof. A Clipboard event means the
fixed URL was copied; it is not evidence the link was distributed.

Cancelled/failed native sharing and Clipboard-denied manual selection write no
success event. The shared destination uses `utm_source=consumer_share`,
`utm_medium=referral`, `utm_campaign=amm_owned_demand_2026`, and
`utm_content=homepage_referral_share`. The packet is generated from constants
and contains no visitor URL, lead/session identifier, contact detail, form
answer, saved plan, click ID, or free text.

## Consent-gated GTM candidate

The external measurement candidate reuses the GTM container already observed
on OurTownProperties.com. It does not create another analytics store. The
container is resolved only on canonical Production, only from the exact
allowlisted public identifier, and only after an explicit analytics choice.
Preview, automation, private/admin, operational-preview, iframe/widget, and
known internal-QA contexts remain external-tag free.

Browser events keep the existing sanitizer, then publish a flat GTM object with
the event name, allowlisted properties, fixed `ask_magic_mike` source,
`amm_public_v1` schema, and `public_production` traffic class. Advertising
storage, advertising user data, and ad personalization remain denied. A
dedicated `ammDataLayer` prevents this controlled queue from colliding with an
unrelated browser tag runtime. The Neon ledger continues regardless of the
optional Google Analytics choice.
