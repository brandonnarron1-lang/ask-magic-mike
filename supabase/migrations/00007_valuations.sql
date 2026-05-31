-- Migration 00007: Valuation reports

CREATE TABLE valuation_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  property_id         UUID NOT NULL REFERENCES properties(id),
  lead_id             UUID REFERENCES leads(id),

  -- Estimate range (all in cents)
  estimate_low        BIGINT NOT NULL,
  estimate_mid        BIGINT NOT NULL,
  estimate_high       BIGINT NOT NULL,
  confidence_pct      SMALLINT CHECK (confidence_pct BETWEEN 0 AND 100),

  -- Provider metadata
  provider            TEXT NOT NULL DEFAULT 'mock',
  provider_report_id  TEXT,
  provider_raw        JSONB,

  -- Comparable sales (up to 5)
  -- Shape: [{ address, sale_price, sale_date, sqft, beds, baths, distance_miles }]
  comps               JSONB NOT NULL DEFAULT '[]',

  -- Disclaimer — stored with each report (immutable)
  disclaimer_version  TEXT NOT NULL DEFAULT 'v1',
  disclaimer_text     TEXT NOT NULL,

  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  is_consumer_facing  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_valuation_reports_property ON valuation_reports(property_id);
CREATE INDEX idx_valuation_reports_lead ON valuation_reports(lead_id);
CREATE INDEX idx_valuation_reports_created ON valuation_reports(created_at DESC);
