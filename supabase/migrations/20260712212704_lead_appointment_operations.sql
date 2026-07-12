-- Lead appointment operations
--
-- Adds a focused appointment history table for AdminOps scheduling workflows.
-- Existing lead lifecycle fields remain the high-level conversion state; this
-- table carries operational appointment status and timing without overwriting
-- prior appointment events.

CREATE TABLE IF NOT EXISTS lead_appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL,

  status              TEXT NOT NULL DEFAULT 'requested'
                      CHECK (status IN (
                        'requested',
                        'scheduled',
                        'confirmed',
                        'completed',
                        'canceled',
                        'no_show',
                        'reschedule_requested'
                      )),
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  timezone            TEXT NOT NULL DEFAULT 'America/New_York',
  location_type       TEXT NOT NULL DEFAULT 'office'
                      CHECK (location_type IN ('phone','video','office','property','other')),
  location_label      TEXT,
  meeting_url         TEXT,

  requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  canceled_at         TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_by          TEXT NOT NULL DEFAULT 'system',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT lead_appointments_time_order
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_appointments_one_active_per_lead
  ON lead_appointments(lead_id)
  WHERE status IN ('requested','scheduled','confirmed','reschedule_requested');

CREATE INDEX IF NOT EXISTS idx_lead_appointments_lead_created
  ON lead_appointments(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_appointments_status_starts
  ON lead_appointments(status, starts_at)
  WHERE status IN ('requested','scheduled','confirmed','reschedule_requested','no_show');

CREATE INDEX IF NOT EXISTS idx_lead_appointments_agent_starts
  ON lead_appointments(assigned_agent_id, starts_at)
  WHERE assigned_agent_id IS NOT NULL;

CREATE OR REPLACE TRIGGER lead_appointments_updated_at
  BEFORE UPDATE ON lead_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE lead_appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_appointments'
      AND policyname = 'lead_appointments_deny_public'
  ) THEN
    CREATE POLICY lead_appointments_deny_public
      ON lead_appointments
      FOR ALL TO PUBLIC
      USING (false);
  END IF;
END $$;
