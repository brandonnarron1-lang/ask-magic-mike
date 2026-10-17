// @vitest-environment node
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {install,literal,psql,startDatabase,stopDatabase} from "../support/qa-audit-postgres";
// Only Next's build-time poison marker is neutralized in the Node test venue.
// Better Auth, cookies, password verification, SQL, RLS and transactions are real.
vi.mock("server-only",()=>({}));
import {GET as authGet,POST as authPost} from "../../app/api/consumer-auth/[...all]/route";
import {GET as workspaceGet} from "../../app/api/consumer/v1/workspace/route";
import {GET as accountGet} from "../../app/api/consumer/v1/account/route";
import {consumerPrincipal,type ConsumerPrincipal} from "../../src/lib/consumer/auth";
import {consumerPool} from "../../src/lib/consumer/runtime";
import {deleteConsumerAccount,readConsumerWorkspace,saveConsumerWorkspace} from "../../src/lib/consumer/workspace";
import {readConsumerWorkspaceWrite} from "../../app/lib/consumerWorkspaceContract";

const origin="http://localhost:39999",password=`SYNTHETIC-${randomBytes(24).toString("hex")}`;
let aliceCookie="",bobCookie="",secondCookie="",alice:ConsumerPrincipal,bob:ConsumerPrincipal;
let pool:ReturnType<typeof consumerPool>;
function request(path:string,method="GET",body?:unknown,cookie="",source=origin){return new NextRequest(origin+path,{method,headers:{Origin:source,"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function cookies(response:Response){return response.headers.getSetCookie().map(x=>x.split(";")[0]).join("; ");}
async function signin(email:string){const response=await authPost(request("/api/consumer-auth/sign-in/email","POST",{email,password}));expect(response.status).toBe(200);const cookie=cookies(response);expect(cookie.includes("amm-consumer.session_token=")).toBe(true);return cookie;}
const write=(revision:number,value="Wilson SYNTHETIC FIXTURE")=>readConsumerWorkspaceWrite({revision,interests:[{id:randomUUID(),kind:"search",value,budget:"Under $300,000"}]});
const counts=()=>psql("SELECT json_build_object('leads',(SELECT count(*) FROM leads),'contacts',(SELECT count(*) FROM contacts),'outbox',(SELECT count(*) FROM lead_notifications),'provider_ids',(SELECT count(*) FROM lead_notifications WHERE provider_message_id IS NOT NULL))");
let originalCounts="";
let outboundAttempts=0;
let migrationPreserved=false;
let migrationFailureRolledBack=false;

describe.runIf(process.env.AMM_QA_POSTGRES_TEST==="1")("Consumer account — actual Better Auth and isolated PostgreSQL",()=>{
 beforeAll(async()=>{
  if(process.env.DATABASE_URL||["preview","production"].includes(process.env.VERCEL_ENV||""))throw Error("clean_owned_local_venue_required");
  const connection=(await startDatabase({loopbackTcp:true}))!.replace("@127.0.0.1:","@localhost:");
  const migration="20261017180000_consumer_saved_workspace.sql";
  install("amm_qa_upgrade",true,new Set([migration]));
  const session=randomUUID(),lead=randomUUID(),contact=randomUUID();
  psql(`INSERT INTO sessions(id) VALUES(${literal(session)});
    INSERT INTO contacts(id,email) VALUES(${literal(contact)},'legacy-synthetic@example.test');
    INSERT INTO leads(id,session_id,first_name,last_name,email,lead_type,source,is_test,communication_suppressed,contact_id) VALUES(${literal(lead)},${literal(session)},'SYNTHETIC','MIGRATION DO NOT CONTACT','legacy-synthetic@example.test','buyer','isolated_migration_fixture',true,true,${literal(contact)});
    INSERT INTO consents(lead_id,consent_type,granted,language_text) VALUES(${literal(lead)},'email',false,'SYNTHETIC MIGRATION NO CONTACT');
    INSERT INTO lead_notifications(lead_id,agent_id,notification_type,channel,recipient_type,recipient_reference,template_version,idempotency_key) VALUES(${literal(lead)},'00000000-0000-4000-8000-000000009901','internal_new_lead','email','agent','synthetic_operator','lead_alert_email_v4',${literal(randomUUID())});
    INSERT INTO audit_logs(actor,action,resource_type,resource_id,metadata) VALUES('isolated-fixture','migration.fixture','lead',${literal(lead)},'{"synthetic":true}')`);
  const canonicalHash=()=>createHash("sha256").update(psql("SELECT jsonb_build_object('leads',(SELECT jsonb_agg(l ORDER BY id) FROM leads l),'contacts',(SELECT jsonb_agg(c ORDER BY id) FROM contacts c),'consents',(SELECT jsonb_agg(c ORDER BY id) FROM consents c),'outbox',(SELECT jsonb_agg(n ORDER BY id) FROM lead_notifications n),'audit',(SELECT jsonb_agg(a ORDER BY id) FROM audit_logs a))::text")).digest("hex");
  // Actual Neon QA revealed these legacy browser roles can be absent. Rename
  // only this owned local cluster's roles, preserving their OID-bound grants,
  // and prove the complete upgrade before restoring the fixture names.
  const before=canonicalHash();
  psql("ALTER ROLE anon RENAME TO amm_legacy_anon_fixture; ALTER ROLE authenticated RENAME TO amm_legacy_authenticated_fixture");
  try{expect(psql("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated')")).toBe("0");psql(readFileSync(`supabase/migrations/${migration}`,"utf8"));migrationPreserved=canonicalHash()===before;}
  finally{psql("ALTER ROLE amm_legacy_anon_fixture RENAME TO anon; ALTER ROLE amm_legacy_authenticated_fixture RENAME TO authenticated");}
  install("amm_qa_fresh",true,new Set([migration]));
  const migrationSQL=readFileSync(`supabase/migrations/${migration}`,"utf8");
  try{psql(migrationSQL.replace("COMMIT;","SELECT 1/0; COMMIT;"),"amm_qa_fresh");throw Error("expected_isolated_migration_failure");}catch(error){if(!String(error).includes("division by zero"))throw error;}
  migrationFailureRolledBack=psql("SELECT to_regclass('public.consumer_users') IS NULL AND to_regclass('public.consumer_workspaces') IS NULL","amm_qa_fresh")==="t";
  psql(migrationSQL,"amm_qa_fresh");
  for(const db of ["amm_qa_upgrade","amm_qa_fresh"] as const)psql("UPDATE agents SET name='SYNTHETIC DIRECTORY',email=id::text||'@example.test',phone=NULL,notification_phone=NULL",db);
  vi.stubEnv("DATABASE_URL",connection);vi.stubEnv("VERCEL_ENV","development");vi.stubEnv("BETTER_AUTH_URL",origin);vi.stubEnv("BETTER_AUTH_SECRET",randomBytes(32).toString("hex"));vi.stubEnv("RATE_LIMIT_HASH_SECRET",randomBytes(32).toString("hex"));vi.stubEnv("CONSUMER_WORKSPACE_ACCOUNTS_ENABLED","true");
  pool=consumerPool();originalCounts=counts();
  vi.stubGlobal("fetch",async()=>{outboundAttempts++;throw Error("isolated_consumer_outbound_fetch_denied");});
 },120000);
 afterAll(async()=>{await pool?.end();stopDatabase();vi.unstubAllEnvs();vi.unstubAllGlobals();},30000);
 it("installs both fresh and upgrade schemas with no canonical capture effect or browser grants",()=>{
  expect(counts()).toBe(originalCounts);
  expect(migrationPreserved).toBe(true);
  expect(migrationFailureRolledBack).toBe(true);
  expect(psql("SELECT count(*) FROM consumer_users")).toBe("0");
  expect(psql("SELECT count(*) FROM pg_roles WHERE rolname='amm_consumer_workspace_v1' AND NOT rolcanlogin AND NOT rolbypassrls")).toBe("1");
  expect(psql("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'consumer_%' AND (has_table_privilege('anon',tablename,'SELECT') OR has_table_privilege('authenticated',tablename,'INSERT'))")).toBe("0");
 });
 it("rejects client privilege, callbacks, unsupported recovery and cross-origin signup",async()=>{
  expect((await authPost(request("/api/consumer-auth/sign-up/email","POST",{name:"SYNTHETIC",email:"alice@example.test",password,role:"administrator"}))).status).toBe(400);
  expect((await authPost(request("/api/consumer-auth/sign-in/email","POST",{email:"alice@example.test",password,callbackURL:"https://untrusted.example"}))).status).toBe(400);
  expect((await authPost(request("/api/consumer-auth/sign-up/email","POST",{name:"SYNTHETIC",email:"alice@example.test",password},"","https://untrusted.example"))).status).toBe(403);
  expect((await authPost(request("/api/consumer-auth/request-password-reset","POST",{email:"alice@example.test"}))).status).toBe(404);
  expect(psql("SELECT count(*) FROM consumer_users")).toBe("0");
 });
 it("creates two unverified consumer-only accounts with no implicit session, message or lead",async()=>{
  for(const who of ["alice","bob"]){const r=await authPost(request("/api/consumer-auth/sign-up/email","POST",{name:`SYNTHETIC ${who}`,email:`${who}@example.test`,password}));expect(r.status).toBe(200);expect((await r.json()).token).toBeNull();expect(cookies(r)).not.toContain("session_token");}
  expect(psql("SELECT count(*) FROM consumer_users WHERE audience='consumer' AND NOT \"emailVerified\" AND NOT disabled")).toBe("2");expect(counts()).toBe(originalCounts);
 });
 it("rolls back user creation when its credential insert fails in the real framework transaction",async()=>{
  psql("CREATE FUNCTION amm_consumer_fail_credential() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF EXISTS(SELECT 1 FROM consumer_users WHERE id=NEW.\"userId\" AND email='broken@example.test') THEN RAISE EXCEPTION 'isolated_credential_insert_failure'; END IF; RETURN NEW; END$$; CREATE TRIGGER amm_consumer_fail BEFORE INSERT ON consumer_accounts FOR EACH ROW EXECUTE FUNCTION amm_consumer_fail_credential()");
  try{const r=await authPost(request("/api/consumer-auth/sign-up/email","POST",{name:"SYNTHETIC FAILURE",email:"broken@example.test",password}));expect(r.status).toBeGreaterThanOrEqual(400);expect(psql("SELECT count(*) FROM consumer_users WHERE email='broken@example.test'")).toBe("0");}
  finally{psql("DROP TRIGGER amm_consumer_fail ON consumer_accounts; DROP FUNCTION amm_consumer_fail_credential()");}
 });
 it("uses genuine consumer sessions and does not accept the staff cookie namespace",async()=>{
  aliceCookie=await signin("alice@example.test");bobCookie=await signin("bob@example.test");
  alice=(await consumerPrincipal(new Headers({Cookie:aliceCookie})))!;bob=(await consumerPrincipal(new Headers({Cookie:bobCookie})))!;
  expect(alice.userId).not.toBe(bob.userId);
  expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,aliceCookie))).headers.get("cache-control")).toContain("private, no-store");
  expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,"amm-lead-center.session_token=not-a-consumer-session"))).status).toBe(401);
  expect(await consumerPrincipal(new Headers())).toBeNull();
 });
 it("saves only the verified subject and reads the same state from a second genuine session",async()=>{
  expect((await readConsumerWorkspace(bob)).workspace.interests).toEqual([]);
  const saved=await saveConsumerWorkspace(alice,write(0));expect(saved.revision).toBe(1);
  secondCookie=await signin("alice@example.test");const second=(await consumerPrincipal(new Headers({Cookie:secondCookie})))!;
  expect(second.sessionId).not.toBe(alice.sessionId);expect((await readConsumerWorkspace(second)).workspace).toEqual(saved);
  expect((await readConsumerWorkspace(bob)).workspace.interests).toEqual([]);
 });
 it("has one concurrent revision winner and refuses an exact stale retry without another audit",async()=>{
  const before=Number(psql("SELECT count(*) FROM audit_logs WHERE action='consumer.workspace_saved'"));
  const inputs=[write(1,"SYNTHETIC A"),write(1,"SYNTHETIC B")];
  const results=await Promise.allSettled(inputs.map(input=>saveConsumerWorkspace(alice,input)));
  expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);expect(results.filter(x=>x.status==="rejected")).toHaveLength(1);
  const winner=results.findIndex(x=>x.status==="fulfilled");await expect(saveConsumerWorkspace(alice,inputs[winner])).rejects.toMatchObject({status:409});
  expect(Number(psql("SELECT count(*) FROM audit_logs WHERE action='consumer.workspace_saved'"))).toBe(before+1);
  expect((await readConsumerWorkspace(alice)).workspace.revision).toBe(2);
 });
 it("enforces database subject RLS even without a WHERE clause, and resets pooled role state",async()=>{
  const visible=psql(`BEGIN; SELECT set_config('amm.consumer_user_id',${literal(bob.userId)},true); SET LOCAL ROLE amm_consumer_workspace_v1; SELECT count(*) FROM consumer_workspaces; ROLLBACK;`).split("\n").at(-1);expect(visible).toBe("0");
  expect(()=>psql(`BEGIN; SELECT set_config('amm.consumer_user_id',${literal(bob.userId)},true); SET LOCAL ROLE amm_consumer_workspace_v1; INSERT INTO consumer_workspaces(user_id) VALUES(${literal(alice.userId)}); COMMIT;`)).toThrow();
  expect((await pool.query("SELECT current_user, current_setting('amm.consumer_user_id',true) subject")).rows[0].current_user).toBe("postgres");
 });
 it("rolls back workspace plus audit on a real audit failure and permits a later explicit safe save",async()=>{
  psql("CREATE FUNCTION amm_consumer_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action LIKE 'consumer.%' THEN RAISE EXCEPTION 'isolated_consumer_audit_failure'; END IF; RETURN NEW; END$$; CREATE TRIGGER amm_consumer_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION amm_consumer_fail_audit()");
  try{await expect(saveConsumerWorkspace(alice,write(2,"SYNTHETIC UNSAVED"))).rejects.toThrow();expect((await readConsumerWorkspace(alice)).workspace.revision).toBe(2);}
  finally{psql("DROP TRIGGER amm_consumer_fail ON audit_logs; DROP FUNCTION amm_consumer_fail_audit()");}
  expect((await saveConsumerWorkspace(alice,write(2))).revision).toBe(3);
 });
 it("exports only the own consumer projection, not auth tokens or canonical/staff history",async()=>{
  const r=await accountGet(request("/api/consumer/v1/account","GET",undefined,aliceCookie));expect(r.status).toBe(200);const body=await r.json();expect(body.profile.email).toBe("alice@example.test");
  expect(JSON.stringify(body)).not.toMatch(/bob@example|session_token|password|assigned_agent|lead_id|leadPermissions|provider_message|staff_secret/);
  expect(body.profile.emailVerified).toBe(false);expect(body.workspace.interests[0].provenance).toBe("user_reported_unverified");
 });
 it("revokes a genuine second session and refuses its pending write",async()=>{
  expect((await authPost(request("/api/consumer-auth/revoke-other-sessions","POST",{},aliceCookie))).status).toBe(200);
  expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,secondCookie))).status).toBe(401);
  const secondId=psql(`SELECT id FROM consumer_sessions WHERE "userId"=${literal(alice.userId)} AND id<>${literal(alice.sessionId)} LIMIT 1`);expect(secondId).toBe("");
  await expect(saveConsumerWorkspace({...alice,sessionId:randomUUID()},write(3))).rejects.toMatchObject({status:401});expect((await readConsumerWorkspace(alice)).workspace.revision).toBe(3);
 });
 it("rechecks disabled accounts and actual expiry instead of trusting an old cookie",async()=>{
  psql(`UPDATE consumer_users SET disabled=true WHERE id=${literal(alice.userId)}`);expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,aliceCookie))).status).toBe(401);
  psql(`UPDATE consumer_users SET disabled=false WHERE id=${literal(alice.userId)}`);
  psql(`UPDATE consumer_sessions SET "expiresAt"=now()-interval '1 second' WHERE id=${literal(alice.sessionId)}`);expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,aliceCookie))).status).toBe(401);
 });
 it("requires the password, atomically recovers failed deletion, then cascades only that account",async()=>{
  await saveConsumerWorkspace(bob,write(0,"SYNTHETIC BOB"));await expect(deleteConsumerAccount(bob,"wrong-password")).rejects.toMatchObject({status:403});
  psql("CREATE FUNCTION amm_consumer_fail_delete() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action='consumer.account_deleted' THEN RAISE EXCEPTION 'isolated_delete_audit_failure'; END IF; RETURN NEW; END$$; CREATE TRIGGER amm_consumer_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION amm_consumer_fail_delete()");
  try{await expect(deleteConsumerAccount(bob,password)).rejects.toThrow();expect((await readConsumerWorkspace(bob)).workspace.interests).toHaveLength(1);}
  finally{psql("DROP TRIGGER amm_consumer_fail ON audit_logs; DROP FUNCTION amm_consumer_fail_delete()");}
  expect(await deleteConsumerAccount(bob,password)).toMatchObject({deleted:true});expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,bobCookie))).status).toBe(401);
  for(const table of ["consumer_users","consumer_sessions","consumer_accounts"]){const column=table==="consumer_users"?"id":"\"userId\"";expect(psql(`SELECT count(*) FROM ${table} WHERE ${column}=${literal(bob.userId)}`)).toBe("0");}
  expect(psql("SELECT count(*) FROM audit_logs WHERE action='consumer.account_deleted'")).toBe("1");expect(counts()).toBe(originalCounts);
 });
 it("disables only the optional account surface and retains its schema/data on recovery",async()=>{
  vi.stubEnv("CONSUMER_WORKSPACE_ACCOUNTS_ENABLED","false");expect((await authGet(request("/api/consumer-auth/get-session"))).status).toBe(503);expect((await workspaceGet(request("/api/consumer/v1/workspace","GET",undefined,aliceCookie))).status).toBe(503);
  expect(psql("SELECT count(*) FROM consumer_users WHERE email='alice@example.test'")).toBe("1");expect(counts()).toBe(originalCounts);
  expect(outboundAttempts).toBe(0);
 });
});
