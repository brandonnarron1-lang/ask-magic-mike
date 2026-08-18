-- Phase 9 Growth Intelligence and Experiment Operating System.
-- Additive only. This migration does not activate consumer messaging, paid media,
-- autonomous mutations, or provider delivery. All recommendation and experiment
-- actions remain operator-reviewed and approval-gated.

CREATE TABLE IF NOT EXISTS public.marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key text NOT NULL UNIQUE,
  name text NOT NULL,
  vendor text NOT NULL,
  channel_type text NOT NULL CHECK (channel_type IN (
    'portal', 'search', 'social', 'display', 'referral', 'organic',
    'database', 'event', 'direct_mail', 'partner', 'outbound', 'other'
  )),
  buying_model text NOT NULL CHECK (buying_model IN (
    'owned', 'subscription', 'cpl', 'cpc', 'cpm', 'referral_fee', 'hybrid', 'free'
  )),
  territory text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.marketing_channels(id) ON DELETE RESTRICT,
  external_id text,
  campaign_key text NOT NULL UNIQUE,
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'lead_generation',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'paused', 'completed', 'archived'
  )),
  daily_budget_usd numeric(14,2) CHECK (daily_budget_usd IS NULL OR daily_budget_usd >= 0),
  lifetime_budget_usd numeric(14,2) CHECK (lifetime_budget_usd IS NULL OR lifetime_budget_usd >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  geography text,
  audience text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_campaigns_channel_external_idx
  ON public.marketing_campaigns(channel_id, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_campaigns_utm_idx
  ON public.marketing_campaigns(utm_source, utm_medium, utm_campaign);
CREATE INDEX IF NOT EXISTS marketing_campaigns_status_idx
  ON public.marketing_campaigns(status, starts_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.marketing_spend_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  spend_date date NOT NULL,
  spend_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (spend_usd >= 0),
  impressions bigint NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks bigint NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  platform_leads bigint NOT NULL DEFAULT 0 CHECK (platform_leads >= 0),
  booked_appointments bigint NOT NULL DEFAULT 0 CHECK (booked_appointments >= 0),
  source_system text NOT NULL,
  source_fingerprint text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, spend_date),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS marketing_spend_daily_date_idx
  ON public.marketing_spend_daily(spend_date DESC, campaign_id);

CREATE TABLE IF NOT EXISTS public.lead_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  outcome_type text NOT NULL CHECK (outcome_type IN (
    'qualified', 'appointment', 'agreement_signed', 'under_contract',
    'closed', 'lost', 'disqualified', 'referral_paid'
  )),
  amount_usd numeric(14,2) CHECK (amount_usd IS NULL OR amount_usd >= 0),
  occurred_at timestamptz NOT NULL,
  source_system text NOT NULL,
  external_id text,
  is_test boolean NOT NULL DEFAULT false,
  communication_suppressed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_outcomes_external_idx
  ON public.lead_outcomes(source_system, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_outcomes_lead_date_idx
  ON public.lead_outcomes(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lead_outcomes_type_date_idx
  ON public.lead_outcomes(outcome_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.growth_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text NOT NULL UNIQUE,
  name text NOT NULL,
  surface text NOT NULL,
  hypothesis text NOT NULL,
  primary_metric text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approval_required', 'scheduled', 'running', 'paused', 'concluded', 'archived'
  )),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'not_required', 'pending', 'approved', 'rejected'
  )),
  variants jsonb NOT NULL,
  allocation jsonb NOT NULL DEFAULT '{}'::jsonb,
  guardrails jsonb NOT NULL DEFAULT '[]'::jsonb,
  minimum_sample_size integer NOT NULL DEFAULT 100 CHECK (minimum_sample_size > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  owner text NOT NULL,
  decision text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(variants) = 'array'),
  CHECK (jsonb_array_length(variants) >= 2),
  CHECK (jsonb_typeof(allocation) = 'object'),
  CHECK (jsonb_typeof(guardrails) = 'array'),
  CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS growth_experiments_status_idx
  ON public.growth_experiments(status, starts_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.growth_experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.growth_experiments(id) ON DELETE CASCADE,
  subject_key text NOT NULL,
  variant_key text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (experiment_id, subject_key),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS growth_experiment_assignments_variant_idx
  ON public.growth_experiment_assignments(experiment_id, variant_key, assigned_at DESC);

CREATE TABLE IF NOT EXISTS public.growth_experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.growth_experiments(id) ON DELETE CASCADE,
  subject_key text NOT NULL,
  variant_key text NOT NULL,
  event_name text NOT NULL,
  event_value numeric(14,4),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS growth_experiment_events_idempotency_idx
  ON public.growth_experiment_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS growth_experiment_events_rollup_idx
  ON public.growth_experiment_events(experiment_id, event_name, variant_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.market_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL CHECK (signal_type IN (
    'portal_demand', 'search_demand', 'listing_supply', 'price_reduction',
    'days_on_market', 'seller_intent', 'buyer_intent', 'engagement',
    'competitive_gap', 'database_reactivation', 'referral', 'other'
  )),
  geography text,
  segment text,
  score numeric(7,4) NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  observed_at timestamptz NOT NULL,
  source_system text NOT NULL,
  external_id text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(evidence) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS market_signals_external_idx
  ON public.market_signals(source_system, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS market_signals_radar_idx
  ON public.market_signals(signal_type, geography, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.market_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_key text NOT NULL UNIQUE,
  opportunity_type text NOT NULL,
  geography text,
  segment text,
  title text NOT NULL,
  rationale text NOT NULL,
  score numeric(7,4) NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  estimated_value_usd numeric(14,2) CHECK (estimated_value_usd IS NULL OR estimated_value_usd >= 0),
  action_class text NOT NULL CHECK (action_class IN (
    'observe', 'recommend', 'draft', 'requires_approval', 'blocked'
  )),
  status text NOT NULL DEFAULT 'detected' CHECK (status IN (
    'detected', 'accepted', 'planned', 'active', 'dismissed', 'completed'
  )),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(evidence) = 'object'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS market_opportunities_priority_idx
  ON public.market_opportunities(status, score DESC, detected_at DESC);

CREATE TABLE IF NOT EXISTS public.growth_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_key text NOT NULL UNIQUE,
  scope text NOT NULL,
  title text NOT NULL,
  rationale text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 5),
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  action_class text NOT NULL CHECK (action_class IN (
    'observe', 'recommend', 'draft', 'requires_approval', 'blocked'
  )),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'approved', 'rejected', 'executed', 'expired'
  )),
  generated_by text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(evidence) = 'object'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS growth_recommendations_queue_idx
  ON public.growth_recommendations(status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vendor_ingest_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL,
  event_type text NOT NULL,
  external_event_id text NOT NULL,
  payload_hash text NOT NULL,
  signature_verified boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL CHECK (processing_status IN (
    'received', 'normalized', 'processed', 'ignored', 'failed', 'blocked'
  )),
  normalized_reference text,
  error_code text,
  occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (vendor, external_event_id),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS vendor_ingest_events_queue_idx
  ON public.vendor_ingest_events(processing_status, received_at DESC);

ALTER TABLE public.marketing_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_spend_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_ingest_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.marketing_channels FROM PUBLIC;
REVOKE ALL ON public.marketing_campaigns FROM PUBLIC;
REVOKE ALL ON public.marketing_spend_daily FROM PUBLIC;
REVOKE ALL ON public.lead_outcomes FROM PUBLIC;
REVOKE ALL ON public.growth_experiments FROM PUBLIC;
REVOKE ALL ON public.growth_experiment_assignments FROM PUBLIC;
REVOKE ALL ON public.growth_experiment_events FROM PUBLIC;
REVOKE ALL ON public.market_signals FROM PUBLIC;
REVOKE ALL ON public.market_opportunities FROM PUBLIC;
REVOKE ALL ON public.growth_recommendations FROM PUBLIC;
REVOKE ALL ON public.vendor_ingest_events FROM PUBLIC;

DO $phase9_privileges$
DECLARE
  role_name text;
  table_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY[
        'marketing_channels', 'marketing_campaigns', 'marketing_spend_daily',
        'lead_outcomes', 'growth_experiments', 'growth_experiment_assignments',
        'growth_experiment_events', 'market_signals', 'market_opportunities',
        'growth_recommendations', 'vendor_ingest_events'
      ]
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END
$phase9_privileges$;

COMMENT ON TABLE public.marketing_channels IS
  'Server-only channel registry for owned, paid, portal, referral, and database growth sources.';
COMMENT ON TABLE public.marketing_spend_daily IS
  'Daily campaign cost and delivery ledger used for CPL, cost-per-appointment, cost-per-close, and ROAS.';
COMMENT ON TABLE public.lead_outcomes IS
  'Canonical outcome and revenue ledger. Test and suppressed rows are excluded from business reporting.';
COMMENT ON TABLE public.growth_experiments IS
  'Approval-gated experiment registry. A running status never grants authority to send messages or buy media.';
COMMENT ON TABLE public.market_opportunities IS
  'Evidence-backed market opportunity queue. Action class controls whether the system may observe, draft, or require approval.';
COMMENT ON TABLE public.growth_recommendations IS
  'Advisory recommendation ledger. Recommendations cannot mutate leads, assignments, consent, campaigns, or provider state.';
COMMENT ON TABLE public.vendor_ingest_events IS
  'Idempotent minimized event ledger for portal, CRM, advertising, and marketing-provider imports; raw consumer payloads are prohibited.';
