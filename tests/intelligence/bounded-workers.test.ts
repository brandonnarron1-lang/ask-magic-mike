// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { WORKER_VERSION, currentWorkerSourceVersions, enqueueWorker, executeWorker, workerJobSchema, workerRoles, type WorkerJob, type WorkerPrincipal } from "../../src/lib/intelligence/bounded-workers";
import { approvedPublicSources } from "../../src/lib/intelligence/public-knowledge";
import { experienceContract } from "../../app/lib/experienceContract";

const now = new Date("2026-10-18T00:00:00Z");
const principal: WorkerPrincipal = { actor: "synthetic-operator", tenant: "ask-magic-mike", permittedRoles: workerRoles, permittedLeadIds: [] };
export const workerFixture = (role: WorkerJob["role"]): WorkerJob => ({ version: WORKER_VERSION, tenant: "ask-magic-mike", actor: principal.actor,
  role, eventId: randomUUID(), entityId: "owned-contract", entityVersion: "owned-v1", sourceVersions: currentWorkerSourceVersions(), deadline: "2026-10-18T01:00:00Z",
  risk: "read_draft_review", approval: "human_required", budget: { steps: 8, tokens: 0, costUsd: 0 },
  input: { question: "Help me buy a home", offer: "buyer", source: approvedPublicSources[0], checkpoint: null } });
const context = { now, principal };
describe("five bounded workers, synthetic/no send", () => {
  it.each(workerRoles)("executes %s without any model, publication, task or notification action", async role => {
    const fetchSource = vi.fn(async () => Response.json(experienceContract)); const job = workerFixture(role);
    const lead = { id: randomUUID(), version: "synthetic-version", owner: "Mike / synthetic", intent: "buyer", propertyReference: null, missing: ["Property reference"], permissions: [], isTest: true, suppressed: true };
    if (role === "concierge_handoff") { job.entityId = lead.id; job.entityVersion = lead.version; }
    const output = await executeWorker(job, { ...context, fetchSource, lead });
    expect(output.effects).toBe("draft_only_no_send"); expect(output.steps).toBeLessThanOrEqual(8);
    expect(output.state).toBe("review_required");
    expect(fetchSource).toHaveBeenCalledTimes(role === "source_steward" ? 1 : 0);
    if (role === "concierge_handoff") expect(output.text).toContain("DO NOT CONTACT");
  });
  it("quarantines changed source content rather than installing new promises", async () => {
    const output = await executeWorker(workerFixture("source_steward"), { ...context, fetchSource: vi.fn(async () => Response.json({ ...experienceContract, promise: "Guaranteed sale" })) });
    expect(output.state).toBe("quarantined"); expect(output.text).not.toContain("Guaranteed sale");
  });
  it.each([404, 410, 429, 503])("handles source %s once, without extending freshness or retrying", async status => {
    const fetchSource = vi.fn(async () => new Response(null, { status }));
    const result = await executeWorker(workerFixture("source_steward"), { ...context, fetchSource });
    expect(result.state).toBe(status === 404 || status === 410 ? "quarantined" : "blocked"); expect(fetchSource).toHaveBeenCalledOnce();
  });
  it("does not trust an arbitrary 304/checkpoint and bounds source body size", async () => {
    const job = workerFixture("source_steward"); job.input.checkpoint = '"unreviewed"';
    expect((await executeWorker(job, { ...context, fetchSource: vi.fn(async () => new Response(null, { status: 304 })) })).state).toBe("quarantined");
    expect((await executeWorker(job, { ...context, fetchSource: vi.fn(async () => new Response("x".repeat(33000), { headers: { "content-type": "application/json" } })) })).state).toBe("blocked");
  });
  it.each(["actor", "deadline", "version", "rights"])("denies changed %s before fetching", async field => {
    const job = workerFixture("source_steward");
    if (field === "actor") job.actor = "another-operator";
    if (field === "deadline") job.deadline = now.toISOString();
    if (field === "version") job.sourceVersions["offer-buyer"] = "unknown";
    if (field === "rights") job.input.source = { ...job.input.source, permissions: { ...job.input.source.permissions, ai: false } };
    const fetchSource = vi.fn(); const r = await executeWorker(job, { ...context, fetchSource });
    expect(["blocked", "quarantined"]).toContain(r.state); expect(fetchSource).not.toHaveBeenCalled();
  });
  it("requires exact entity id/version and never promotes missing permission into consent", async () => {
    const job = workerFixture("concierge_handoff"), lead = { id: randomUUID(), version: "changed", owner: null, intent: "buyer", propertyReference: null, missing: [], permissions: [], isTest: true, suppressed: true };
    expect((await executeWorker(job, { ...context, lead })).state).toBe("blocked");
    job.entityId = lead.id; job.entityVersion = lead.version;
    const r = await executeWorker(job, { ...context, lead }); expect(r.text).toContain("Not established"); expect(r.text).toContain("not scheduled");
  });
  it("rejects model/tool escalation, extra keys and excessive budgets", () => {
    const job = workerFixture("research_assistant");
    for (const raw of [{ ...job, tools: ["send"] }, { ...job, budget: { steps: 9, tokens: 0, costUsd: 0 } }, { ...job, budget: { steps: 8, tokens: 50, costUsd: 1 } }, { ...job, tenant: "other" }]) expect(workerJobSchema.safeParse(raw).success).toBe(false);
  });
  it("denies enqueue before SQL on actor/role mismatch or a missing lead", async () => {
    const sql = { query: vi.fn() };
    await expect(enqueueWorker(sql, { ...principal, actor: "other" }, workerFixture("research_assistant"))).rejects.toThrow("worker_scope_denied");
    await expect(enqueueWorker(sql, principal, workerFixture("concierge_handoff"))).rejects.toThrow("worker_scope_denied");
    expect(sql.query).not.toHaveBeenCalled();
  });
  it("uses only independently approved launch assets, never implied marketing rights", async () => {
    const job = workerFixture("marketing_producer"); expect(job.input.source.permissions.marketing).toBe(false);
    const r = await executeWorker(job, context); expect(r.text).toContain("buyer-feed.jpg"); expect(r.evidence[0]).toContain("posts.md@");
    job.input.offer = "compare"; expect((await executeWorker(job, context)).state).toBe("blocked");
  });
});
