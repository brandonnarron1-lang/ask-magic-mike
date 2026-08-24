-- Read-only Production evidence query for the Phase 9 home-value completion
-- integrity candidate. This query returns aggregate event counts only.
--
-- The bounded window isolates one unclassified contact-step sequence observed
-- in the canonical Neon analytics ledger. Registered QA/test UTM markers are
-- excluded. Because these historical anonymous events have no session ID and
-- predate current route/funnel dimensions, temporal adjacency is an inference,
-- not proof that the sequence belongs to a genuine public prospect.

WITH sequence_events AS (
  SELECT
    e.occurred_at,
    e.event_name,
    lower(coalesce(e.utm_source, '')) AS utm_source,
    lower(coalesce(e.utm_campaign, '')) AS utm_campaign
  FROM public.analytics_events e
  WHERE e.occurred_at >= timestamptz '2026-08-22 19:04:50+00'
    AND e.occurred_at < timestamptz '2026-08-22 19:20:00+00'
    AND e.event_name IN (
      'funnel_started',
      'address_submitted',
      'contact_submitted',
      'lead_created'
    )
    AND lower(coalesce(e.utm_source, '')) NOT IN (
      'internal_qa',
      'internal_qa_wordpress_bridge',
      'launch_qa',
      'preview_qa',
      'test'
    )
    AND lower(coalesce(e.utm_source, '')) NOT LIKE '%internal%qa%'
    AND lower(coalesce(e.utm_campaign, '')) NOT LIKE '%qa%'
    AND lower(coalesce(e.utm_campaign, '')) NOT LIKE '%test%'
)
SELECT stage_order, stage, event_name, events, observation_start, observation_end
FROM (
  SELECT
    1 AS stage_order,
    'Funnel start'::text AS stage,
    'funnel_started'::text AS event_name,
    count(*) FILTER (WHERE event_name = 'funnel_started')::integer AS events,
    timestamptz '2026-08-22 19:04:50+00' AS observation_start,
    timestamptz '2026-08-22 19:20:00+00' AS observation_end
  FROM sequence_events
  UNION ALL
  SELECT
    2,
    'Address submitted',
    'address_submitted',
    count(*) FILTER (WHERE event_name = 'address_submitted')::integer,
    timestamptz '2026-08-22 19:04:50+00',
    timestamptz '2026-08-22 19:20:00+00'
  FROM sequence_events
  UNION ALL
  SELECT
    3,
    'Contact submitted',
    'contact_submitted',
    count(*) FILTER (WHERE event_name = 'contact_submitted')::integer,
    timestamptz '2026-08-22 19:04:50+00',
    timestamptz '2026-08-22 19:20:00+00'
  FROM sequence_events
  UNION ALL
  SELECT
    4,
    'Durable lead created',
    'lead_created',
    count(*) FILTER (WHERE event_name = 'lead_created')::integer,
    timestamptz '2026-08-22 19:04:50+00',
    timestamptz '2026-08-22 19:20:00+00'
  FROM sequence_events
) stages
ORDER BY stage_order;
