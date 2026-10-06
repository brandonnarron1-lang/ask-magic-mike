// @vitest-environment node
import {randomUUID} from "node:crypto";
import {createHash} from "node:crypto";
import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {dumpAndRestoreSyntheticDatabase,concurrent,install,localQuery,psql,startDatabase,stopDatabase} from "../support/qa-audit-postgres";
import {runAllocationScheduler} from "../../app/lib/leadAllocationScheduler";
import {resolveAllocationOffer} from "../../app/lib/leadAllocation";
const transport=vi.hoisted(()=>({send:vi.fn(async()=>({ok:true as const,provider:"synthetic-no-network",providerMessageId:`SYNTHETIC-${Math.random()}`}))}));
vi.mock("../../app/lib/leadNotificationProvider",async original=>({...await original<typeof import("../../app/lib/leadNotificationProvider")>(),selectNotificationProvider:()=>({name:"synthetic-no-network",send:transport.send})}));

describe.runIf(process.env.AMM_QA_POSTGRES_TEST==="1")("scheduler lease — actual isolated PostgreSQL, no-send",()=>{
 beforeAll(async()=>{await startDatabase();install("amm_qa_upgrade",true);vi.stubEnv("LEAD_ALLOCATION_ENABLED","true");vi.stubEnv("LEAD_ALLOCATION_DUE_ENABLED","true");vi.stubEnv("LEAD_ALLOCATION_SENDS_ENABLED","false");vi.stubEnv("LEAD_ALLOCATION_COMMAND_SECRET","synthetic-scheduler-test-key-not-a-credential");},120000);
 afterAll(()=>{stopDatabase();vi.unstubAllEnvs();});
 const acquire=(token:string)=>`SET ROLE service_role; SELECT acquire_lead_allocation_scheduler_v1('${token}');`;
 it("inactive default policy does not acquire or write a lease",async()=>{
  expect(await runAllocationScheduler(localQuery)).toMatchObject({held:true,reason:"policy_held"});
  expect(psql("SELECT count(*) FROM lead_allocation_scheduler_lease;")).toBe("0");
 });
 it("same tick race has one owner; expiry/restart recovers and old worker cannot release new owner",async()=>{
  psql("UPDATE lead_allocation_policy SET active=true,approved_at=now(),starts_at=now(),fallback_agent_id='00000000-0000-4000-8000-000000009901';");
  const tokens=[randomUUID(),randomUUID()];
  const outcomes=await Promise.all(tokens.map(t=>concurrent(acquire(t))));
  expect(outcomes.map(r=>JSON.parse(r)).filter(r=>r.acquired)).toHaveLength(1);
  expect(outcomes.map(r=>JSON.parse(r)).filter(r=>r.reason==="lease_busy")).toHaveLength(1);
  const old=psql("SELECT token FROM lead_allocation_scheduler_lease;");
  psql("UPDATE lead_allocation_scheduler_lease SET lease_until=now()-interval '1 second',last_started_at=now()-interval '91 seconds';");
  const next=randomUUID(),result=JSON.parse(await concurrent(acquire(next)));
  expect(result.acquired).toBe(true);expect(Number(result.late_seconds)).toBeGreaterThanOrEqual(31);
  psql(`SET ROLE service_role; UPDATE lead_allocation_scheduler_lease SET lease_until=NULL WHERE token='${old}' AND lease_until>clock_timestamp();`);
  expect(psql("SELECT token FROM lead_allocation_scheduler_lease;")).toBe(next);
  expect(psql("SELECT lease_until>now() FROM lead_allocation_scheduler_lease;")).toBe("t");
 });
 it("sequential duplicate inside cadence cannot bypass five-intent bound",async()=>{
  psql("UPDATE lead_allocation_scheduler_lease SET lease_until=NULL,last_started_at=now();");
  expect(JSON.parse(await concurrent(acquire(randomUUID())))).toMatchObject({acquired:false,reason:"cadence_duplicate"});
 });
 it("bounded due run records no-send hold, metrics and successful release; replay has no effects",async()=>{
  psql("UPDATE lead_allocation_scheduler_lease SET lease_until=NULL,last_started_at=now()-interval '61 seconds';");
  const result=await runAllocationScheduler(localQuery);
  expect(result).toMatchObject({ok:true,overloaded:false,dispatch:{held:true,processed:0}});
  expect(psql("SELECT lease_until IS NULL FROM lead_allocation_scheduler_lease;")).toBe("t");
  expect(JSON.parse(psql("SELECT last_result FROM lead_allocation_scheduler_lease;"))).toMatchObject({ok:true,processed:0,accepted:0});
  expect(await runAllocationScheduler(localQuery)).toMatchObject({held:true,reason:"cadence_duplicate"});
  expect(psql("SELECT count(*) FROM lead_allocation_send_reservations;")).toBe("0");
 });
 it("interrupted due SQL records safe failure; lease releases, no provider/refund/retry",async()=>{
  psql("UPDATE lead_allocation_scheduler_lease SET lease_until=NULL,last_started_at=now()-interval '61 seconds';");
  const broken={query:async(sql:string,params?:unknown[])=>{
   if(sql.includes("expire_lead_allocation_offers_v2"))throw Error("SYNTHETIC DOWNSTREAM FAILURE");
   return localQuery.query(sql,params);
  }};
  expect(await runAllocationScheduler(broken)).toMatchObject({ok:false,error:"allocation_scheduler_failed",noAutomaticResend:true});
  expect(psql("SELECT lease_until IS NULL FROM lead_allocation_scheduler_lease;")).toBe("t");
  expect(JSON.parse(psql("SELECT last_result FROM lead_allocation_scheduler_lease;"))).toMatchObject({ok:false,error:"scheduler_incomplete"});
 });
 it("browser roles have no lease table/function access",()=>{
  expect(()=>psql("SET ROLE anon; SELECT * FROM lead_allocation_scheduler_lease;")).toThrow();
  expect(()=>psql(`SET ROLE authenticated; SELECT acquire_lead_allocation_scheduler_v1('${randomUUID()}');`)).toThrow();
 });
 it("actual five-intent processor includes confirmations and leaves remaining backlog for later ticks",async()=>{
  const admin=randomUUID(),user=randomUUID(),agent=randomUUID(),fallback="00000000-0000-4000-8000-000000009901";
  psql(`INSERT INTO lead_center_users(id,name,email,role) VALUES('${admin}','SYNTHETIC ADMIN','${admin}@example.test','administrator');
    INSERT INTO agents(id,name,email,role,is_active,max_daily_leads,notification_email,availability) VALUES('${agent}','SYNTHETIC — DO NOT CONTACT','staff@example.test','backup',true,100,true,'{"sun":[0,24],"mon":[0,24],"tue":[0,24],"wed":[0,24],"thu":[0,24],"fri":[0,24],"sat":[0,24]}');
    INSERT INTO lead_center_users(id,name,email,role,"agentId") VALUES('${user}','SYNTHETIC STAFF','${user}@example.test','approved_agent','${agent}');
    INSERT INTO agent_operational_enrollment(agent_id,user_id,approved_at,approved_by,paused,email_enabled,towns,intents,daily_cap,concurrent_cap) VALUES('${agent}','${user}',now(),'${admin}',false,true,ARRAY['Wilson'],ARRAY['buyer'],100,20);
    UPDATE lead_allocation_policy SET approved_by='${admin}',starts_at=now()-interval '1 minute',max_fanout=1,mode='sequential',offer_seconds=900;
    UPDATE lead_allocation_scheduler_lease SET lease_until=NULL,last_started_at=now()-interval '61 seconds';`);
  for(let i=0;i<13;i++){
   const lead=randomUUID(),session=randomUUID();
   psql(`INSERT INTO sessions(id) VALUES('${session}'); INSERT INTO leads(id,session_id,first_name,lead_type,primary_intent,city,state,assigned_agent_id,assigned_at) VALUES('${lead}','${session}','SYNTHETIC DO NOT CONTACT','buyer','buy','Wilson','NC','${fallback}',now()); SELECT create_lead_allocation_offers_v1('${lead}',0,'${admin}');`);
  }
  // Three accepted synthetic offers add real confirmation intents to the same
  // outbox. No real lead, provider, email address or device participates.
  const offers=JSON.parse(psql("SELECT json_agg(o) FROM (SELECT id,version FROM lead_allocation_offers ORDER BY created_at LIMIT 3) o;")) as Array<{id:string;version:number}>;
  for(const offer of offers)expect(await resolveAllocationOffer(localQuery,{offerId:offer.id,version:offer.version,userId:user,action:"claim",receipt:`synthetic:${offer.id}`})).toMatchObject({ok:true,state:"accepted"});
  expect(psql("SELECT count(*) FROM lead_notifications WHERE notification_type='allocation_confirmation';")).toBe("3");
  const before=Number(psql("SELECT count(*) FROM lead_notifications WHERE status='pending';"));
  expect(before).toBe(13); // 3 accepted offer intents are correctly skipped
  vi.stubEnv("VERCEL_ENV","development");vi.stubEnv("LEAD_NOTIFICATION_MODE","production");vi.stubEnv("LEAD_NOTIFICATION_PRODUCTION_ENABLED","true");
  vi.stubEnv("LEAD_ALLOCATION_SENDS_ENABLED","true");vi.stubEnv("LEAD_ALLOCATION_TRANSPORT_APPROVED","true");
  vi.stubEnv("EMAIL_ENABLED","true");vi.stubEnv("EMAIL_PROVIDER","resend");vi.stubEnv("RESEND_API_KEY","synthetic-no-network");vi.stubEnv("RESEND_FROM","staff@example.test");
  const result=await runAllocationScheduler(localQuery);
  expect(result).toMatchObject({ok:true,dispatch:{processed:5,accepted:5}});
  expect(transport.send).toHaveBeenCalledTimes(5);
  expect(Number(psql("SELECT count(*) FROM lead_notifications WHERE status='pending';"))).toBe(8);
  expect(await runAllocationScheduler(localQuery)).toMatchObject({held:true,reason:"cadence_duplicate"});
  expect(transport.send).toHaveBeenCalledTimes(5);
  psql("UPDATE lead_allocation_scheduler_lease SET last_started_at=now()-interval '61 seconds';");
  expect(await runAllocationScheduler(localQuery)).toMatchObject({ok:true,dispatch:{processed:5}});
  expect(transport.send).toHaveBeenCalledTimes(10);
  expect(Number(psql("SELECT count(*) FROM lead_notifications WHERE status='pending';"))).toBe(3);
  psql("UPDATE lead_allocation_scheduler_lease SET last_started_at=now()-interval '61 seconds';");
  expect(await runAllocationScheduler(localQuery)).toMatchObject({ok:true,dispatch:{processed:3,accepted:3}});
  expect(transport.send).toHaveBeenCalledTimes(13);
  expect(psql("SELECT count(*) FROM lead_notifications WHERE notification_type='allocation_confirmation' AND status='sent';")).toBe("3");
  vi.stubEnv("LEAD_ALLOCATION_SENDS_ENABLED","false");
 },30000);
 it("overload still expires stale intents and creates fallback tasks without discovering another lead",async()=>{
  const lead=randomUUID(),session=randomUUID();
  psql(`INSERT INTO sessions(id) VALUES('${session}'); INSERT INTO leads(id,session_id,first_name,lead_type,primary_intent,city,state,assigned_agent_id,assigned_at) VALUES('${lead}','${session}','SYNTHETIC OVERLOAD DO NOT CONTACT','buyer','buy','Wilson','NC','00000000-0000-4000-8000-000000009901',now());
    UPDATE lead_allocation_offers SET deadline=now()-interval '1 second' WHERE state='offered';
    INSERT INTO lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,template_version,idempotency_key,status,metadata,created_at)
    SELECT o.lead_id,o.agent_id,'allocation_offer','email','agent','reference_cards_v1','synthetic-overload:'||i,'pending',jsonb_build_object('offer_id',o.id,'offer_version',o.version),now()-interval '11 minutes'
    FROM (SELECT * FROM lead_allocation_offers WHERE state='offered' LIMIT 1) o CROSS JOIN generate_series(1,51) i;
    UPDATE lead_allocation_scheduler_lease SET lease_until=NULL,last_started_at=now()-interval '61 seconds';`);
  const result=await runAllocationScheduler(localQuery);
  expect(result).toMatchObject({ok:true,overloaded:true,expiry:{discovery_held:true,first_offered:0},after:{pending:0}});
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${lead}';`)).toBe("0");
  expect(psql("SELECT count(*) FROM tasks WHERE category='allocation_fallback';")).toBe("10");
  expect(psql("SELECT count(*) FROM lead_notifications WHERE idempotency_key LIKE 'synthetic-overload:%' AND status='skipped';")).toBe("51");
  expect(transport.send).toHaveBeenCalledTimes(13); // no overload sends
 },30000);
 it("synthetic-only pg_dump/restore roundtrip preserves rows, functions and denied browser ACLs",()=>{
  const dump=dumpAndRestoreSyntheticDatabase();
  const totals="SELECT json_build_object('leads',(SELECT count(*) FROM leads),'intents',(SELECT count(*) FROM lead_notifications),'assignments',(SELECT count(*) FROM agent_assignments),'audit',(SELECT count(*) FROM audit_logs),'lease',(SELECT run_count FROM lead_allocation_scheduler_lease));";
  expect(psql(totals,"amm_qa_fresh")).toBe(psql(totals));
  // Resolve actual overload by catalog identity; no guessed function arguments.
  const definition="SELECT string_agg(pg_get_functiondef(oid),E'\\n' ORDER BY oid::regprocedure::text) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('capture_public_lead_v2','acquire_lead_allocation_scheduler_v1','resolve_lead_allocation_offer_v1','expire_lead_allocation_offers_v1','expire_lead_allocation_offers_v2');";
  expect(createHash('sha256').update(psql(definition,"amm_qa_fresh")).digest('hex')).toBe(createHash('sha256').update(psql(definition)).digest('hex'));
  expect(()=>psql("SET ROLE anon; SELECT * FROM lead_allocation_scheduler_lease;","amm_qa_fresh")).toThrow();
  expect(dump.length).toBeGreaterThan(0);
 });
});
