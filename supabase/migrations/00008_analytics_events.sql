-- Migration 00008: Analytics events ledger

CREATE TABLE analytics_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  session_id      UUID REFERENCES sessions(id),
  lead_id         UUID REFERENCES leads(id),
  agent_id        UUID REFERENCES agents(id),

  -- Event identity
  event_name      TEXT NOT NULL,
  event_category  TEXT NOT NULL CHECK (event_category IN (
    'session','intake','scoring','routing','valuation','crm','admin','system'
  )),

  -- Payload (arbitrary properties)
  properties      JSONB NOT NULL DEFAULT '{}',

  -- Denormalized attribution for fast queries
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,

  -- Device context
  ip_address      INET,
  user_agent      TEXT
);

-- Index for time-series queries
CREATE INDEX idx_analytics_events_occurred ON analytics_events(occurred_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id)
  WHERE session_id IS NOT NULL;
CREATE INDEX idx_analytics_events_lead ON analytics_events(lead_id)
  WHERE lead_id IS NOT NULL;
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
