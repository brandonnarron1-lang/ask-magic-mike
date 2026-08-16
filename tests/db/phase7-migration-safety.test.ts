import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260816143000_phase7_messaging_release_candidate.sql", "utf8");

describe("Phase 7 migration safety", () => {
  it("is additive, idempotent, and does not repeat Phase 6 table creation", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.message_template_versions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.provider_webhook_events");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS");
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS public\.communication_permissions/i);
    expect(migration).not.toMatch(/\b(?:DROP TABLE|TRUNCATE|DELETE FROM)\b/i);
  });
});
