-- Migration 00002: Leads table with full TCPA consent fields

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,                          -- E.164 format: +15551234567
  phone_normalized TEXT,                         -- stripped digits only

  -- Property of interest
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT NOT NULL DEFAULT 'FL',
  zip             TEXT,
  address_raw     TEXT,                          -- unstructured original input

  -- Intent
  primary_intent  TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (primary_intent IN ('sell','buy','both','unknown')),
  question_raw    TEXT,                          -- verbatim question from user
  timeline_months SMALLINT CHECK (timeline_months IN (0,3,6,12,24)),

  -- Consent (TCPA — immutable once written)
  consent_sms     BOOLEAN NOT NULL DEFAULT FALSE,
  consent_call    BOOLEAN NOT NULL DEFAULT FALSE,
  consent_email   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  consent_ip      INET,
  consent_language_version TEXT NOT NULL DEFAULT 'v1',

  -- CTA chip used on landing page
  cta_chip_used   TEXT CHECK (cta_chip_used IN (
    'home_worth','should_sell_now','tour_home','what_can_afford','talk_to_mike'
  )),

  -- Lead status
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','scored','assigned','contacted','nurture','dead','converted')),

  -- CRM sync
  crm_contact_id  TEXT,
  crm_lead_id     TEXT,
  crm_synced_at   TIMESTAMPTZ,

  CONSTRAINT uq_leads_session UNIQUE (session_id)
);

CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON leads(phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_primary_intent ON leads(primary_intent);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
