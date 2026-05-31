-- Migration 00003: Lead scores table with JSONB factor log

CREATE TABLE lead_scores (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  scored_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  seller_certainty_score  SMALLINT NOT NULL DEFAULT 0
                          CHECK (seller_certainty_score BETWEEN 0 AND 100),
  buyer_certainty_score   SMALLINT NOT NULL DEFAULT 0
                          CHECK (buyer_certainty_score BETWEEN 0 AND 100),
  composite_score         SMALLINT NOT NULL DEFAULT 0
                          CHECK (composite_score BETWEEN 0 AND 100),

  temperature             TEXT NOT NULL DEFAULT 'low'
                          CHECK (temperature IN ('urgent','hot','warm','nurture','low')),

  -- Every scoring decision is logged verbatim for auditability
  -- Shape: [{ key, category, points, reason }]
  factor_log              JSONB NOT NULL DEFAULT '[]',

  scorer_version          TEXT NOT NULL DEFAULT '1.0.0',

  CONSTRAINT uq_lead_scores_lead UNIQUE (lead_id)
);

CREATE INDEX idx_lead_scores_temperature ON lead_scores(temperature);
CREATE INDEX idx_lead_scores_seller ON lead_scores(seller_certainty_score DESC);
CREATE INDEX idx_lead_scores_buyer ON lead_scores(buyer_certainty_score DESC);
CREATE INDEX idx_lead_scores_composite ON lead_scores(composite_score DESC);
