import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261002143000_agent_command_center.sql", "utf8");
const postgresContract = readFileSync("supabase/tests/agent_command_center_pg17.sql", "utf8");
const localVerifier = readFileSync("scripts/staging-local-verify.mjs", "utf8");

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
    expect(migration).toContain("p_actual_cost_usd > v_reservation.reserved_cost_usd");
  });

  it("removes browser RPC grants and ships a rollback-only PostgreSQL 17 contract", () => {
    expect(migration).toContain("ARRAY['anon', 'authenticated']");
    expect(migration).toContain("REVOKE ALL ON FUNCTION %s FROM %I");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION %s TO service_role");
    expect(postgresContract).toContain("assert_acc_browser_privileges_denied");
    expect(postgresContract).toContain("budget reservations fail closed");
    expect(postgresContract).toContain("AI draft update is rejected");
    expect(postgresContract).toContain("draft generation and approval do not enqueue or send communication");
    expect(postgresContract).toMatch(/BEGIN;[\s\S]*ROLLBACK;/);
    expect(localVerifier).toContain("agent_command_center_pg17.sql");
    expect(localVerifier).toContain("agent_command_center_sql_passed");
    expect(localVerifier).toContain("agentCommandCenter.status !== 0");
  });
});
