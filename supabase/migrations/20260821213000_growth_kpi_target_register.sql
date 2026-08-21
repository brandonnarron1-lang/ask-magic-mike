-- Phase 9 operator-approved KPI target register.
-- Additive, append-only, server-only, and deliberately empty at migration time.
-- The register stores evidence-backed target versions; it does not set targets,
-- alter leads, launch campaigns, contact consumers, spend, or call providers.

CREATE TABLE IF NOT EXISTS public.growth_kpi_target_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  metric_key text NOT NULL CHECK (metric_key IN (
    'useful_source_attribution_rate',
    'median_first_response_minutes',
    'p75_first_response_minutes',
    'p90_first_response_minutes',
    'contactable_rate',
    'qualification_rate',
    'appointment_set_rate',
    'appointment_held_rate',
    'signed_client_rate',
    'close_rate',
    'stale_lead_inventory',
    'database_reactivation_rate',
    'cost_per_lead',
    'cost_per_qualified_lead',
    'cost_per_appointment',
    'cost_per_signed_client',
    'cost_per_close',
    'attributed_revenue',
    'referral_cost',
    'return_on_ad_spend',
    'margin_after_acquisition_cost',
    'owned_demand_share',
    'rented_demand_share',
    'agent_acceptance_rate',
    'agent_follow_up_rate',
    'agent_conversion_rate',
    'experiment_velocity',
    'experiment_decision_quality',
    'p75_largest_contentful_paint_ms',
    'p75_interaction_to_next_paint_ms',
    'p75_cumulative_layout_shift',
    'critical_accessibility_issue_count',
    'mobile_funnel_technical_success_rate',
    'durable_funnel_completion_rate',
    'notification_failure_rate',
    'bounce_rate',
    'opt_out_rate',
    'complaint_rate'
  )),
  metric_unit text NOT NULL CHECK (metric_unit IN (
    'percentage', 'minutes', 'milliseconds', 'count', 'usd', 'ratio', 'score'
  )),
  direction text NOT NULL CHECK (direction IN (
    'higher_is_better', 'lower_is_better'
  )),
  status text NOT NULL CHECK (status IN ('draft', 'approved', 'retired')),
  target_value numeric,
  baseline_value numeric,
  baseline_state text NOT NULL CHECK (baseline_state IN (
    'measured', 'directional', 'insufficient_sample',
    'not_instrumented', 'unavailable'
  )),
  baseline_sample_size integer NOT NULL CHECK (baseline_sample_size >= 0),
  baseline_window_days integer NOT NULL CHECK (baseline_window_days IN (30, 90, 365)),
  baseline_evidence_sha256 text NOT NULL CHECK (
    baseline_evidence_sha256 ~ '^[0-9a-f]{64}$'
  ),
  baseline_observed_at timestamptz NOT NULL,
  rationale text NOT NULL CHECK (length(btrim(rationale)) BETWEEN 20 AND 500),
  approval_reference text,
  recorded_by text NOT NULL CHECK (length(btrim(recorded_by)) BETWEEN 1 AND 180),
  is_test boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  CHECK (baseline_observed_at <= created_at + interval '5 minutes'),
  CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (
    (baseline_state IN ('measured', 'directional') AND baseline_value IS NOT NULL)
    OR (
      baseline_state IN ('insufficient_sample', 'not_instrumented', 'unavailable')
      AND baseline_value IS NULL
    )
  ),
  CHECK (
    target_value IS NULL
    OR (baseline_state = 'measured' AND baseline_value IS NOT NULL)
  ),
  CHECK (
    (metric_unit = 'percentage' AND target_value BETWEEN 0 AND 100)
    OR (metric_unit = 'minutes' AND target_value BETWEEN 0 AND 10080)
    OR (metric_unit = 'milliseconds' AND target_value BETWEEN 0 AND 600000)
    OR (metric_unit = 'count' AND target_value BETWEEN 0 AND 1000000000 AND target_value = trunc(target_value))
    OR (metric_unit = 'usd' AND target_value BETWEEN 0 AND 1000000000000)
    OR (metric_unit = 'ratio' AND target_value BETWEEN 0 AND 1000000)
    OR (metric_unit = 'score' AND target_value BETWEEN 0 AND 100)
    OR target_value IS NULL
  ),
  CHECK (
    (metric_unit = 'percentage' AND baseline_value BETWEEN 0 AND 100)
    OR (metric_unit = 'minutes' AND baseline_value BETWEEN 0 AND 10080)
    OR (metric_unit = 'milliseconds' AND baseline_value BETWEEN 0 AND 600000)
    OR (metric_unit = 'count' AND baseline_value BETWEEN 0 AND 1000000000 AND baseline_value = trunc(baseline_value))
    OR (metric_unit = 'usd' AND baseline_value BETWEEN 0 AND 1000000000000)
    OR (metric_unit = 'ratio' AND baseline_value BETWEEN 0 AND 1000000)
    OR (metric_unit = 'score' AND baseline_value BETWEEN 0 AND 100)
    OR baseline_value IS NULL
  ),
  CHECK (
    (metric_key IN (
      'useful_source_attribution_rate', 'contactable_rate', 'qualification_rate',
      'appointment_set_rate', 'appointment_held_rate', 'signed_client_rate',
      'close_rate', 'database_reactivation_rate', 'owned_demand_share',
      'rented_demand_share', 'agent_acceptance_rate', 'agent_follow_up_rate',
      'agent_conversion_rate', 'experiment_decision_quality',
      'mobile_funnel_technical_success_rate', 'durable_funnel_completion_rate',
      'notification_failure_rate', 'bounce_rate', 'opt_out_rate', 'complaint_rate'
    ) AND metric_unit = 'percentage')
    OR (metric_key IN (
      'median_first_response_minutes', 'p75_first_response_minutes',
      'p90_first_response_minutes'
    ) AND metric_unit = 'minutes')
    OR (metric_key IN (
      'p75_largest_contentful_paint_ms', 'p75_interaction_to_next_paint_ms'
    ) AND metric_unit = 'milliseconds')
    OR (metric_key IN (
      'stale_lead_inventory', 'experiment_velocity', 'critical_accessibility_issue_count'
    ) AND metric_unit = 'count')
    OR (metric_key IN (
      'cost_per_lead', 'cost_per_qualified_lead', 'cost_per_appointment',
      'cost_per_signed_client', 'cost_per_close', 'attributed_revenue',
      'referral_cost', 'margin_after_acquisition_cost'
    ) AND metric_unit = 'usd')
    OR (metric_key = 'return_on_ad_spend' AND metric_unit = 'ratio')
    OR (metric_key = 'p75_cumulative_layout_shift' AND metric_unit = 'score')
  ),
  CHECK (
    (metric_key IN (
      'useful_source_attribution_rate', 'contactable_rate', 'qualification_rate',
      'appointment_set_rate', 'appointment_held_rate', 'signed_client_rate',
      'close_rate', 'database_reactivation_rate', 'attributed_revenue',
      'return_on_ad_spend', 'margin_after_acquisition_cost', 'owned_demand_share',
      'agent_acceptance_rate', 'agent_follow_up_rate', 'agent_conversion_rate',
      'experiment_velocity', 'experiment_decision_quality',
      'mobile_funnel_technical_success_rate', 'durable_funnel_completion_rate'
    ) AND direction = 'higher_is_better')
    OR (metric_key IN (
      'median_first_response_minutes', 'p75_first_response_minutes',
      'p90_first_response_minutes', 'stale_lead_inventory', 'cost_per_lead',
      'cost_per_qualified_lead', 'cost_per_appointment', 'cost_per_signed_client',
      'cost_per_close', 'referral_cost', 'rented_demand_share',
      'p75_largest_contentful_paint_ms', 'p75_interaction_to_next_paint_ms',
      'p75_cumulative_layout_shift', 'critical_accessibility_issue_count',
      'notification_failure_rate', 'bounce_rate', 'opt_out_rate', 'complaint_rate'
    ) AND direction = 'lower_is_better')
  ),
  CHECK (
    (status = 'draft' AND approval_reference IS NULL)
    OR (
      status = 'approved'
      AND target_value IS NOT NULL
      AND baseline_state = 'measured'
      AND baseline_value IS NOT NULL
      AND approval_reference IS NOT NULL
      AND length(btrim(approval_reference)) BETWEEN 4 AND 160
    )
    OR (
      status = 'retired'
      AND target_value IS NULL
      AND approval_reference IS NOT NULL
      AND length(btrim(approval_reference)) BETWEEN 4 AND 160
    )
  )
);

