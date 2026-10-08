// @vitest-environment node
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { install, literal, psql, startDatabase, statements, stopDatabase } from "../support/qa-audit-postgres";
import { loadNeonAdminReportingSummary, loadNeonAdminReportingDrillthrough } from "../../app/lib/persistence/neonAdminReportingView";
import { loadAcceptedReportingSummary } from '../support/acceptedReportingReference';
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

const reportingQuery = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => reportingQuery }));

// All records below are synthetic, local-only reporting fixtures. They test
// read reconciliation, not appointment/task transaction implementation.
const ownerAgent = "00000000-0000-4000-8000-000000009901";
const otherAgent = "00000000-0000-4000-8000-000000009902";
const administrator: LeadCenterPrincipal = { userId: "synthetic-reporting-admin", role: "administrator",
  agentId: null, name: "Synthetic reporting admin", email: "report-admin@example.test" };
function seed(options: { ageDays?: number; agent?: string | null; source?: string; status?: string;
  test?: boolean; suppressed?: boolean; duplicate?: boolean; duplicateOf?: string } = {}): string {
  const id: string = randomUUID();
  psql(`INSERT INTO sessions(id) VALUES (${literal(id)});
    INSERT INTO leads(id,session_id,created_at,first_name,email,phone,address_raw,page_url,source_detail,
      status,assigned_agent_id,is_test,communication_suppressed,is_duplicate,duplicate_of_lead_id)
    VALUES (${literal(id)},${literal(id)},now() - ${options.ageDays ?? 1} * interval '1 day',
      'SYNTHETIC REPORTING — NOT A CONSUMER',${literal(`${id}@example.test`)},'+12525550199',
      '1 Synthetic Private Test Street','https://example.test/?email=private@example.test','private free text',
      ${literal(options.status || "new")},${literal(options.agent)},${literal(options.test || false)},
      ${literal(options.suppressed || false)},${literal(options.duplicate || false)},${literal(options.duplicateOf)});
    ${options.source ? `INSERT INTO source_attribution(lead_id,session_id,utm_source,created_at)
      VALUES (${literal(id)},${literal(id)},${literal(options.source)},now() - interval '1 hour');` : ""}`);
  return id;
}
function appointment(leadId: string, status: string) {
  psql(`INSERT INTO lead_appointments(lead_id,status,created_at) VALUES
    (${literal(leadId)},${literal(status)},now() - interval '30 minutes');`);
}
function outcome(leadId: string, type: string, flags = { test: false, suppressed: false }) {
  psql(`INSERT INTO lead_outcomes(lead_id,outcome_type,occurred_at,source_system,is_test,communication_suppressed)
    VALUES (${literal(leadId)},${literal(type)},now() - interval '10 minutes','synthetic_reporting',
      ${literal(flags.test)},${literal(flags.suppressed)});`);
}
function humanAudit(leadId: string, result: string, provenance = "manual_operator_record", action = "lead.human_interaction_recorded", occurredAt?: string) {
  const metadata = { provenance, channel: "phone", result, occurred_at: occurredAt || new Date(Date.now() - 60_000).toISOString(),
    task_id: null, request_key: randomUUID(), request_hash: "a".repeat(64) };
  psql(`INSERT INTO audit_logs(actor,action,resource_type,resource_id,metadata)
    VALUES ('lead_center:synthetic-reporting-admin',${literal(action)},'lead',${literal(leadId)},${literal(JSON.stringify(metadata))}::jsonb);`);
}
function seedMany(count: number, agent: string | null = null) {
  psql(`WITH fixture_ids AS MATERIALIZED (SELECT gen_random_uuid() AS id FROM generate_series(1,${count})),
    fixture_sessions AS (INSERT INTO sessions(id) SELECT id FROM fixture_ids RETURNING id)
    INSERT INTO leads(id,session_id,created_at,first_name,is_test,communication_suppressed,assigned_agent_id)
      SELECT id,id,now() - interval '1 day','SYNTHETIC REPORTING BULK — NOT A CONSUMER',false,false,${literal(agent)} FROM fixture_sessions;`);
}

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("conversion reporting: real isolated PostgreSQL reconciliation", () => {
  let client: Client | undefined;
  let fixtureConnectionString: string;
  beforeAll(async () => {
    const connectionString = await startDatabase({ loopbackTcp: true }); install("amm_qa_upgrade", true);
    if (!connectionString || new URL(connectionString).hostname !== "127.0.0.1" ||
      new URL(connectionString).pathname !== "/amm_qa_upgrade") throw new Error("isolated_loopback_fixture_required");
    fixtureConnectionString = connectionString;
    // Use real driver Date decoding, also exercised through Neon by the built
    // browser suite. Cursor SELECTs explicitly preserve timestamp microseconds.
    // Only transport is replaced; no result/SQL mock. This single-connection
    // fixture serializes queued reads explicitly (no deprecated pg concurrency).
    client = new Client({ connectionString });
    await client.connect(); await client.query("SET ROLE service_role");
    let queued: Promise<unknown> = Promise.resolve();
    reportingQuery.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      statements.push({ sql, params });
      const result=queued.then(()=>client!.query(sql,params));
      queued=result.then(()=>undefined,()=>undefined);
      return (await result).rows;
    });
    expect(psql("SELECT count(*) FROM leads;")).toBe("0");
    psql(`INSERT INTO agents(id,name,email,role,is_active) VALUES (${literal(otherAgent)},'SYNTHETIC OTHER REPORTING AGENT','other-reporting@example.test','backup',false);`);
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("external_network_forbidden"); }));
  }, 120_000);
  afterAll(async () => { await client?.end(); stopDatabase(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }, 30_000);

  it('distinguishes a measured empty cohort from an unavailable database', async () => {
    const anchor = new Date();
    const old = await loadAcceptedReportingSummary(30, administrator, anchor);
    const fresh = await loadNeonAdminReportingSummary(30, administrator, anchor);
    expect(fresh.error).toBeUndefined();
    expect(fresh.conversionReporting.cohort.denominator).toBe(0);
    expect(fresh.conversionReporting.totals?.conversionRate).toBeNull();
    expect(fresh).toEqual({ ...old, displayBounds: fresh.displayBounds,
      conversionReporting: { ...old.conversionReporting, cohort: {
        ...old.conversionReporting.cohort, calculation: 'database_snapshot_aggregate',
      } },
    });
  });

  it("reconciles distinct-lead states and recorded closed outcomes, without status-inferred appointments or contact", async () => {
    const source = `synthetic-reporting-states-${randomUUID()}`;
    const states = ["requested", "scheduled", "confirmed", "completed", "no_show", "canceled"];
    for (const state of states) { const id = seed({ source }); appointment(id, state);
      if (state === "completed") { appointment(id, "completed"); outcome(id, "closed"); } }
    const snapshot = seed({ source, status: "converted" });
    outcome(snapshot, "closed", { test: true, suppressed: false });
    outcome(snapshot, "closed", { test: false, suppressed: true });
    psql(`INSERT INTO tasks(lead_id,title,category,status) VALUES (${literal(snapshot)},'SYNTHETIC callback completed','followup:manual_callback','done');
      INSERT INTO communication_events(lead_id,event_type,channel) VALUES (${literal(snapshot)},'delivered','email');`);
    const report = await loadNeonAdminReportingSummary(30, administrator);
    expect(report.error).toBeUndefined();
    expect(report.conversionReporting.sources.find((row) => row.source === source)).toMatchObject({ captured: 7,
      appointments: 6, appointmentStates: { requested: 1, scheduled: 1, confirmed: 1, completed: 1, no_show: 1, canceled: 1 },
      appointmentEvidenceUnknown: 1, closedWon: 1, commissions: null, firstHumanResponse: 0,
      manualAttempted: 0, twoWayContact: 0, manualEvidenceUnknown: 7 });
    expect(report.rows.find((row) => row.id === snapshot)?.outcome_types).toEqual([]);
  });

  it("uses the captured-lead denominator and excludes test, suppressed, duplicate, old and future lead records before joins", async () => {
    const source = `synthetic-reporting-exclusions-${randomUUID()}`;
    const live = seed({ source }); appointment(live, "requested");
    const excluded = [seed({ source, test: true }), seed({ source, suppressed: true }),
      seed({ source, duplicate: true }), seed({ source, duplicateOf: live }),
      seed({ source, ageDays: 45 }), seed({ source, ageDays: -1 })];
    for (const id of excluded) { appointment(id, "completed"); outcome(id, "closed"); }
    const report = await loadNeonAdminReportingSummary(30, administrator);
    expect(report.error).toBeUndefined();
    expect(report.conversionReporting.sources.find((row) => row.source === source)).toMatchObject({ captured: 1,
      appointments: 1, appointmentStates: { requested: 1, completed: 0 }, closedWon: 0 });
    expect(report.rows.some((row) => excluded.includes(row.id))).toBe(false);
    expect(report.dataTrust.excludedTest).toBe(1);
    expect(report.dataTrust.excludedSuppressed).toBe(1);
    expect(report.dataTrust.excludedDuplicates).toBe(2);
  });

  it("counts manual attempts and conversations from actual provenance-gated audit records, independently of first response", async () => {
    const source = `synthetic-reporting-human-${randomUUID()}`;
    const attempted = seed({ source }); const conversation = seed({ source }); const unrelated = seed({ source });
    humanAudit(attempted, "attempted"); humanAudit(attempted, "no_answer");
    humanAudit(conversation, "two_way_conversation"); humanAudit(conversation, "two_way_conversation");
    humanAudit(unrelated, "two_way_conversation", "provider_delivery");
    humanAudit(unrelated, "two_way_conversation", "manual_operator_record", "lead.lifecycle_changed");
    humanAudit(unrelated, "two_way_conversation", "manual_operator_record", "lead.human_interaction_recorded", "malformed-timestamp");
    humanAudit(unrelated, "two_way_conversation", "manual_operator_record", "lead.human_interaction_recorded", new Date(Date.now() + 86_400_000).toISOString());
    psql(`SELECT record_admin_first_response_v1(${literal(unrelated)},'lead_center:synthetic-reporting-admin',now() - interval '1 minute');`);
    const report = await loadNeonAdminReportingSummary(30, administrator);
    expect(report.error).toBeUndefined();
    expect(report.conversionReporting.sources.find((row) => row.source === source)).toMatchObject({ captured: 3,
      manualAttempted: 2, twoWayContact: 1, manualEvidenceUnknown: 1, firstHumanResponse: 1 });
  });

  it("enforces owner SQL scope and analyst aggregate-only returns without private values or URLs", async () => {
    const own = seed({ agent: ownerAgent, source: "synthetic-reporting-own" });
    const other = seed({ agent: otherAgent, source: "synthetic-reporting-other" });
    seedMany(52, ownerAgent);
    appointment(own, "completed"); appointment(other, "completed"); outcome(other, "closed");
    const start = statements.length;
    const owner = await loadNeonAdminReportingSummary(30, { ...administrator, role: "primary_lead_owner", agentId: ownerAgent });
    expect(owner.error).toBeUndefined();
    expect(owner.conversionReporting.cohort.denominator).toBe(53);
    expect(owner.rows.every((row) => row.assigned_agent_id === ownerAgent)).toBe(true);
    expect(owner.rows.some((row) => row.id === other)).toBe(false);
    for (const statement of statements.slice(start).filter((entry) => entry.sql.includes("public.leads l"))) {
      expect(statement.sql).toContain("l.assigned_agent_id = $2::uuid"); expect(statement.params[1]).toBe(ownerAgent);
    }
    const analyst = await loadNeonAdminReportingSummary(30, { ...administrator, role: "read_only_analyst" });
    expect(analyst.error).toBeUndefined(); expect(analyst.conversionReporting.cohort.scope).toBe("aggregate_only");
    expect(analyst.conversionReporting.cohort.denominator).toBe(65);
    expect(analyst.conversionReporting.totals).toMatchObject({ captured: 65, appointments: 9, closedWon: 2,
      firstHumanResponse: 1, manualAttempted: 2, twoWayContact: 1, manualEvidenceUnknown: 63,
      appointmentEvidenceUnknown: 56, commissions: null });
    expect(analyst.rows).toEqual([]); expect(analyst.hotLeads).toEqual([]);
    expect(analyst.topPages).toEqual([]); expect(analyst.agentPerformance).toEqual([]);
    const serialized = JSON.stringify(analyst);
    for (const privateValue of [own, other, "@example.test", "+12525550199", "Synthetic Private Test Street", "private free text", "private@example.test"]) {
      expect(serialized).not.toContain(privateValue);
    }
    const beforeDenied = statements.length;
    const denied = await loadNeonAdminReportingSummary(30, { ...administrator, role: "approved_agent", agentId: ownerAgent });
    expect(denied.error).toBe("lead_center_report_permission_required");
    expect(denied.conversionReporting.cohort.denominator).toBeNull(); expect(statements.length).toBe(beforeDenied);
    const missingScope = await loadNeonAdminReportingSummary(30, { ...administrator, role: "primary_lead_owner", agentId: null });
    expect(missingScope.error).toBe("lead_center_agent_scope_required");
  });

  it("computes complete authoritative totals beyond the old 1000-row reporting cap", async () => {
    // One small set-based insertion into the disposable fixture; no providers,
    // live database or event/transaction implementation under test.
    seedMany(1205);
    const report = await loadNeonAdminReportingSummary(30, administrator);
    expect(report.error).toBeUndefined(); expect(report.conversionReporting.cohort.denominator).toBe(1270);
    expect(report.conversionReporting.cohort.totals).toBe("complete");
    expect(report.conversionReporting.cohort.calculation).toBe("database_snapshot_aggregate");
    expect(report.conversionReporting.totals).toMatchObject({ captured: 1270, appointments: 9, closedWon: 2,
      manualAttempted: 2, twoWayContact: 1, firstHumanResponse: 1, manualEvidenceUnknown: 1268,
      appointmentEvidenceUnknown: 1261, outcomeEvidenceUnknown: 1268,
      appointmentStates: { requested: 2, scheduled: 1, confirmed: 1, completed: 3, no_show: 1, canceled: 1 } });
    expect(report.dataTrust).toMatchObject({ included: 1270, excludedTest: 1, excludedSuppressed: 1,
      excludedDuplicates: 2, unknownFirstTouch: 1257, unknownLastTouch: 1257, outcomesObserved: 2 });
    expect(report.conversionReporting.sources.find((row) => row.source === "Unknown first touch")?.captured).toBe(1257);
    expect(report.conversionReporting.sources.reduce((sum, row) => sum + row.captured, 0)).toBe(report.conversionReporting.cohort.denominator);
    expect(report.rows.length).toBe(50);
    expect(report.funnel.captured).toBe(report.conversionReporting.cohort.denominator);
    expect(report.operationalTrust.duplicates.canonicalLeads).toBe(report.conversionReporting.cohort.denominator);
  });

  it("paginates a fixed full cohort without gaps/duplicates, preserves timestamp microseconds, and scopes every owner page", async () => {
    const report = await loadNeonAdminReportingSummary(30, administrator);
    const allIds: string[] = []; let cursor: string | undefined;
    for (let page = 0; page < 30; page++) {
      const result = await loadNeonAdminReportingDrillthrough({ principal: administrator, limit: 100, cursor,
        asOf: new Date(report.generatedAt) });
      expect(result.error).toBeUndefined(); expect(result.rows.length).toBeLessThanOrEqual(100);
      allIds.push(...result.rows.map((row) => row.id));
      if (!result.hasMore) break;
      expect(result.nextCursor).toMatch(/\.\d{6}Z~/); cursor = result.nextCursor!;
    }
    expect(allIds.length).toBe(1270); expect(new Set(allIds).size).toBe(1270);
    expect(report.rows.every(row=>allIds.includes(row.id))).toBe(true);
    expect(psql("SELECT count(*) FROM leads WHERE is_test=false AND communication_suppressed=false AND is_duplicate=false AND duplicate_of_lead_id IS NULL AND created_at>=now()-interval '30 days' AND created_at<now();")).toBe(String(allIds.length));
    const ownerIds: string[] = []; cursor = undefined;
    const owner = { ...administrator, role: "primary_lead_owner" as const, agentId: ownerAgent };
    for (let page = 0; page < 10; page++) {
      const result = await loadNeonAdminReportingDrillthrough({ principal: owner, limit: 10, cursor });
      expect(result.error).toBeUndefined(); expect(result.rows.every((row) => row.assigned_agent_id === ownerAgent)).toBe(true);
      ownerIds.push(...result.rows.map((row) => row.id)); if (!result.hasMore) break; cursor = result.nextCursor!;
    }
    expect(ownerIds.length).toBe(53); expect(new Set(ownerIds).size).toBe(53);
    const analyst = await loadNeonAdminReportingDrillthrough({ principal: { ...administrator, role: "read_only_analyst" } });
    expect(analyst.rows).toEqual([]); expect(analyst.error).toBe("lead_center_drillthrough_permission_required");
  });

  it("records loopback p50/p95 for five report reads on the declared 1270-live-lead fixture, without a production SLA", async () => {
    const samples: number[] = []; const before = statements.length;
    for (let run = 0; run < 5; run++) {
      const start = performance.now(); const report = await loadNeonAdminReportingSummary(30, administrator);
      samples.push(performance.now() - start);
      expect(report.error).toBeUndefined(); expect(report.conversionReporting.cohort.denominator).toBe(1270);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const percentile = (p: number) => sorted[Math.ceil(sorted.length * p) - 1];
    expect(samples.every((ms) => Number.isFinite(ms) && ms >= 0)).toBe(true);
    // tests/setup may mock console; stdout keeps this synthetic-only receipt
    // visible to the main serial run without creating files or exposing PII.
    process.stdout.write(`CONVERSION_REPORTING_LOOPBACK_TIMING ${JSON.stringify({ transport: "PostgreSQL 17 TCP loopback 127.0.0.1",
      eligibleLeads: 1270, reportingReads: 5, sqlRoundTrips: statements.length - before,
      p50Ms: Number(percentile(0.50).toFixed(2)), p95Ms: Number(percentile(0.95).toFixed(2)),
      aggregation: "one database snapshot, bounded detail/dimensions", productionSla: false })}\n`);
  });

  it("does not report a real missing canonical source as a measured-zero success", async () => {
    psql("ALTER TABLE public.lead_outcomes RENAME TO synthetic_conversion_reporting_unavailable;");
    try {
      const report = await loadNeonAdminReportingSummary(30, administrator);
      expect(report.error).toBe("Canonical Neon reporting query failed");
      expect(report.conversionReporting).toMatchObject({ available: false, totals: null, sources: [], cohort: { denominator: null } });
    } finally { psql("ALTER TABLE public.synthetic_conversion_reporting_unavailable RENAME TO lead_outcomes;"); }
  });

  it('preserves every public metric against the accepted independent implementation for all permitted scopes',async()=>{
    const anchor=new Date();
    for(const role of ['administrator','primary_lead_owner','read_only_analyst'] as const){
      const principal={...administrator,role,agentId:role==='primary_lead_owner'?ownerAgent:null};
      const old=await loadAcceptedReportingSummary(30,principal,anchor);
      const fresh=await loadNeonAdminReportingSummary(30,principal,anchor);
      expect(old.error).toBeUndefined();expect(fresh.error).toBeUndefined();
      const expected={...old,rows:old.rows.slice(0,50),displayBounds:fresh.displayBounds,
        conversionReporting:{...old.conversionReporting,cohort:{...old.conversionReporting.cohort,calculation:'database_snapshot_aggregate'}}};
      expect(fresh).toEqual(expected);
    }
  });

  it('preserves every widget across mixed dates, status, hot/stalled facts, attribution shapes and null evidence', async () => {
    for (const [index, status] of ['new', 'scored', 'qualified', 'assigned', 'contacted',
      'appointment_requested', 'appointment_set', 'nurture', 'dead', 'converted', 'escalated'].entries()) {
      const id = seed({ source: ' synthetic_mixed ', status, ageDays: index % 3 === 0 ? 12 : 5,
        agent: index % 2 === 0 ? ownerAgent : null });
      psql(`UPDATE leads SET lead_type='seller',primary_intent='sell',timeline_months=${index % 2 === 0 ? 0 : 6},
        assigned_at=created_at+interval '1 hour',last_contacted_at=${index % 3 === 0 ? "created_at+interval '2 hours'" : 'NULL'},
        lead_grade='A',source_detail=${literal(index % 2 === 0 ? ' ' : ' mixed detail ')},
        page_url=${literal('https://example.test/synthetic-mixed-'+index)} WHERE id=${literal(id)};
        UPDATE source_attribution SET first_touch=${literal(JSON.stringify(index % 2 === 0 ? {source:' first JSON source '} : []))}::jsonb,
        last_touch=${literal(JSON.stringify(index % 2 === 0 ? {utm_source:' last JSON source '} : null))}::jsonb,
        utm_campaign=${literal(index % 2 === 0 ? ' ' : ' mixed campaign ')} WHERE lead_id=${literal(id)};
        INSERT INTO tasks(lead_id,title,category,status,due_at,created_at) VALUES
        (${literal(id)},'SYNTHETIC NULL/DUE','followup:manual_callback','open',NULL,now()-interval '1 hour'),
        (${literal(id)},'SYNTHETIC OVERDUE','followup:manual_callback','open',now()-interval '1 hour',now()-interval '1 hour'),
        (${literal(id)},'SYNTHETIC FUTURE','followup:manual_callback','open',now()+interval '2 days',now()-interval '1 hour');`);
      appointment(id, index % 2 === 0 ? 'reschedule_requested' : 'no_show');
      appointment(id, 'completed'); appointment(id, 'completed');
      if (index % 2 === 0) { outcome(id, 'qualified'); outcome(id, 'qualified'); }
      if (index % 3 === 0) { outcome(id, 'closed'); outcome(id, 'closed'); }
    }
    const today = seed({source:'synthetic_today'});
    psql(`UPDATE leads SET created_at=now()-interval '1 hour',email=' ',phone=NULL WHERE id=${literal(today)};`);
    const anchor = new Date();
    for (const window of [7, 30, 90] as const) {
      for (const role of ['administrator', 'primary_lead_owner', 'read_only_analyst'] as const) {
        const principal = {...administrator, role, agentId: role === 'primary_lead_owner' ? ownerAgent : null};
        const old = await loadAcceptedReportingSummary(window, principal, anchor);
        const fresh = await loadNeonAdminReportingSummary(window, principal, anchor);
        expect(old.error).toBeUndefined(); expect(fresh.error).toBeUndefined();
        expect(fresh).toEqual({...old, rows:old.rows.slice(0,50), displayBounds:fresh.displayBounds,
          conversionReporting:{...old.conversionReporting,cohort:{...old.conversionReporting.cohort,calculation:'database_snapshot_aggregate'}}});
      }
    }
    // This fixture includes Docker/psql startup and nine accepted/candidate
    // comparisons. Its deadline is not the separate 2s reporting-scale target.
  }, 30_000);

  it('combines high-cardinality groups explicitly without changing any full-cohort count',async()=>{
    const before=await loadNeonAdminReportingSummary(30,administrator);
    psql(`WITH ids AS MATERIALIZED(SELECT gen_random_uuid() id,i FROM generate_series(1,75)i), s AS(INSERT INTO sessions(id) SELECT id FROM ids RETURNING id)
      INSERT INTO leads(id,session_id,first_name,created_at,source,source_detail,lead_type,primary_intent) SELECT ids.id,ids.id,'SYNTHETIC DIMENSION',now()-interval '1 day','synthetic_dimension_'||i,'detail_'||i,'renter','unknown' FROM ids JOIN s ON s.id=ids.id;
      INSERT INTO source_attribution(lead_id,session_id,utm_source) SELECT id,session_id,source FROM leads WHERE first_name='SYNTHETIC DIMENSION';`);
    const r=await loadNeonAdminReportingSummary(30,administrator);
    expect(r.error).toBeUndefined();expect(r.funnel.captured).toBe(before.funnel.captured+75);
    for(const groups of [r.sources,r.campaigns]){expect(groups.length).toBe(51);expect(groups.reduce((s,g)=>s+g.count,0)).toBe(r.funnel.captured);expect(groups.some(g=>g.label.includes('groups (combined)'))).toBe(true);}
    expect(r.conversionReporting.sources.length).toBe(51);expect(r.conversionReporting.sources.reduce((s,g)=>s+g.captured,0)).toBe(r.funnel.captured);
    expect(r.leadTypes.reduce((s,g)=>s+g.count,0)).toBe(r.funnel.captured);
    expect(r.intents.reduce((s,g)=>s+g.count,0)).toBe(r.funnel.captured);
  });

  it('uses one actual statement snapshot despite an intervening current-status edit',async()=>{
    const id=seed({source:'synthetic_snapshot'}),anchor=new Date();
    const before=await loadNeonAdminReportingSummary(30,administrator,anchor);
    reportingQuery.query.mockImplementationOnce(async(statement:string,params:unknown[])=>{
      const blocker = new Client({ connectionString: fixtureConnectionString });
      await blocker.connect();
      const lockKey = Number.parseInt(randomUUID().replaceAll('-', '').slice(0, 7), 16);
      try {
        const pid = (await client!.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await blocker.query('SELECT pg_advisory_lock($1::bigint)', [lockKey]);
        const pending = client!.query(
          `WITH snapshot_gate AS MATERIALIZED(SELECT pg_advisory_xact_lock(${lockKey})), ` +
          statement.replace(/^WITH /, '') + ' FROM snapshot_gate', params,
        );
        try {
          // Observe the actual report statement waiting inside PostgreSQL.
          // A fixed sleep cannot prove its snapshot began on a loaded runner.
          let observed = false;
          const deadline = Date.now() + 5_000;
          while (Date.now() < deadline) {
            const activity = (await blocker.query(
              "SELECT wait_event_type, wait_event FROM pg_stat_activity WHERE pid=$1", [pid],
            )).rows[0];
            if (activity?.wait_event_type === 'Lock' && activity.wait_event === 'advisory') {
              observed = true; break;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          expect(observed).toBe(true);
          await blocker.query("UPDATE leads SET status='qualified' WHERE id=$1::uuid", [id]);
        } finally {
          await blocker.query('SELECT pg_advisory_unlock($1::bigint)', [lockKey]);
        }
        return (await pending).rows;
      } finally {
        await blocker.end();
      }
    });
    const concurrent=await loadNeonAdminReportingSummary(30,administrator,anchor);
    expect(concurrent.error).toBeUndefined();expect(concurrent.funnel.qualified).toBe(before.funnel.qualified);
    expect(concurrent.rows.find(r=>r.id===id)?.status).toBe('new');
    const after=await loadNeonAdminReportingSummary(30,administrator,anchor);
    expect(after.funnel.qualified).toBe(before.funnel.qualified+1);expect(after.rows.find(r=>r.id===id)?.status).toBe('qualified');
  }, 15_000);

  it('rechecks ownership and revoked report permission on later cursor requests',async()=>{
    const owner={...administrator,role:'primary_lead_owner' as const,agentId:ownerAgent};
    const first=await loadNeonAdminReportingDrillthrough({principal:owner,limit:1});expect(first.nextCursor).toBeTruthy();
    psql(`UPDATE leads SET assigned_agent_id=${literal(otherAgent)} WHERE assigned_agent_id=${literal(ownerAgent)};`);
    const later=await loadNeonAdminReportingDrillthrough({principal:owner,cursor:first.nextCursor!});expect(later.rows).toEqual([]);
    const denied=await loadNeonAdminReportingDrillthrough({principal:{...owner,role:'approved_agent'},cursor:first.nextCursor!});expect(denied.error).toBe('lead_center_drillthrough_permission_required');
    const mismatched=await loadNeonAdminReportingDrillthrough({principal:administrator,windowDays:7,cursor:first.nextCursor!});expect(mismatched.error).toBe('invalid_reporting_cursor');
  });

  it('does not turn a real cancelled SQL query into a complete zero report',async()=>{
    await client!.query('SET statement_timeout=1');
    try{const r=await loadNeonAdminReportingSummary(30,administrator);expect(r.error).toBe('Canonical Neon reporting query failed');expect(r.conversionReporting.available).toBe(false);expect(r.conversionReporting.cohort.denominator).toBeNull();}
    finally{await client!.query('SET statement_timeout=0');}
  });
});
