-- Migration 00011: Schema v2
-- Adds contacts, source_attribution, consents, messages, agent_assignments,
-- compliance_flags, audit_logs tables. Fixes NC state default in leads.
-- Idempotent via IF NOT EXISTS / DO $$ ... END.

-- ─── Fix leads.state default (was FL, must be NC) ────────────────────────────
ALTER TABLE leads ALTER COLUMN state SET DEFAULT 'NC';

-- ─── Contacts ────────────────────────────────────────────────────────────────
-- Deduplicated contact identity separate from individual leads
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  first_name      TEXT,
  last_name       TEXT,
  email           TEXT UNIQUE,
  phone           TEXT,                          -- E.164
  phone_normalized TEXT,

  crm_contact_id  TEXT,
  crm_synced_at   TIMESTAMPTZ,

  -- Dedup key: prefer email, fallback phone_normalized
  CONSTRAINT contacts_identity CHECK (email IS NOT NULL OR phone_normalized IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_normalized) WHERE phone_normalized IS NOT NULL;

CREATE OR REPLACE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id) WHERE contact_id IS NOT NULL;

-- ─── Source Attribution ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS source_attribution (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,

  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  referrer_url    TEXT,
  referrer_type   TEXT CHECK (referrer_type IN ('organic','paid','social','direct','email','referral')),
  landing_page    TEXT,
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT source_attribution_anchor CHECK (session_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_source_attr_session ON source_attribution(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_source_attr_lead ON source_attribution(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_source_attr_utm_source ON source_attribution(utm_source) WHERE utm_source IS NOT NULL;

-- ─── Consents ────────────────────────────────────────────────────────────────
-- Immutable consent records (append-only for TCPA audit trail)
CREATE TABLE IF NOT EXISTS consents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lead_id               UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  contact_id            UUID REFERENCES contacts(id) ON DELETE SET NULL,

  consent_type          TEXT NOT NULL CHECK (consent_type IN ('sms','call','email','all')),
  granted               BOOLEAN NOT NULL,
  language_version      TEXT NOT NULL DEFAULT 'v1',
  -- Verbatim consent text shown to user at time of consent
  language_text         TEXT,
  ip_address            INET,
  user_agent            TEXT,
  collected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_lead_id ON consents(lead_id);
CREATE INDEX IF NOT EXISTS idx_consents_contact_id ON consents(contact_id) WHERE contact_id IS NOT NULL;

-- Prevent UPDATE/DELETE — consents are immutable
CREATE OR REPLACE RULE consents_no_update AS ON UPDATE TO consents DO INSTEAD NOTHING;
CREATE OR REPLACE RULE consents_no_delete AS ON DELETE TO consents DO INSTEAD NOTHING;

-- ─── Messages ────────────────────────────────────────────────────────────────
-- All messages exchanged (user question, AI response, agent notes)
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,

  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system','agent')),
  content         TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text','markdown','html')),

  -- For AI messages
  model_id        TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,

  -- For agent notes
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,

  CONSTRAINT messages_anchor CHECK (session_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, created_at) WHERE lead_id IS NOT NULL;

-- ─── Agent Assignments ────────────────────────────────────────────────────────
-- Full assignment history (lead_routing is the current/latest, this is history)
CREATE TABLE IF NOT EXISTS agent_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,

  assigned_by     TEXT NOT NULL DEFAULT 'system' CHECK (assigned_by IN ('system','admin','agent')),
  assignment_reason TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','expired','reassigned')),
  accepted_at     TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  accept_deadline TIMESTAMPTZ,
  contact_deadline TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_assignments_lead ON agent_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_status ON agent_assignments(status);

-- ─── Compliance Flags ─────────────────────────────────────────────────────────
-- Tracks compliance-relevant events for audit / legal review
CREATE TABLE IF NOT EXISTS compliance_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,

  flag_type       TEXT NOT NULL CHECK (flag_type IN (
    'sla_accept_breached','sla_contact_breached','consent_missing',
    'do_not_contact','duplicate_lead','invalid_phone','invalid_email',
    'opt_out_sms','opt_out_call','opt_out_email','data_deletion_request'
  )),
  severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolved_by     TEXT,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_compliance_flags_lead ON compliance_flags(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_flags_type ON compliance_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_compliance_flags_unresolved ON compliance_flags(created_at DESC) WHERE resolved = FALSE;

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
-- Immutable audit trail for admin actions, data access, and mutations
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  actor           TEXT NOT NULL,                 -- 'system', 'admin', agent email, etc.
  action          TEXT NOT NULL,                 -- e.g. 'lead.viewed', 'lead.status_changed'
  resource_type   TEXT NOT NULL,                 -- 'lead', 'contact', 'agent', etc.
  resource_id     UUID,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Prevent modification — audit logs are immutable
CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ─── RLS Policies ────────────────────────────────────────────────────────────
-- Enable RLS on all new tables. Service role bypasses RLS automatically.
-- These policies deny all anon/authenticated access — only service role writes.
ALTER TABLE contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_flags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- Deny all public access (service role bypasses RLS)
CREATE POLICY contacts_deny_public          ON contacts          FOR ALL TO PUBLIC USING (false);
CREATE POLICY source_attr_deny_public       ON source_attribution FOR ALL TO PUBLIC USING (false);
CREATE POLICY consents_deny_public          ON consents          FOR ALL TO PUBLIC USING (false);
CREATE POLICY messages_deny_public          ON messages          FOR ALL TO PUBLIC USING (false);
CREATE POLICY agent_assignments_deny_public ON agent_assignments  FOR ALL TO PUBLIC USING (false);
CREATE POLICY compliance_flags_deny_public  ON compliance_flags  FOR ALL TO PUBLIC USING (false);
CREATE POLICY audit_logs_deny_public        ON audit_logs        FOR ALL TO PUBLIC USING (false);

-- ─── Re-seed Mike Eatmon agent (upsert on email) ─────────────────────────────
INSERT INTO agents (name, email, phone, role, is_active, max_daily_leads, priority_score, timezone, notification_email, notification_sms, notification_phone)
VALUES (
  'Mike Eatmon',
  'mike@ourtownproperties.com',
  '+12522454337',
  'primary',
  TRUE,
  50,
  100,
  'America/New_York',
  TRUE,
  TRUE,
  '+12522454337'
)
ON CONFLICT (email) DO UPDATE SET
  name            = EXCLUDED.name,
  phone           = EXCLUDED.phone,
  role            = EXCLUDED.role,
  is_active       = EXCLUDED.is_active,
  max_daily_leads = EXCLUDED.max_daily_leads,
  priority_score  = EXCLUDED.priority_score,
  timezone        = EXCLUDED.timezone,
  notification_phone = EXCLUDED.notification_phone;
