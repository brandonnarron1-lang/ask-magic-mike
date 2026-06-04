-- Migration 00012: Canonical lead platform
--
-- Layers the lead-platform tables on top of the existing intake schema
-- (00001..00011). Everything in here is additive and idempotent — no data
-- is moved or destroyed. The existing `leads.primary_intent` enum stays;
-- a new `leads.lead_type` column carries the broader canonical taxonomy.

-- ─── Extend leads with canonical lead_type + dedup helpers ───────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (lead_type IN (
      'buyer','seller','seller_cash_offer','investor',
      'listing_inquiry','home_value','relocation','renter',
      'agent_referral','general_question','unknown'
    )),
  ADD COLUMN IF NOT EXISTS normalized_email TEXT,
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT,
  ADD COLUMN IF NOT EXISTS normalized_property_address TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS spam_score SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spam_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_of_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_detail TEXT,
  ADD COLUMN IF NOT EXISTS page_url TEXT,
  ADD COLUMN IF NOT EXISTS widget_session_id TEXT,
  ADD COLUMN IF NOT EXISTS listing_id UUID,
  ADD COLUMN IF NOT EXISTS lead_grade TEXT
    CHECK (lead_grade IN ('A+','A','B','C','D')),
  ADD COLUMN IF NOT EXISTS conversion_stage TEXT,
  ADD COLUMN IF NOT EXISTS closed_lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_response_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_won_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_lost_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_normalized_email ON leads(normalized_email) WHERE normalized_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone ON leads(normalized_phone) WHERE normalized_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_normalized_address ON leads(normalized_property_address) WHERE normalized_property_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id) WHERE listing_id IS NOT NULL;

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_by      TEXT NOT NULL DEFAULT 'system',

  title           TEXT NOT NULL,
  body            TEXT,
  due_at          TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','done','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','high','urgent')),
  category        TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_open ON tasks(due_at) WHERE status = 'open';

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Listings (public-safe) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  mls_number      TEXT UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('coming_soon','active','pending','contingent','closed','withdrawn','expired')),

  -- Public address (street/city/state/zip are public; full street + unit fine)
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  county          TEXT,
  state           TEXT NOT NULL DEFAULT 'NC',
  zip             TEXT,

  list_price      NUMERIC(12,2),
  beds            SMALLINT,
  baths_full      SMALLINT,
  baths_half      SMALLINT,
  sqft            INTEGER,
  acres           NUMERIC(10,4),
  year_built      SMALLINT,
  property_type   TEXT,

  public_remarks  TEXT,
  directions      TEXT,           -- only public-safe directions
  list_office     TEXT,
  dom             INTEGER,
  cdom            INTEGER,
  taxes           NUMERIC(12,2),

  source          TEXT NOT NULL DEFAULT 'csv_import'
                  CHECK (source IN ('csv_import','pdf_import','flexmls_api','idx','manual')),
  source_ref      TEXT,           -- import row id or external ref
  imported_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listings_mls ON listings(mls_number) WHERE mls_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_zip ON listings(zip) WHERE zip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(list_price) WHERE list_price IS NOT NULL;

CREATE OR REPLACE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Listing Photos (public-safe) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sequence        SMALLINT NOT NULL DEFAULT 0,
  url             TEXT NOT NULL,
  alt_text        TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  source          TEXT NOT NULL DEFAULT 'import'
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing ON listing_photos(listing_id, sequence);

