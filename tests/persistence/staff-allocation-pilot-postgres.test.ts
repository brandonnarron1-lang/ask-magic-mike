// @vitest-environment node
import { createHmac, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { bind, concurrent, install, localQuery, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { allocationCommandCode, commandRequestHash, processEnrolledStaffCommand, staffPhoneFingerprint } from "../../app/lib/leadAllocation";
import { dispatchAllocationIntent } from "../../app/lib/leadAllocationDispatch";
import type { NotificationProvider } from "../../app/lib/leadNotificationTypes";
vi.mock('@neondatabase/serverless',()=>({neon:()=>localQuery}));
import { POST as signedInbound } from "../../app/api/webhooks/sms/inbound/route";

const fallback="00000000-0000-4000-8000-000000009901";
let fixtureIndex=110;
async function fixture() {
 const id=randomUUID(),admin=randomUUID(),agents:string[]=[randomUUID(),randomUUID()],users:string[]=[randomUUID(),randomUUID()],phones=[`+1919555${String(++fixtureIndex).padStart(4,'0')}`,`+1919555${String(++fixtureIndex).padStart(4,'0')}`];
 psql(`UPDATE lead_allocation_pilots SET active=false; UPDATE agent_operational_enrollment SET phone_fingerprint=NULL,paused=true; UPDATE lead_allocation_policy SET active=false,daily_segment_budget=0,daily_estimated_cost_micros=0;
  UPDATE agents SET is_active=false,notification_phone=NULL WHERE id<>'${fallback}';
  INSERT INTO lead_center_users(id,name,email,role) VALUES('${admin}','SYNTHETIC ADMIN','${admin}@example.test','administrator');`);
 for(let i=0;i<2;i++)psql(`INSERT INTO agents(id,name,email,notification_phone,notification_sms,notification_email,role,is_active,current_load,max_daily_leads,availability)
  VALUES('${agents[i]}','SYNTHETIC STAFF','${agents[i]}@example.test','${phones[i]}',true,false,'backup',true,0,20,'{"sun":[0,24],"mon":[0,24],"tue":[0,24],"wed":[0,24],"thu":[0,24],"fri":[0,24],"sat":[0,24]}');
  INSERT INTO lead_center_users(id,name,email,role,"agentId") VALUES('${users[i]}','SYNTHETIC STAFF','${users[i]}@example.test','approved_agent','${agents[i]}');
  INSERT INTO agent_operational_enrollment(agent_id,user_id,approved_at,approved_by,paused,sms_enabled,email_enabled,towns,intents,daily_cap,concurrent_cap,consent_at,consent_version,possession_verified_at,phone_fingerprint)
  VALUES('${agents[i]}','${users[i]}',now(),'${admin}',false,true,false,ARRAY['Wilson'],ARRAY['buyer'],10,3,now(),'staff_allocation_v1',now(),'${staffPhoneFingerprint(phones[i])}');`);
 psql(`INSERT INTO lead_allocation_pilots(id,active,approved_by,approved_at,approval_reference,reviewed_tree,pricing_reference,pricing_verified_at,starts_at,ends_at,allowed_agents,fallback_agent_id,max_outbound_messages,per_agent_messages,max_segments,max_cost_micros,segment_cost_micros,max_actions)
  VALUES('${id}',true,'${admin}',now(),'SYNTHETIC ISOLATED ONLY','${'1'.repeat(40)}','SYNTHETIC NO-SEND QUOTE',now(),now()-interval '1 minute',now()+interval '30 minutes',ARRAY['${agents[0]}'::uuid,'${agents[1]}'::uuid],'${fallback}',22,12,66,2000000,20000,32);`);
 const seed=JSON.parse(psql(`SET ROLE service_role; SELECT seed_staff_allocation_fixture_v1('${id}',1,'${admin}');`));
 expect(seed.ok,JSON.stringify(seed)).toBe(true);
 return {id,admin,agents,users,phones,lead:String(seed.lead_id)};
}
async function offers(f:Awaited<ReturnType<typeof fixture>>) {
 const version=Number(psql(`SELECT allocation_version FROM leads WHERE id='${f.lead}';`));
 const result=JSON.parse(psql(`SET ROLE service_role; SELECT create_lead_allocation_offers_v1('${f.lead}',${version},'${f.admin}');`));
 expect(result.ok,JSON.stringify(result)).toBe(true);
 return JSON.parse(psql(`SELECT json_agg(o) FROM lead_allocation_offers o WHERE lead_id='${f.lead}';`)) as Array<{id:string;version:number;agent_id:string}>;
}
describe.runIf(process.env.AMM_QA_POSTGRES_TEST==='1')('Staff pilot — actual isolated SQL, never carrier evidence',()=>{
 beforeAll(async()=>{await startDatabase();install('amm_qa_upgrade',true);vi.stubEnv('VERCEL_ENV','development');vi.stubEnv('LEAD_ALLOCATION_ENABLED','false');vi.stubEnv('LEAD_ALLOCATION_SENDS_ENABLED','false');vi.stubEnv('LEAD_ALLOCATION_STAFF_PILOT_ENABLED','true');vi.stubEnv('LEAD_ALLOCATION_STAFF_PILOT_SENDS_ENABLED','true');vi.stubEnv('LEAD_ALLOCATION_COMMAND_SECRET','synthetic-staff-pilot-key-not-a-credential');},120000);
 afterAll(()=>{stopDatabase();vi.unstubAllEnvs();vi.unstubAllGlobals();},20000);
 it('default empty envelope; public/browser roles denied and canonical capture bytes preserved',()=>{
  expect(psql('SELECT count(*) FROM lead_allocation_pilots;')).toBe('0');
  expect(psql("SELECT has_table_privilege('anon','lead_allocation_pilots','SELECT'),has_function_privilege('authenticated','seed_staff_allocation_fixture_v1(uuid,integer,text)','EXECUTE');")).toBe('f|f');
  expect(psql("SELECT bool_and(NOT prosecdef AND proconfig @> ARRAY['search_path=public, pg_temp']) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('staff_allocation_pilot_v1','seed_staff_allocation_fixture_v1','queue_staff_allocation_reply_v1');")).toBe('t');
  expect(psql("SELECT position('PERFORM 1 FROM public.lead_allocation_policy WHERE id=''staff_v1'' FOR UPDATE' IN pg_get_functiondef('public.reserve_lead_allocation_send_v1(uuid,integer,bigint,boolean)'::regprocedure))>0;")).toBe('t');
 });
 it('registered canonical fixture stays suppressed and replay does not create a second record',async()=>{
  const f=await fixture();
  const replay=JSON.parse(psql(`SELECT seed_staff_allocation_fixture_v1('${f.id}',1,'${f.admin}');`));
  expect(replay).toMatchObject({ok:true,replayed:true,lead_id:f.lead});
  expect(psql(`SELECT is_test AND communication_suppressed AND email_suppressed AND sms_suppressed AND NOT consent_email AND NOT consent_sms AND NOT consent_call AND email IS NULL AND phone IS NULL FROM leads WHERE id='${f.lead}';`)).toBe('t');
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND status='pending';`)).toBe('0');
  expect(psql(`SELECT count(*) FROM message_sequence_instances WHERE lead_id='${f.lead}';`)).toBe('0');
  expect(psql("SELECT active||':'||daily_segment_budget||':'||daily_estimated_cost_micros FROM lead_allocation_policy;")).toBe('false:0:0');
 });
 it('ordinary suppressed QA cannot borrow the approved pilot exception',async()=>{
  const f=await fixture();const session=randomUUID(),other=randomUUID();
  psql(`INSERT INTO sessions(id) VALUES('${session}'); INSERT INTO leads(id,session_id,first_name,lead_type,primary_intent,city,is_test,communication_suppressed,source) VALUES('${other}','${session}','INTERNAL QA — DO NOT CONTACT','buyer','buy','Wilson',true,true,'staff_allocation_pilot_v1');`);
  expect(JSON.parse(psql(`SELECT create_lead_allocation_offers_v1('${other}',0,'${f.admin}');`))).toMatchObject({ok:false,error:'allocation_policy_held'});
  expect(JSON.parse(psql(`SELECT seed_staff_allocation_fixture_v1('${f.id}',2,'${f.users[0]}');`)).error).toBe('pilot_scope_held');
 });
 it('two real fixture principals race for exactly one canonical winner; ordinary policy remains off',async()=>{
  const f=await fixture(),os=await offers(f);
  expect(os).toHaveLength(2);
  const results=await Promise.all(os.map(o=>concurrent(bind("SELECT resolve_lead_allocation_offer_v1($1::uuid,$2::bigint,$3,'claim',$4,$5);",[o.id,o.version,f.users[f.agents.indexOf(o.agent_id)],`isolated:${o.id}`,commandRequestHash(o.id,o.version,f.users[f.agents.indexOf(o.agent_id)],'claim')]))));
  expect(results.filter(r=>JSON.parse(r).ok)).toHaveLength(1);
  expect(psql(`SELECT count(*) FROM lead_allocation_offers WHERE lead_id='${f.lead}' AND state='accepted';`)).toBe('1');
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_confirmation' AND channel='sms';`)).toBe('1');
  expect(psql(`SELECT is_test AND communication_suppressed FROM leads WHERE id='${f.lead}';`)).toBe('t');
  expect(psql(`SELECT sum(current_load) FROM agents WHERE id IN ('${f.agents[0]}','${f.agents[1]}');`)).toBe('0');
  expect(psql(`SELECT bool_and(last_offered_at IS NULL) FROM agent_operational_enrollment WHERE agent_id IN ('${f.agents[0]}','${f.agents[1]}');`)).toBe('t');
 });
 it('HELP/STATUS queue real canonical intents once, refuse body/SID conflict, and suppress provider opt-out duplicates',async()=>{
  const f=await fixture(),os=await offers(f),o=os[0],idx=f.agents.indexOf(o.agent_id),sid=`SM${randomUUID().replaceAll('-','')}`;
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[idx],body:'HELP',sid})).toMatchObject({ok:true,replyQueued:true});
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[idx],body:'HELP',sid})).toMatchObject({ok:true,replyQueued:true,replayed:true});
  const code=allocationCommandCode({id:o.id,version:o.version,agentId:o.agent_id});
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[idx],body:`STATUS ${code}`,sid})).toMatchObject({replyQueued:false,reason:'command_receipt_conflict'});
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[idx],body:`STATUS ${code}`,sid:`SM${randomUUID().replaceAll('-','')}`})).toMatchObject({ok:true,state:'offered',replyQueued:true});
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[idx],body:'HELP',sid:`SM${randomUUID().replaceAll('-','')}`,providerOptOutType:'HELP'})).toMatchObject({replyQueued:false});
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_command_reply';`)).toBe('2');
 });
 it('reply dispatch reserves before I/O; ambiguous result cannot resend/refund or touch consumer messages',async()=>{
  const f=await fixture();
  await processEnrolledStaffCommand(localQuery,{from:f.phones[0],body:'HELP',sid:`SM${randomUUID().replaceAll('-','')}`});
  const id=psql(`SELECT id FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_command_reply';`);
  const provider:NotificationProvider={name:'no-send-fixture',send:vi.fn(async request=>{
   expect(request.text).toContain('CLAIM');expect(request.text).not.toContain(f.lead);expect(request.mediaUrls).toBeUndefined();
   expect(psql(`SELECT status FROM lead_notifications WHERE id='${id}';`)).toBe('processing');
   throw Error('SYNTHETIC timeout; NO I/O');
  })};
  const opts={segmentCostMicros:20000,mmsCostMicros:NaN,mmsReady:false,transportReady:true};
  expect(await dispatchAllocationIntent(localQuery,provider,id,opts)).toMatchObject({ok:false,reconciliationRequired:true});
  expect(psql(`SELECT state||':'||segments FROM lead_allocation_send_reservations WHERE notification_id='${id}';`)).toMatch(/^ambiguous:[123]$/);
  expect(await dispatchAllocationIntent(localQuery,provider,id,opts)).toMatchObject({ok:false,error:'send_reconciliation_required'});
  expect(provider.send).toHaveBeenCalledTimes(1);
 });
 it('offer and command replies share concurrency-safe aggregate and per-agent cost/segment/message caps',async()=>{
  const f=await fixture();await offers(f);
  psql(`UPDATE lead_allocation_pilots SET max_outbound_messages=1,max_segments=2,max_cost_micros=40000 WHERE id='${f.id}';`);
  const ids=JSON.parse(psql(`SELECT json_agg(id) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_offer';`)) as string[];
  const settled=await Promise.allSettled(ids.map(id=>concurrent(`SELECT reserve_lead_allocation_send_v1('${id}',2,40000,false);`)));
  expect(settled.filter(r=>r.status==='fulfilled'&&JSON.parse(r.value).ok)).toHaveLength(1);
  expect(psql(`SELECT count(*) FROM lead_allocation_send_reservations WHERE pilot_id='${f.id}';`)).toBe('1');
  const reserved=psql(`SELECT notification_id FROM lead_allocation_send_reservations WHERE pilot_id='${f.id}';`);
  expect(JSON.parse(psql(`SELECT reserve_lead_allocation_send_v1('${reserved}',1,1,false);`))).toMatchObject({ok:false,error:'send_reconciliation_required'});
 });
 it('scoped expiry retains custodial task; ordinary due neither expires nor discovers pilot QA',async()=>{
  const f=await fixture();await offers(f);
  psql(`UPDATE lead_allocation_offers SET deadline=now()-interval '1 second' WHERE lead_id='${f.lead}';`);
  expect(JSON.parse(psql('SELECT expire_lead_allocation_offers_v2(25,true);')).expired).toBe(0);
  expect(JSON.parse(psql(`SELECT expire_staff_allocation_pilot_v1('${f.id}','${f.admin}');`)).expired).toBe(2);
  expect(psql(`SELECT count(*) FROM tasks WHERE lead_id='${f.lead}' AND category='allocation_fallback';`)).toBe('1');
 });
 it('underquoted cost, per-agent cap and expired/rebound scope fail before I/O',async()=>{
  const f=await fixture(),os=await offers(f),o=os[0],idx=f.agents.indexOf(o.agent_id);
  const id=psql(`SELECT id FROM lead_notifications WHERE lead_id='${f.lead}' AND agent_id='${o.agent_id}' AND notification_type='allocation_offer';`);
  expect(()=>psql(`SELECT reserve_lead_allocation_send_v1('${id}',2,1,false);`)).toThrow();
  expect(psql(`SELECT count(*) FROM lead_allocation_send_reservations WHERE pilot_id='${f.id}';`)).toBe('0');
  psql(`UPDATE agents SET notification_phone='+19195550199' WHERE id='${o.agent_id}';`);
  const noSend:NotificationProvider={name:'no-send-fixture',send:vi.fn()};
  expect(await dispatchAllocationIntent(localQuery,noSend,id,{segmentCostMicros:20000,mmsCostMicros:NaN,mmsReady:false,transportReady:true})).toMatchObject({ok:false,error:'destination_binding_changed'});
  expect(noSend.send).not.toHaveBeenCalled();
  psql(`UPDATE agents SET notification_phone='${f.phones[idx]}' WHERE id='${o.agent_id}';`);
  await processEnrolledStaffCommand(localQuery,{from:f.phones[idx],body:'HELP',sid:`SM${randomUUID().replaceAll('-','')}`});
  const reply=psql(`SELECT id FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_command_reply';`);
  psql(`UPDATE lead_allocation_pilots SET per_agent_messages=1 WHERE id='${f.id}';`);
  expect(JSON.parse(psql(`SELECT reserve_staff_allocation_reply_v1('${reply}',1,20000);`))).toMatchObject({ok:true});
  expect(()=>psql(`SELECT reserve_lead_allocation_send_v1('${id}',1,20000,false);`)).toThrow();
  psql(`UPDATE lead_allocation_pilots SET ends_at=now()-interval '1 second' WHERE id='${f.id}';`);
  expect(JSON.parse(psql(`SELECT reserve_lead_allocation_send_v1('${id}',1,20000,false);`))).toMatchObject({ok:false});
  expect(psql(`SELECT count(*) FROM lead_allocation_send_reservations WHERE pilot_id='${f.id}';`)).toBe('1');
 });
 it('STOP always revokes at the action cap, no automatic START/RESUME resubscription or reply',async()=>{
  const f=await fixture();psql(`UPDATE lead_allocation_pilots SET actions_used=max_actions WHERE id='${f.id}';`);
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[0],body:'STOP',sid:`SM${randomUUID().replaceAll('-','')}`,providerOptOutType:'STOP'})).toMatchObject({ok:true,action:'stop',replyQueued:false});
  expect(psql(`SELECT revoked_at IS NOT NULL AND paused FROM agent_operational_enrollment WHERE agent_id='${f.agents[0]}';`)).toBe('t');
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[0],body:'RESUME',sid:`SM${randomUUID().replaceAll('-','')}`})).toMatchObject({handled:false});
  expect(await processEnrolledStaffCommand(localQuery,{from:f.phones[0],body:'START',sid:`SM${randomUUID().replaceAll('-','')}`})).toMatchObject({handled:false});
 });
 it('pause/expiry and changed QA source/flags invalidate scope without clearing suppression',async()=>{
  const f=await fixture(),os=await offers(f),o=os[0],u=f.users[f.agents.indexOf(o.agent_id)];
  psql(`UPDATE lead_allocation_pilots SET active=false WHERE id='${f.id}';`);
  expect(JSON.parse(psql(bind("SELECT resolve_lead_allocation_offer_v1($1::uuid,$2::bigint,$3,'claim',$4,$5);",[o.id,o.version,u,'isolated-held',commandRequestHash(o.id,o.version,u,'claim')])))).toMatchObject({ok:false,error:'allocation_policy_held'});
  expect(psql(`SELECT is_test AND communication_suppressed FROM leads WHERE id='${f.lead}';`)).toBe('t');
 });
 it('actual signed HTTP → SQL → bounded existing Twilio adapter returns empty TwiML; replay and provider HELP do not send twice',async()=>{
  const f=await fixture(),account=`AC${'a'.repeat(32)}`,token='synthetic-no-send-token',sender='+12025550123',url='https://www.askmagicmike.com/api/webhooks/sms/inbound';
  for(const [key,value] of Object.entries({DATABASE_URL:'postgresql://synthetic.invalid/no-network',TWILIO_ACCOUNT_SID:account,TWILIO_AUTH_TOKEN:token,TWILIO_FROM_PHONE:sender,SMS_PROVIDER:'twilio',ENABLE_SMS:'true',AGENT_SMS_NOTIFICATIONS_ENABLED:'true',LEAD_ALLOCATION_TRANSPORT_APPROVED:'true',LEAD_NOTIFICATION_MODE:'production',LEAD_NOTIFICATION_PRODUCTION_ENABLED:'true',LEAD_ALLOCATION_SEGMENT_COST_MICROS:'20000'}))vi.stubEnv(key,value);
  const io=vi.fn(async(input:RequestInfo|URL)=>{
   expect(String(input)).toBe(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`);
   return new Response(JSON.stringify({sid:`SM${'7'.repeat(32)}`,status:'queued'}),{status:201,headers:{'Content-Type':'application/json'}});
  });vi.stubGlobal('fetch',io);
  const sid=`SM${randomUUID().replaceAll('-','')}`;
  const request=(body:string,eventId=sid,extra:Record<string,string>={})=>{
   const form={AccountSid:account,From:f.phones[0],To:sender,MessageSid:eventId,Body:body,...extra};
   const material=url+Object.keys(form).sort().map(k=>k+(form as Record<string,string>)[k]).join('');
   return new NextRequest(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','x-twilio-signature':createHmac('sha1',token).update(material).digest('base64')},body:new URLSearchParams(form).toString()});
  };
  const first=await signedInbound(request('HELP'));
  expect(first.status).toBe(200);expect(first.headers.get('content-type')).toContain('application/xml');expect(await first.text()).toContain('<Response/>');
  expect(io).toHaveBeenCalledTimes(1);
  expect((await signedInbound(request('HELP'))).status).toBe(200);expect(io).toHaveBeenCalledTimes(1);
  const providerReply=await signedInbound(request('INFO',`SM${randomUUID().replaceAll('-','')}`,{OptOutType:'HELP'}));
  expect(await providerReply.text()).toContain('<Response/>');expect(io).toHaveBeenCalledTimes(1);
  expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id='${f.lead}' AND notification_type='allocation_command_reply';`)).toBe('1');
  const bad=request('HELP');bad.headers.set('x-twilio-signature','invalid');expect((await signedInbound(bad)).status).toBe(401);
  expect(io).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
 });
});
