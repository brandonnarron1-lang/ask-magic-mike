// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { bind, concurrent, dumpAndRestoreSyntheticDatabase, install, literal, localQuery, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { WORKER_VERSION, currentWorkerSourceVersions, enqueueWorker, runOneWorker, workerRoles, type WorkerJob, type WorkerPrincipal } from "../../src/lib/intelligence/bounded-workers";
import { approvedPublicSources } from "../../src/lib/intelligence/public-knowledge";
import { experienceContract } from "../../app/lib/experienceContract";
import { evaluationBudget } from "../../src/lib/intelligence/evaluation-budget";
import { CURRENT_LAUNCH_TEMPLATE } from "../../src/lib/content/reviewed-launch-work-item";

const principal: WorkerPrincipal = { actor: "synthetic-r2-operator", tenant: "ask-magic-mike", permittedRoles: workerRoles, permittedLeadIds: [] };
const job = (role: WorkerJob["role"]): WorkerJob => ({ version: WORKER_VERSION, tenant: "ask-magic-mike", actor: principal.actor,
  role, eventId: randomUUID(), entityId: "owned-contract", entityVersion: "owned-v1", sourceVersions: currentWorkerSourceVersions(), deadline: new Date(Date.now()+3600000).toISOString(),
  risk: "read_draft_review", approval: "human_required", budget: { steps: 8, tokens: 0, costUsd: 0 },
  input: { question: "Help me buy a home", offer: "buyer", source: approvedPublicSources[0], checkpoint: null } });
