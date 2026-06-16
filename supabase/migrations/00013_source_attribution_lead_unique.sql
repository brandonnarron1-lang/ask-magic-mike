-- Make source_attribution idempotent: one attribution row per lead.
--
-- Context: lead-detail.ts uses .maybeSingle() which errors on duplicate rows;
-- lead-list.ts uses first-row-wins with no ORDER BY, so duplicates produce
-- non-deterministic attribution. Both write paths (intake + canonical) now
-- upsert with ON CONFLICT (lead_id) DO NOTHING, so this constraint is the
-- matching DB-side enforcement.
--
-- Step 1 — remove duplicates produced before this constraint existed.
--   Keep the earliest row per lead_id (by created_at, then id for ties).
DELETE FROM source_attribution
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY lead_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM source_attribution
    WHERE lead_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2 — add the unique constraint.
--   NULLs are treated as distinct in PostgreSQL, so session-only rows
--   (lead_id IS NULL) are unaffected.
ALTER TABLE source_attribution
  ADD CONSTRAINT source_attribution_lead_id_unique UNIQUE (lead_id);
