-- Phase 6 additive communication-permission, sequence, and AI audit structures.
-- Canonical lead and notification storage remains public.leads + public.lead_notifications.

CREATE TABLE IF NOT EXISTS public.communication_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'phone', 'push')),
  purpose text NOT NULL CHECK (purpose IN (
    'internal_alert', 'requested_service_response', 'transactional_acknowledgment',
    'appointment_coordination', 'property_alert_subscription', 'marketing_nurture',
    'manual_one_to_one', 'qa_test'
  )),
  state text NOT NULL CHECK (state IN ('allowed', 'denied', 'ambiguous', 'opted_out', 'held')),
  consent_text text,
  consent_version text,
  source text,
  form_id text,
  page_url text,
  evidence_at timestamptz,
  opted_out_at timestamptz,
  manual_review_required boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, channel, purpose)
);

CREATE TABLE IF NOT EXISTS public.communication_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  channel text NOT NULL,
  purpose text NOT NULL,
  allowed boolean NOT NULL,
  decision_code text NOT NULL,
  explanation text NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  actor text NOT NULL DEFAULT 'system',
  idempotency_key text NOT NULL UNIQUE,
  decided_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.message_sequence_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id text NOT NULL,
  sequence_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'approval_required', 'scheduled', 'paused', 'completed', 'cancelled', 'blocked')),
  started_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, sequence_id, sequence_version)
);

CREATE TABLE IF NOT EXISTS public.message_sequence_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_instance_id uuid NOT NULL REFERENCES public.message_sequence_instances(id) ON DELETE CASCADE,
  lead_notification_id uuid REFERENCES public.lead_notifications(id) ON DELETE SET NULL,
  step_index integer NOT NULL CHECK (step_index >= 0),
  template_id text NOT NULL,
  template_version text NOT NULL,
  scheduled_at timestamptz,
  status text NOT NULL CHECK (status IN ('draft', 'approval_required', 'scheduled', 'claimed', 'sent', 'failed', 'skipped', 'cancelled', 'blocked')),
  rendered_content_hash text,
  idempotency_key text NOT NULL UNIQUE,
  human_approved_by text,
  human_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_instance_id, step_index)
);

CREATE TABLE IF NOT EXISTS public.communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_notification_id uuid REFERENCES public.lead_notifications(id) ON DELETE SET NULL,
  provider_event_id text,
  event_type text NOT NULL,
  channel text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS communication_events_provider_event_uq
  ON public.communication_events(provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ai_lead_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  schema_version text NOT NULL,
  prompt_version text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('openai_responses', 'deterministic_fallback', 'blocked')),
  model text NOT NULL,
  output jsonb NOT NULL,
  input_fingerprint text NOT NULL,
  confidence numeric(5,4),
  is_test boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, schema_version, prompt_version, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  feature text NOT NULL,
  model text NOT NULL,
  mode text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  fallback_reason text,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communication_permissions_lead_idx ON public.communication_permissions(lead_id);
CREATE INDEX IF NOT EXISTS communication_decisions_lead_idx ON public.communication_decisions(lead_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS message_sequence_instances_lead_idx ON public.message_sequence_instances(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS communication_events_lead_idx ON public.communication_events(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ai_lead_intelligence_lead_idx ON public.ai_lead_intelligence(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_created_idx ON public.ai_usage_events(created_at DESC);

ALTER TABLE public.communication_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_sequence_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_sequence_step_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_lead_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.communication_permissions FROM PUBLIC;
REVOKE ALL ON public.communication_decisions FROM PUBLIC;
REVOKE ALL ON public.message_sequence_instances FROM PUBLIC;
REVOKE ALL ON public.message_sequence_step_runs FROM PUBLIC;
REVOKE ALL ON public.communication_events FROM PUBLIC;
REVOKE ALL ON public.ai_lead_intelligence FROM PUBLIC;
REVOKE ALL ON public.ai_usage_events FROM PUBLIC;

-- Supabase commonly provisions anon/authenticated roles; canonical Neon does not.
-- Keep the same least-privilege posture without making either provider mandatory.
DO $phase6_privileges$
DECLARE
  role_name text;
  table_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY[
        'communication_permissions',
        'communication_decisions',
        'message_sequence_instances',
        'message_sequence_step_runs',
        'communication_events',
        'ai_lead_intelligence',
        'ai_usage_events'
      ]
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END
$phase6_privileges$;
