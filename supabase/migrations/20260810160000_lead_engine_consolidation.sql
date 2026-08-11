-- Same-day lead engine enrichment. Additive only: the existing atomic capture
-- RPC remains the durable first write, then the API enriches the same record
-- before any provider notification is attempted.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score SMALLINT,
  ADD COLUMN IF NOT EXISTS score_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS score_version TEXT,
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_language_text TEXT,
  ADD COLUMN IF NOT EXISTS consent_source TEXT,
  ADD COLUMN IF NOT EXISTS consent_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS consent_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS communication_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS routing_reason TEXT,
  ADD COLUMN IF NOT EXISTS target_geography TEXT,
  ADD COLUMN IF NOT EXISTS financing TEXT,
  ADD COLUMN IF NOT EXISTS preapproval BOOLEAN,
  ADD COLUMN IF NOT EXISTS request_idempotency_key TEXT;

-- The existing canonical taxonomy predates open-house registration. Extend its
-- check constraint before the public open-house route is enabled.
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_lead_type_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_lead_type_check
  CHECK (lead_type IN (
    'buyer', 'seller', 'seller_cash_offer', 'investor', 'listing_inquiry',
    'open_house', 'home_value', 'relocation', 'renter', 'agent_referral',
    'general_question', 'unknown'
  ));

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_score_range;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100));

CREATE INDEX IF NOT EXISTS idx_leads_is_test_created_at
  ON public.leads(is_test, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score_created_at
  ON public.leads(score DESC NULLS LAST, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_request_idempotency_key
  ON public.leads(request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;

ALTER TABLE public.source_attribution
  ADD COLUMN IF NOT EXISTS first_touch JSONB,
  ADD COLUMN IF NOT EXISTS last_touch JSONB,
  ADD COLUMN IF NOT EXISTS click_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS placement_id TEXT,
  ADD COLUMN IF NOT EXISTS page_title TEXT,
  ADD COLUMN IF NOT EXISTS listing_id TEXT,
  ADD COLUMN IF NOT EXISTS property_id TEXT,
  ADD COLUMN IF NOT EXISTS agent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_source_attr_placement
  ON public.source_attribution(placement_id)
  WHERE placement_id IS NOT NULL;

-- Internal broker alerts do not have an agent_id. Preserve the existing agent
-- invariant while allowing one canonical internal notification outbox.
ALTER TABLE public.lead_notifications
  DROP CONSTRAINT IF EXISTS lead_notifications_agent_recipient;
ALTER TABLE public.lead_notifications
  DROP CONSTRAINT IF EXISTS lead_notifications_recipient_type_check;
ALTER TABLE public.lead_notifications
  ADD CONSTRAINT lead_notifications_recipient_type_check
  CHECK (recipient_type IN ('agent', 'customer', 'internal'));
ALTER TABLE public.lead_notifications
  ADD CONSTRAINT lead_notifications_agent_recipient
  CHECK (recipient_type <> 'agent' OR agent_id IS NOT NULL);

COMMENT ON COLUMN public.leads.is_test IS
  'Synthetic QA lead marker. Exclude from production KPIs and suppress contact.';
COMMENT ON COLUMN public.leads.score_factors IS
  'Explainable deterministic scoring factors; never protected-class data.';
COMMENT ON COLUMN public.lead_notifications.recipient_reference IS
  'Minimized recipient reference. BCC values and provider secrets are never stored here.';
