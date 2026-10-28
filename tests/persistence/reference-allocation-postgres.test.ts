// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll,afterEach,beforeAll,describe,expect,it,vi } from "vitest";
import { bind,concurrent,install,literal,localQuery,psql,startDatabase,stopDatabase } from "../support/qa-audit-postgres";
import { commandRequestHash,resolveAllocationOffer,staffPhoneFingerprint,createPossessionChallenge,processEnrolledStaffCommand,allocationCommandCode } from "../../app/lib/leadAllocation";
import { dispatchAllocationIntent } from "../../app/lib/leadAllocationDispatch";
import type { NotificationProvider } from "../../app/lib/leadNotificationTypes";
import { loadAllocationWorkspace } from "../../app/lib/leadAllocationReadModel";

const fallback="00000000-0000-4000-8000-000000009901";
const revalidationMigration="20261028010000_web_allocation_claim_revalidation.sql";
async function fixture(fanout=2,initialOffers=true) {
 const lead=randomUUID(),session=randomUUID(),admin=randomUUID(),agents=[randomUUID(),randomUUID()] as string[],users=[randomUUID(),randomUUID()] as string[];
 psql(`INSERT INTO sessions(id) VALUES('${session}'); INSERT INTO leads(id,session_id,first_name,lead_type,primary_intent,city,state,is_test,communication_suppressed,assigned_agent_id,assigned_at) VALUES('${lead}','${session}','SYNTHETIC ISOLATED FIXTURE','buyer','buy','Wilson','NC',false,false,'${fallback}',now());
 INSERT INTO lead_center_users(id,name,email,role) VALUES('${admin}','SYNTHETIC ADMIN','${admin}@example.test','administrator');`);
 for(let i=0;i<2;i++) psql(`INSERT INTO agents(id,name,email,role,is_active,max_daily_leads,current_load,availability) VALUES('${agents[i]}','SYNTHETIC AGENT','${agents[i]}@example.test','backup',true,20,0,'{"sun":[0,24],"mon":[0,24],"tue":[0,24],"wed":[0,24],"thu":[0,24],"fri":[0,24],"sat":[0,24]}'); INSERT INTO lead_center_users(id,name,email,role,"agentId") VALUES('${users[i]}','SYNTHETIC STAFF','${users[i]}@example.test','approved_agent','${agents[i]}'); INSERT INTO agent_operational_enrollment(agent_id,user_id,approved_at,approved_by,paused,email_enabled,towns,intents,daily_cap,concurrent_cap) VALUES('${agents[i]}','${users[i]}',now(),'${admin}',false,true,ARRAY['Wilson'],ARRAY['buyer'],10,3);`);
 // Each fixture owns its roster; other synthetic rosters are paused.
 psql(`UPDATE agent_operational_enrollment SET paused=true WHERE agent_id NOT IN ('${agents[0]}','${agents[1]}'); UPDATE lead_allocation_policy SET active=true,starts_at=(SELECT created_at FROM leads WHERE id='${lead}'),version=version+1,approved_at=now(),approved_by='${admin}',fallback_agent_id='${fallback}',mode='first_claim',max_fanout=${fanout},daily_segment_budget=5,daily_estimated_cost_micros=1000000 WHERE id='staff_v1';`);
 const version=Number(psql(`SELECT allocation_version FROM leads WHERE id='${lead}';`));
 if(!initialOffers)return {lead,admin,agents,users,offers:[] as Array<{id:string;version:number;agent_id:string}>,version};
 const created=JSON.parse(psql(`SELECT create_lead_allocation_offers_v1('${lead}',${version},'${admin}');`));
 expect(created.ok,JSON.stringify(created)).toBe(true);
 const offers=JSON.parse(psql(`SELECT json_agg(o) FROM lead_allocation_offers o WHERE lead_id='${lead}';`)) as Array<{id:string;version:number;agent_id:string}>;
 return {lead,admin,agents,users,offers,version:created.version};
}
function resolveSql(offer:{id:string;version:number},user:string,action="claim",receipt:string=randomUUID()) {
 return bind("SELECT resolve_lead_allocation_offer_v1($1::uuid,$2::bigint,$3,$4,$5,$6);",[offer.id,offer.version,user,action,receipt,commandRequestHash(offer.id,offer.version,user,action)]);
}
describe.runIf(process.env.AMM_QA_POSTGRES_TEST==="1")("Reference allocation — real isolated PostgreSQL",()=>{
 beforeAll(async()=>{await startDatabase();install("amm_qa_upgrade",true);vi.stubEnv("LEAD_ALLOCATION_ENABLED","true");vi.stubEnv("LEAD_ALLOCATION_SENDS_ENABLED","true");vi.stubEnv("LEAD_ALLOCATION_COMMAND_SECRET","synthetic-allocation-test-key-not-a-credential");vi.stubEnv("VERCEL_ENV","development");},120000);
 afterAll(()=>{stopDatabase();vi.unstubAllEnvs();},20000);
 afterEach(()=>{psql("UPDATE agents SET timezone='America/New_York' WHERE email LIKE '%@example.test';");});
 it("admin routing read model uses real canonical source, roster, deadline and outbox with no private contact JSON",async()=>{
  const f=await fixture(1);
  psql(`UPDATE leads SET source='synthetic_owned_media' WHERE id='${f.lead}';`);
  const view=await loadAllocationWorkspace({userId:f.admin,name:"SYNTHETIC ADMIN",email:"admin@example.test",role:"administrator",agentId:null},localQuery);
  expect(view.error).toBeUndefined();expect(view.ready).toBe(true);
  expect(view.leads.find(lead=>lead.id===f.lead)).toMatchObject({source:"synthetic_owned_media",intent:"buyer",town:"Wilson",lifecycle:"new",ownerId:fallback});
  expect(view.offers.some(offer=>offer.delivery.includes("email: pending")&&offer.recipient==="SYNTHETIC AGENT")).toBe(true);
  expect(view.roster.find(agent=>agent.id===f.agents[0])).toMatchObject({approved:true,paused:false,concurrentCap:3});
  expect(JSON.stringify(view)).not.toContain("@example.test");expect(JSON.stringify(view)).not.toContain("phone_fingerprint");
  const analyst=await loadAllocationWorkspace({userId:f.admin,name:"SYNTHETIC",email:"admin@example.test",role:"read_only_analyst",agentId:null},localQuery);
  expect(analyst.ready).toBe(false);expect(analyst.leads).toEqual([]);
 });
 it("due discovery offers a new durable lead once and exact replay cannot create another intent",async()=>{
  const f=await fixture(1,false);
  const due=JSON.parse(psql("SELECT expire_lead_allocation_offers_v1(25);"));expect(due.first_offered).toBe(1);
  expect(JSON.parse(psql("SELECT expire_lead_allocation_offers_v1(25);")).first_offered).toBe(0);
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${f.lead}';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}';`)).toBe("1");
  expect(psql(`SELECT assigned_agent_id FROM leads WHERE id='${f.lead}';`)).toBe(fallback);
 });
 it.each(["coverage","intent","hours","timezone","terminal","terminal_stage","spam","concurrent_reservation","daily_reservation"])("claim rechecks changed %s inside the canonical transaction",async change=>{
  const f=await fixture(1),o=f.offers[0],user=f.users[f.agents.indexOf(o.agent_id)];
  if(change==="coverage")psql(`UPDATE agent_operational_enrollment SET towns=ARRAY['not-covered'] WHERE agent_id='${o.agent_id}';`);
  if(change==="intent")psql(`UPDATE agent_operational_enrollment SET intents=ARRAY['seller'] WHERE agent_id='${o.agent_id}';`);
  if(change==="hours")psql(`UPDATE agents SET availability='{}' WHERE id='${o.agent_id}';`);
  if(change==="timezone")psql(`UPDATE agents SET timezone='Not/A_Zone' WHERE id='${o.agent_id}';`);
  if(change==="terminal")psql(`UPDATE leads SET status='dead' WHERE id='${f.lead}';`);
  if(change==="terminal_stage")psql(`UPDATE leads SET conversion_stage='closed_lost' WHERE id='${f.lead}';`);
  if(change==="spam")psql(`UPDATE leads SET status='spam' WHERE id='${f.lead}';`);
  if(change==="concurrent_reservation"||change==="daily_reservation"){
   const extra=randomUUID(),session=randomUUID();
   psql(`UPDATE agent_operational_enrollment SET paused=true WHERE agent_id<>'${o.agent_id}'; INSERT INTO sessions(id) VALUES('${session}'); INSERT INTO leads(id,session_id,first_name,lead_type,primary_intent,city,state,assigned_agent_id,assigned_at) VALUES('${extra}','${session}','SYNTHETIC CAPACITY','buyer','buy','Wilson','NC','${fallback}',now());`);
   expect(JSON.parse(psql(`SELECT create_lead_allocation_offers_v1('${extra}',0,'${f.admin}');`)).ok).toBe(true);
   psql(`UPDATE agent_operational_enrollment SET ${change==="concurrent_reservation"?"concurrent_cap":"daily_cap"}=1 WHERE agent_id='${o.agent_id}';`);
  }
  const snapshot=()=>psql(`SELECT json_build_object('owner',l.assigned_agent_id,'version',l.allocation_version,'load',(SELECT current_load FROM agents WHERE id='${o.agent_id}'),'assignments',(SELECT count(*) FROM agent_assignments WHERE lead_id=l.id),'notifications',(SELECT count(*) FROM lead_notifications WHERE lead_id=l.id),'tasks',(SELECT count(*) FROM tasks WHERE lead_id=l.id)) FROM leads l WHERE l.id='${f.lead}';`);
  const before=snapshot();
  expect(JSON.parse(psql(resolveSql(o,user))).ok).toBe(false);
  expect(snapshot()).toBe(before);
  expect(psql(`SELECT state FROM lead_allocation_offers WHERE id='${o.id}';`)).toBe("offered");
 });
 it("pass after coverage and hours change releases only its own offer and exact replay stays idempotent",async()=>{
  const f=await fixture(1),o=f.offers[0],user=f.users[f.agents.indexOf(o.agent_id)],receipt=randomUUID();
  psql(`UPDATE agent_operational_enrollment SET towns=ARRAY['not-covered'] WHERE agent_id='${o.agent_id}'; UPDATE agents SET availability='{}' WHERE id='${o.agent_id}';`);
  expect(JSON.parse(psql(resolveSql(o,user,"pass",receipt)))).toMatchObject({ok:true,state:"passed"});
  const audits=psql(`SELECT count(*) FROM audit_logs WHERE resource_id='${f.lead}' AND action='allocation.passed';`);
  expect(JSON.parse(psql(resolveSql(o,user,"pass",receipt)))).toMatchObject({ok:true,state:"passed",replayed:true});
  expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id='${f.lead}' AND action='allocation.passed';`)).toBe(audits);
  expect(psql(`SELECT assigned_agent_id FROM leads WHERE id='${f.lead}';`)).toBe(fallback);
  expect(psql(`SELECT count(*) FROM agent_assignments WHERE lead_id='${f.lead}';`)).toBe("0");
 });
 it("availability uses explicit instants across DST and fails closed on malformed hours/timezones",()=>{
  const available=(hours:unknown,zone:string|null,at:string)=>psql(`SET ROLE service_role; SELECT lead_allocation_available_at_v1(${literal(JSON.stringify(hours))}::jsonb,${literal(zone)},${literal(at)}::timestamptz);`);
  for(const instant of ["2026-11-01T05:30:00Z","2026-11-01T06:30:00Z"])expect(available({sun:[1,2]},"America/New_York",instant)).toBe("t");
  expect(available({sun:[1,2]},"America/New_York","2026-11-01T07:00:00Z")).toBe("f");
  expect(available({sun:[2,3]},"America/New_York","2026-03-08T07:30:00Z")).toBe("f");
  for(const malformed of [{},null,{sun:[0]},{sun:[24,24]},{sun:[22,2]},{sun:[0,25]},{sun:[0,1.5]},{sun:["0",24]},{sun:{start:0,end:24}}])expect(available(malformed,"America/New_York","2026-11-01T05:30:00Z")).toBe("f");
  expect(available({sun:[0,24]},"Not/A_Zone","2026-11-01T05:30:00Z")).toBe("f");
  expect(available({sun:[0,24]},null,"2026-11-01T05:30:00Z")).toBe("f");
  expect(()=>psql("SET ROLE anon; SELECT lead_allocation_available_at_v1('{}','UTC',now());")).toThrow();
  expect(()=>psql("SET ROLE authenticated; SELECT lead_allocation_available_at_v1('{}','UTC',now());")).toThrow();
 });
 it("additive upgrade preserves function identities/grants, business rows and a compatible retained-guard app rollback",()=>{
  install("amm_qa_fresh",true,new Set([revalidationMigration]));
  const functions="'public.create_lead_allocation_offers_v1(uuid,bigint,text)'::regprocedure,'public.resolve_lead_allocation_offer_v1(uuid,bigint,text,text,text,text)'::regprocedure";
  const metadata=()=>psql(`SELECT json_agg(json_build_object('oid',oid,'owner',proowner,'acl',proacl,'definer',prosecdef,'settings',proconfig) ORDER BY oid) FROM pg_proc WHERE oid IN (${functions});`,"amm_qa_fresh");
  const before=metadata();
  const oldDefinitions=psql(`SELECT string_agg(pg_get_functiondef(oid),E';\\n' ORDER BY oid) FROM pg_proc WHERE oid IN (${functions});`,"amm_qa_fresh");
  const migration=readFileSync(`supabase/migrations/${revalidationMigration}`,"utf8");
  const beforeRows=psql("SELECT json_build_object('leads',(SELECT count(*) FROM leads),'offers',(SELECT count(*) FROM lead_allocation_offers),'notifications',(SELECT count(*) FROM lead_notifications),'policy',(SELECT row_to_json(p) FROM lead_allocation_policy p));","amm_qa_fresh");
  psql(migration,"amm_qa_fresh");expect(metadata()).toBe(before);
  expect(psql("SELECT json_build_object('leads',(SELECT count(*) FROM leads),'offers',(SELECT count(*) FROM lead_allocation_offers),'notifications',(SELECT count(*) FROM lead_notifications),'policy',(SELECT row_to_json(p) FROM lead_allocation_policy p));","amm_qa_fresh")).toBe(beforeRows);
  const newDefinitions=psql(`SELECT string_agg(pg_get_functiondef(oid),E';\\n' ORDER BY oid) FROM pg_proc WHERE oid IN (${functions});`,"amm_qa_fresh");
  // A guarded database recovery can restore exact pilot-aware predecessor
  // bodies without DROP/CASCADE or deleting business history. Preferred app
  // recovery retains the new SQL guards with the unchanged function protocol.
  psql(`BEGIN; ${oldDefinitions}; COMMIT;`,"amm_qa_fresh");expect(metadata()).toBe(before);
  psql(`BEGIN; ${newDefinitions}; COMMIT;`,"amm_qa_fresh");expect(metadata()).toBe(before);
  expect(()=>psql(migration,"amm_qa_fresh")).toThrow();
  expect(psql(`SELECT string_agg(pg_get_functiondef(oid),E';\\n' ORDER BY oid) FROM pg_proc WHERE oid IN (${functions});`,"amm_qa_fresh")).toBe(newDefinitions);
 // This case installs the entire tracked schema before exercising the additive
 // upgrade and both recovery directions. Hosted Docker took 5.27s, just over
 // the ordinary 5s unit budget. Keep a finite per-case 30s bound; no assertion,
 // migration, privilege check, isolation control or global timeout is relaxed.
 },30000);
 it("web-only operational offer and claim use no transport, reservation or extra operator alert",async()=>{
  const f=await fixture(1,false);
  psql(`UPDATE agent_operational_enrollment SET email_enabled=false,sms_enabled=false,consent_at=NULL,possession_verified_at=NULL,phone_fingerprint=NULL WHERE agent_id IN ('${f.agents[0]}','${f.agents[1]}');`);
  const created=JSON.parse(psql(`SELECT create_lead_allocation_offers_v1('${f.lead}',${f.version},'${f.admin}');`));
  expect(created.ok).toBe(true);
  const offer=JSON.parse(psql(`SELECT row_to_json(o) FROM lead_allocation_offers o WHERE lead_id='${f.lead}';`));
  const user=f.users[f.agents.indexOf(offer.agent_id)],receipt=randomUUID();
  expect(JSON.parse(psql(resolveSql(offer,user,"claim",receipt)))).toMatchObject({ok:true,state:"accepted"});
  expect(JSON.parse(psql(resolveSql(offer,user,"claim",receipt)))).toMatchObject({ok:true,replayed:true});
  expect(psql(`SELECT count(*) FROM agent_assignments WHERE lead_id='${f.lead}';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM tasks WHERE lead_id='${f.lead}' AND category='allocation_followup';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}';`)).toBe("0");
  expect(psql(`SELECT count(*) FROM lead_allocation_send_reservations r JOIN lead_allocation_offers o ON o.id=r.offer_id WHERE o.lead_id='${f.lead}';`)).toBe("0");
 });
 it("one concurrent winner across channel receipts, one assignment/task/confirmation and replay",async()=>{
  const f=await fixture();const o0=f.offers.find(o=>o.agent_id===f.agents[0])!,o1=f.offers.find(o=>o.agent_id===f.agents[1])!;
  const results=await Promise.all([concurrent(resolveSql(o0,f.users[0],"claim","sms:fixture-one")),concurrent(resolveSql(o1,f.users[1],"claim","web:fixture-two"))]);
  expect(results.filter(r=>JSON.parse(r).ok)).toHaveLength(1);
  expect(psql(`SELECT count(*) FROM agent_assignments WHERE lead_id='${f.lead}';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${f.lead}' AND state='accepted';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM tasks WHERE lead_id='${f.lead}' AND category='allocation_followup';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_confirmation';`)).toBe("1");
  const winner=JSON.parse(results.find(r=>JSON.parse(r).ok)!);const idx=winner.offer_id===o0.id?0:1;const receipt=idx===0?"sms:fixture-one":"web:fixture-two";
  const replay=await resolveAllocationOffer(localQuery,{offerId:winner.offer_id,version:f.version,userId:f.users[idx],action:"claim",receipt});
  expect(replay).toMatchObject({ok:true,replayed:true});
  expect(psql(`SELECT agent_id=(SELECT assigned_agent_id FROM leads WHERE id='${f.lead}') FROM lead_routing WHERE lead_id='${f.lead}';`)).toBe("t");
 });
 it("forwarded link, audit/admin identity, stale role and expired offers cannot claim",async()=>{
  const f=await fixture();const o=f.offers[0];
  expect(JSON.parse(psql(resolveSql(o,f.admin))).error).toBe("offer_actor_forbidden");
  expect(JSON.parse(psql(resolveSql(o,f.users[f.agents[0]===o.agent_id?1:0]))).error).toBe("offer_actor_forbidden");
  psql(`UPDATE lead_allocation_offers SET deadline=now()-interval '1 second' WHERE id='${o.id}';`);
  expect(JSON.parse(psql(resolveSql(o,f.users[f.agents.indexOf(o.agent_id)]))).error).toBe("offer_stale_or_expired");
 });
 it("manual owner change invalidates outstanding offers and unsent intents",async()=>{
  const f=await fixture();psql(`UPDATE leads SET assigned_agent_id='${f.agents[0]}',assigned_at=now()+interval '1 second' WHERE id='${f.lead}';`);
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${f.lead}' AND state='offered';`)).toBe("0");
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_offer' AND status='pending';`)).toBe("0");
 });
 it("required audit/task/outbox failure rolls back assignment and capacity",async()=>{
  const f=await fixture();const o=f.offers[0],u=f.users[f.agents.indexOf(o.agent_id)];
  psql(`CREATE FUNCTION synthetic_reject_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.notification_type='allocation_confirmation' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_reject BEFORE INSERT ON lead_notifications FOR EACH ROW EXECUTE FUNCTION synthetic_reject_confirmation();`);
  try{expect(()=>psql(resolveSql(o,u))).toThrow();expect(psql(`SELECT assigned_agent_id FROM leads WHERE id='${f.lead}';`)).toBe(fallback);expect(psql(`SELECT current_load FROM agents WHERE id='${o.agent_id}';`)).toBe("0");expect(psql(`SELECT state FROM lead_allocation_offers WHERE id='${o.id}';`)).toBe("offered");}
  finally{psql("DROP TRIGGER synthetic_reject ON lead_notifications; DROP FUNCTION synthetic_reject_confirmation();");}
 });
 it("allocation expiry is durable and never drains historical permanent failures",async()=>{
  const f=await fixture();psql(`INSERT INTO lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,template_version,idempotency_key,status,error_code) VALUES('${f.lead}','${f.agents[0]}','agent_assignment','email','agent','legacy_v1','synthetic-old-${f.lead}','permanently_failed','fixture_permanent'); UPDATE lead_allocation_offers SET deadline=now()-interval '1 second' WHERE lead_id='${f.lead}';`);
  const result=JSON.parse(psql("SELECT expire_lead_allocation_offers_v1(50);"));expect(result.expired).toBeGreaterThanOrEqual(2);
  expect(JSON.parse(psql("SELECT expire_lead_allocation_offers_v1(50);")).expired).toBe(0);
  expect(psql(`SELECT status||':'||error_code FROM lead_notifications WHERE idempotency_key='synthetic-old-${f.lead}';`)).toBe("permanently_failed:fixture_permanent");
  expect(psql(`SELECT count(*) FROM tasks WHERE lead_id='${f.lead}' AND category='allocation_fallback';`)).toBe("1");
 });
 it("provider ambiguity preserves lead and reservation; cannot blindly resend",async()=>{
  const f=await fixture(1);const id=psql(`SELECT id FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_offer';`);
  const provider:NotificationProvider={name:"no-send-fixture",send:vi.fn(async()=>{expect(psql(`SELECT status FROM lead_notifications WHERE id='${id}';`)).toBe("processing");return {ok:false as const,provider:"no-send-fixture",retryable:true,errorCode:"synthetic_timeout",errorSummary:"Synthetic"};})};
  const held=await dispatchAllocationIntent(localQuery,provider,id,{segmentCostMicros:10000,mmsCostMicros:30000,mmsReady:false,transportReady:false});
  expect(held).toMatchObject({ok:false,error:"transport_configuration_held"});expect(provider.send).not.toHaveBeenCalled();
  expect(psql(`SELECT status FROM lead_notifications WHERE id='${id}';`)).toBe("pending");
  const result=await dispatchAllocationIntent(localQuery,provider,id,{segmentCostMicros:10000,mmsCostMicros:30000,mmsReady:false,transportReady:true});
  expect(result).toMatchObject({ok:false,reconciliationRequired:true});
  expect(psql(`SELECT state FROM lead_allocation_send_reservations WHERE notification_id='${id}';`)).toBe("ambiguous");
  expect(psql(`SELECT count(*) FROM leads WHERE id='${f.lead}';`)).toBe("1");
  const second=await dispatchAllocationIntent(localQuery,provider,id,{segmentCostMicros:10000,mmsCostMicros:30000,mmsReady:false,transportReady:true});
  expect(second).toMatchObject({ok:false,error:"send_reconciliation_required"});expect(provider.send).toHaveBeenCalledTimes(1);
 });
 it("suppressed QA and policy hold cannot create offers",async()=>{
  const f=await fixture();psql(`UPDATE leads SET is_test=true,communication_suppressed=true WHERE id='${f.lead}'; UPDATE lead_allocation_offers SET state='cancelled' WHERE lead_id='${f.lead}';`);
  expect(JSON.parse(psql(`SELECT create_lead_allocation_offers_v1('${f.lead}',${f.version},'${f.admin}');`)).error).toBe("lead_ineligible");
  psql("UPDATE lead_allocation_policy SET active=false WHERE id='staff_v1';");
  expect(JSON.parse(psql(`SELECT create_lead_allocation_offers_v1('${f.lead}',${f.version},'${f.admin}');`)).error).toBe("allocation_policy_held");
 });
 it("pass escalation is bounded, durable and does not re-offer to prior recipients",async()=>{
  const f=await fixture(1),o=f.offers[0],u=f.users[f.agents.indexOf(o.agent_id)];
  expect(JSON.parse(psql(resolveSql(o,u,"pass"))).ok).toBe(true);
  const due=JSON.parse(psql("SELECT expire_lead_allocation_offers_v1(25);"));
  expect(due.escalated).toBe(1);
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${f.lead}';`)).toBe("2");
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${f.lead}' AND agent_id='${o.agent_id}' AND state='offered';`)).toBe("0");
  expect(JSON.parse(psql("SELECT expire_lead_allocation_offers_v1(25);")).escalated).toBe(0);
 });
 it("policy rollback holds new claims without altering a previous accepted receipt",async()=>{
  const f=await fixture(1),o=f.offers[0],u=f.users[f.agents.indexOf(o.agent_id)];
  psql("UPDATE lead_allocation_policy SET active=false WHERE id='staff_v1';");
  expect(JSON.parse(psql(resolveSql(o,u))).error).toBe("allocation_policy_held");
  expect(psql(`SELECT assigned_agent_id FROM leads WHERE id='${f.lead}';`)).toBe(fallback);
 });
 for(const table of ["audit_logs","tasks"])it(`${table} failure rolls back the canonical winner`,async()=>{
  const f=await fixture(1),o=f.offers[0],u=f.users[f.agents.indexOf(o.agent_id)];
  psql(`CREATE FUNCTION synthetic_reject_required() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic required failure'; END $$; CREATE TRIGGER synthetic_reject_required BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION synthetic_reject_required();`);
  try{expect(()=>psql(resolveSql(o,u))).toThrow();expect(psql(`SELECT assigned_agent_id FROM leads WHERE id='${f.lead}';`)).toBe(fallback);expect(psql(`SELECT state FROM lead_allocation_offers WHERE id='${o.id}';`)).toBe("offered");}
  finally{psql(`DROP TRIGGER synthetic_reject_required ON ${table}; DROP FUNCTION synthetic_reject_required();`);}
 });
 it("concurrent segment/cost reservations cannot overspend a reviewed pool",async()=>{
  const f=await fixture(),day="(now() AT TIME ZONE 'America/New_York')::date";
  // Independent fresh pool day; earlier reservations remain historical.
  psql(`UPDATE lead_allocation_policy SET daily_segment_budget=2+(SELECT COALESCE(sum(segments),0) FROM lead_allocation_send_reservations WHERE day=${day}) WHERE id='staff_v1';
    UPDATE lead_allocation_offers SET binding_fingerprint='synthetic-binding' WHERE lead_id='${f.lead}';
    UPDATE agent_operational_enrollment SET sms_enabled=true,consent_at=now(),possession_verified_at=now(),phone_fingerprint='synthetic-binding' WHERE agent_id='${f.agents[0]}';
    UPDATE agent_operational_enrollment SET sms_enabled=true,consent_at=now(),possession_verified_at=now(),phone_fingerprint='synthetic-binding-two' WHERE agent_id='${f.agents[1]}';
    UPDATE lead_allocation_offers SET binding_fingerprint='synthetic-binding-two' WHERE agent_id='${f.agents[1]}' AND lead_id='${f.lead}';
    INSERT INTO lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,template_version,idempotency_key,status,metadata)
    SELECT lead_id,agent_id,'allocation_offer','sms','agent','reference_cards_v1','synthetic-budget:'||id,'pending',jsonb_build_object('offer_id',id,'offer_version',version) FROM lead_allocation_offers WHERE lead_id='${f.lead}';`);
  const ids=JSON.parse(psql(`SELECT json_agg(id) FROM lead_notifications WHERE lead_id='${f.lead}' AND channel='sms';`)) as string[];
  const results=await Promise.all(ids.map(id=>concurrent(`SELECT reserve_lead_allocation_send_v1('${id}',2,20000,false);`)));
  expect(results.filter(v=>JSON.parse(v).ok)).toHaveLength(1);
  expect(results.filter(v=>JSON.parse(v).error==="send_budget_exhausted")).toHaveLength(1);
  expect(psql(`SELECT count(*) FROM leads WHERE id='${f.lead}';`)).toBe("1");
 });
 it("possession challenge is sender-bound, bounded and replay-idempotent; STAFF STOP prevents dispatch",async()=>{
  const f=await fixture(1),o=f.offers[0],index=f.agents.indexOf(o.agent_id),user=f.users[index],from="+19195550101";
  const binding=staffPhoneFingerprint(from),challenge=createPossessionChallenge();
  psql(`UPDATE agents SET notification_phone=NULL WHERE id<>'${o.agent_id}'; UPDATE agent_operational_enrollment SET phone_fingerprint=NULL WHERE agent_id<>'${o.agent_id}';
    UPDATE agents SET notification_phone='${from}',notification_sms=true WHERE id='${o.agent_id}';
    UPDATE agent_operational_enrollment SET phone_fingerprint='${binding}',challenge_hash='${challenge.hash}',challenge_expires_at=now()+interval '10 minutes',challenge_attempts=0,sms_enabled=true,consent_at=now() WHERE agent_id='${o.agent_id}';
    UPDATE lead_allocation_offers SET binding_fingerprint='${binding}' WHERE id='${o.id}';`);
  const sid=`SM${randomUUID().replaceAll("-","")}`;
  expect(await processEnrolledStaffCommand(localQuery,{from,body:`VERIFY ${challenge.value}`,sid})).toMatchObject({handled:true,ok:true,replyQueued:false});
  expect(await processEnrolledStaffCommand(localQuery,{from,body:`VERIFY ${challenge.value}`,sid})).toMatchObject({handled:true,ok:true,replayed:true});
  expect(psql(`SELECT challenge_attempts FROM agent_operational_enrollment WHERE agent_id='${o.agent_id}';`)).toBe("1");
  const command=allocationCommandCode({id:o.id,version:o.version,agentId:o.agent_id});
  expect(await processEnrolledStaffCommand(localQuery,{from,body:`STATUS ${command}`,sid:`SM${randomUUID().replaceAll("-","")}`})).toMatchObject({ok:true,state:"offered",replyQueued:false});
  // A signed, bound opt-out does not require renewed possession or an SMS flag.
  psql(`UPDATE agent_operational_enrollment SET possession_verified_at=NULL,sms_enabled=false WHERE agent_id='${o.agent_id}';`);
  expect(await processEnrolledStaffCommand(localQuery,{from,body:"STOP",sid:`SM${randomUUID().replaceAll("-","")}`})).toMatchObject({handled:true,ok:true,action:"stop"});
  const id=psql(`SELECT id FROM lead_notifications WHERE lead_id='${f.lead}' AND channel='email';`);
  expect(JSON.parse(psql(`SELECT reserve_lead_allocation_send_v1('${id}',0,0,false);`)).error).toBe("recipient_or_policy_held");
  expect(await processEnrolledStaffCommand(localQuery,{from,body:`CLAIM ${command}`,sid:`SM${randomUUID().replaceAll("-","")}`})).toMatchObject({handled:false});
  expect(psql(`SELECT count(*) FROM agent_assignments WHERE lead_id='${f.lead}';`)).toBe("0");
  expect(user).toBeTruthy();
 });
 it("revoked role and orphan intent fail closed before any provider request",async()=>{
  const f=await fixture(1),o=f.offers[0],u=f.users[f.agents.indexOf(o.agent_id)];
  psql(`UPDATE lead_center_users SET role='read_only_analyst' WHERE id='${u}';`);
  expect(JSON.parse(psql(resolveSql(o,u))).error).toBe("offer_actor_forbidden");
  const id=psql(`SELECT id FROM lead_notifications WHERE lead_id='${f.lead}' AND channel='email';`);
  expect(JSON.parse(psql(`SELECT reserve_lead_allocation_send_v1('${id}',0,0,false);`)).error).toBe("recipient_or_policy_held");
  psql(`UPDATE lead_center_users SET role='approved_agent' WHERE id='${u}'; UPDATE lead_notifications SET metadata='{}' WHERE id='${id}';`);
  expect(JSON.parse(psql(`SELECT reserve_lead_allocation_send_v1('${id}',0,0,false);`)).error).toBe("recipient_or_policy_held");
 });
 it("one no-send SMS acceptance and bound CLAIM share the canonical offer; MMS pricing remains separate",async()=>{
  const f=await fixture(1),o=f.offers[0],from="+19195550102",binding=staffPhoneFingerprint(from),id=randomUUID();
  psql(`UPDATE agents SET notification_phone=NULL WHERE id<>'${o.agent_id}';
    UPDATE agents SET notification_phone='${from}',notification_sms=true WHERE id='${o.agent_id}';
    UPDATE agent_operational_enrollment SET phone_fingerprint='${binding}',sms_enabled=true,mms_enabled=false,consent_at=now(),possession_verified_at=now() WHERE agent_id='${o.agent_id}';
    UPDATE lead_allocation_offers SET binding_fingerprint='${binding}' WHERE id='${o.id}';
    UPDATE lead_allocation_policy SET daily_segment_budget=100 WHERE id='staff_v1';
    INSERT INTO lead_notifications(id,lead_id,agent_id,notification_type,channel,recipient_type,template_version,idempotency_key,status,metadata) VALUES('${id}','${f.lead}','${o.agent_id}','allocation_offer','sms','agent','reference_cards_v1','synthetic-accepted:${id}','pending',jsonb_build_object('offer_id','${o.id}','offer_version',${o.version}));`);
  const provider:NotificationProvider={name:"no-send-fixture",send:vi.fn(async request=>{
    expect(request.text).toContain(o.id);expect(request.text).toContain("CLAIM ");expect(request.mediaUrls).toBeUndefined();
    expect(psql(`SELECT status FROM lead_notifications WHERE id='${id}';`)).toBe("processing");
    return {ok:true as const,provider:"no-send-fixture",providerMessageId:`SM${"2".repeat(32)}`};
  })};
  expect(await dispatchAllocationIntent(localQuery,provider,id,{segmentCostMicros:10000,mmsCostMicros:NaN,mmsReady:false,transportReady:true})).toMatchObject({ok:true,providerAccepted:true,delivered:false});
  expect(psql(`SELECT state FROM lead_allocation_send_reservations WHERE notification_id='${id}';`)).toBe("accepted");
  const result=await processEnrolledStaffCommand(localQuery,{from,body:`CLAIM ${allocationCommandCode({id:o.id,version:o.version,agentId:o.agent_id})}`,sid:`SM${randomUUID().replaceAll("-","")}`});
  expect(result).toMatchObject({ok:true,state:"accepted"});
  expect(psql(`SELECT count(*) FROM agent_assignments WHERE lead_id='${f.lead}';`)).toBe("1");
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_confirmation';`)).toBe("2");
  expect(provider.send).toHaveBeenCalledTimes(1);
 });
});