const claim = (actor = principal.actor) => `SELECT public.claim_r2_worker_v1('synthetic-worker',${literal(actor)},ARRAY['source_steward','research_assistant','concierge_handoff','marketing_producer','quality_operations'])`;
const snapshot = () => psql("SELECT jsonb_build_object('leads',(SELECT count(*) FROM leads),'notifications',(SELECT count(*) FROM lead_notifications),'assignments',(SELECT count(*) FROM agent_assignments),'consents',(SELECT count(*) FROM consents),'audit',(SELECT count(*) FROM audit_logs))");
describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("bounded workers: owned isolated PostgreSQL, synthetic only", () => {
  let leadId = "", baseline = "";
  beforeAll(async () => {
    await startDatabase(); install("amm_qa_upgrade", true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network_forbidden"); }));
    const session = randomUUID();
    const capture = JSON.parse(psql(bind("SELECT public.capture_public_lead_v1($1::jsonb,$2::jsonb,'{}'::jsonb,'disabled')", [JSON.stringify({ id: session }), JSON.stringify({ first_name: "INTERNAL QA", last_name: "DO NOT CONTACT", session_id: session, lead_type: "buyer", primary_intent: "buy", source: "internal_qa", source_detail: "synthetic_r2", email: "synthetic@example.test", is_test: true, communication_suppressed: true, email_suppressed: true, sms_suppressed: true, request_idempotency_key: session })])));
    leadId = capture.lead_id; expect(leadId).toBeTruthy(); principal.permittedLeadIds = [leadId]; baseline = snapshot();
  }, 120000);
  afterAll(() => { stopDatabase(); vi.unstubAllGlobals(); }, 20000);
  it("runs each existing role durably with truthful held marketing rights and one reviewed handoff", async () => {
    for (const role of workerRoles) {
      const input = job(role);
      const version = psql(`SELECT updated_at::text FROM leads WHERE id=${literal(leadId)}`);
      if (role === "concierge_handoff") { input.entityId = leadId; input.entityVersion = version; }
      const first = await enqueueWorker(localQuery, principal, input, role === "concierge_handoff" ? leadId : null);
      const repeat = await enqueueWorker(localQuery, principal, input, role === "concierge_handoff" ? leadId : null);
      expect(first.replay).toBe(false); expect(repeat).toMatchObject({ replay: true, id: first.id });
      const r = await runOneWorker(localQuery, "synthetic-worker", { now: new Date(), principal,
        fetchSource: vi.fn(async () => Response.json(experienceContract)),
        lead: { id: leadId, version, owner: "Mike / synthetic", intent: "buyer", propertyReference: null, missing: ["Property reference"], permissions: [], isTest: true, suppressed: true } });
      expect(r.processed).toBe(1);
    }
    expect(psql("SELECT count(*) FROM ai_intelligence_jobs WHERE feature='bounded_intelligence_v1' AND r2_result IS NOT NULL")).toBe("5");
    expect(psql("SELECT count(*) FROM lead_action_reviews WHERE action_key LIKE 'r2-review:%'")).toBe("1"); expect(snapshot()).toBe(baseline);
    expect(psql("SELECT count(*) FROM ai_draft_reviews WHERE schema_version='amm.r2.workers.v1' AND status='generated' AND model='none'")).toBe("1");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retains an explicitly versioned compare draft through the real existing job lease and replay contract", async () => {
    const input = job("marketing_producer"); input.input.offer = "compare"; input.input.marketingTemplateVersion = CURRENT_LAUNCH_TEMPLATE;
    const before = snapshot(); const usage = psql("SELECT count(*) FROM ai_usage_events");
    const first = await enqueueWorker(localQuery, principal, input);
    expect(await enqueueWorker(localQuery, principal, input)).toMatchObject({ id: first.id, replay: true });
    const executed = await runOneWorker(localQuery, "synthetic-current-kit-worker", { now: new Date(), principal });
    expect(executed.output?.state).toBe("review_required"); expect(executed.output?.evidence).toContain(CURRENT_LAUNCH_TEMPLATE);
    expect(executed.output?.text).toContain("seller_option=compare");
    expect(JSON.parse(psql(`SELECT r2_result FROM ai_intelligence_jobs WHERE id=${literal(first.id)}`))).toMatchObject({ state: "review_required", effects: "draft_only_no_send" });
    expect(snapshot()).toBe(before); expect(psql("SELECT count(*) FROM ai_usage_events")).toBe(usage); expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses conflicting replay and does not update the original contract", async () => {
    const input = job("research_assistant"); await enqueueWorker(localQuery, principal, input);
    await expect(enqueueWorker(localQuery, principal, { ...input, entityVersion: "changed" })).rejects.toThrow("worker_replay_conflict");
  });
  it("limits simultaneous claims to two even under concurrent callers", async () => {
    for (let i=0;i<4;i++) await enqueueWorker(localQuery, principal, job("quality_operations"));
    const results = await Promise.all(Array.from({length:4},()=>concurrent(`SET ROLE service_role; ${claim()}`)));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(psql("SELECT count(*) FROM ai_intelligence_jobs WHERE feature='bounded_intelligence_v1' AND status='processing'")).toBe("2");
  });
  it("does not let a different actor claim a queued job", () => { expect(psql(claim("other-actor"))).toBe(""); });
  it("expires a lease with bounded delay, rejects old completion and visibly exhausts attempts", () => {
    const row = JSON.parse(psql("SELECT to_jsonb(j) FROM ai_intelligence_jobs j WHERE status='processing' AND feature='bounded_intelligence_v1' LIMIT 1"));
    psql(`UPDATE ai_intelligence_jobs SET r2_lease_until=now()-interval '1 second',attempt_count=max_attempts WHERE id=${literal(row.id)}`);
    psql(claim());
    expect(psql(`SELECT status FROM ai_intelligence_jobs WHERE id=${literal(row.id)}`)).toBe("failed");
    const result = JSON.parse(psql(`SELECT complete_r2_worker_v1(${literal(row.id)},${literal(row.r2_lease_token)},'{}'::jsonb)`));
    expect(result).toMatchObject({ ok: false, error: "worker_lease_not_current" });
  });
  it("cancels only the owning actor and does not create task or notification writes", async () => {
    const r = await enqueueWorker(localQuery, principal, job("quality_operations"));
    expect(psql(`SELECT cancel_r2_worker_v1(${literal(r.id)},'other')`)).toBe("f");
    expect(psql(`SELECT cancel_r2_worker_v1(${literal(r.id)},${literal(principal.actor)})`)).toBe("t"); expect(snapshot()).toBe(baseline);
  });
  it("preserves legacy lead requirement and denies all browser RPC execution", () => {
    expect(()=>psql("INSERT INTO ai_intelligence_jobs(feature,request_key,requested_by) VALUES('lead_center_copilot','invalid-no-lead','fixture')")).toThrow();
    expect(()=>psql("INSERT INTO ai_intelligence_jobs(feature,request_key,requested_by,r2_contract,r2_deadline) VALUES('bounded_intelligence_v1','invalid-contract','fixture','{}',now()+interval '1 hour')")).toThrow();
    for (const signature of ["claim_r2_worker_v1(text,text,text[])","enqueue_r2_worker_v1(text,uuid,text,jsonb)","complete_r2_worker_v1(uuid,uuid,jsonb)","reserve_r2_evaluation_v1(text,uuid,text,text,numeric,text)"]) {
      expect(psql(`SELECT has_function_privilege('anon',${literal(signature)},'EXECUTE'),has_function_privilege('authenticated',${literal(signature)},'EXECUTE'),has_function_privilege('service_role',${literal(signature)},'EXECUTE')`)).toBe("f|f|t");
    }
  });
  it("uses the canonical budget/usage transaction, blocks replay and caps sentinel count at three", async () => {
    const budget = evaluationBudget(localQuery, { leadId, actor: principal.actor, phase: "sentinel" });
    const request = { key: "r2:sentinel:synthetic:0001", model: "synthetic-model", maximumUsd: 0.16 };
    expect(await budget.reserve(request)).toEqual({ authorized: true }); expect(await budget.reserve(request)).toEqual({ authorized: false });
    await budget.settle({ key: request.key, inputTokens: 100, outputTokens: 100, costUsd: 0.0002, providerId: "synthetic-only" });
    for(let i=2;i<=4;i++) expect((await budget.reserve({...request,key:`r2:sentinel:synthetic:000${i}`})).authorized).toBe(i<=3);
    expect(psql("SELECT count(*) FROM ai_usage_events WHERE feature='r2_evaluation_sentinel'")).toBe("1");
  });
  it("holds ambiguous expenditure after expiry/day boundaries and enforces the lifetime $10 cap", async () => {
    psql("UPDATE ai_budget_reservations SET expires_at=now()-interval '2 days',created_at=now()-interval '3 days' WHERE feature LIKE 'r2_evaluation_%'");
    const budget = evaluationBudget(localQuery, { leadId, actor: principal.actor, phase: "fixed" });
    let authorized = 0;
    for(let i=0;i<64;i++) if((await budget.reserve({key:`r2:fixed:synthetic:${String(i).padStart(4,'0')}`,model:"synthetic-model",maximumUsd:0.16})).authorized) authorized++;
    expect(authorized).toBe(60); // .0002 settled + .32 held + 60*.16 = 9.9202
    expect(snapshot()).toBe(baseline);
  });
  it("migration is additive and legacy processor cannot accidentally claim R2 jobs", () => {
    const route = readFileSync("app/api/admin/copilot/jobs/process/route.ts","utf8");
    expect(route).toContain("WHERE feature = 'lead_center_copilot'");
    expect(psql("SELECT count(*) FROM ai_intelligence_jobs WHERE feature='bounded_intelligence_v1'")).not.toBe("0");
  });
  it("restores the synthetic database with job, review and budget state intact", () => {
    const before = psql("SELECT jsonb_build_object('jobs',(SELECT count(*) FROM ai_intelligence_jobs),'reviews',(SELECT count(*) FROM lead_action_reviews),'budgets',(SELECT count(*) FROM ai_budget_reservations))");
    expect(dumpAndRestoreSyntheticDatabase().length).toBeGreaterThan(1000);
    expect(psql("SELECT jsonb_build_object('jobs',(SELECT count(*) FROM ai_intelligence_jobs),'reviews',(SELECT count(*) FROM lead_action_reviews),'budgets',(SELECT count(*) FROM ai_budget_reservations))","amm_qa_fresh")).toBe(before);
    expect(snapshot()).toBe(baseline);
  });
});
