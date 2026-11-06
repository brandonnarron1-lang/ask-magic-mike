// @vitest-environment node
// Real disposable PostgreSQL 17 via the existing harness. No external provider.
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {install,startDatabase,stopDatabase,localQuery,psql,literal,statements} from "../support/qa-audit-postgres";
import {runDailyDigest} from "../../app/lib/operations/dailyDigest";
import {readTrafficReport} from "../../app/lib/persistence/neonTrafficReport";
import {LEAD_CONSENT_LANGUAGE_TEXT,LEAD_CONSENT_LANGUAGE_VERSION} from "../../app/lib/leadConsent";
vi.mock("@neondatabase/serverless",async()=>{const h=await import("../support/qa-audit-postgres");return {neon:()=>h.localQuery}});
vi.mock("../../src/lib/security/rate-limit",async original=>({...await original<object>(),checkRateLimit:vi.fn(async()=>({allowed:true,durable:true,remaining:50,resetAt:Date.now()+60000}))}));
vi.mock("../../app/lib/serverAnalytics",()=>({recordServerAnalyticsEvent:vi.fn(async()=>true)}));
vi.mock("../../app/lib/growth/lead-experiment-conversion",()=>({recordLeadExperimentConversion:vi.fn(async()=>({attempted:false}))}));
vi.mock("../../src/lib/operations/first-live-lead-monitor",async original=>({...await original<object>(),createFirstLiveLeadMonitor:()=>null}));
vi.mock("../../app/lib/leadAlertService",async original=>({...await original<object>(),enqueueLeadNotifications:vi.fn(async()=>({internal:null}))}));
const opted=process.env.AMM_QA_POSTGRES_TEST==="1";
// Inject only the digest's business clock. Real timers and the SQL harness stay
// real; wall-clock +24h is still ineligible when CI runs before 8am Eastern.
const digestActivation="2026-11-05T16:27:32.953Z";
const digestDue=new Date("2026-11-06T13:00:00.000Z");
const seller={version:1,option:"cash-review",relationship:"owner",representation:"unknown",occupancy:"unknown"};
function fixture(extra:Record<string,unknown>={}) {
 const key=randomUUID();return {funnel_type:"seller",lead_type:"seller_cash_offer",lead_source_surface:"seller_page",
 name:"Synthetic isolated seller",email:key+"@example.test",address:"101 Synthetic Fixture Road, Unit B",
 seller_request:seller,consent:false,consent_email:false,consent_call:false,question:"Possible direct purchase review; no offer.",
 consent_language_text:LEAD_CONSENT_LANGUAGE_TEXT,consent_language_version:LEAD_CONSENT_LANGUAGE_VERSION,
 idempotency_key:key,widget_session_id:key,attribution:{},...extra};
}
async function submit(body:ReturnType<typeof fixture>) {
 const {POST}=await import("../../app/api/leads/route");
 const response=await POST(new Request("https://www.askmagicmike.com/api/leads",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://www.askmagicmike.com","Idempotency-Key":body.idempotency_key},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json()};
}
describe.skipIf(!opted)("qualified conversion actual SQL, synthetic only",()=>{
 beforeAll(async()=>{
  await startDatabase();install("amm_qa_upgrade",true);
  vi.stubEnv("DATABASE_URL","postgresql://isolated-placeholder/amm_qa_upgrade");
  vi.stubEnv("DATABASE_ENV","test"); vi.stubEnv("VERCEL_ENV","development");
  vi.stubEnv("PREVIEW_DATA_MODE",""); vi.stubEnv("LEAD_ALERT_V6_ENABLED","true");
  vi.stubEnv("LEAD_ALERT_V6_CUTOFF","2000-01-01T00:00:00Z"); vi.stubEnv("LEAD_NOTIFICATION_MODE","disabled");
  vi.stubEnv("LEAD_NOTIFICATION_TO","mike@example.test");vi.stubEnv("LEAD_NOTIFICATION_SECOND_OPERATOR_TO","operator@example.test");
  vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("external_network_forbidden")}));
 },120000);
 afterAll(()=>{stopDatabase();vi.unstubAllEnvs();vi.unstubAllGlobals()});
 it("keeps predecessor source bodies and browser grants unchanged",()=>{
  expect(psql("SELECT has_function_privilege('anon','public.capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb)','EXECUTE');")).toBe("f");
  expect(()=>psql("SET ROLE authenticated;SELECT recipient FROM operational_daily_reports;")).toThrow();
  expect(readFileSync("supabase/migrations/20261103233000_traffic_daily_digest_seller_review.sql","utf8")).not.toContain("CREATE OR REPLACE");
 });
 it("persists explicit cash request, separate repeats and declined permission with exact retry",async()=>{
  const original=fixture(); const saved=await submit(original);expect(saved.status).toBe(200);
  const rows=await localQuery.query("SELECT lead_type,seller_request,consent_email,assigned_agent_id FROM leads WHERE id=$1::uuid",[saved.body.lead_id]);
  expect(rows[0]).toMatchObject({lead_type:"seller_cash_offer",seller_request:seller,consent_email:false});
  expect((await submit(original)).body.lead_id).toBe(saved.body.lead_id);
  expect((await submit({...original,seller_request:{...seller,representation:"represented"}})).status).toBe(409);
  const next=await submit(fixture({email:original.email,address:"102 Synthetic Fixture Road"}));
  expect(next.status).toBe(200);expect(next.body.lead_id).not.toBe(saved.body.lead_id);
  expect(psql(`SELECT count(DISTINCT contact_id)||':'||count(*) FROM leads WHERE email=${literal(original.email)}`)).toBe("1:2");
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(saved.body.lead_id)}::uuid AND private_intake_snapshot->'submitted'->'seller_request'->>'option'='cash-review'`)).toBe("2");
 });
 it("retains seller intent when v6 generation is disabled instead of losing the request context",async()=>{
  vi.stubEnv("LEAD_ALERT_V6_ENABLED","false");
  try {
   const original=fixture();const saved=await submit(original);expect(saved.status).toBe(200);
   expect((await localQuery.query("SELECT seller_request FROM leads WHERE id=$1::uuid",[saved.body.lead_id]))[0].seller_request).toEqual(seller);
   expect((await submit(original)).body.lead_id).toBe(saved.body.lead_id);
   expect((await submit({...original,seller_request:{...seller,representation:"represented"}})).status).toBe(409);
   expect(psql("SELECT count(*) FROM lead_notifications WHERE provider_message_id IS NOT NULL")).toBe("0");
  } finally {vi.stubEnv("LEAD_ALERT_V6_ENABLED","true");}
 });
 it("rejects cash/as-is mismatch before writes; invalid shape rolls back SQL",async()=>{
  const before=psql("SELECT count(*) FROM leads");
  expect((await submit(fixture({lead_type:"seller"}))).status).toBe(400);
  expect(psql("SELECT count(*) FROM leads")).toBe(before);
  const invalid=fixture({seller_request:{...seller,relationship:null}});
  expect((await submit(invalid)).status).toBe(400);
  const valid=await submit(fixture());
  expect(()=>psql(`UPDATE leads SET seller_request=jsonb_set(seller_request,'{relationship}','null') WHERE id=${literal(valid.body.lead_id)}::uuid`)).toThrow();
 });
 it("deduplicates anonymous events using unique event identity without canonical sessions",async()=>{
  const id=randomUUID(),props={traffic_version:1,traffic_event_id:id,traffic_route:"/sell",traffic_context:"top_level"};
  const sql="INSERT INTO analytics_events(event_name,event_category,properties) VALUES('page_view','session',$1::jsonb) ON CONFLICT DO NOTHING";
  await localQuery.query(sql,[JSON.stringify(props)]);await localQuery.query(sql,[JSON.stringify(props)]);
  expect(psql(`SELECT count(*) FROM analytics_events WHERE properties->>'traffic_event_id'=${literal(id)}`)).toBe("1");
  const now=new Date(),from=new Date(now.getTime()-3600000).toISOString();
  const report=await readTrafficReport(from,now.toISOString(),{query:(s,p)=>localQuery.query(s,p),now,collectionStartedAt:from});
  expect(report.coverage).toBe("complete");expect(report.metrics?.pageViews).toBe(1);expect(report.metrics?.visits).toBe(0);
 });
 it("claims one zero-lead-independent report under concurrent jobs and never replays unknown",async()=>{
  psql(`INSERT INTO lead_center_users(id,name,email,"emailVerified",role) VALUES('digest-fixture','Synthetic operator','operator@example.test',true,'administrator');`);
  const now=digestDue,activation=digestActivation;
  const report=vi.fn(async(from:string,to:string)=>({coverage:"unavailable" as const,reason:"synthetic unavailable storage",from,to,generatedAt:null,collectionStartedAt:null,metrics:null}));
  const send=vi.fn(async()=>({ok:true as const,provider:"mock",providerMessageId:"synthetic-digest-1"}));
  const input={sql:localQuery,env:{OPERATOR_DAILY_DIGEST_USER_ID:"digest-fixture",LEAD_NOTIFICATION_SECOND_OPERATOR_TO:"operator@example.test",LEAD_NOTIFICATION_TO:"mike@example.test",OPERATOR_DAILY_DIGEST_ACTIVATED_AT:activation,RESEND_FROM:"Our Town Properties <sender@example.test>"},now,provider:{name:"mock",send},report};
  expect(await runDailyDigest({...input,now:new Date(now.getTime()-1)})).toMatchObject({periodsConsidered:0,attempted:0});
  expect(send).not.toHaveBeenCalled();
  expect(psql("SELECT count(*) FROM operational_daily_reports WHERE recipient_user_id='digest-fixture'")).toBe("0");
  await Promise.all([runDailyDigest(input),runDailyDigest(input)]);expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0]).toBeDefined(); expect(psql("SELECT count(*) FROM operational_daily_reports WHERE status='accepted'")).toBe("1");
  expect(psql("SELECT count(*) FROM leads WHERE email='operator@example.test'")).toBe("0");
  psql("UPDATE operational_daily_reports SET status='unknown',provider_message_id=NULL");
  await runDailyDigest(input); expect(send).toHaveBeenCalledTimes(1);
  expect(statements.some(s=>s.sql.includes("claim_token"))).toBe(true);
 });
 it("saves uncertain provider outcomes once and refuses a later automatic retry",async()=>{
  psql(`INSERT INTO lead_center_users(id,name,email,"emailVerified",role) VALUES('digest-timeout','Synthetic operator','timeout@example.test',true,'administrator');`);
  const send=vi.fn(async()=>{throw new Error("simulated_lost_acknowledgement")});
  const input={sql:localQuery,env:{OPERATOR_DAILY_DIGEST_USER_ID:"digest-timeout",LEAD_NOTIFICATION_SECOND_OPERATOR_TO:"timeout@example.test",
   OPERATOR_DAILY_DIGEST_ACTIVATED_AT:digestActivation,RESEND_FROM:"Our Town <sender@example.test>"},now:digestDue,
   provider:{name:"mock",send},report:async(from:string,to:string)=>({coverage:"unavailable" as const,reason:"synthetic unavailable",from,to,metrics:null,generatedAt:null,collectionStartedAt:null})};
  expect((await runDailyDigest(input)).interventionRequired).toBe(1);
  expect(psql("SELECT status||':'||attempt_count FROM operational_daily_reports WHERE recipient_user_id='digest-timeout'")).toBe("unknown:1");
  await runDailyDigest(input);expect(send).toHaveBeenCalledTimes(1);
 });
 it("does not misreport unavailable schema/grants as zero traffic",async()=>{
  const to=new Date().toISOString(),from=new Date(Date.now()-3600000).toISOString();
  const unavailable=await readTrafficReport(from,to,{query:async()=>[{allowed:false,metrics:{}}]});
  expect(unavailable.coverage).toBe("unavailable");expect(unavailable.metrics).toBeNull();
 });
});
