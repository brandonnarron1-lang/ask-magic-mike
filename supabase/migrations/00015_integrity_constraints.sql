-- Migration 00015: Data integrity constraints
--
-- Adds UNIQUE constraints to prevent duplicate data paths:
--   - properties(lead_id): one property per lead (enables safe upsert)
--   - consents(lead_id, consent_type): prevents duplicate consent records
--
-- Adds analytics_events composite index for dashboard event queries.
--
-- NOTE: The consents table has DO INSTEAD NOTHING rules for DELETE and UPDATE
-- (append-only by design for TCPA compliance). If a historical duplicate exists
-- it cannot be removed by any means, so the consents UNIQUE index creation is
-- wrapped in exception handling. The dedup constraint is enforced at the
-- application layer instead (intake flow must check before inserting).

-- ─── 1. properties.lead_id unique constraint ─────────────────────────────────
-- Required for upsertProperty to use onConflict instead of blind INSERT.
-- Partial (WHERE lead_id IS NOT NULL) to allow unlinked property records.

CREATE UNIQUE INDEX IF NOT EXISTS uq_properties_lead_id
  ON properties(lead_id) WHERE lead_id IS NOT NULL;

-- ─── 2. consents dedup constraint ────────────────────────────────────────────
-- The consents table is append-only (consents_no_delete + consents_no_update
-- rules prevent any modification). If a historical duplicate exists it blocks
-- UNIQUE index creation and cannot be removed. Guard with exception handling
-- so the migration succeeds and the two safe constraints below still apply.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'consents' AND indexname = 'uq_consents_lead_consent_type'
  ) THEN
    BEGIN
      EXECUTE 'CREATE UNIQUE INDEX uq_consents_lead_consent_type ON consents(lead_id, consent_type)';
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'uq_consents_lead_consent_type skipped: %. Consents table is append-only; enforce dedup at application layer.', SQLERRM;
    END;
  END IF;
END $$;

-- ─── 3. analytics_events composite index ─────────────────────────────────────
-- Supports admin dashboard queries that filter by event_name and time range.
-- Without this, a full table scan runs on every dashboard load.

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON analytics_events(event_name, occurred_at DESC);
