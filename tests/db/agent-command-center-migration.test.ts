import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261002143000_agent_command_center.sql", "utf8");

describe("Agent Command Center migration", () => {
  it("keeps queue review, AI budget, and AI draft state additive and private", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.lead_action_reviews");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.ai_budget_reservations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.ai_draft_reviews");
    expect(migration).toContain("REVOKE ALL ON public.ai_draft_reviews FROM PUBLIC");
    expect(migration).not.toMatch(/DROP TABLE\s+(?:IF EXISTS\s+)?public\.(?:leads|tasks|lead_appointments|lead_notifications)/i);
  });

  it("uses atomic budget locking, immutable draft versions, and purpose permission on approval", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("v_existing.expires_at > p_now");
    expect(migration).toContain("status = 'reserved', reserved_cost_usd = p_reserve_cost_usd");
    expect(migration).toContain("budget_request_key_conflict");
    expect(migration).toContain("finalize_ai_budget_reservation_v1");
    expect(migration).toContain("ai_draft_reviews_immutable");
    expect(migration).toContain("amm_reject_immutable_change()");
    expect(migration).toContain("cp.channel = v_current.channel");
    expect(migration).toContain("cp.purpose = v_current.purpose");
    expect(migration).toContain("cp.state = 'allowed'");
    expect(migration).toContain("l.communication_suppressed = true");
  });
});
