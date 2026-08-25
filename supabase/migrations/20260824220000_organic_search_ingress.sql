-- Phase 9 privacy-minimized organic-search evidence ingress.
-- Additive, server-only, and disabled at the application boundary by default.
-- One operator-reviewed page-performance report atomically reconciles existing
-- market_signals and market_opportunities with immutable audit evidence.
-- Raw CSV, Search Console query text, Google credentials, and provider payloads
-- are never retained. This contract cannot publish content or call Google.

CREATE TABLE IF NOT EXISTS public.organic_search_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_fingerprint text NOT NULL UNIQUE CHECK (batch_fingerprint ~ '^[0-9a-f]{64}$'),
  import_version text NOT NULL CHECK (import_version = 'search_console_page_csv_v1'),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 1000),
  inserted_signals integer NOT NULL CHECK (inserted_signals >= 0),
  updated_signals integer NOT NULL CHECK (updated_signals >= 0),
  unchanged_signals integer NOT NULL CHECK (unchanged_signals >= 0),
  opportunity_rows integer NOT NULL CHECK (opportunity_rows BETWEEN 0 AND row_count),
  inserted_opportunities integer NOT NULL CHECK (inserted_opportunities >= 0),
  updated_opportunities integer NOT NULL CHECK (updated_opportunities >= 0),
  unchanged_opportunities integer NOT NULL CHECK (unchanged_opportunities >= 0),
  impressions_total bigint NOT NULL CHECK (impressions_total > 0),
  clicks_total bigint NOT NULL CHECK (clicks_total >= 0 AND clicks_total <= impressions_total),
  ctr_total numeric(10,8) NOT NULL CHECK (ctr_total BETWEEN 0 AND 1),
  date_start date NOT NULL,
  date_end date NOT NULL CHECK (date_end >= date_start),
  site_properties jsonb NOT NULL,
  page_hosts jsonb NOT NULL,
  approval_reference text NOT NULL CHECK (length(approval_reference) BETWEEN 4 AND 160),
  imported_by text NOT NULL CHECK (length(imported_by) BETWEEN 1 AND 180),
  audit_id uuid NOT NULL REFERENCES public.audit_logs(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (inserted_signals + updated_signals + unchanged_signals = row_count),
  CHECK (
    inserted_opportunities + updated_opportunities + unchanged_opportunities = opportunity_rows
  ),
  CHECK (jsonb_typeof(site_properties) = 'array'),
  CHECK (jsonb_array_length(site_properties) = 1),
  CHECK (jsonb_typeof(page_hosts) = 'array'),
  CHECK (jsonb_array_length(page_hosts) BETWEEN 1 AND 2),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS organic_search_import_batches_created_idx
  ON public.organic_search_import_batches(created_at DESC);

ALTER TABLE public.organic_search_import_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organic_search_import_batches FROM PUBLIC;

DROP TRIGGER IF EXISTS organic_search_import_batches_reject_change
  ON public.organic_search_import_batches;
CREATE TRIGGER organic_search_import_batches_reject_change
  BEFORE UPDATE OR DELETE ON public.organic_search_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DO $organic_search_import_table_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.organic_search_import_batches FROM %I',
        role_name
      );
    END IF;
  END LOOP;
END;
$organic_search_import_table_privileges$;