-- ─── Listing Private Fields (admin/internal only) ───────────────────────────
CREATE TABLE IF NOT EXISTS listing_private_fields (
  listing_id      UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  agent_remarks   TEXT,
  lockbox_info    TEXT,
  showing_instructions TEXT,
  compensation    TEXT,           -- co-op/compensation
  owner_notes     TEXT,
  internal_notes  TEXT,
  raw_payload     JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER listing_private_fields_updated_at
  BEFORE UPDATE ON listing_private_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FlexMLS / listing imports ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flex_imports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by     TEXT NOT NULL DEFAULT 'system',
  source          TEXT NOT NULL CHECK (source IN ('csv','pdf','flexmls_api','idx')),
  file_name       TEXT,
  file_hash       TEXT,
  row_count       INTEGER NOT NULL DEFAULT 0,
  ok_count        INTEGER NOT NULL DEFAULT 0,
  error_count     INTEGER NOT NULL DEFAULT 0,
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_flex_imports_created_at ON flex_imports(created_at DESC);

-- ─── Listing matches (buyer ↔ listing) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  match_score     SMALLINT NOT NULL DEFAULT 0,
  match_reasons   JSONB NOT NULL DEFAULT '[]'::jsonb,
  shared_with_lead_at TIMESTAMPTZ,
  UNIQUE (lead_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_matches_lead ON listing_matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_listing_matches_listing ON listing_matches(listing_id);

-- Backfill the FK target on leads now that listings exists.
ALTER TABLE leads
  ADD CONSTRAINT leads_listing_id_fk
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL
  NOT VALID;
-- (NOT VALID skips backfill check; existing leads carry NULL listing_id.)

-- ─── Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  recipient_email TEXT,
  channel         TEXT NOT NULL CHECK (channel IN ('inapp','email','sms','push')),
  category        TEXT NOT NULL,    -- e.g. 'new_hot_lead', 'sla_breach', 'digest'
  title           TEXT NOT NULL,
  body            TEXT,
  payload         JSONB,
  read_at         TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_agent_unread ON notifications(recipient_agent_id) WHERE read_at IS NULL;

-- ─── Marketing templates + generated assets ─────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category        TEXT NOT NULL,
  channel         TEXT NOT NULL
                  CHECK (channel IN ('sms','email','social_post','reel_script','caption','flyer','landing_copy','ad_copy','call_script')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  variables       JSONB NOT NULL DEFAULT '[]'::jsonb,
  brand           TEXT NOT NULL DEFAULT 'ask_magic_mike',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_category ON marketing_templates(category, channel);

CREATE OR REPLACE TRIGGER marketing_templates_updated_at
  BEFORE UPDATE ON marketing_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS generated_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  template_id     UUID REFERENCES marketing_templates(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL,
  body            TEXT NOT NULL,
  source_fields   JSONB,            -- exactly which sanitized fields fed generation
  approved        BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  provider        TEXT NOT NULL DEFAULT 'deterministic_template'
);

CREATE INDEX IF NOT EXISTS idx_generated_assets_lead ON generated_assets(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_assets_listing ON generated_assets(listing_id) WHERE listing_id IS NOT NULL;

-- ─── Email + SMS templates (canonical, separate from marketing copy) ────────
CREATE TABLE IF NOT EXISTS sms_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  body            TEXT NOT NULL,
  variables       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_marketing    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS email_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  subject         TEXT NOT NULL,
  html            TEXT NOT NULL,
  text            TEXT NOT NULL,
  variables       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_marketing    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── Message deliveries (provider receipts / callbacks) ─────────────────────
CREATE TABLE IF NOT EXISTS message_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_id      UUID REFERENCES messages(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('sms','email')),
  provider        TEXT NOT NULL,
  provider_message_id TEXT,
  to_address      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sent','delivered','failed','bounced','undelivered','opened','clicked','replied')),
  error_code      TEXT,
  error_message   TEXT,
  raw_payload     JSONB
);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_lead ON message_deliveries(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_deliveries_provider ON message_deliveries(provider, provider_message_id);

-- ─── Integration accounts (provider creds metadata only — no secrets) ──────
CREATE TABLE IF NOT EXISTS integration_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider        TEXT NOT NULL,    -- twilio, sendgrid, flexmls, openai, etc.
  label           TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  -- ONLY metadata, never raw secrets. Secrets live in env / Vercel.
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (provider, label)
);

CREATE OR REPLACE TRIGGER integration_accounts_updated_at
  BEFORE UPDATE ON integration_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Webhook events (raw inbound captures) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider        TEXT NOT NULL,
  topic           TEXT NOT NULL,
  signature_ok    BOOLEAN,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ,
  process_error   TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed ON webhook_events(received_at) WHERE processed_at IS NULL;

-- ─── Saved views (admin filters) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_views (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT NOT NULL,
  name            TEXT NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'leads'
                  CHECK (scope IN ('leads','listings','tasks','notifications')),
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── Campaigns ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name            TEXT NOT NULL,
  utm_campaign    TEXT UNIQUE,
  channel         TEXT NOT NULL
                  CHECK (channel IN ('paid_social','google_ads','organic_social','email','sms','direct_mail','referral','wordpress','widget','other')),
  source          TEXT,
  budget_cents    BIGINT,
  spend_cents     BIGINT NOT NULL DEFAULT 0,
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaigns_utm ON campaigns(utm_campaign) WHERE utm_campaign IS NOT NULL;

CREATE OR REPLACE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS campaign_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id) WHERE campaign_id IS NOT NULL;

-- ─── RLS (deny anon/authenticated; service role bypasses) ────────────────────
ALTER TABLE tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_private_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE flex_imports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views            ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events        ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_deny_public                  ON tasks                  FOR ALL TO PUBLIC USING (false);
-- Listings: public-read of public columns is allowed via service role / API,
-- so we still deny public RLS access here. The public API filters columns.
CREATE POLICY listings_deny_public               ON listings               FOR ALL TO PUBLIC USING (false);
CREATE POLICY listing_photos_deny_public         ON listing_photos         FOR ALL TO PUBLIC USING (false);
CREATE POLICY listing_private_fields_deny_public ON listing_private_fields FOR ALL TO PUBLIC USING (false);
CREATE POLICY flex_imports_deny_public           ON flex_imports           FOR ALL TO PUBLIC USING (false);
CREATE POLICY listing_matches_deny_public        ON listing_matches        FOR ALL TO PUBLIC USING (false);
CREATE POLICY notifications_deny_public          ON notifications          FOR ALL TO PUBLIC USING (false);
CREATE POLICY marketing_templates_deny_public    ON marketing_templates    FOR ALL TO PUBLIC USING (false);
CREATE POLICY generated_assets_deny_public       ON generated_assets       FOR ALL TO PUBLIC USING (false);
CREATE POLICY sms_templates_deny_public          ON sms_templates          FOR ALL TO PUBLIC USING (false);
CREATE POLICY email_templates_deny_public        ON email_templates        FOR ALL TO PUBLIC USING (false);
CREATE POLICY message_deliveries_deny_public     ON message_deliveries     FOR ALL TO PUBLIC USING (false);
CREATE POLICY integration_accounts_deny_public   ON integration_accounts   FOR ALL TO PUBLIC USING (false);
CREATE POLICY webhook_events_deny_public         ON webhook_events         FOR ALL TO PUBLIC USING (false);
CREATE POLICY saved_views_deny_public            ON saved_views            FOR ALL TO PUBLIC USING (false);
CREATE POLICY campaigns_deny_public              ON campaigns              FOR ALL TO PUBLIC USING (false);
CREATE POLICY campaign_events_deny_public        ON campaign_events        FOR ALL TO PUBLIC USING (false);
