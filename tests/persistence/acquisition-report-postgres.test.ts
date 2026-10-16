// @vitest-environment node
// Actual PG, fresh owned local process/schema/synthetic fixtures, no provider I/O.
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bind, install, literal, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { ACQUISITION_AGGREGATE_SQL, loadAcquisitionReport } from "../../app/lib/persistence/neonAcquisitionReport";
import { ACQUISITION_PLACEMENTS, type AcquisitionWindow } from "../../app/lib/growth/acquisition-window";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
const owner = "00000000-0000-4000-8000-000000009901";
const admin: LeadCenterPrincipal = { userId: "synthetic-report-admin", role: "administrator", agentId: null, name: "SYNTHETIC", email: "report@example.test" };
// Declared BEFORE measuring: 3 serial reads at each scale, p95 <=2000ms,
// aggregate response <=16KiB, RSS delta <=64MiB, SQL statement <=5000ms.
const budget = { repeats: 3, concurrency: 1, p95Ms: 2000, responseBytes: 16384, rssDeltaBytes: 64 * 1024 * 1024, statementMs: 5000 };
describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("acquisition full-cohort reporting: isolated PostgreSQL", () => {
  let client: Client; let connection: string; let window: AcquisitionWindow; let anchor: Date;
  let count = 0;
  const statements: string[] = [];
  const measurements: Record<string, unknown>[] = [];
  async function query(text: string, params: unknown[]) {
    statements.push(text);
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      await client.query("SET LOCAL statement_timeout='5000ms'");
      const r = await client.query(text, params);
      await client.query("COMMIT"); return r.rows;
    } catch (e) { await client.query("ROLLBACK"); throw e; }
  }
  const read = (placement: AcquisitionWindow["placement"] = "all", principal = admin) => loadAcquisitionReport({ ...window, placement }, principal, { query });
  function seedThrough(n: number) {
    psql(`WITH ids AS MATERIALIZED (SELECT i,md5('acq-inquiry-'||i)::uuid AS id FROM generate_series(${count + 1},${n}) i),
      s AS (INSERT INTO sessions(id) SELECT id FROM ids RETURNING id)
      INSERT INTO leads(id,session_id,created_at,first_name,contact_id,is_test,communication_suppressed,assigned_agent_id)
      SELECT f.id,f.id,${literal(new Date(anchor.getTime()-86400000).toISOString())}::timestamptz,'SYNTHETIC ACQUISITION — NOT A CONSUMER',
        CASE WHEN i%11=0 THEN NULL ELSE md5('acq-person-'||(i%2300))::uuid END,false,false,CASE WHEN i%2=0 THEN ${literal(owner)}::uuid ELSE NULL END
      FROM ids f JOIN s ON s.id=f.id;
      INSERT INTO source_attribution(lead_id,session_id,utm_source,utm_medium,utm_campaign,utm_content,created_at)
      SELECT md5('acq-inquiry-'||i)::uuid,md5('acq-inquiry-'||i)::uuid,'ourtownproperties','owned_media','amm_owned_demand_2026',
        (ARRAY['wordpress_homepage_ask_mike','wordpress_we_buy_homes','wordpress_listing_buyer'])[1+(i%3)],
        ${literal(new Date(anchor.getTime()-86000000).toISOString())}::timestamptz
      FROM generate_series(${count + 1},${n}) i;`);
    count = n;
  }
  beforeAll(async () => {
    const url = await startDatabase({ loopbackTcp: true }); install("amm_qa_upgrade", true);
    if (!url || new URL(url).hostname !== "127.0.0.1" || new URL(url).pathname !== "/amm_qa_upgrade") throw new Error("owned_loopback_database_required");
    connection = url; client = new Client({ connectionString: url }); await client.connect(); await client.query("SET ROLE service_role");
    expect(psql("SELECT count(*) FROM leads;")).toBe("0");
    anchor = new Date();
    window = { mode: "7", placement: "all", from: new Date(anchor.getTime()-7*86400000).toISOString(), to: anchor.toISOString(), label: "Synthetic 7-day window" };
    psql("INSERT INTO contacts(id,email) SELECT md5('acq-person-'||i)::uuid,'synthetic-acq-'||i||'@example.test' FROM generate_series(0,2299) i;");
  }, 120000);
  afterAll(async () => {
    await client?.end(); stopDatabase();
    mkdirSync(".amm-run/acquisition-report",{recursive:true});
    writeFileSync(`.amm-run/acquisition-report/scale-${Date.now()}.json`,JSON.stringify({venue:"fresh isolated PostgreSQL17; synthetic only; no provider",budget,measurements},null,2),{mode:0o600});
  }, 30000);
  it("returns a measured zero with bounded aggregate output, not disconnected data", async () => {
    expect(await read()).toMatchObject({ coverage: "complete", totals: { inquiries: 0, contacts: 0, unresolved: 0 } });
  });
  it.each([5001,10001])("counts the complete %i-inquiry cohort, with actual plans and a fixed finite budget", async n => {
    seedThrough(n);
    const durations: number[] = []; const rss = process.memoryUsage().rss;
    for (let attempt=0; attempt<budget.repeats; attempt++) {
      const start=performance.now(); const report=await read(); durations.push(performance.now()-start);
      expect(report.coverage).toBe("complete"); expect(report.totals!.inquiries).toBe(n);
      const expectedContacts = new Set(Array.from({length:n},(_,i)=>i+1).filter(i=>i%11!==0).map(i=>i%2300)).size;
      expect(report.totals!.contacts).toBe(expectedContacts);
      expect(report.totals!.unresolved).toBe(Math.floor(n/11));
      expect(report.placements.reduce((sum,p)=>sum+p.counts.inquiries,0)).toBe(n);
      expect(report.placements.reduce((sum,p)=>sum+p.counts.contacts,0)).toBeGreaterThan(expectedContacts);
      expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThan(budget.responseBytes);
      expect(JSON.stringify(report)).not.toMatch(/example\.test|contact_id|inquiry_id|recipient_reference|SYNTHETIC ACQUISITION/);
    }
    const p95=durations.toSorted((a,b)=>a-b)[Math.ceil(durations.length*.95)-1];
    expect(p95).toBeLessThan(budget.p95Ms); expect(process.memoryUsage().rss-rss).toBeLessThan(budget.rssDeltaBytes);
    const plan = (await query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${ACQUISITION_AGGREGATE_SQL}`,
      [window.from,window.to,JSON.stringify(ACQUISITION_PLACEMENTS.map(({key})=>({key}))),"all",null]))[0]["QUERY PLAN"][0];
    const evidence={n,budget,durationsMs:durations,p95Ms:p95,rssDeltaBytes:process.memoryUsage().rss-rss,planningMs:plan["Planning Time"],executionMs:plan["Execution Time"],plan:plan.Plan};
    measurements.push(evidence);console.info("isolated acquisition scale",JSON.stringify(evidence));
    expect(statements.every(s=>!s.includes("LIMIT 5000"))).toBe(true);
  },30000);
  it("uses a real least-privilege read-only transaction with statement timeout and no raw result rows", async () => {
    const identity=(await query("SELECT current_setting('transaction_read_only') AS ro,current_setting('transaction_isolation') AS level,current_setting('statement_timeout') AS timeout",[]))[0];
    expect(identity).toEqual({ro:"on",level:"repeatable read",timeout:"5s"});
    expect((await read()).placements).toHaveLength(3);
  });
  it("retains repeat inquiries by one contact and does not multiply rows for attribution/callback relations", async () => {
    psql("UPDATE leads SET is_duplicate=true,duplicate_of_lead_id=md5('acq-inquiry-2')::uuid WHERE id=md5('acq-inquiry-1')::uuid;");
    expect((await read()).totals!.inquiries).toBe(10001);
    // Actual schema forbids multiple attribution rows per inquiry. Do not drop
    // that constraint to make an impossible fixture appear representative.
    expect(()=>psql("INSERT INTO source_attribution(lead_id,session_id) SELECT lead_id,session_id FROM source_attribution LIMIT 1;")).toThrow();
    // The actual request key (not widget_session_id) has the uniqueness guard.
    const key=randomUUID();
    psql(`UPDATE leads SET request_idempotency_key=${literal(key)} WHERE id=md5('acq-inquiry-1')::uuid;`);
    expect(()=>psql(`UPDATE leads SET request_idempotency_key=${literal(key)} WHERE id=md5('acq-inquiry-2')::uuid;`)).toThrow();
    expect((await read()).totals!.inquiries).toBe(10001);
  });
  it("actual exact capture replay adds one synthetic suppressed record, not another inquiry or notification", () => {
    const id=randomUUID(); const payload={first_name:"INTERNAL QA",last_name:"DO NOT CONTACT",email:`${id}@example.test`,normalized_email:`${id}@example.test`,lead_type:"buyer",primary_intent:"buy",source:"isolated_acquisition",is_test:true,communication_suppressed:true,email_suppressed:true,sms_suppressed:true,consent_email:false,consent_call:false,consent_sms:false,request_idempotency_key:id};
    const command=bind("SELECT capture_public_lead_v1($1::jsonb,$2::jsonb,$3::jsonb,'disabled')",[JSON.stringify({id}),JSON.stringify(payload),"{}"]);
    const first=JSON.parse(psql(command)); const before=psql("SELECT json_build_object('leads',count(*),'notifications',(SELECT count(*) FROM lead_notifications)) FROM leads;");
    const second=JSON.parse(psql(command));expect(first.ok).toBe(true);expect(second.lead_id).toBe(first.lead_id);expect(second.idempotent_replay).toBe(true);
    expect(psql("SELECT json_build_object('leads',count(*),'notifications',(SELECT count(*) FROM lead_notifications)) FROM leads;")).toBe(before);
  });
  it("keeps owner assignment scope, filtered placements and global distinct counts correct", async () => {
    expect((await read("all",{...admin,role:"primary_lead_owner",agentId:owner})).totals!.inquiries).toBe(5000);
    expect((await read("wordpress_we_buy_homes")).totals!.inquiries).toBe(3334);
    expect((await read("all",{...admin,role:"read_only_analyst"})).totals!.inquiries).toBe(10001);
    psql(`UPDATE leads SET assigned_agent_id=NULL WHERE id=md5('acq-inquiry-2')::uuid;`);
    expect((await read("all",{...admin,role:"primary_lead_owner",agentId:owner})).totals!.inquiries).toBe(4999);
  });
  it("excludes QA and suppression without using consent as a filter", async () => {
    expect(psql("SELECT count(*) FROM leads WHERE first_name='SYNTHETIC ACQUISITION — NOT A CONSUMER' AND consent_email=false AND consent_call=false AND consent_sms=false;")).toBe("10001");
    psql("UPDATE leads SET is_test=true WHERE id=md5('acq-inquiry-1')::uuid;UPDATE leads SET communication_suppressed=true WHERE id=md5('acq-inquiry-2')::uuid;");
    expect((await read()).totals!.inquiries).toBe(9999);
    psql("UPDATE leads SET is_test=false WHERE id=md5('acq-inquiry-1')::uuid;UPDATE leads SET communication_suppressed=false WHERE id=md5('acq-inquiry-2')::uuid;");
    expect((await read()).totals!.inquiries).toBe(10001);
  });
  it("acceptance boundaries are start-inclusive/end-exclusive, independent of current delivery time", async () => {
    const id=randomUUID(); psql(`INSERT INTO sessions(id) VALUES(${literal(id)});INSERT INTO leads(id,session_id,created_at) VALUES(${literal(id)},${literal(id)},${literal(window.from)});INSERT INTO source_attribution(lead_id,session_id,utm_source,utm_medium,utm_campaign,utm_content) VALUES(${literal(id)},${literal(id)},'ourtownproperties','owned_media','amm_owned_demand_2026','wordpress_we_buy_homes');`);
    expect((await read()).totals!.inquiries).toBe(10002);
    psql(`UPDATE leads SET created_at=${literal(window.to)} WHERE id=${literal(id)};`);
    expect((await read()).totals!.inquiries).toBe(10001);
  });
  it("preserves separate operator acceptance/current delivery, unknown metadata and legacy non-failure absence", async () => {
    // Only disposable synthetic fixture setup uses the existing capture guard setting.
    psql(`BEGIN;SET LOCAL amm.launch_alert_capture='v4';
      INSERT INTO lead_notifications(lead_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key,status,provider_message_id,provider_accepted_at,metadata)
      VALUES(md5('acq-inquiry-3')::uuid,'lead_alert','email','internal','synthetic-mike@example.test','lead_alert_email_v6','synthetic-acq-mike','sent','synthetic-message',now(),'{"operator":"mike","provider_delivery_confirmed":true}'),
      (md5('acq-inquiry-3')::uuid,'lead_alert','email','internal','synthetic-brandon@example.test','lead_alert_email_v6','synthetic-acq-brandon','pending',NULL,NULL,'{"operator":"brandon"}'),
      (md5('acq-inquiry-4')::uuid,'lead_alert','email','internal','synthetic-unknown@example.test','lead_alert_email_v6','synthetic-acq-unknown','pending',NULL,NULL,'{}');COMMIT;`);
    const report=await read();expect(report.totals).toMatchObject({inquiries:10001,unknownOperatorEnvelopes:1,mike:{envelopes:1,providerAccepted:1,delivered:1,noV6Recorded:10000},brandon:{envelopes:1,pending:1,failed:0}});
    psql("UPDATE lead_notifications SET metadata=metadata||'{\"provider_delivery_confirmed\":true}'::jsonb WHERE idempotency_key='synthetic-acq-mike';");
    expect((await read()).totals!.mike.delivered).toBe(1);
    psql("UPDATE lead_notifications SET status='retry_scheduled' WHERE idempotency_key='synthetic-acq-brandon';");
    expect((await read()).totals!.brandon.retry).toBe(1);
    psql("UPDATE lead_notifications SET status='permanently_failed' WHERE idempotency_key='synthetic-acq-brandon';");
    expect((await read()).totals!.brandon.failed).toBe(1);
  });
  it("returns unavailable rather than a false zero under revoked read permission/RLS", async () => {
    const denied=new Client({connectionString:connection});await denied.connect();await denied.query("SET ROLE anon");
    try { expect((await loadAcquisitionReport(window,admin,{query:async(text,params)=>(await denied.query(text,params)).rows})).coverage).toBe("unavailable"); }
    finally {await denied.end();}
  });
});
