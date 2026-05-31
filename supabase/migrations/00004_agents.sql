-- Migration 00004: Agents table

CREATE TABLE agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'agent'
                  CHECK (role IN ('primary','backup','admin')),

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  max_daily_leads SMALLINT NOT NULL DEFAULT 20,
  current_load    SMALLINT NOT NULL DEFAULT 0,

  -- Routing weight (higher = preferred)
  priority_score  SMALLINT NOT NULL DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),

  -- Availability windows per weekday: { "mon": [8, 18], "tue": [8, 18], ... }
  -- Values are [startHour, endHour] in 24h format in agent's local timezone
  availability    JSONB NOT NULL DEFAULT
    '{"mon":[8,18],"tue":[8,18],"wed":[8,18],"thu":[8,18],"fri":[8,18]}',
  timezone        TEXT NOT NULL DEFAULT 'America/New_York',

  notification_email  BOOLEAN NOT NULL DEFAULT TRUE,
  notification_sms    BOOLEAN NOT NULL DEFAULT TRUE,
  notification_phone  TEXT
);

CREATE INDEX idx_agents_is_active ON agents(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_agents_role ON agents(role);
CREATE INDEX idx_agents_priority ON agents(priority_score DESC);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
