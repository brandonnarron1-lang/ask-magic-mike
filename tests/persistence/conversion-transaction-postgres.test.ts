// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { bind, concurrent, install, literal, localQuery, psql, startDatabase, statements, stopDatabase } from "../support/qa-audit-postgres";
vi.mock("@neondatabase/serverless", async () => { const fixture = await import("../support/qa-audit-postgres"); return { neon: () => fixture.localQuery }; });
const baseline = process.env.AMM_CONVERSION_BASELINE === "1";
const actor = "lead_center:synthetic-conversion-admin";
const conversionMigration = "20261006190000_atomic_conversion_followthrough.sql";
const conversionSql = readFileSync(`supabase/migrations/${conversionMigration}`, "utf8");
function command(id: string, operation: string, payload: Record<string, unknown>, key = randomUUID(), currentActor = actor) {
 return bind("SELECT mutate_admin_conversion_v1($1::uuid,$2::text,$3::jsonb,$4::text,$5::text)", [id,operation,JSON.stringify(payload),currentActor,key]);
}
function seed() {
  const id = randomUUID();
  psql(`INSERT INTO sessions(id) VALUES (${literal(id)}); INSERT INTO leads(id,session_id,first_name,email,status,assigned_agent_id,is_test,communication_suppressed) VALUES (${literal(id)},${literal(id)},'SYNTHETIC FIXTURE — NOT A CONSUMER',${literal(`${id}@example.test`)},'new','00000000-0000-4000-8000-000000009901',false,false);`);
  return id;
}
function state(id: string) {
  return JSON.parse(psql(`SELECT jsonb_build_object('lead',(SELECT status FROM leads WHERE id=${literal(id)}),'appointments',(SELECT jsonb_agg(jsonb_build_object('id',id,'status',status)) FROM lead_appointments WHERE lead_id=${literal(id)}),'tasks',(SELECT jsonb_agg(jsonb_build_object('id',id,'status',status)) FROM tasks WHERE lead_id=${literal(id)}),'audit',(SELECT count(*) FROM audit_logs WHERE resource_id=${literal(id)}),'outbox',(SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(id)}));`));
}
function failAudit() { psql("CREATE FUNCTION synthetic_conversion_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'lead.appointment_%' OR NEW.action LIKE 'lead.followup_%' OR NEW.action='lead.human_interaction_recorded' THEN RAISE EXCEPTION 'synthetic conversion audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_conversion_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION synthetic_conversion_failure();"); }
function restoreAudit() { psql("DROP TRIGGER synthetic_conversion_failure ON audit_logs; DROP FUNCTION synthetic_conversion_failure();"); }
describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("Conversion: actual Neon methods on isolated PostgreSQL", () => {
  beforeAll(async () => {
    await startDatabase(); install("amm_qa_upgrade", true, new Set([conversionMigration]));
    if (!baseline) psql(conversionSql);
    psql("INSERT INTO lead_center_users(id,name,email,role) VALUES ('synthetic-conversion-admin','Synthetic admin','admin@example.test','administrator');");
    vi.stubEnv("VERCEL_ENV", "development"); vi.stubEnv("DATABASE_URL", "postgresql://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("external_network_forbidden"); }));
  }, 120_000);
  afterAll(() => { stopDatabase(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }, 30_000);
  it.each(["appointment_create", "appointment_transition", "task_create", "task_update"])("%s audit failure: inspect persisted state, not response alone", async (operation) => {
    const ops = await import("../../app/lib/persistence/neonAdminAppointmentFollowupOps");
    const id = seed(); let recordId = ""; let version = "";
    if (operation === "appointment_transition") {
      const created = await ops.createNeonAppointment({ leadId: id, actor }); expect(created.ok).toBe(true);
      if (created.ok) recordId = created.id;
      version = psql(`SELECT updated_at::text FROM lead_appointments WHERE id=${literal(recordId)};`);
    }
    if (operation === "task_update") {
      const created = await ops.createNeonFollowupTask({ leadId: id, taskType: "manual_callback", dueAt: "2026-10-07T15:00:00Z", actor }); expect(created.ok).toBe(true);
      if (created.ok) recordId = created.id;
      version = psql(`SELECT updated_at::text FROM tasks WHERE id=${literal(recordId)};`);
    }
    const before = state(id); failAudit();
    try {
      const result = operation === "appointment_create" ? await ops.createNeonAppointment({ leadId: id, actor })
        : operation === "appointment_transition" ? await ops.transitionNeonAppointment({ leadId: id, appointmentId: recordId, expectedUpdatedAt: version, status: "scheduled", startsAt: "2026-10-07T15:00:00Z", endsAt: "2026-10-07T15:30:00Z", actor })
        : operation === "task_create" ? await ops.createNeonFollowupTask({ leadId: id, taskType: "manual_callback", dueAt: "2026-10-07T15:00:00Z", actor })
        : await ops.updateNeonFollowupTask({ leadId: id, taskId: recordId, expectedUpdatedAt: version, action: "complete", actor });
      expect(result.ok).toBe(false);
      const after = state(id);
      if (baseline) { expect(after).not.toEqual(before); console.info("BASELINE_PARTIAL_COMMIT", operation, JSON.stringify({ before, after })); }
      else expect(after).toEqual(before);
      expect(after.outbox).toBe(0);
    } finally { restoreAudit(); }
    expect(localQuery).toBeDefined();
  });
  it.skipIf(baseline)("a false lifecycle result aborts the appointment and every required effect", async () => {
    const id=seed(); const before=state(id);
    const original=psql("SELECT pg_get_functiondef('mutate_admin_lead_status_v2(uuid,text,text,jsonb,text,numeric,text,timestamptz)'::regprocedure);");
    psql(original.replace(/AS \$function\$[\s\S]*\$function\$/,"AS $function$ BEGIN RETURN '{\"ok\":false,\"error\":\"synthetic_rejection\"}'::jsonb; END $function$"));
    try {
      const {createNeonAppointment}=await import("../../app/lib/persistence/neonAdminAppointmentFollowupOps");
      expect((await createNeonAppointment({leadId:id,actor})).ok).toBe(false); expect(state(id)).toEqual(before);
    } finally { psql(original); }
  });
  it.skipIf(baseline)("manual human outcome and next task commit together; task completion is not contact evidence", async () => {
    const ops=await import("../../app/lib/persistence/neonAdminAppointmentFollowupOps"); const id=seed(); const key=randomUUID();
    const input={leadId:id,actor,channel:"phone",result:"no_answer",note:"Synthetic documented attempt; no provider verified contact",taskType:"manual_callback",dueAt:"2026-10-07T15:00:00Z",idempotencyKey:key};
    const saved=await ops.recordNeonHumanFollowthrough(input); expect(saved.ok).toBe(true);
    expect(psql(`SELECT count(*) FROM lead_response_milestones WHERE lead_id=${literal(id)};`)).toBe("0");
    const before=state(id); expect(await ops.recordNeonHumanFollowthrough(input)).toMatchObject({ok:true,warning:"conversion_action_already_saved"}); expect(state(id)).toEqual(before);
    expect(await ops.recordNeonHumanFollowthrough({...input,note:"Changed",idempotencyKey:key})).toMatchObject({ok:false,error:"idempotency_conflict"});
    failAudit(); try { expect((await ops.recordNeonHumanFollowthrough({...input,result:"two_way_conversation",idempotencyKey:randomUUID()})).ok).toBe(false); expect(state(id)).toEqual(before); expect(psql(`SELECT count(*) FROM lead_response_milestones WHERE lead_id=${literal(id)};`)).toBe("0"); } finally{restoreAudit();}
    expect((await ops.recordNeonHumanFollowthrough({...input,result:"two_way_conversation",idempotencyKey:randomUUID()})).ok).toBe(true);
    expect(psql(`SELECT count(*) FROM lead_response_milestones WHERE lead_id=${literal(id)};`)).toBe("1");
    expect(psql(`SELECT metadata->>'provenance' FROM audit_logs WHERE resource_id=${literal(id)} AND action='lead.human_interaction_recorded' ORDER BY created_at DESC LIMIT 1;`)).toBe("manual_operator_record");
    expect(state(id).outbox).toBe(0);
  });
  it.skipIf(baseline)("concurrent exact replay creates one task/audit; distinct legitimate actions remain possible", async () => {
    const id=seed(); const payload={taskType:"manual_callback",dueAt:"2026-10-07T15:00:00Z"}; const key=randomUUID();
    const responses=await Promise.all(Array.from({length:5},()=>concurrent(`SET ROLE service_role; ${command(id,"task_create",payload,key)};`)));
    expect(new Set(responses.map(row=>JSON.parse(row).id)).size).toBe(1); expect(state(id).tasks).toHaveLength(1); expect(state(id).audit).toBe(1);
    expect(JSON.parse(psql(`${command(id,"task_create",payload)};`)).ok).toBe(true); expect(state(id).tasks).toHaveLength(2);
  });
  it.skipIf(baseline)("concurrent conflicting versions preserve one transition and microsecond tokens", async()=>{
    const id=seed(); const created=JSON.parse(psql(`${command(id,"appointment_create",{})};`));
    psql(`ALTER TABLE lead_appointments DISABLE TRIGGER lead_appointments_updated_at; UPDATE lead_appointments SET updated_at='2026-10-06T18:00:00.123456Z' WHERE id=${literal(created.id)}; ALTER TABLE lead_appointments ENABLE TRIGGER lead_appointments_updated_at;`);
    const version=psql(`SELECT updated_at::text FROM lead_appointments WHERE id=${literal(created.id)};`);
    const payload={appointmentId:created.id,expectedUpdatedAt:version,status:"scheduled",startsAt:"2026-10-07T15:00:00Z",endsAt:"2026-10-07T15:30:00Z"};
    const responses=await Promise.all(Array.from({length:2},()=>concurrent(`${command(id,"appointment_transition",payload)};`)));
    expect(responses.map(x=>JSON.parse(x).ok).sort()).toEqual([false,true]);
    expect(responses.some(x=>JSON.parse(x).error==='stale_appointment_version')).toBe(true);
    expect(psql(`SELECT status FROM lead_appointments WHERE id=${literal(created.id)};`)).toBe("scheduled");
  });
  it.skipIf(baseline)("current role, ban and assignment are rechecked in SQL, including after waiting for an owner change", async()=>{
    const id=seed(); const payload={taskType:"manual_callback",dueAt:"2026-10-07T15:00:00Z"};
    psql("INSERT INTO lead_center_users(id,name,email,role,\"agentId\") VALUES ('synthetic-conversion-agent','Synthetic agent','conversion-agent@example.test','approved_agent','00000000-0000-4000-8000-000000009901'),('synthetic-conversion-analyst','Synthetic analyst','conversion-analyst@example.test','read_only_analyst',NULL);");
    expect(JSON.parse(psql(`${command(id,"task_create",payload,randomUUID(),"lead_center:synthetic-conversion-analyst")};`))).toMatchObject({ok:false,error:"conversion_actor_forbidden"});
    psql("UPDATE lead_center_users SET banned=true WHERE id='synthetic-conversion-agent';");
    expect(JSON.parse(psql(`${command(id,"task_create",payload,randomUUID(),"lead_center:synthetic-conversion-agent")};`)).ok).toBe(false);
    psql("UPDATE lead_center_users SET banned=false WHERE id='synthetic-conversion-agent';");
    const ownerChange=concurrent(`BEGIN; SELECT id FROM leads WHERE id=${literal(id)} FOR UPDATE; SELECT pg_sleep(0.3); UPDATE leads SET assigned_agent_id=NULL WHERE id=${literal(id)}; COMMIT;`);
    await new Promise(resolve=>setTimeout(resolve,75));
    const mutation=concurrent(`${command(id,"task_create",payload,randomUUID(),"lead_center:synthetic-conversion-agent")};`);
    await ownerChange; expect(JSON.parse(await mutation)).toMatchObject({ok:false,error:"conversion_actor_forbidden"}); expect(state(id).tasks).toBeNull();
  });
  it.skipIf(baseline)("terminal lead outcomes are preserved when an older confirmed appointment completes",()=>{
    const id=seed(); const created=JSON.parse(psql(`${command(id,"appointment_create",{status:"confirmed",startsAt:"2026-10-09T15:00:00Z",endsAt:"2026-10-09T15:30:00Z"})};`)); expect(created.ok).toBe(true);
    psql(`UPDATE leads SET status='converted',closed_won_at=now(),converted_at=now() WHERE id=${literal(id)};`);
    const terminal=psql(`SELECT status,closed_won_at,converted_at FROM leads WHERE id=${literal(id)};`); const version=psql(`SELECT updated_at::text FROM lead_appointments WHERE id=${literal(created.id)};`);
    expect(JSON.parse(psql(`${command(id,"appointment_transition",{appointmentId:created.id,expectedUpdatedAt:version,status:"completed"})};`)).ok).toBe(true);
    expect(psql(`SELECT status,closed_won_at,converted_at FROM leads WHERE id=${literal(id)};`)).toBe(terminal);
    expect(JSON.parse(psql(`${command(id,"appointment_create",{})};`))).toMatchObject({ok:false,error:"terminal_lead_appointment_held"});
  });
  it.skipIf(baseline)("existing actual human-response/lifecycle controls deny a revoked actor inside their transaction",async()=>{
    const id=seed(); const before=state(id);
    const {recordAdminFirstHumanResponse,updateAdminLeadStatus}=await import("../../app/lib/adminLeadActions");
    psql("UPDATE lead_center_users SET banned=true WHERE id='synthetic-conversion-admin';");
    try {
      expect((await updateAdminLeadStatus(id,"contacted",{actor})).ok).toBe(false);
      expect((await recordAdminFirstHumanResponse(id,{actor})).ok).toBe(false);
      expect(state(id)).toEqual(before); expect(psql(`SELECT count(*) FROM lead_response_milestones WHERE lead_id=${literal(id)};`)).toBe("0");
    }finally{psql("UPDATE lead_center_users SET banned=false WHERE id='synthetic-conversion-admin';");}
  });
  it.skipIf(baseline)("native time conflicts are detected, without claiming an external calendar connection",()=>{
    const id=seed(),second=seed(); const payload={status:"scheduled",startsAt:"2026-10-08T15:00:00Z",endsAt:"2026-10-08T15:30:00Z"};
    expect(JSON.parse(psql(`${command(id,"appointment_create",payload)};`)).ok).toBe(true);
    expect(JSON.parse(psql(`${command(second,"appointment_create",payload)};`))).toMatchObject({ok:false,error:"appointment_native_conflict"}); expect(state(second).appointments).toBeNull();
  });
  it.skipIf(baseline)("Preview refuses before any database query",async()=>{
    const ops=await import("../../app/lib/persistence/neonAdminAppointmentFollowupOps"); const count=statements.length; vi.stubEnv("VERCEL_ENV","preview");
    try { expect((await ops.createNeonFollowupTask({leadId:randomUUID(),actor,taskType:"manual_callback",dueAt:"2026-10-07T15:00:00Z"})).ok).toBe(false); expect(statements).toHaveLength(count); }finally{vi.stubEnv("VERCEL_ENV","development");}
  });
  it.skipIf(baseline)("fresh/upgrade installs and role-aware ACLs preserve old functions and immutable evidence on rollback",()=>{
    install("amm_qa_fresh",true);
    for(const db of ["amm_qa_upgrade","amm_qa_fresh"] as const) {
      expect(psql("SELECT has_function_privilege('service_role','mutate_admin_conversion_v1(uuid,text,jsonb,text,text)','EXECUTE'),has_function_privilege('anon','mutate_admin_conversion_v1(uuid,text,jsonb,text,text)','EXECUTE'),has_function_privilege('authenticated','mutate_admin_conversion_v1(uuid,text,jsonb,text,text)','EXECUTE');",db)).toBe("t|f|f");
      expect(psql("SELECT prorettype::regtype FROM pg_proc WHERE oid='mutate_admin_lead_status_v2(uuid,text,text,jsonb,text,numeric,text,timestamptz)'::regprocedure;",db)).toBe("jsonb");
    }
    const counts=psql("SELECT count(*) FROM audit_logs;"); psql("REVOKE EXECUTE ON FUNCTION mutate_admin_conversion_v1(uuid,text,jsonb,text,text) FROM service_role;");
    expect(psql("SELECT count(*) FROM audit_logs;")).toBe(counts);
    // Compatibility rehearsal: accepted app's retained v3/v1 contracts still
    // execute under the server role after disabling only the new entrypoint.
    // No historical evidence is deleted; this new disposable lead owns all writes.
    const rollbackLead=seed();
    expect(JSON.parse(psql(`SET ROLE service_role; SELECT mutate_admin_lead_status_v3(${literal(rollbackLead)},'new','contacted','{}'::jsonb,NULL,NULL,${literal(actor)},now());`)).ok).toBe(true);
    expect(JSON.parse(psql(`SET ROLE service_role; SELECT record_admin_first_response_v1(${literal(rollbackLead)},${literal(actor)},now(),'admin_lead_detail');`)).ok).toBe(true);
    expect(psql(`SELECT count(*) FROM lead_response_milestones WHERE lead_id=${literal(rollbackLead)};`)).toBe("1");
    expect(Number(psql("SELECT count(*) FROM audit_logs;"))).toBeGreaterThanOrEqual(Number(counts));
    psql(conversionSql);
    // New migration must work without browser/provider roles; never create a
    // missing role to satisfy its grant wrapper.
    psql("DROP OWNED BY anon,authenticated;", "amm_qa_upgrade"); psql("DROP OWNED BY anon,authenticated;", "amm_qa_fresh");
    psql("DROP ROLE anon; DROP ROLE authenticated;", "amm_qa_fresh"); psql(conversionSql,"amm_qa_fresh");
  });
});
