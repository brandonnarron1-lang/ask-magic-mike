-- Lead notification outbox for assignment notifications and future follow-up.
-- This migration is intentionally source-only until applied through the
-- reviewed production migration process.

CREATE TABLE IF NOT EXISTS lead_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  assignment_audit_id UUID REFERENCES audit_logs(id) ON DELETE SET NULL,
  assignment_event_at TIMESTAMPTZ,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('agent', 'customer')),
  recipient_reference TEXT,
  template_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'sent',
      'failed',
      'skipped',
      'retry_scheduled',
      'permanently_failed'
    )),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  provider TEXT,
  provider_message_id TEXT,
  error_code TEXT,
  error_summary TEXT,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT lead_notifications_agent_recipient CHECK (
    recipient_type <> 'agent' OR agent_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_notifications_idempotency_key_idx
  ON lead_notifications(idempotency_key);

CREATE INDEX IF NOT EXISTS lead_notifications_lead_id_idx
  ON lead_notifications(lead_id);

CREATE INDEX IF NOT EXISTS lead_notifications_agent_id_idx
  ON lead_notifications(agent_id)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lead_notifications_status_next_attempt_idx
  ON lead_notifications(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS lead_notifications_created_at_idx
  ON lead_notifications(created_at DESC);

CREATE OR REPLACE FUNCTION set_lead_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_notifications_updated_at ON lead_notifications;
CREATE TRIGGER lead_notifications_updated_at
  BEFORE UPDATE ON lead_notifications
  FOR EACH ROW EXECUTE FUNCTION set_lead_notifications_updated_at();

ALTER TABLE lead_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_notifications_deny_public ON lead_notifications;
CREATE POLICY lead_notifications_deny_public
  ON lead_notifications
  FOR ALL
  TO PUBLIC
  USING (false);

COMMENT ON TABLE lead_notifications IS
  'Server-only lead notification outbox. Stores delivery metadata and retry state, not provider secrets.';

COMMENT ON COLUMN lead_notifications.recipient_reference IS
  'Minimized recipient reference such as agent id or contact class; do not store full customer message bodies or provider secrets.';

-- Rollback guidance:
-- DROP TABLE IF EXISTS lead_notifications;
-- DROP FUNCTION IF EXISTS set_lead_notifications_updated_at();
