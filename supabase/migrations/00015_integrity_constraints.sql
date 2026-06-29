-- Migration 00015: Data integrity constraints
--
-- Adds UNIQUE constraints to prevent duplicate data paths:
--   - properties(lead_id): one property per lead (enables safe upsert)
--   - consents(lead_id, consent_type): prevents duplicate consent records
--
-- Adds analytics_events composite index for dashboard event queries.

-- ─── 1. properties.lead_id unique constraint ─────────────────────────────────
-- Required for upsertProperty to use onConflict instead of blind INSERT.
-- Partial (WHERE lead_id IS NOT NULL) to allow unlinked property records.

CREATE UNIQUE INDEX IF NOT EXISTS uq_properties_lead_id
  ON properties(lead_id) WHERE lead_id IS NOT NULL;

-- ─── 2. consents dedup constraint ────────────────────────────────────────────
-- Prevents duplicate (lead_id, consent_type) pairs from accumulating on
-- idempotent intake retries. The consents table is append-only for TCPA
-- compliance but a given consent type should only be captured once per lead.

CREATE UNIQUE INDEX IF NOT EXISTS uq_consents_lead_consent_type
  ON consents(lead_id, consent_type);

-- ─── 3. analytics_events composite index ─────────────────────────────────────
-- Supports admin dashboard queries that filter by event_name and time range.
-- Without this, a full table scan runs on every dashboard load.

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON analytics_events(event_name, occurred_at DESC);