CREATE OR REPLACE FUNCTION public.import_organic_search_batch_v1(
  p_batch_fingerprint text,
  p_rows jsonb,
  p_actor text,
  p_approval_reference text,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_audit_id uuid;
  v_signal_id uuid;
  v_opportunity_id uuid;
  v_existing_batch public.organic_search_import_batches%ROWTYPE;
  v_existing_signal public.market_signals%ROWTYPE;
  v_existing_opportunity public.market_opportunities%ROWTYPE;
  v_inserted_signals integer := 0;
  v_updated_signals integer := 0;
  v_unchanged_signals integer := 0;
  v_opportunity_rows integer := 0;
  v_inserted_opportunities integer := 0;
  v_updated_opportunities integer := 0;
  v_unchanged_opportunities integer := 0;
  v_row_count integer;
  v_impressions_total bigint;
  v_clicks_total bigint;
  v_ctr_total numeric(10,8);
  v_date_start date;
  v_date_end date;
  v_site_properties jsonb;
  v_page_hosts jsonb;
  v_geography text;
  v_observed_at timestamptz;
  v_signal_evidence jsonb;
  v_opportunity_evidence jsonb;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF p_batch_fingerprint !~ '^[0-9a-f]{64}$' OR
     jsonb_typeof(p_rows) <> 'array' OR
     jsonb_array_length(p_rows) NOT BETWEEN 1 AND 1000 OR
     p_actor IS NULL OR length(btrim(p_actor)) NOT BETWEEN 1 AND 180 OR
     p_approval_reference IS NULL OR length(btrim(p_approval_reference)) NOT BETWEEN 4 AND 160 OR
     p_confirmation IS DISTINCT FROM 'IMPORT REVIEWED ORGANIC SEARCH' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_organic_search_batch');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('amm_organic_search_import_v1', 0));

  SELECT * INTO v_existing_batch
    FROM public.organic_search_import_batches
   WHERE batch_fingerprint = p_batch_fingerprint;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'batch_id', v_existing_batch.id,
      'audit_id', v_existing_batch.audit_id,
      'idempotent_replay', true,
      'row_count', v_existing_batch.row_count,
      'inserted_signals', v_existing_batch.inserted_signals,
      'updated_signals', v_existing_batch.updated_signals,
      'unchanged_signals', v_existing_batch.unchanged_signals,
      'opportunity_rows', v_existing_batch.opportunity_rows,
      'inserted_opportunities', v_existing_batch.inserted_opportunities,
      'updated_opportunities', v_existing_batch.updated_opportunities,
      'unchanged_opportunities', v_existing_batch.unchanged_opportunities
    );
  END IF;

  -- Application validation is usability. Revalidate the minimized normalized
  -- contract inside the owner-connected transaction before any durable write.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(v_row) <> 'object' OR
       (SELECT count(*) FROM jsonb_object_keys(v_row)) <> 28 OR
       NOT (v_row ?& ARRAY[
         'start_date', 'end_date', 'site_property', 'search_type', 'data_state',
         'country', 'device', 'page_url', 'page_host', 'page_path', 'clicks',
         'impressions', 'ctr', 'position', 'source_system', 'signal_external_id',
         'signal_score', 'confidence', 'opportunity_key', 'opportunity_type',
         'opportunity_title', 'opportunity_rationale', 'opportunity_score',
         'policy_ctr_threshold', 'demand_points', 'accessibility_points',
         'click_gap_points', 'row_fingerprint'
       ]) OR
       v_row->>'start_date' !~ '^\d{4}-\d{2}-\d{2}$' OR
       v_row->>'end_date' !~ '^\d{4}-\d{2}-\d{2}$' OR
       (v_row->>'start_date')::date > (v_row->>'end_date')::date OR
       (v_row->>'end_date')::date > current_date OR
       (v_row->>'start_date')::date < current_date - interval '550 days' OR
       (v_row->>'end_date')::date - (v_row->>'start_date')::date > 550 OR
       v_row->>'site_property' NOT IN (
         'sc-domain:askmagicmike.com',
         'https://askmagicmike.com/',
         'https://www.askmagicmike.com/',
         'sc-domain:ourtownproperties.com',
         'https://ourtownproperties.com/',
         'https://www.ourtownproperties.com/'
       ) OR
       v_row->>'search_type' NOT IN ('web', 'image', 'video', 'news', 'discover', 'google_news') OR
       v_row->>'data_state' NOT IN ('final', 'fresh') OR
       v_row->>'country' !~ '^(ALL|[A-Z]{3})$' OR
       v_row->>'device' NOT IN ('all', 'desktop', 'mobile', 'tablet') OR
       v_row->>'page_host' NOT IN ('www.askmagicmike.com', 'www.ourtownproperties.com') OR
       v_row->>'page_url' !~ '^https://www\.(askmagicmike|ourtownproperties)\.com/' OR
       v_row->>'page_url' ~ '[?#]' OR
       v_row->>'page_url' ~* '(@|%40)' OR
       length(v_row->>'page_url') NOT BETWEEN 20 AND 2048 OR
       v_row->>'page_url' ~ '[[:cntrl:]]' OR
       v_row->>'page_path' !~ '^/' OR
       length(v_row->>'page_path') NOT BETWEEN 1 AND 1600 OR
       v_row->>'page_path' ~ '[?#]' OR
       v_row->>'page_path' ~* '(@|%40)' OR
       v_row->>'page_path' ~ '[[:cntrl:]]' OR
       v_row->>'page_url' IS DISTINCT FROM
         ('https://' || (v_row->>'page_host') || (v_row->>'page_path')) OR
       (
         v_row->>'page_host' = 'www.askmagicmike.com' AND
         v_row->>'site_property' NOT IN (
           'sc-domain:askmagicmike.com',
           'https://askmagicmike.com/',
           'https://www.askmagicmike.com/'
         )
       ) OR
       (
         v_row->>'page_host' = 'www.ourtownproperties.com' AND
         v_row->>'site_property' NOT IN (
           'sc-domain:ourtownproperties.com',
           'https://ourtownproperties.com/',
           'https://www.ourtownproperties.com/'
         )
       ) OR
       v_row->>'clicks' !~ '^(0|[1-9][0-9]{0,9})$' OR
       (v_row->>'clicks')::bigint > 2147483647 OR
       v_row->>'impressions' !~ '^[1-9][0-9]{0,9}$' OR
       (v_row->>'impressions')::bigint > 2147483647 OR
       (v_row->>'clicks')::bigint > (v_row->>'impressions')::bigint OR
       v_row->>'ctr' !~ '^(0(\.[0-9]{1,8})?|1(\.0{1,8})?)$' OR
       abs(
         (v_row->>'ctr')::numeric -
         ((v_row->>'clicks')::numeric / (v_row->>'impressions')::numeric)
       ) > 0.0001 OR
       v_row->>'position' !~ '^(0|[1-9][0-9]{0,3})(\.[0-9]{1,4})?$' OR
       (v_row->>'position')::numeric < 1 OR
       (v_row->>'position')::numeric > 1000 OR
       v_row->>'source_system' IS DISTINCT FROM 'google_search_console_csv' OR
       v_row->>'signal_external_id' !~ '^gsc_page:[0-9a-f]{64}$' OR
       v_row->>'signal_score' !~ '^(0|[1-9][0-9]?|100)$' OR
       v_row->>'confidence' !~ '^(0(\.[0-9]{1,4})?|1(\.0{1,4})?)$' OR
       (v_row->>'confidence')::numeric <= 0 OR
       v_row->>'row_fingerprint' !~ '^[0-9a-f]{64}$' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_organic_search_row');
    END IF;

    IF v_row->>'opportunity_key' IS NULL THEN
      IF v_row->>'opportunity_type' IS NOT NULL OR
         v_row->>'opportunity_title' IS NOT NULL OR
         v_row->>'opportunity_rationale' IS NOT NULL OR
         v_row->>'opportunity_score' IS NOT NULL OR
         v_row->>'policy_ctr_threshold' IS NOT NULL OR
         v_row->>'demand_points' IS NOT NULL OR
         v_row->>'accessibility_points' IS NOT NULL OR
         v_row->>'click_gap_points' IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_organic_search_opportunity');
      END IF;
    ELSE
      IF v_row->>'opportunity_key' !~ '^organic_search:[0-9a-f]{64}$' OR
         v_row->>'opportunity_key' IS DISTINCT FROM
           ('organic_search:' || encode(extensions.digest(v_row->>'page_url', 'sha256'), 'hex')) OR
         v_row->>'opportunity_type' NOT IN (
           'organic_click_capture_gap', 'organic_page_one_gap', 'organic_visibility_gap'
         ) OR
         length(v_row->>'opportunity_title') NOT BETWEEN 10 AND 180 OR
         v_row->>'opportunity_title' ~ '[[:cntrl:]]' OR
         v_row->>'opportunity_title' ~ '^[=+@-]' OR
         length(v_row->>'opportunity_rationale') NOT BETWEEN 40 AND 800 OR
         v_row->>'opportunity_rationale' ~ '[[:cntrl:]]' OR
         v_row->>'opportunity_rationale' ~ '^[=+@-]' OR
         v_row->>'opportunity_score' !~ '^(0|[1-9][0-9]?|100)$' OR
         v_row->>'policy_ctr_threshold' !~ '^(0(\.[0-9]{1,8})?|1(\.0{1,8})?)$' OR
         v_row->>'demand_points' !~ '^(0|[1-3]?[0-9]|4[0-5])$' OR
         v_row->>'accessibility_points' !~ '^(0|[1-2]?[0-9]|30)$' OR
         v_row->>'click_gap_points' !~ '^(0|1?[0-9]|2[0-5])$' OR
         (v_row->>'opportunity_score')::integer IS DISTINCT FROM LEAST(
           100,
           (v_row->>'demand_points')::integer +
           (v_row->>'accessibility_points')::integer +
           (v_row->>'click_gap_points')::integer
         ) OR
         (v_row->>'policy_ctr_threshold')::numeric IS DISTINCT FROM (CASE
           WHEN (v_row->>'position')::numeric <= 3 THEN 0.03
           WHEN (v_row->>'position')::numeric <= 10 THEN 0.02
           WHEN (v_row->>'position')::numeric <= 20 THEN 0.01
           WHEN (v_row->>'position')::numeric <= 40 THEN 0.005
           ELSE 0.0025
         END) OR
         NOT (
           (
             v_row->>'opportunity_type' = 'organic_click_capture_gap' AND
             (v_row->>'impressions')::bigint >= 100 AND
             (v_row->>'position')::numeric <= 10 AND
             (v_row->>'ctr')::numeric < (v_row->>'policy_ctr_threshold')::numeric
           ) OR (
             v_row->>'opportunity_type' = 'organic_page_one_gap' AND
             (v_row->>'impressions')::bigint >= 100 AND
             (v_row->>'position')::numeric > 10 AND
             (v_row->>'position')::numeric <= 20
           ) OR (
             v_row->>'opportunity_type' = 'organic_visibility_gap' AND
             (v_row->>'impressions')::bigint >= 250 AND
             (v_row->>'position')::numeric > 20 AND
             (v_row->>'position')::numeric <= 40
           )
         ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_organic_search_opportunity');
      END IF;
    END IF;
  END LOOP;

  IF (
    SELECT count(DISTINCT concat_ws(
      chr(31), start_date, end_date, site_property, search_type,
      data_state, country, device, source_system
    ))
      FROM jsonb_to_recordset(p_rows) AS row_data(
        start_date text, end_date text, site_property text, search_type text,
        data_state text, country text, device text, source_system text
      )
  ) <> 1 OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(page_url text)
     GROUP BY page_url
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
      FROM jsonb_to_recordset(p_rows) AS row_data(signal_external_id text)
     GROUP BY signal_external_id
    HAVING count(*) > 1
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflicting_organic_search_batch_identity');
  END IF;

  FOR v_row IN
    SELECT value
      FROM jsonb_array_elements(p_rows)
     ORDER BY value->>'page_url'
  LOOP
    v_geography := NULLIF(v_row->>'country', 'ALL');
    v_observed_at := (
      (v_row->>'end_date')::date + interval '1 day' - interval '1 second'
    ) AT TIME ZONE 'UTC';
    v_signal_evidence := jsonb_build_object(
      'page_url', v_row->>'page_url',
      'page_path', v_row->>'page_path',
      'site_property', v_row->>'site_property',
      'search_type', v_row->>'search_type',
      'data_state', v_row->>'data_state',
      'country', v_row->>'country',
      'device', v_row->>'device',
      'date_start', v_row->>'start_date',
      'date_end', v_row->>'end_date',
      'clicks', (v_row->>'clicks')::bigint,
      'impressions', (v_row->>'impressions')::bigint,
      'ctr', (v_row->>'ctr')::numeric,
      'position', (v_row->>'position')::numeric,
      'row_fingerprint', v_row->>'row_fingerprint',
      'scoring_version', 'search_console_page_csv_v1',
      'source_coverage', 'operator_export_not_guaranteed_exhaustive',
      'raw_csv_retained', false,
      'raw_queries_retained', false,
      'provider_call_performed', false
    );
    v_after := jsonb_build_object(
      'signal_type', 'search_demand',
      'geography', v_geography,
      'segment', v_row->>'page_host',
      'score', (v_row->>'signal_score')::numeric,
      'confidence', (v_row->>'confidence')::numeric,
      'observed_at', v_observed_at,
      'source_system', 'google_search_console',
      'external_id', v_row->>'signal_external_id',
      'evidence', v_signal_evidence,
      'is_test', false
    );

    SELECT * INTO v_existing_signal
      FROM public.market_signals
     WHERE source_system = 'google_search_console'
       AND external_id = v_row->>'signal_external_id'
     FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.market_signals(
        signal_type, geography, segment, score, confidence, observed_at,
        source_system, external_id, evidence, is_test
      ) VALUES (
        'search_demand', v_geography, v_row->>'page_host',
        (v_row->>'signal_score')::numeric, (v_row->>'confidence')::numeric,
        v_observed_at, 'google_search_console', v_row->>'signal_external_id',
        v_signal_evidence, false
      ) RETURNING id INTO v_signal_id;
      v_before := NULL;
      v_inserted_signals := v_inserted_signals + 1;
    ELSE
      v_signal_id := v_existing_signal.id;
      v_before := jsonb_build_object(
        'signal_type', v_existing_signal.signal_type,
        'geography', v_existing_signal.geography,
        'segment', v_existing_signal.segment,
        'score', v_existing_signal.score,
        'confidence', v_existing_signal.confidence,
        'observed_at', v_existing_signal.observed_at,
        'source_system', v_existing_signal.source_system,
        'external_id', v_existing_signal.external_id,
        'evidence', v_existing_signal.evidence,
        'is_test', v_existing_signal.is_test
      );
      IF v_before = v_after THEN
        v_unchanged_signals := v_unchanged_signals + 1;
      ELSE
        UPDATE public.market_signals
           SET signal_type = 'search_demand',
               geography = v_geography,
               segment = v_row->>'page_host',
               score = (v_row->>'signal_score')::numeric,
               confidence = (v_row->>'confidence')::numeric,
               observed_at = v_observed_at,
               evidence = v_signal_evidence,
               is_test = false
         WHERE id = v_signal_id;
        v_updated_signals := v_updated_signals + 1;
      END IF;
    END IF;

    IF v_before IS NULL OR v_before <> v_after THEN
      INSERT INTO public.audit_logs(
        actor, action, resource_type, resource_id,
        before_state, after_state, metadata
      ) VALUES (
        btrim(p_actor),
        CASE WHEN v_before IS NULL
          THEN 'growth.organic_search_signal_inserted'
          ELSE 'growth.organic_search_signal_revised'
        END,
        'market_signal',
        v_signal_id,
        v_before,
        v_after,
        jsonb_build_object(
          'batch_fingerprint', p_batch_fingerprint,
          'approval_reference', btrim(p_approval_reference),
          'raw_csv_retained', false,
          'raw_queries_retained', false,
          'provider_call_performed', false,
          'content_published', false
        )
      );
    END IF;

    IF v_row->>'opportunity_key' IS NOT NULL THEN
      v_opportunity_rows := v_opportunity_rows + 1;
      v_opportunity_evidence := v_signal_evidence || jsonb_build_object(
        'signal_external_id', v_row->>'signal_external_id',
        'policy_ctr_threshold', (v_row->>'policy_ctr_threshold')::numeric,
        'demand_points', (v_row->>'demand_points')::integer,
        'accessibility_points', (v_row->>'accessibility_points')::integer,
        'click_gap_points', (v_row->>'click_gap_points')::integer
      );

      SELECT * INTO v_existing_opportunity
        FROM public.market_opportunities
       WHERE opportunity_key = v_row->>'opportunity_key'
       FOR UPDATE;

      IF NOT FOUND THEN
        v_after := jsonb_build_object(
          'opportunity_key', v_row->>'opportunity_key',
          'opportunity_type', v_row->>'opportunity_type',
          'geography', v_geography,
          'segment', v_row->>'page_host',
          'title', v_row->>'opportunity_title',
          'rationale', v_row->>'opportunity_rationale',
          'score', (v_row->>'opportunity_score')::numeric,
          'confidence', (v_row->>'confidence')::numeric,
          'action_class', 'recommend',
          'status', 'detected',
          'evidence', v_opportunity_evidence
        );
        INSERT INTO public.market_opportunities(
          opportunity_key, opportunity_type, geography, segment,
          title, rationale, score, confidence, action_class, status,
          evidence, detected_at, metadata
        ) VALUES (
          v_row->>'opportunity_key', v_row->>'opportunity_type', v_geography,
          v_row->>'page_host', v_row->>'opportunity_title',
          v_row->>'opportunity_rationale', (v_row->>'opportunity_score')::numeric,
          (v_row->>'confidence')::numeric, 'recommend', 'detected',
          v_opportunity_evidence, v_observed_at,
          jsonb_build_object(
            'import_version', 'search_console_page_csv_v1',
            'batch_fingerprint', p_batch_fingerprint,
            'content_published', false
          )
        ) RETURNING id INTO v_opportunity_id;
        v_before := NULL;
        v_inserted_opportunities := v_inserted_opportunities + 1;
      ELSE
        v_opportunity_id := v_existing_opportunity.id;
        v_before := jsonb_build_object(
          'opportunity_key', v_existing_opportunity.opportunity_key,
          'opportunity_type', v_existing_opportunity.opportunity_type,
          'geography', v_existing_opportunity.geography,
          'segment', v_existing_opportunity.segment,
          'title', v_existing_opportunity.title,
          'rationale', v_existing_opportunity.rationale,
          'score', v_existing_opportunity.score,
          'confidence', v_existing_opportunity.confidence,
          'action_class', v_existing_opportunity.action_class,
          'status', v_existing_opportunity.status,
          'evidence', v_existing_opportunity.evidence
        );
        v_after := jsonb_build_object(
          'opportunity_key', v_existing_opportunity.opportunity_key,
          'opportunity_type', v_row->>'opportunity_type',
          'geography', v_geography,
          'segment', v_row->>'page_host',
          'title', v_row->>'opportunity_title',
          'rationale', v_row->>'opportunity_rationale',
          'score', (v_row->>'opportunity_score')::numeric,
          'confidence', (v_row->>'confidence')::numeric,
          'action_class', v_existing_opportunity.action_class,
          'status', v_existing_opportunity.status,
          'evidence', v_opportunity_evidence
        );
        IF v_before = v_after THEN
          v_unchanged_opportunities := v_unchanged_opportunities + 1;
        ELSE
          UPDATE public.market_opportunities
             SET opportunity_type = v_row->>'opportunity_type',
                 geography = v_geography,
                 segment = v_row->>'page_host',
                 title = v_row->>'opportunity_title',
                 rationale = v_row->>'opportunity_rationale',
                 score = (v_row->>'opportunity_score')::numeric,
                 confidence = (v_row->>'confidence')::numeric,
                 evidence = v_opportunity_evidence,
                 metadata = v_existing_opportunity.metadata || jsonb_build_object(
                   'last_import_version', 'search_console_page_csv_v1',
                   'last_batch_fingerprint', p_batch_fingerprint,
                   'content_published', false
                 ),
                 updated_at = now()
           WHERE id = v_opportunity_id;
          v_updated_opportunities := v_updated_opportunities + 1;
        END IF;
      END IF;

      IF v_before IS NULL OR v_before <> v_after THEN
        INSERT INTO public.audit_logs(
          actor, action, resource_type, resource_id,
          before_state, after_state, metadata
        ) VALUES (
          btrim(p_actor),
          CASE WHEN v_before IS NULL
            THEN 'growth.organic_search_opportunity_inserted'
            ELSE 'growth.organic_search_opportunity_revised'
          END,
          'market_opportunity',
          v_opportunity_id,
          v_before,
          v_after,
          jsonb_build_object(
            'batch_fingerprint', p_batch_fingerprint,
            'approval_reference', btrim(p_approval_reference),
            'raw_csv_retained', false,
            'raw_queries_retained', false,
            'provider_call_performed', false,
            'content_published', false,
            'operator_status_preserved', v_before IS NOT NULL
          )
        );
      END IF;
    END IF;
  END LOOP;

  SELECT count(*)::integer,
         COALESCE(sum(impressions), 0)::bigint,
         COALESCE(sum(clicks), 0)::bigint,
         CASE WHEN COALESCE(sum(impressions), 0) = 0 THEN 0
              ELSE round(sum(clicks)::numeric / sum(impressions)::numeric, 8)
         END,
         min(start_date),
         max(end_date),
         jsonb_agg(DISTINCT site_property ORDER BY site_property),
         jsonb_agg(DISTINCT page_host ORDER BY page_host)
    INTO v_row_count, v_impressions_total, v_clicks_total, v_ctr_total,
         v_date_start, v_date_end, v_site_properties, v_page_hosts
    FROM jsonb_to_recordset(p_rows) AS row_data(
      start_date date,
      end_date date,
      site_property text,
      page_host text,
      clicks bigint,
      impressions bigint
    );

  INSERT INTO public.audit_logs(
    actor, action, resource_type, resource_id,
    before_state, after_state, metadata
  ) VALUES (
    btrim(p_actor),
    'growth.organic_search_batch_imported',
    'organic_search_import_batch',
    v_batch_id,
    NULL,
    jsonb_build_object(
      'batch_fingerprint', p_batch_fingerprint,
      'row_count', v_row_count,
      'inserted_signals', v_inserted_signals,
      'updated_signals', v_updated_signals,
      'unchanged_signals', v_unchanged_signals,
      'opportunity_rows', v_opportunity_rows,
      'inserted_opportunities', v_inserted_opportunities,
      'updated_opportunities', v_updated_opportunities,
      'unchanged_opportunities', v_unchanged_opportunities,
      'impressions_total', v_impressions_total,
      'clicks_total', v_clicks_total,
      'ctr_total', v_ctr_total,
      'date_start', v_date_start,
      'date_end', v_date_end,
      'site_properties', v_site_properties,
      'page_hosts', v_page_hosts
    ),
    jsonb_build_object(
      'import_version', 'search_console_page_csv_v1',
      'approval_reference', btrim(p_approval_reference),
      'source_coverage', 'operator_export_not_guaranteed_exhaustive',
      'raw_csv_retained', false,
      'raw_queries_retained', false,
      'provider_call_performed', false,
      'content_published', false,
      'consumer_action_performed', false
    )
  ) RETURNING id INTO v_audit_id;

  INSERT INTO public.organic_search_import_batches(
    id, batch_fingerprint, import_version, row_count,
    inserted_signals, updated_signals, unchanged_signals,
    opportunity_rows, inserted_opportunities, updated_opportunities,
    unchanged_opportunities, impressions_total, clicks_total, ctr_total,
    date_start, date_end, site_properties, page_hosts,
    approval_reference, imported_by, audit_id, metadata
  ) VALUES (
    v_batch_id, p_batch_fingerprint, 'search_console_page_csv_v1', v_row_count,
    v_inserted_signals, v_updated_signals, v_unchanged_signals,
    v_opportunity_rows, v_inserted_opportunities, v_updated_opportunities,
    v_unchanged_opportunities, v_impressions_total, v_clicks_total, v_ctr_total,
    v_date_start, v_date_end, v_site_properties, v_page_hosts,
    btrim(p_approval_reference), btrim(p_actor), v_audit_id,
    jsonb_build_object(
      'source_coverage', 'operator_export_not_guaranteed_exhaustive',
      'raw_csv_retained', false,
      'raw_queries_retained', false,
      'provider_call_performed', false,
      'content_published', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'batch_id', v_batch_id,
    'audit_id', v_audit_id,
    'idempotent_replay', false,
    'row_count', v_row_count,
    'inserted_signals', v_inserted_signals,
    'updated_signals', v_updated_signals,
    'unchanged_signals', v_unchanged_signals,
    'opportunity_rows', v_opportunity_rows,
    'inserted_opportunities', v_inserted_opportunities,
    'updated_opportunities', v_updated_opportunities,
    'unchanged_opportunities', v_unchanged_opportunities
  );
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR
       numeric_value_out_of_range OR string_data_right_truncation OR
       datetime_field_overflow THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_organic_search_batch');
  WHEN unique_violation OR foreign_key_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'organic_search_identity_conflict');
END;
$$;

REVOKE ALL ON FUNCTION public.import_organic_search_batch_v1(
  text, jsonb, text, text, text
) FROM PUBLIC;

DO $organic_search_import_function_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.import_organic_search_batch_v1(text, jsonb, text, text, text) FROM %I',
        role_name
      );
    END IF;
  END LOOP;
END;
$organic_search_import_function_privileges$;

COMMENT ON TABLE public.organic_search_import_batches IS
  'Append-only minimized receipts for operator-approved Search Console page-performance imports. Raw CSV and query text are never retained.';
COMMENT ON FUNCTION public.import_organic_search_batch_v1(
  text, jsonb, text, text, text
) IS
  'Atomically reconciles privacy-minimized owned-page search signals and advisory opportunities with immutable audit evidence; it cannot call Google or publish content.';

-- Functional rollback: disable GROWTH_SEARCH_IMPORT_ENABLED and revert the
-- application. Preserve signals, opportunities, receipts, and audit evidence.
-- Historical deletion is destructive and intentionally not part of rollback.
