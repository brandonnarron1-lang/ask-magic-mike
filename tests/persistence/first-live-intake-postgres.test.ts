// @vitest-environment node
// Real ordinary root POST + real monitor against fresh local PostgreSQL.
// Synthetic data only; all outbound transport forbidden/mocked. after's
// lifetime callback is captured, not replaced with an untracked promise.
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { install, literal, localQuery, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../app/lib/leadConsent";
const callbacks = vi.hoisted(() => ({ pending: [] as Array<() => Promise<void>>, mode: "healthy", active: 0, committedAt:0 }));
vi.mock("next/server", async original => ({ ...await original<object>(), after: (work: () => Promise<void>) => callbacks.pending.push(work) }));
vi.mock("@neondatabase/serverless", async () => {
  const db=await import("../support/qa-audit-postgres");
  return {neon:()=>({async query(sql:string, params?:unknown[]) {
    const rows=await db.localQuery.query(sql,params);
    if(sql.includes("capture_public_lead_v4("))callbacks.committedAt=performance.now();
    return rows;
  }})};
});
vi.mock("../../src/lib/security/rate-limit", async original => ({ ...await original<object>(), checkRateLimit: vi.fn(async () => ({ allowed: true, durable: true, remaining: 50, resetAt: Date.now()+60000 })) }));
vi.mock("../../app/lib/serverAnalytics", () => ({ recordServerAnalyticsEvent: vi.fn(async () => undefined) }));
vi.mock("../../app/lib/growth/lead-experiment-conversion", () => ({ recordLeadExperimentConversion: vi.fn(async () => ({ attempted: false })) }));
const provider = vi.hoisted(() => ({ enqueue: vi.fn(async () => ({ internal: null, warning: "synthetic_no_send" })) }));
vi.mock("../../app/lib/leadAlertService", async original => ({ ...await original<object>(), enqueueLeadNotifications: provider.enqueue }));
vi.mock("../../src/lib/operations/first-live-lead-monitor", async original => {
  const actual = await original<typeof import("../../src/lib/operations/first-live-lead-monitor")>();
  const db = await import("../support/qa-audit-postgres");
  return { ...actual, createFirstLiveLeadMonitor: () => new actual.FirstLiveLeadMonitor({
    async query(sql, params, options) {
      if (callbacks.mode === "query_error") throw Object.assign(new Error("synthetic private error must not be logged"), { code: "42501" });
      if (callbacks.mode === "stalled") {
        callbacks.active++;
        try { await new Promise((_, reject) => {
          if (!options) return reject(new Error("deadline_required"));
          if (options.signal.aborted) return reject(new Error("aborted"));
          options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }); } finally { callbacks.active--; }
      }
      return db.localQuery.query(sql, params);
    },
  }) };
});
function body(extra: Record<string, unknown> = {}) {
  const key = randomUUID(); return { funnel_type: "buyer", lead_source_surface: "buyer_page", name: "SYNTHETIC MONITOR FIXTURE — NOT A CONSUMER", email: `${key}@example.test`, phone: "",
    buyer_interest: { version: 1, kind: "search", desired_area: "Wilson" }, question: "Synthetic inquiry", timeline: "3-6 months",
    consent: true, consent_email: false, consent_call: false, consent_sms: false,
    consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
    idempotency_key: key, widget_session_id: key, attribution: { source: "ourtownproperties", medium: "owned_media", campaign: "synthetic_monitor" },
    page_url: "https://www.askmagicmike.com/buy", ...extra };
}
async function submit(value = body()) {
  const { POST } = await import("../../app/api/leads/route"); const started = performance.now();
  const response = await POST(new Request("https://www.askmagicmike.com/api/leads", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.askmagicmike.com", "Idempotency-Key": String(value.idempotency_key) }, body: JSON.stringify(value) }));
  return { response, result: await response.json(), totalMs: performance.now()-started, commitToResponseMs:performance.now()-callbacks.committedAt, value };
}
const count = (table: string) => psql(`SELECT count(*) FROM ${table}`);
const noBusinessEdits = () => psql("SELECT jsonb_build_object('assignments',(SELECT coalesce(jsonb_agg(a ORDER BY id),'[]') FROM agent_assignments a),'notifications',(SELECT coalesce(jsonb_agg(n ORDER BY id),'[]') FROM lead_notifications n),'leads',(SELECT coalesce(jsonb_agg(l ORDER BY id),'[]') FROM leads l))");
describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("ordinary capture with real bounded monitor: isolated PostgreSQL", () => {
  beforeAll(async () => {
    await startDatabase(); install("amm_qa_upgrade", true);
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL_ENV", "development"); vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production"); vi.stubEnv("LEAD_ALERT_V6_ENABLED", "true"); vi.stubEnv("LEAD_ALERT_V6_WORKER_ENABLED", "true"); vi.stubEnv("LEAD_ALERT_V6_CUTOFF", "2000-01-01T00:00:00.000Z");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "mike@example.test"); vi.stubEnv("LEAD_NOTIFICATION_SECOND_OPERATOR_TO", "brandon@example.test"); vi.stubEnv("RESEND_FROM", "Our Town <sender@example.test>");
    vi.stubEnv("LEAD_ALERT_V6_QA_SESSION_IDS", ""); vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("outbound_forbidden"); }));
  }, 120000);
  beforeEach(() => { callbacks.mode="healthy"; callbacks.pending=[]; provider.enqueue.mockClear(); });
  afterAll(() => { stopDatabase(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("healthy ordinary response precedes monitor completion; decline evidence is not missing consent", async () => {
    const result = await submit(); expect(result.response.status).toBe(200); expect(callbacks.pending).toHaveLength(1);
    expect(result.commitToResponseMs).toBeLessThan(100);
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(result.result.lead_id)} AND action LIKE 'lead.first_live_%'`)).toBe("0");
    const before = noBusinessEdits(); const start=performance.now(); await callbacks.pending[0]();
    expect(noBusinessEdits()).toBe(before);
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(result.result.lead_id)} AND action='lead.first_live_detected'`)).toBe("1");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(result.result.lead_id)} AND action='lead.first_live_escalation'`)).toBe("0");
    const evidence={at:new Date().toISOString(),totalMs: result.totalMs, commitToResponseMs:result.commitToResponseMs, monitorCompletionMs: performance.now()-start, monitorResponseOverheadTargetMs:100, providerCalls:0, venue:"local PG17 synthetic; not Production SLA"};
    mkdirSync(".amm-run/ownership-monitor",{recursive:true,mode:0o700});
    writeFileSync(".amm-run/ownership-monitor/ordinary-timing.json",JSON.stringify(evidence,null,2)+"\n",{mode:0o600});
  });
  it("unhealthy real report persists one incident across duplicate invocations; both v6 recipients matter", async () => {
    const result=await submit(); const id=literal(result.result.lead_id);
    psql(`UPDATE lead_notifications SET status='permanently_failed' WHERE lead_id=${id} AND recipient_reference='operator:brandon';`);
    const before=noBusinessEdits(); await callbacks.pending[0](); await callbacks.pending[0]();
    expect(noBusinessEdits()).toBe(before);
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${id} AND action='lead.first_live_escalation'`)).toBe("1");
    expect(psql(`SELECT metadata->'reasons' FROM audit_logs WHERE resource_id=${id} AND action='lead.first_live_escalation'`)).toContain("internal_email_failed");
  });
  it("repeat on an old contact inherits ownership, preserves buyer interests, and catches a missed run", async () => {
    const first=await submit(); psql(`UPDATE leads SET created_at=now()-interval '10 days' WHERE id=${literal(first.result.lead_id)};`);
    const second=await submit(body({ email:first.value.email, buyer_interest:{version:1,kind:"specific",properties:[{address_text:"202 Synthetic Fixture Street"}]} }));
    expect(second.result.duplicate_of_lead_id).toBe(first.result.lead_id);
    const {FirstLiveLeadMonitor}=await import("../../src/lib/operations/first-live-lead-monitor");
    const before=noBusinessEdits(); const report=await new FirstLiveLeadMonitor(localQuery).run({lookbackHours:1});
    expect(noBusinessEdits()).toBe(before); expect(report.scanned).toBeGreaterThanOrEqual(2);
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id IN(${literal(first.result.lead_id)},${literal(second.result.lead_id)}) AND action='lead.first_live_detected'`)).toBe("2");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(second.result.lead_id)} AND action='lead.first_live_escalation'`)).toBe("0");
    const {loadNeonAdminLeadDetail}=await import("../../app/lib/persistence/neonAdminLeadView");
    const admin={userId:"synthetic-admin",role:"administrator" as const,name:"Synthetic",email:"admin@example.test",agentId:null};
    const a=await loadNeonAdminLeadDetail(first.result.lead_id,admin), b=await loadNeonAdminLeadDetail(second.result.lead_id,admin);
    expect(a.lead?.buyer_interest?.kind).toBe("search"); expect(b.lead?.buyer_interest?.kind).toBe("specific");
    expect(b.lead?.inquiry_owner_agent_name).toBe("SYNTHETIC QA AGENT"); expect(b.lead?.assigned_agent_id).toBeNull();
    const denied=await loadNeonAdminLeadDetail(second.result.lead_id,{...admin,role:"approved_agent",agentId:randomUUID()}); expect(denied.lead).toBeNull();
    expect(noBusinessEdits()).toBe(before);
  });
  it("query error cannot lose committed capture; diagnostic contains SQLSTATE, not the error text", async () => {
    callbacks.mode="query_error"; const log=vi.spyOn(console,"error").mockImplementation(()=>{});
    try { const result=await submit(); expect(result.response.status).toBe(200); const before=count("leads"); await callbacks.pending[0](); expect(count("leads")).toBe(before);
      expect(JSON.stringify(log.mock.calls)).toContain("42501"); expect(JSON.stringify(log.mock.calls)).not.toContain("synthetic private error");
    } finally {log.mockRestore();}
  });
  it("stalled monitor is abortable and outside the response; no work survives its finite deadline", async () => {
    callbacks.mode="stalled"; const result=await submit(); expect(result.response.status).toBe(200); expect(callbacks.active).toBe(0);
    const before=count("leads"); const started=performance.now(); const pending=callbacks.pending[0](); await pending;
    expect(performance.now()-started).toBeLessThan(11000); expect(callbacks.active).toBe(0); expect(count("leads")).toBe(before);
  },15000);
  it("exact intake replay does not register a second monitor or change canonical effects", async () => {
    const first=await submit(); const before=noBusinessEdits(); const scheduled=callbacks.pending.length;
    const replay=await submit(first.value); expect(replay.response.status).toBe(200); expect(replay.result.lead_id).toBe(first.result.lead_id);
    expect(callbacks.pending).toHaveLength(scheduled); expect(noBusinessEdits()).toBe(before); expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
