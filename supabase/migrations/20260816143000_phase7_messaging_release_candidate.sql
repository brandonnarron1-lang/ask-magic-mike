-- Phase 7 additive release-candidate structures.
-- Phase 6 tables remain canonical; this migration adds version governance,
-- provider webhook audit, and safer sequence-control metadata only.

CREATE TABLE IF NOT EXISTS public.message_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  version text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'phone', 'call')),
  purpose text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'approved', 'retired')),
  subject text,
  body text NOT NULL,
  content_hash text NOT NULL,
  change_note text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);

CREATE INDEX IF NOT EXISTS message_template_versions_lookup_idx
  ON public.message_template_versions(template_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  provider_message_id text,
  event_type text NOT NULL,
  signature_verified boolean NOT NULL,
  processing_status text NOT NULL CHECK (processing_status IN ('processed', 'ignored', 'failed')),
  payload_hash text NOT NULL,
  error_code text,
  occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS provider_webhook_events_message_idx
  ON public.provider_webhook_events(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ai_intelligence_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  feature text NOT NULL DEFAULT 'lead_center_copilot',
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'blocked', 'cancelled')),
  request_key text NOT NULL UNIQUE,
  requested_by text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 2 CHECK (max_attempts > 0),
  not_before timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  result_id uuid REFERENCES public.ai_lead_intelligence(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_intelligence_jobs_queue_idx
  ON public.ai_intelligence_jobs(status, not_before, created_at);

ALTER TABLE public.message_sequence_instances
  ADD COLUMN IF NOT EXISTS last_transition_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_transition_by text,
  ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.message_sequence_instances
  DROP CONSTRAINT IF EXISTS message_sequence_instances_status_check;
ALTER TABLE public.message_sequence_instances
  ADD CONSTRAINT message_sequence_instances_status_check
  CHECK (status IN ('draft', 'approval_required', 'test', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'blocked', 'failed'));

ALTER TABLE public.message_sequence_step_runs
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS permission_decision_id uuid REFERENCES public.communication_decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0);

ALTER TABLE public.message_sequence_step_runs
  DROP CONSTRAINT IF EXISTS message_sequence_step_runs_status_check;
ALTER TABLE public.message_sequence_step_runs
  ADD CONSTRAINT message_sequence_step_runs_status_check
  CHECK (status IN ('draft', 'pending', 'permission_blocked', 'approval_required', 'scheduled',
                    'claimed', 'sent', 'delivered', 'failed', 'bounced', 'complained',
                    'replied', 'cancelled', 'skipped', 'opted_out', 'blocked'));

ALTER TABLE public.message_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_intelligence_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_template_versions FROM PUBLIC;
REVOKE ALL ON public.provider_webhook_events FROM PUBLIC;
REVOKE ALL ON public.ai_intelligence_jobs FROM PUBLIC;

DO $phase7_privileges$
DECLARE
  role_name text;
  table_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY['message_template_versions', 'provider_webhook_events', 'ai_intelligence_jobs']
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END
$phase7_privileges$;

COMMENT ON TABLE public.message_template_versions IS
  'Server-only immutable template release ledger; secrets and consumer PII are prohibited.';
COMMENT ON TABLE public.provider_webhook_events IS
  'Signature-verification and idempotency ledger for provider lifecycle events; raw payloads are not retained.';
COMMENT ON TABLE public.ai_intelligence_jobs IS
  'Durable, read-only AI advisory jobs. Jobs cannot mutate lead assignment, score, consent, or communication state.';
