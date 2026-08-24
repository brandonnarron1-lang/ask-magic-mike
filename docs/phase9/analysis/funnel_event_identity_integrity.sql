-- Read-only aggregate verifier for post-release funnel-event identity quality.
-- It returns no lead/contact identifiers or event payloads. Public funnel
-- identities are pseudonymous operational keys, not unique-person evidence.

WITH bounded_events AS (
  SELECT
    e.event_name,
    e.occurred_at,
    COALESCE(e.session_id::text, e.properties->>'funnel_session_id') AS funnel_identity,
    lower(COALESCE(e.utm_source, '')) AS utm_source,
    lower(COALESCE(e.utm_campaign, '')) AS utm_campaign,
    lower(COALESCE(e.properties->>'is_test', 'false')) = 'true' AS is_test
  FROM public.analytics_events e
  WHERE e.occurred_at >= NOW() - INTERVAL '7 days'
    AND e.event_name IN (
      'funnel_started',
      'address_submitted',
      'contact_submitted',
      'lead_submit_failed',
      'thank_you_viewed',
      'lead_created'
    )
), eligible AS (
  SELECT *
  FROM bounded_events
  WHERE NOT is_test
    AND utm_source NOT IN (
      'internal_qa',
      'internal_qa_wordpress_bridge',
      'launch_qa',
      'preview_qa',
      'test'
    )
    AND utm_source NOT LIKE '%internal%qa%'
    AND utm_campaign NOT LIKE '%qa%'
    AND utm_campaign NOT LIKE '%test%'
), stage_quality AS (
  SELECT
    event_name,
    count(*)::integer AS event_rows,
    count(*) FILTER (WHERE funnel_identity IS NOT NULL)::integer AS identity_linked_rows,
    count(DISTINCT funnel_identity) FILTER (WHERE funnel_identity IS NOT NULL)::integer AS distinct_funnel_identities
  FROM eligible
  GROUP BY event_name
), duplicate_conversions AS (
  SELECT count(*)::integer AS duplicate_conversion_identities
  FROM (
    SELECT funnel_identity
    FROM eligible
    WHERE event_name = 'lead_created'
      AND funnel_identity IS NOT NULL
    GROUP BY funnel_identity
    HAVING count(*) > 1
  ) duplicates
)
SELECT
  'stage'::text AS result_type,
  stage_quality.event_name AS metric,
  stage_quality.event_rows AS value,
  stage_quality.identity_linked_rows AS linked_rows,
  stage_quality.distinct_funnel_identities AS distinct_identities
FROM stage_quality
UNION ALL
SELECT
  'integrity',
  'duplicate_server_lead_created_identities',
  duplicate_conversions.duplicate_conversion_identities,
  NULL::integer,
  NULL::integer
FROM duplicate_conversions
ORDER BY result_type, metric;
