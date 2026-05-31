-- Migration 00001: Sessions table and shared trigger function

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Attribution
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  referrer_url    TEXT,
  referrer_type   TEXT CHECK (referrer_type IN ('organic','paid','social','direct','email','referral')),
  landing_page    TEXT,
  user_agent      TEXT,
  ip_address      INET,
  device_type     TEXT CHECK (device_type IN ('mobile','tablet','desktop')),

  -- State
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','abandoned','expired')),
  step_reached    SMALLINT NOT NULL DEFAULT 1,
  initial_question TEXT,
  initial_address  TEXT
);

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at)
  WHERE status = 'active';

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
