import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260815193000_phase6_ai_messaging.sql",
  "utf8",
);

describe("Phase 6 messaging migration safety", () => {
  it("keeps the migration additive and Neon-compatible", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC");
    expect(migration).toContain("IF EXISTS (SELECT 1 FROM pg_roles");
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE FROM)\b/i);
    expect(migration).not.toMatch(/FROM anon, authenticated/);
  });
});
