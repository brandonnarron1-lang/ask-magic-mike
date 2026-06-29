-- Migration 00014: Lead table critical fixes
--
-- Adds columns that exist in application code but were never added to the schema:
--   assigned_agent_id, assignment_status, appointment_requested, notes
--
-- Expands the leads.status CHECK constraint to include all values used by the
-- application (qualified, spam, escalated, appointment_requested, appointment_set).
--
-- Adds missing performance indexes for high-traffic query patterns.

-- ─── 1. Add missing columns (idempotent) ─────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_agent_id    UUID REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assignment_status    TEXT,
  ADD COLUMN IF NOT EXISTS appointment_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes                TEXT;

-- ─── 2. Expand status CHECK constraint ───────────────────────────────────────
-- The original constraint in 00002 only covered 7 values. The application uses
-- 12 distinct status values. Drop the auto-named constraint and replace it.

DO $$
DECLARE
  conname TEXT;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'leads'
    AND c.contype = 'c'
    AND a.attname = 'status'
  LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE leads DROP CONSTRAINT ' || quote_ident(conname);
  END IF;
END $$;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check CHECK (status IN (
    'new',
    'scored',
    'qualified',
    'assigned',
    'contacted',
    'appointment_requested',
    'appointment_set',
    'nurture',
    'dead',
    'converted',
    'spam',
    'escalated'
  ));

-- ─── 3. Missing performance indexes ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent_id
  ON leads(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_at
  ON leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at
  ON leads(last_contacted_at) WHERE last_contacted_at IS NOT NULL;

-- Composite index for agent portal queries (most common: WHERE assigned_agent_id = ? ORDER BY created_at)
CREATE INDEX IF NOT EXISTS idx_leads_agent_created
  ON leads(assigned_agent_id, created_at DESC) WHERE assigned_agent_id IS NOT NULL;
