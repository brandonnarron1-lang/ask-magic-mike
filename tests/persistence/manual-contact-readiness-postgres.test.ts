import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { startDatabase, stopDatabase, install, localQuery, psql, literal } from "../support/qa-audit-postgres";
import { LEAD_CONSENT_LANGUAGE_TEXT as copy } from "../../app/lib/leadConsent";
import { loadLeadPermissionContext, evaluateAndRecordPermission } from "../../src/lib/messaging/neon-communication-repository";
import { evaluateLeadCommunicationPermission } from "../../src/lib/messaging/permission-service";
vi.mock("@neondatabase/serverless",()=>({neon:()=>localQuery}));
const enabled=process.env.AMM_QA_POSTGRES_TEST==='1';
const admin={userId:'synthetic-admin',name:'SYNTHETIC OPERATOR',email:'operator@example.test',role:'administrator' as const,agentId:null};
const owner='00000000-0000-4000-8000-000000009901';
const at='2026-10-30T12:00:00.000Z';
let started=false;
async function fixture(includeConsents=true,contactId:string|null=null){
  const id=randomUUID(),session=randomUUID();
  psql(`INSERT INTO sessions(id) VALUES(${literal(session)});
    INSERT INTO leads(id,session_id,first_name,last_name,lead_type,primary_intent,status,conversion_stage,
      email,phone,assigned_agent_id,is_test,communication_suppressed,consent_email,consent_call,consent_sms,
      consent_timestamp,consent_language_version,consent_language_text)
    VALUES(${literal(id)},${literal(session)},'SYNTHETIC','DO NOT CONTACT','seller','sell','assigned','assigned',
      'request@example.test','+12025550199',${literal(owner)},false,false,true,true,false,${literal(at)},'amm_contact_v2',${literal(copy)});
    ${contactId ? `UPDATE leads SET contact_id=${literal(contactId)} WHERE id=${literal(id)};` : ""}
    ${includeConsents ? `INSERT INTO consents(lead_id,consent_type,granted,language_version,language_text,collected_at)
    VALUES(${literal(id)},'email',true,'amm_contact_v2',${literal(copy)},${literal(at)}),
      (${literal(id)},'call',true,'amm_contact_v2',${literal(copy)},${literal(at)}),
      (${literal(id)},'sms',false,'amm_contact_v2',${literal(copy)},${literal(at)});` : ""}`);
  return id;
}
async function context(id:string,principal=admin){const r=await loadLeadPermissionContext(id,principal);if(!r.ok)throw Error(r.error);return r;}
function businessCounts(){return psql(`SELECT json_build_object('permissions',(SELECT count(*) FROM communication_permissions),'consents',(SELECT count(*) FROM consents),'tasks',(SELECT count(*) FROM tasks),'notifications',(SELECT count(*) FROM lead_notifications),'assignments',(SELECT count(*) FROM agent_assignments),'appointments',(SELECT count(*) FROM lead_appointments))`);}
describe.skipIf(!enabled)('manual request readiness — real isolated PostgreSQL, no providers',()=>{
  beforeAll(async()=>{
    if(process.env.DATABASE_URL||process.env.VERCEL_ENV==='production'||process.env.VERCEL_ENV==='preview')throw Error('clean_nonproduction_environment_required');
    await startDatabase();started=true;install('amm_qa_upgrade',true);
    psql("UPDATE agents SET name='SYNTHETIC DIRECTORY '||id::text,email=id::text||'@example.test',phone=NULL,notification_phone=NULL;");
    const identity=JSON.parse(psql("SELECT json_build_object('database',current_database(),'dataDirectory',current_setting('data_directory'),'leads',(SELECT count(*) FROM leads),'externalDirectory',(SELECT count(*) FROM agents WHERE email NOT LIKE '%@example.test'))"));
    expect(identity.database).toBe('amm_qa_upgrade');expect(identity.leads).toBe(0);expect(identity.externalDirectory).toBe(0);
    if(process.env.AMM_QA_NATIVE_POSTGRES_TEST==='1')expect(identity.dataDirectory).toContain('amm-qa-native-');
    vi.stubEnv('DATABASE_URL','postgresql://synthetic@localhost/amm_qa_upgrade');
  },120000);
  afterAll(()=>{vi.unstubAllEnvs();if(started)stopDatabase();},30000);
  it('reads canonical inquiry evidence without writing permission rows or business effects',async()=>{
    const id=await fixture(),before=businessCounts(),c=await context(id);
    expect(c.storedPermissions).toHaveLength(0);expect(c.permissions.filter(p=>p.evidenceKind==='canonical_request_consent')).toHaveLength(2);
    expect(evaluateLeadCommunicationPermission(c.lead,c.permissions,{channel:'email',purpose:'manual_one_to_one',humanApproved:false}).code).toBe('auto_send_disabled');
    expect(evaluateLeadCommunicationPermission(c.lead,c.permissions,{channel:'sms',purpose:'manual_one_to_one',humanApproved:true}).allowed).toBe(false);
    expect(evaluateLeadCommunicationPermission(c.lead,c.permissions,{channel:'email',purpose:'marketing_nurture',humanApproved:true}).allowed).toBe(false);
    expect(businessCounts()).toBe(before);
  });
  it('audits the evaluated basis idempotently without amending permission or dispatching',async()=>{
    const id=await fixture(),before=businessCounts();
    const input={leadId:id,principal:admin,request:{channel:'email' as const,purpose:'manual_one_to_one' as const,humanApproved:false,autoSendEnabled:false}};
    const a=await evaluateAndRecordPermission(input),b=await evaluateAndRecordPermission(input);
    expect(a.ok&&b.ok).toBe(true);if(!a.ok||!b.ok)throw Error('audit');
    expect(a.decisionId).toBe(b.decisionId);expect(a.decision.decisionSource).toBe('canonical_request_consent');
    expect(Number(psql(`SELECT count(*) FROM communication_decisions WHERE lead_id=${literal(id)}`))).toBe(1);
    expect(businessCounts()).toBe(before);
  });
  it('a newly recorded opt-out revokes readiness on the fresh read',async()=>{
    const id=await fixture(),first=await context(id);
    expect(evaluateLeadCommunicationPermission(first.lead,first.permissions,{channel:'email',purpose:'manual_one_to_one',humanApproved:true}).allowed).toBe(true);
    psql(`INSERT INTO communication_permissions(lead_id,channel,purpose,state,source,evidence_at) VALUES(${literal(id)},'email','manual_one_to_one','opted_out','synthetic_revocation',now());`);
    const fresh=await context(id);expect(evaluateLeadCommunicationPermission(fresh.lead,fresh.permissions,{channel:'email',purpose:'manual_one_to_one',humanApproved:true}).code).toBe('channel_opt_out');
    expect(evaluateLeadCommunicationPermission(fresh.lead,fresh.permissions,{channel:'phone',purpose:'manual_one_to_one',humanApproved:true}).allowed).toBe(true);
  });
  it('does not expose or mutate another agent’s request, including after reassignment',async()=>{
    const id=await fixture();const agent={...admin,role:'approved_agent' as const,agentId:owner};
    expect((await loadLeadPermissionContext(id,agent)).ok).toBe(true);
    const other=randomUUID();psql(`INSERT INTO agents(id,name,email,role,is_active) VALUES(${literal(other)},'SYNTHETIC OTHER','other@example.test','backup',true);UPDATE leads SET assigned_agent_id=${literal(other)} WHERE id=${literal(id)};`);
    expect(await loadLeadPermissionContext(id,agent)).toEqual({ok:false,error:'lead_not_found'});
  });
  it('does not inherit consent from another inquiry on the same contact',async()=>{
    const original=await fixture(),contact=randomUUID();
    psql(`INSERT INTO contacts(id,email) VALUES(${literal(contact)},${literal('synthetic-'+contact+'@example.test')});UPDATE leads SET contact_id=${literal(contact)} WHERE id=${literal(original)};`);
    const id=await fixture(false,contact);
    const c=await context(id);expect(c.permissions).toHaveLength(0);expect(evaluateLeadCommunicationPermission(c.lead,c.permissions,{channel:'email',purpose:'manual_one_to_one',humanApproved:true}).code).toBe('ambiguous_consent');
  });
  it('global suppression still defeats otherwise sufficient recorded evidence',async()=>{
    const id=await fixture();psql(`UPDATE leads SET communication_suppressed=true WHERE id=${literal(id)}`);
    const c=await context(id);expect(evaluateLeadCommunicationPermission(c.lead,c.permissions,{channel:'email',purpose:'manual_one_to_one',humanApproved:true}).code).toBe('suppressed');
  });
});