CREATE INDEX IF NOT EXISTS growth_kpi_target_versions_metric_idx
  ON public.growth_kpi_target_versions(metric_key, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS growth_kpi_target_versions_approved_idx
  ON public.growth_kpi_target_versions(metric_key, created_at DESC)
  WHERE status = 'approved' AND is_test = false;

ALTER TABLE public.growth_kpi_target_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.growth_kpi_target_versions FROM PUBLIC;

DROP TRIGGER IF EXISTS growth_kpi_target_versions_reject_change
  ON public.growth_kpi_target_versions;
CREATE TRIGGER growth_kpi_target_versions_reject_change
  BEFORE UPDATE OR DELETE ON public.growth_kpi_target_versions
  FOR EACH ROW EXECUTE FUNCTION public.amm_reject_immutable_change();

DO $growth_kpi_target_table_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.growth_kpi_target_versions FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.growth_kpi_target_versions FROM service_role';
    EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';
    EXECUTE 'GRANT SELECT, INSERT ON TABLE public.growth_kpi_target_versions TO service_role';
  END IF;
END;
$growth_kpi_target_table_privileges$;

CREATE OR REPLACE FUNCTION public.record_growth_kpi_target_version_v1(
  p_idempotency_key text,
  p_metric_key text,
  p_metric_unit text,
  p_direction text,
  p_target_value numeric,
  p_status text,
  p_baseline_state text,
  p_baseline_value numeric,
  p_baseline_evidence_sha256 text,
  p_baseline_sample_size integer,
  p_baseline_window_days integer,
  p_rationale text,
  p_approval_reference text,
  p_baseline_observed_at timestamptz,
  p_actor text,
  p_is_test boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version_id uuid;
  v_audit_id uuid;
  v_existing boolean := false;
  v_expected_unit text;
  v_expected_direction text;
BEGIN
  v_expected_unit := CASE
    WHEN p_metric_key IN (
      'useful_source_attribution_rate', 'contactable_rate', 'qualification_rate',
      'appointment_set_rate', 'appointment_held_rate', 'signed_client_rate',
      'close_rate', 'database_reactivation_rate', 'owned_demand_share',
      'rented_demand_share', 'agent_acceptance_rate', 'agent_follow_up_rate',
      'agent_conversion_rate', 'experiment_decision_quality',
      'mobile_funnel_technical_success_rate', 'durable_funnel_completion_rate',
      'notification_failure_rate', 'bounce_rate', 'opt_out_rate', 'complaint_rate'
    ) THEN 'percentage'
    WHEN p_metric_key IN (
      'median_first_response_minutes', 'p75_first_response_minutes',
      'p90_first_response_minutes'
    ) THEN 'minutes'
    WHEN p_metric_key IN (
      'p75_largest_contentful_paint_ms', 'p75_interaction_to_next_paint_ms'
    ) THEN 'milliseconds'
    WHEN p_metric_key IN (
      'stale_lead_inventory', 'experiment_velocity', 'critical_accessibility_issue_count'
    ) THEN 'count'
    WHEN p_metric_key IN (
      'cost_per_lead', 'cost_per_qualified_lead', 'cost_per_appointment',
      'cost_per_signed_client', 'cost_per_close', 'attributed_revenue',
      'referral_cost', 'margin_after_acquisition_cost'
    ) THEN 'usd'
    WHEN p_metric_key = 'return_on_ad_spend' THEN 'ratio'
    WHEN p_metric_key = 'p75_cumulative_layout_shift' THEN 'score'
    ELSE NULL
  END;
  v_expected_direction := CASE
    WHEN p_metric_key IN (
      'useful_source_attribution_rate', 'contactable_rate', 'qualification_rate',
      'appointment_set_rate', 'appointment_held_rate', 'signed_client_rate',
      'close_rate', 'database_reactivation_rate', 'attributed_revenue',
      'return_on_ad_spend', 'margin_after_acquisition_cost', 'owned_demand_share',
      'agent_acceptance_rate', 'agent_follow_up_rate', 'agent_conversion_rate',
      'experiment_velocity', 'experiment_decision_quality',
      'mobile_funnel_technical_success_rate', 'durable_funnel_completion_rate'
    ) THEN 'higher_is_better'
    WHEN p_metric_key IN (
      'median_first_response_minutes', 'p75_first_response_minutes',
      'p90_first_response_minutes', 'stale_lead_inventory', 'cost_per_lead',
      'cost_per_qualified_lead', 'cost_per_appointment', 'cost_per_signed_client',
      'cost_per_close', 'referral_cost', 'rented_demand_share',
      'p75_largest_contentful_paint_ms', 'p75_interaction_to_next_paint_ms',
      'p75_cumulative_layout_shift', 'critical_accessibility_issue_count',
      'notification_failure_rate', 'bounce_rate', 'opt_out_rate', 'complaint_rate'
    ) THEN 'lower_is_better'
    ELSE NULL
  END;

  IF p_idempotency_key !~ '^[0-9a-f]{64}$' OR
     p_baseline_evidence_sha256 !~ '^[0-9a-f]{64}$' OR
     v_expected_unit IS NULL OR p_metric_unit <> v_expected_unit OR
     v_expected_direction IS NULL OR p_direction <> v_expected_direction OR
     p_status NOT IN ('draft', 'approved', 'retired') OR
     p_baseline_state NOT IN (
       'measured', 'directional', 'insufficient_sample',
       'not_instrumented', 'unavailable'
     ) OR
     p_baseline_sample_size < 0 OR
     p_baseline_window_days NOT IN (30, 90, 365) OR
     p_baseline_observed_at IS NULL OR p_baseline_observed_at > now() + interval '5 minutes' OR
     p_actor IS NULL OR length(btrim(p_actor)) NOT BETWEEN 1 AND 180 OR
     p_rationale IS NULL OR length(btrim(p_rationale)) NOT BETWEEN 20 AND 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kpi_target_version');
  END IF;

  IF (
    (p_baseline_state IN ('measured', 'directional') AND p_baseline_value IS NULL)
    OR (
      p_baseline_state IN ('insufficient_sample', 'not_instrumented', 'unavailable')
      AND p_baseline_value IS NOT NULL
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kpi_target_version');
  END IF;

  IF p_target_value IS NOT NULL AND (
    p_baseline_state <> 'measured' OR p_baseline_value IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'measured_kpi_baseline_and_approval_required');
  END IF;

  IF p_status = 'approved' AND (
    p_target_value IS NULL OR p_baseline_state <> 'measured' OR
    p_baseline_value IS NULL OR p_approval_reference IS NULL OR
    length(btrim(p_approval_reference)) NOT BETWEEN 4 AND 160
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'measured_kpi_baseline_and_approval_required');
  END IF;
  IF p_status = 'draft' AND p_approval_reference IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'draft_kpi_target_cannot_claim_approval');
  END IF;
  IF p_status = 'retired' AND (
    p_target_value IS NOT NULL OR p_approval_reference IS NULL OR
    length(btrim(p_approval_reference)) NOT BETWEEN 4 AND 160
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kpi_target_retirement');
  END IF;

  INSERT INTO public.growth_kpi_target_versions(
    idempotency_key,
    metric_key,
    metric_unit,
    direction,
    status,
    target_value,
    baseline_value,
    baseline_state,
    baseline_sample_size,
    baseline_window_days,
    baseline_evidence_sha256,
    baseline_observed_at,
    rationale,
    approval_reference,
    recorded_by,
    is_test,
    metadata
  ) VALUES (
    p_idempotency_key,
    p_metric_key,
    p_metric_unit,
    p_direction,
    p_status,
    p_target_value,
    p_baseline_value,
    p_baseline_state,
    p_baseline_sample_size,
    p_baseline_window_days,
    p_baseline_evidence_sha256,
    p_baseline_observed_at,
    btrim(p_rationale),
    NULLIF(btrim(p_approval_reference), ''),
    btrim(p_actor),
    COALESCE(p_is_test, false),
    jsonb_build_object(
      'register_version', 'v1',
      'scope_type', 'portfolio',
      'browser_baseline_accepted', false,
      'external_mutation_performed', false
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_version_id;

  IF v_version_id IS NULL THEN
    SELECT id INTO v_version_id
      FROM public.growth_kpi_target_versions
     WHERE idempotency_key = p_idempotency_key;
    v_existing := true;
  ELSE
    INSERT INTO public.audit_logs(
      actor,
      action,
      resource_type,
      resource_id,
      before_state,
      after_state,
      metadata
    ) VALUES (
      p_actor,
      'growth.kpi_target_version_recorded',
      'growth_kpi_target',
      v_version_id,
      NULL,
      jsonb_build_object(
        'metric_key', p_metric_key,
        'status', p_status,
        'target_value', p_target_value,
        'metric_unit', p_metric_unit
      ),
      jsonb_build_object(
        'baseline_state', p_baseline_state,
        'baseline_value', p_baseline_value,
        'baseline_sample_size', p_baseline_sample_size,
        'baseline_window_days', p_baseline_window_days,
        'baseline_evidence_sha256', p_baseline_evidence_sha256,
        'is_test', COALESCE(p_is_test, false),
        'external_mutation_performed', false
      )
    ) RETURNING id INTO v_audit_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'version_id', v_version_id,
    'audit_id', v_audit_id,
    'idempotent_replay', v_existing
  );
EXCEPTION
  WHEN check_violation OR invalid_text_representation OR string_data_right_truncation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kpi_target_version');
END;
$$;

REVOKE ALL ON FUNCTION public.record_growth_kpi_target_version_v1(
  text, text, text, text, numeric, text, text, numeric, text,
  integer, integer, text, text, timestamptz, text, boolean
) FROM PUBLIC;

DO $growth_kpi_target_function_privileges$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.record_growth_kpi_target_version_v1(text, text, text, text, numeric, text, text, numeric, text, integer, integer, text, text, timestamptz, text, boolean) FROM %I',
        role_name
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE
      'GRANT EXECUTE ON FUNCTION public.record_growth_kpi_target_version_v1(text, text, text, text, numeric, text, text, numeric, text, integer, integer, text, text, timestamptz, text, boolean) TO service_role';
  END IF;
END;
$growth_kpi_target_function_privileges$;

COMMENT ON TABLE public.growth_kpi_target_versions IS
  'Append-only portfolio KPI target versions. Approved targets require a measured canonical baseline and explicit approval reference. No target rows are seeded by migration.';
COMMENT ON FUNCTION public.record_growth_kpi_target_version_v1(
  text, text, text, text, numeric, text, text, numeric, text,
  integer, integer, text, text, timestamptz, text, boolean
) IS
  'Idempotently records one server-resolved KPI target version plus an immutable audit event. It cannot mutate leads, campaigns, providers, or consumer communications.';
