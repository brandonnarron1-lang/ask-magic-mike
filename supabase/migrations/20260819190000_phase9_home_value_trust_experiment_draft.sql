-- Phase 9.6 first controlled public-funnel experiment candidate.
--
-- This migration registers an approval-required draft only. It does not run
-- the experiment, change public copy, assign a visitor, record an event, or
-- enable PUBLIC_EXPERIMENTS_ENABLED. Production application requires its own
-- exact database-migration approval. Activation requires a later, separately
-- audited status/approval decision plus the server-only runtime master switch.

INSERT INTO public.growth_experiments (
  experiment_key,
  name,
  surface,
  hypothesis,
  primary_metric,
  status,
  approval_status,
  variants,
  allocation,
  guardrails,
  minimum_sample_size,
  owner,
  metadata
) VALUES (
  'home_value_trust_promise_v1',
  'Home value trust promise',
  '/home-value',
  'A more explicit broker-review promise will improve qualified appointment rate without weakening completion quality, accessibility, performance, or consumer trust.',
  'qualified_appointment_rate',
  'approval_required',
  'pending',
  '[
    {"key":"control","label":"Current trust promise","weight":50},
    {"key":"broker_review","label":"Broker-review promise","weight":50}
  ]'::jsonb,
  '{"strategy":"deterministic_weighted","subject":"anonymous_session_digest","total_weight":100}'::jsonb,
  '[
    "no_contactable_or_qualified_rate_decline",
    "no_spam_test_complaint_or_suppression_increase",
    "no_accessibility_or_keyboard_regression",
    "no_material_mobile_layout_shift_or_performance_regression",
    "no_automated_value_offer_availability_or_response_claim"
  ]'::jsonb,
  100,
  'Mike Eatmon / Our Town Properties',
  '{
    "action_class":"requires_approval",
    "diagnostic_metric":"durable_lead_rate",
    "minimum_relative_uplift_percent":10,
    "activation_master_switch":"PUBLIC_EXPERIMENTS_ENABLED",
    "registry_version":"home_value_trust_promise_v1",
    "search_test_mode":"same_url_dynamic_content"
  }'::jsonb
)
ON CONFLICT (experiment_key) DO NOTHING;

COMMENT ON TABLE public.growth_experiments IS
  'Approval-gated experiment registry. A running status never grants authority to send messages, buy media, publish content, or bypass the server runtime master switch.';
