// @vitest-environment node
// Fresh local PostgreSQL; tracked schema and synthetic fixtures only. No sends.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { install, literal, localQuery, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

vi.mock("@neondatabase/serverless", () => ({ neon: () => localQuery }));
import { loadNeonAdminTodayQueue } from "../../app/lib/persistence/neonAdminTodayView";
import { loadNeonAdminLeadDetail } from "../../app/lib/persistence/neonAdminLeadView";

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("Today ownership parity in isolated PostgreSQL", () => {
  const owner = "00000000-0000-4000-8000-000000009901";
  const original = randomUUID(), repeat = randomUUID(), unrelated = randomUUID();
  const principal: LeadCenterPrincipal = { userId: "synthetic-owner", role: "approved_agent", agentId: owner, name: "SYNTHETIC", email: "owner@example.test" };
  beforeAll(async () => {
    if (process.env.DATABASE_URL || process.env.VERCEL_ENV) throw new Error("clean_local_venue_required");
    await startDatabase(); install("amm_qa_upgrade", true);
    expect(psql("SELECT count(*) FROM leads")).toBe("0");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/amm_qa_upgrade");
    for (const id of [original, repeat, unrelated]) psql(`INSERT INTO sessions(id) VALUES(${literal(id)}); INSERT INTO leads(id,session_id,first_name,email,status,assigned_agent_id,duplicate_of_lead_id,primary_intent) VALUES(${literal(id)},${literal(id)},'SYNTHETIC REQUEST',${literal(`${id}@example.test`)},'new',${id === original ? literal(owner) : "NULL"},${id === repeat ? literal(original) : "NULL"},'buy');`);
  }, 120000);
  afterAll(() => { vi.unstubAllEnvs(); stopDatabase(); });
  it("includes exactly the inquiries readable through the established inherited-read policy", async () => {
    expect((await loadNeonAdminLeadDetail(repeat, principal)).lead).not.toBeNull();
    const queue = await loadNeonAdminTodayQueue(principal);
    expect(queue.error).toBeUndefined();
    expect(new Set(queue.items.map(item => item.leadId))).toEqual(new Set([original, repeat]));
    expect(queue.items.filter(item => item.leadId === repeat).every(item => item.ownership === "inherited")).toBe(true);
    expect(queue.items.some(item => item.leadId === repeat && item.actionKind === "assign_lead")).toBe(false);
  });
  it("denies wrong roles and missing agent identity without returning request details", async () => {
    expect(await loadNeonAdminTodayQueue({ ...principal, role: "read_only_analyst" })).toMatchObject({ error: "lead_center_lead_permission_required", items: [] });
    expect(await loadNeonAdminTodayQueue({ ...principal, agentId: null })).toMatchObject({ error: "lead_center_agent_identity_required", items: [] });
  });
  it("fresh reads remove inherited access after canonical ownership changes; no reassignment is performed by reads", async () => {
    const before = psql(`SELECT json_agg(json_build_object('id',id,'owner',assigned_agent_id,'parent',duplicate_of_lead_id)) FROM leads`);
    await loadNeonAdminTodayQueue(principal);
    expect(psql(`SELECT json_agg(json_build_object('id',id,'owner',assigned_agent_id,'parent',duplicate_of_lead_id)) FROM leads`)).toBe(before);
    psql(`UPDATE leads SET assigned_agent_id=NULL WHERE id=${literal(original)}`);
    expect((await loadNeonAdminTodayQueue(principal)).items).toEqual([]);
    expect((await loadNeonAdminLeadDetail(repeat, principal)).lead).toBeNull();
  });
  it("labels a genuinely capped PostgreSQL read rather than claiming a complete cohort", async () => {
    psql("WITH ids AS MATERIALIZED (SELECT md5('synthetic-today-cap-'||i)::uuid id FROM generate_series(1,1001) i), s AS (INSERT INTO sessions(id) SELECT id FROM ids RETURNING id) INSERT INTO leads(id,session_id,status,first_name) SELECT id,id,'new','SYNTHETIC CAP' FROM s");
    const queue = await loadNeonAdminTodayQueue({ ...principal, role: "administrator" });
    expect(queue.coverage).toMatchObject({ state: "limited", leadCount: 1000, leadLimit: 1000, limitedBy: ["requests"] });
    expect(queue.error).toBeUndefined();
  });
});
