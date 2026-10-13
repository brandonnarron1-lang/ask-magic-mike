// @vitest-environment node
/**
 * Opt-in root POST(Request/Response) -> actual Neon adapter -> isolated PG17.
 * Only the Neon transport targets the existing owned localQuery harness;
 * receipts, capture, consent, routing and outbox SQL are not mocked. No sends.
 * Supplemental direct SQL cases exercise claims/cross-session keys that the
 * root handler normalizes or binds to one session; they are labelled as such.
 * This is not built-browser, live Places or Production migration acceptance.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ADDRESS_COMPONENTS, formatAddress, type AddressValue } from "../../app/lib/address/addressValue";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../app/lib/leadConsent";
import { LEAD_ALERT_TEMPLATE_VERSION } from "../../app/lib/leadAlertTemplates";
import { publicLeadOutcomeFromResponse } from "../../app/lib/publicLeadReceipt";
import type { NotificationProvider } from "../../app/lib/leadNotificationTypes";
import {
  addressCaptureMigration, bind, concurrent, install, literal, psql,
  startDatabase, statements, stopDatabase,
} from "../support/qa-audit-postgres";

const transport = vi.hoisted(() => ({
  send: vi.fn<NotificationProvider["send"]>(), network: vi.fn(), concurrentCaptures: false,
}));
vi.mock("@neondatabase/serverless", async () => {
  const local = await import("../support/qa-audit-postgres");
  return { neon: () => ({ async query(sql: string, params: unknown[] = []) {
    if (!transport.concurrentCaptures || !sql.includes("capture_public_lead_v3(")) {
      return local.localQuery.query(sql, params);
    }
    // Independent real connections, not Promise.all over synchronous psql.
    local.statements.push({ sql, params });
    return JSON.parse(await local.concurrent(`SET ROLE service_role;
      SELECT COALESCE(jsonb_agg(amm_rows), '[]') FROM (${local.bind(sql, params)}) amm_rows;`));
  } }) };
});
vi.mock("../../src/lib/security/rate-limit", async original => ({
  ...await original<object>(),
  checkRateLimit: vi.fn(async () => ({allowed:true,durable:true,remaining:50,resetAt:Date.now()+60_000})),
}));
vi.mock("../../app/lib/serverAnalytics", () => ({ recordServerAnalyticsEvent: vi.fn(async () => undefined) }));
vi.mock("../../app/lib/growth/lead-experiment-conversion", () => ({ recordLeadExperimentConversion: vi.fn(async () => ({attempted:false})) }));
vi.mock("../../src/lib/operations/first-live-lead-monitor", async original => ({
  ...await original<object>(), createFirstLiveLeadMonitor: () => null,
}));
vi.mock("../../app/lib/leadNotificationProvider", async original => ({
  ...await original<object>(), selectNotificationProvider: () => ({name:"isolated",send:transport.send}),
}));

type Row = Record<string, unknown>;
type Body = Row & {
  idempotency_key?: string; widget_session_id: string; address: string;
  email: string; phone: string; address_entry?: AddressValue;
};
const migration = readFileSync(`supabase/migrations/${addressCaptureMigration}`, "utf8");
const V3 = "public.capture_public_lead_v3(jsonb,jsonb,jsonb,text,jsonb)";
const AGENT = "00000000-0000-4000-8000-000000009901";
const USER_AGENT = "SYNTHETIC INTERNAL QA - DO NOT CONTACT";

function address(unit = "Unit 1", confirmation: AddressValue["confirmation"] = "manual"): AddressValue {
  const components = {line1:"101 Synthetic Fixture Road",line2:unit,locality:"Wilson",region:"NC",postalCode:"27893",country:"US"};
  return {
    version:1, enteredText:`  101 Synthetic Fixture Rd ${unit}, Wilson NC 27893  `,
    acceptedText:formatAddress(components), components, confirmation, validation:"not_performed",
    ...(confirmation === "user_confirmed_suggestion"
      ? {reportedProvider:"google_places_new" as const,reportedPlaceId:"synthetic_place_1"} : {}),
  };
}
function fixture(entry: AddressValue | null = address()): Body {
  const key = randomUUID();
  return {
    funnel_type:"home_value",lead_source_surface:"home_value_page",
    name:"SYNTHETIC ADDRESS FIXTURE | INTERNAL QA | DO NOT CONTACT",
    email:`${key}@example.test`,phone:"",address:entry?.acceptedText ?? address().acceptedText,
    ...(entry ? {address_entry:entry} : {}),
    city:entry?.components.locality ?? "Wilson",timeline:"30-60 days",
    consent:true,consent_email:true,consent_call:false,consent_sms:false,
    consent_language_text:LEAD_CONSENT_LANGUAGE_TEXT,consent_language_version:LEAD_CONSENT_LANGUAGE_VERSION,
    consent_source:"home_value_page:home-value",idempotency_key:key,widget_session_id:key,
    attribution:{source:"ourtownproperties",medium:"owned_media",campaign:"synthetic_structured_address",
      content:"synthetic_home_value",landing_page:"https://www.askmagicmike.com/home-value"},
    page_url:"https://www.askmagicmike.com/home-value",
  };
}
async function submit(input: Body, captureVersion: "v2" | "v3" | null = "v3") {
  const { POST } = await import("../../app/api/leads/route");
  const start = statements.length;
  const headers = new Headers({"Content-Type":"application/json",Origin:"https://www.askmagicmike.com",
    Referer:"https://www.ourtownproperties.com/how-much-is-your-home-worth/","User-Agent":USER_AGENT});
  headers.set("Idempotency-Key",input.idempotency_key ?? input.widget_session_id);
  const response = await POST(new Request("https://www.askmagicmike.com/api/leads", {
    method:"POST",headers,
    body:JSON.stringify(input),
  }));
  const outcome = await publicLeadOutcomeFromResponse(response.clone());
  const result = await response.json() as Row;
  const captures = statements.slice(start).filter(entry => /capture_public_lead_v[123]\(/.test(entry.sql));
  if (captureVersion) {
    expect(captures, "actual root handler must retain structured context and execute one atomic RPC").toHaveLength(1);
    expect(captures[0].sql).toContain(`capture_public_lead_${captureVersion}(`);
    if (captureVersion === "v3") {
      const lead = JSON.parse(String(captures[0].params[1]));
      expect(lead.address_entry).toEqual(input.address_entry);
      expect(lead).toMatchObject({address_raw:input.address,
        address_line1:input.address_entry!.components.line1 || null,
        address_line2:input.address_entry!.components.line2 || null,
        city:input.address_entry!.components.locality || input.city || null,
        state:input.address_entry!.components.region,
        zip:input.address_entry!.components.postalCode || null});
    }
  }
  return {response,outcome,result,capture:captures[0]};
}
function saved(submitted: Awaited<ReturnType<typeof submit>>, input: Body) {
  expect(submitted.response.status, JSON.stringify(submitted.result)).toBe(200);
  expect(submitted.outcome.status).toBe("saved");
  if (submitted.outcome.status !== "saved") throw new Error("expected_real_committed_receipt");
  expect(submitted.outcome.receipt.session_id).toBe(input.idempotency_key ?? input.widget_session_id);
  return submitted.outcome.receipt;
}
function rows(sql: string): Row[] {
  return JSON.parse(psql(`SELECT COALESCE(jsonb_agg(amm_rows),'[]') FROM (${sql}) amm_rows;`));
}
function lead(id: string) {
  const result = rows(`SELECT * FROM leads WHERE id=${literal(id)}::uuid`);
  expect(result).toHaveLength(1); return result[0];
}
function snapshot(withoutAddressColumn = false) {
  // Compare values as well as counts. No retry, error or migration may silently
  // mutate old contacts, assignment/consent evidence, or a queued template.
  return psql(`SELECT jsonb_build_object(
    'leads',(SELECT COALESCE(jsonb_agg(${withoutAddressColumn ? "to_jsonb(l)-'address_entry'" : "to_jsonb(l)"} ORDER BY id),'[]') FROM leads l),
    'contacts',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM contacts c),
    'identities',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY identity_type,normalized_value),'[]') FROM contact_identities i),
    'sessions',(SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM sessions s),
    'attribution',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM source_attribution a),
    'consents',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM consents c),
    'audits',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM audit_logs a),
    'assignments',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM agent_assignments a),
    'routing',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY id),'[]') FROM lead_routing r),
    'outbox',(SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY id),'[]') FROM lead_notifications n),
    'agents',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM agents a),
    'communications',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM communication_events c),
    'webhooks',(SELECT COALESCE(jsonb_agg(to_jsonb(w) ORDER BY id),'[]') FROM provider_webhook_events w));`);
}
function predecessorHashes(db: "amm_qa_upgrade" | "amm_qa_fresh" = "amm_qa_upgrade") {
  return psql(`SELECT jsonb_build_object(
    'v1',encode(sha256(convert_to(pg_get_functiondef('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'UTF8')),'hex'),
    'v2',encode(sha256(convert_to(pg_get_functiondef('public.capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)'::regprocedure),'UTF8')),'hex'),
    'fingerprint',encode(sha256(convert_to(pg_get_functiondef('public.amm_public_lead_request_fingerprint(jsonb,jsonb)'::regprocedure),'UTF8')),'hex'));`, db);
}
function rpc(params: unknown[]) {
  return bind("SELECT public.capture_public_lead_v3($1::jsonb,$2::jsonb,$3::jsonb,$4::text,$5::jsonb)", params);
}
function verifyContext(id: string, entry: AddressValue) {
  const row = lead(id);
  expect(row).toMatchObject({address_entry:entry,address_raw:entry.acceptedText,
    address_line1:entry.components.line1 || null,address_line2:entry.components.line2 || null,
    city:entry.components.locality || null,state:entry.components.region,zip:entry.components.postalCode || null});
  return row;
}
function verifyEvidence(id: string, emailConsent = true) {
  const row = lead(id);
  expect(row).toMatchObject({is_test:true,communication_suppressed:true,email_suppressed:true,sms_suppressed:true,
    consent_email:emailConsent,consent_call:false,consent_sms:false,
    consent_language_text:LEAD_CONSENT_LANGUAGE_TEXT,consent_language_version:LEAD_CONSENT_LANGUAGE_VERSION});
  expect(rows(`SELECT consent_type,granted,language_text,language_version FROM consents WHERE lead_id=${literal(id)}::uuid ORDER BY consent_type`))
    .toEqual(["call","email","sms"].map(type => ({consent_type:type,granted:type === "email" && emailConsent,
      language_text:LEAD_CONSENT_LANGUAGE_TEXT,language_version:LEAD_CONSENT_LANGUAGE_VERSION})));
  const intents = rows(`SELECT * FROM lead_notifications WHERE lead_id=${literal(id)}::uuid`);
  const alert = intents.filter(row => row.notification_type === "lead_alert");
  expect(alert).toHaveLength(1);
  expect(alert[0]).toMatchObject({template_version:LEAD_ALERT_TEMPLATE_VERSION,status:"skipped",attempt_count:0,provider_message_id:null,
    metadata:{capture_transaction:"capture_public_lead_v2"}});
  for (const intent of intents) expect(intent).toMatchObject({status:"skipped",attempt_count:0,provider_message_id:null});
  expect(rows(`SELECT action FROM audit_logs WHERE resource_id=${literal(id)}::uuid AND action IN ('lead.created','lead.qa_suppressed') ORDER BY action`))
    .toEqual([{action:"lead.created"},{action:"lead.qa_suppressed"}]);
  expect(rows(`SELECT utm_source,utm_medium,utm_campaign FROM source_attribution WHERE lead_id=${literal(id)}::uuid`))
    .toEqual([{utm_source:"ourtownproperties",utm_medium:"owned_media",utm_campaign:"synthetic_structured_address"}]);
}

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("structured address capture — isolated root HTTP to PostgreSQL, no sends", () => {
  let legacyBody: Body;
  let legacyId = "";
  let legacySnapshot = "";
  let hashes = "";
  beforeAll(async () => {
    await startDatabase();
    // Both supported harness venues use the owned DB over a local Unix socket,
    // never DATABASE_URL or a Production/Preview endpoint from the environment.
    expect(psql("SELECT current_database(),current_user,inet_server_addr() IS NULL;")).toBe("amm_qa_upgrade|postgres|t");
    install("amm_qa_upgrade", true, new Set([addressCaptureMigration]));
    psql(`UPDATE agents SET name='SYNTHETIC QA — DO NOT CONTACT',email=id::text||'@example.test',
      phone=NULL,notification_phone=NULL,notification_sms=false,notification_email=false,is_active=false;
      UPDATE agents SET is_active=true,notification_email=true,max_daily_leads=0,priority_score=100 WHERE id=${literal(AGENT)}::uuid;`);
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("VERCEL_ENV", "development"); vi.stubEnv("DATABASE_ENV", "local");
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "disabled"); vi.stubEnv("LEAD_NOTIFICATION_PRODUCTION_ENABLED", "false");
    for (const name of ["CONSUMER_ACKNOWLEDGMENT_ENABLED","AGENT_SMS_NOTIFICATIONS_ENABLED","AGENT_PUSH_NOTIFICATIONS_ENABLED"]) vi.stubEnv(name,"false");
    for (const name of ["RESEND_API_KEY","OPENAI_API_KEY","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","CONSENT_IP_HASH_SALT"]) vi.stubEnv(name,"");
    transport.network.mockImplementation(async () => { throw new Error("external_network_forbidden"); });
    transport.send.mockImplementation(async () => { throw new Error("provider_send_forbidden"); });
    vi.stubGlobal("fetch", transport.network);
    legacyBody = fixture(null);
    legacyId = saved(await submit(legacyBody,"v2"), legacyBody).lead_id;
    // Old queued versions are synthetic pre-upgrade evidence, never dispatched.
    psql(`INSERT INTO lead_notifications(lead_id,notification_type,channel,recipient_type,recipient_reference,
      template_version,idempotency_key,status,provider,metadata)
      SELECT ${literal(legacyId)}::uuid,'lead_alert','email','internal','email_configured',
        'lead_alert_email_v'||n,'synthetic-old-address-queue:'||n,'pending','disabled','{"synthetic_fixture":true}'::jsonb
      FROM generate_series(1,5) n;`);
    hashes = predecessorHashes(); legacySnapshot = snapshot(true);
    psql(migration);
    expect(snapshot(true)).toBe(legacySnapshot);
    expect(lead(legacyId).address_entry).toBeNull();
    expect(predecessorHashes()).toBe(hashes);
    install("amm_qa_fresh", true);
  }, 120_000);
  beforeEach(() => {
    transport.concurrentCaptures = false;
    transport.send.mockClear(); transport.network.mockClear();
  });
  afterEach(() => {
    transport.concurrentCaptures = false;
    expect(transport.send).not.toHaveBeenCalled(); expect(transport.network).not.toHaveBeenCalled();
    expect(psql("SELECT count(*) FROM lead_notifications WHERE provider_message_id IS NOT NULL;")).toBe("0");
  });
  afterAll(() => {
    try { stopDatabase(); } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
  }, 20_000);

  it("fresh and upgrade schemas converge; legacy bodies/hash/grants/history stay intact", () => {
    expect(predecessorHashes()).toBe(hashes); expect(predecessorHashes("amm_qa_fresh")).toBe(hashes);
    const definition = `SELECT pg_get_functiondef('${V3}'::regprocedure);`;
    expect(psql(definition,"amm_qa_fresh")).toBe(psql(definition));
    expect(psql(`SELECT prosecdef,pronargs FROM pg_proc WHERE oid='${V3}'::regprocedure;`)).toBe("f|5");
    const body = psql(definition);
    expect(body.indexOf("amm:request-idempotency:")).toBeLessThan(body.indexOf("amm:session:"));
    expect(body.indexOf("amm:session:")).toBeLessThan(body.indexOf("SELECT id, session_id, address_entry"));
    for (const db of ["amm_qa_upgrade","amm_qa_fresh"] as const) {
      expect(psql("SELECT data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='address_entry';",db)).toBe("jsonb|YES|");
      expect(psql(`SELECT has_function_privilege('anon','${V3}','EXECUTE'),
        has_function_privilege('authenticated','${V3}','EXECUTE'),has_function_privilege('service_role','${V3}','EXECUTE');`,db)).toBe("f|f|t");
      expect(psql(`SELECT count(*) FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
        WHERE p.oid='${V3}'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE';`,db)).toBe("0");
    }
    expect(snapshot(true)).toBe(legacySnapshot);
  }, 30_000);

  it("browser roles cannot invoke the v3 RPC even with an otherwise valid captured request", async () => {
    const input = fixture(); const submitted = await submit(input); saved(submitted,input);
    const before = snapshot();
    for (const role of ["anon","authenticated"]) {
      expect(() => psql(`SET ROLE ${role}; ${rpc(submitted.capture.params)};`))
        .toThrow(/permission denied for function capture_public_lead_v3/);
      expect(snapshot()).toBe(before);
    }
  }, 30_000);

  it.each(["manual","user_confirmed_suggestion","user_edited"] as const)("root HTTP preserves exact entered/accepted/components for %s without inventing validation", async confirmation => {
    const entry = address("Unit 7",confirmation); const input = fixture(entry);
    const submitted = await submit(input); const receipt = saved(submitted,input);
    const row = verifyContext(receipt.lead_id,entry); verifyEvidence(receipt.lead_id);
    expect(row.address_raw).not.toBe(entry.enteredText);
    expect((row.address_entry as AddressValue).validation).toBe("not_performed");
    expect(row).toMatchObject({assigned_agent_id:AGENT,assignment_status:"assigned"});
    expect(psql(`SELECT initial_address FROM sessions WHERE id=${literal(receipt.session_id)}::uuid;`)).toBe(entry.acceptedText);
    const serverLead = JSON.parse(String(submitted.capture.params[1]));
    expect(row.request_fingerprint).toBe(psql(`SELECT public.amm_public_lead_request_fingerprint(${literal(JSON.stringify(serverLead))}::jsonb,${literal(String(submitted.capture.params[2]))}::jsonb);`));
  }, 30_000);

  it("manual unstructured rural/parcel entry keeps empty components instead of guessed geography", async () => {
    const entry: AddressValue = {version:1,enteredText:"  SYNTHETIC rural parcel near fixture road  ",
      acceptedText:"SYNTHETIC rural parcel near fixture road",components:{...EMPTY_ADDRESS_COMPONENTS},confirmation:"manual",validation:"not_performed"};
    const input = fixture(entry); const receipt = saved(await submit(input),input);
    verifyContext(receipt.lead_id,entry); verifyEvidence(receipt.lead_id);
  }, 30_000);

  it("identical root HTTP replay is read-only; app v2 rollback retains structured data and original outbox", async () => {
    const input = fixture(); const submitted = await submit(input); const first = saved(submitted,input);
    const before = snapshot();
    const replay = await submit(input);
    expect(saved(replay,input)).toMatchObject({lead_id:first.lead_id,idempotentReplay:true});
    expect(replay.response.headers.get("X-AMM-Idempotent-Replay")).toBe("1"); expect(snapshot()).toBe(before);
    const params = structuredClone(submitted.capture.params);
    params[4] = JSON.stringify({template_version:"lead_alert_email_v5",metadata:{synthetic_fixture:true}});
    expect(JSON.parse(psql(`SET ROLE service_role; ${rpc(params)};`))).toMatchObject({ok:true,lead_id:first.lead_id,idempotent_replay:true});
    expect(snapshot()).toBe(before); // No v5 replacement or new intent on replay.
    const fallback = await submit({...input,address_entry:undefined},"v2");
    expect(saved(fallback,input)).toMatchObject({lead_id:first.lead_id,idempotentReplay:true});
    expect(snapshot()).toBe(before); verifyContext(first.lead_id,input.address_entry!);
  }, 30_000);

  it.each(["line2","locality","postalCode","enteredText","confirmation"] as const)("same-key material %s change conflicts even with unchanged accepted text/fingerprint", async field => {
    const input = fixture(); const first = saved(await submit(input),input); const before = snapshot();
    const entry = structuredClone(input.address_entry!);
    if (field === "enteredText") entry.enteredText = "101 Synthetic Fixture Road Unit 1 (edited original input)";
    else if (field === "confirmation") entry.confirmation = "user_edited";
    // Components can partition the same flattened text differently. Keep the
    // input valid while proving structured context matters beyond the old hash.
    if (field === "line2" || field === "locality" || field === "postalCode") {
      entry.components = {...EMPTY_ADDRESS_COMPONENTS,line1:input.address};
      if (field === "line2") { entry.components.line1="101 Synthetic Fixture Road, Unit 1"; entry.components.line2="Wilson, NC 27893"; }
      else if (field === "locality") { entry.components.line1="101 Synthetic Fixture Road, Unit 1"; entry.components.locality="Wilson, NC 27893"; }
      else { entry.components.line1="101 Synthetic Fixture Road, Unit 1, Wilson"; entry.components.postalCode="NC 27893"; }
    }
    expect(formatAddress(entry.components)).toBe(input.address);
    const rejected = await submit({...input,address_entry:entry});
    const incoming = JSON.parse(String(rejected.capture.params[1]));
    expect(psql(`SELECT public.amm_public_lead_request_fingerprint(${literal(JSON.stringify(incoming))}::jsonb,${literal(String(rejected.capture.params[2]))}::jsonb);`))
      .toBe(String(lead(first.lead_id).request_fingerprint));
    expect(rejected.response.status).toBe(409); expect(rejected.result).toMatchObject({code:"idempotency_conflict"});
    expect(rejected.outcome).toMatchObject({status:"not_saved",retryPolicy:"blocked"});
    expect(snapshot()).toBe(before); verifyContext(first.lead_id,input.address_entry!);
  }, 30_000);

  it("a legacy existing key cannot be silently upgraded with structured context", async () => {
    const before = snapshot(); const rejected = await submit({...legacyBody,address_entry:address()});
    expect(rejected.response.status).toBe(409); expect(rejected.result).toMatchObject({code:"idempotency_conflict"});
    expect(snapshot()).toBe(before); expect(lead(legacyId).address_entry).toBeNull();
  }, 30_000);

  it("supplemental adapter compatibility: legacy caller without internalNotification still uses unchanged v1", async () => {
    const source = await submit(fixture(null),"v2");
    const session = JSON.parse(String(source.capture.params[0]));
    const payload = JSON.parse(String(source.capture.params[1]));
    const key = randomUUID();
    session.id = key;
    Object.assign(payload,{session_id:key,widget_session_id:key,request_idempotency_key:key,
      email:`${key}@example.test`,normalized_email:`${key}@example.test`});
    const { NeonPostgresAdapter } = await import("../../app/lib/persistence/neonPostgresAdapter");
    const { localQuery } = await import("../support/qa-audit-postgres");
    const start = statements.length;
    const result = await new NeonPostgresAdapter(localQuery as never).captureLeadLifecycle({
      session,lead:payload,attribution:JSON.parse(String(source.capture.params[2])),notificationMode:"disabled",
    });
    expect(result.ok).toBe(true);
    if (result.ok === false) throw new Error("legacy_capture_failed");
    expect(statements.slice(start).filter(entry => /capture_public_lead_v[123]\(/.test(entry.sql)).map(entry => entry.sql))
      .toEqual(["SELECT public.capture_public_lead_v1($1::jsonb, $2::jsonb, $3::jsonb, $4::text) AS result"]);
    expect(lead(result.lead_id).address_entry).toBeNull(); expect(predecessorHashes()).toBe(hashes);
  }, 30_000);

  it("header-only idempotency callers (body key absent) get guarded replay/conflict behavior", async () => {
    const input = fixture(); delete input.idempotency_key;
    const first = saved(await submit(input),input); const before = snapshot();
    expect(saved(await submit(input),input)).toMatchObject({lead_id:first.lead_id,idempotentReplay:true});
    const entry = {...input.address_entry!,enteredText:"changed original entry with identical accepted address"};
    expect((await submit({...input,address_entry:entry})).response.status).toBe(409);
    expect(snapshot()).toBe(before);
  }, 30_000);

  it("same contact / different units retains separate inquiries without rewriting canonical property/consent/owner", async () => {
    const input = fixture(address("Unit 11")); const first = saved(await submit(input),input);
    const original = lead(first.lead_id); const historical = rows(`SELECT * FROM consents WHERE lead_id=${literal(first.lead_id)}::uuid ORDER BY id`);
    const second = {...fixture(address("Unit 12")),email:input.email,consent:false,consent_email:false};
    const repeat = saved(await submit(second),second); const inquiry = verifyContext(repeat.lead_id,second.address_entry!);
    expect(repeat.lead_id).not.toBe(first.lead_id);
    expect(repeat.duplicate_of_lead_id).toBe(first.lead_id); // Existing contact dedupe, not property-row collapse.
    expect(inquiry).toMatchObject({contact_id:original.contact_id,assigned_agent_id:null});
    expect(lead(first.lead_id)).toEqual(original);
    expect(rows(`SELECT * FROM consents WHERE lead_id=${literal(first.lead_id)}::uuid ORDER BY id`)).toEqual(historical);
    verifyEvidence(repeat.lead_id,false);
    expect(psql(`SELECT count(*) FROM leads WHERE id IN (${literal(first.lead_id)}::uuid,${literal(repeat.lead_id)}::uuid);`)).toBe("2");
  }, 30_000);

  it("different people at the same building remain different contacts/inquiries, not address identities", async () => {
    const entry = address(""); const firstInput = fixture(entry); const secondInput = fixture(entry);
    const first = saved(await submit(firstInput),firstInput); const second = saved(await submit(secondInput),secondInput);
    expect(first.lead_id).not.toBe(second.lead_id); expect(first.duplicate_of_lead_id).toBeNull(); expect(second.duplicate_of_lead_id).toBeNull();
    expect(lead(first.lead_id).contact_id).not.toBe(lead(second.lead_id).contact_id);
    verifyContext(first.lead_id,entry); verifyContext(second.lead_id,entry); verifyEvidence(first.lead_id); verifyEvidence(second.lead_id);
  }, 30_000);

  it("two actual concurrent root HTTP captures commit one inquiry and one unchanged replay", async () => {
    const input = fixture(); const start = statements.length; transport.concurrentCaptures = true;
    const results = await Promise.all([submit(input,null),submit(input,null)]);
    expect(results.map(result => saved(result,input).lead_id)[0]).toBe(saved(results[1],input).lead_id);
    expect(results.filter(result => result.response.headers.get("X-AMM-Idempotent-Replay") === "1")).toHaveLength(1);
    expect(statements.slice(start).filter(entry => entry.sql.includes("capture_public_lead_v3("))).toHaveLength(2);
    expect(psql(`SELECT count(*) FROM leads WHERE request_idempotency_key=${literal(input.idempotency_key)};`)).toBe("1");
    verifyContext(saved(results[0],input).lead_id,input.address_entry!); verifyEvidence(saved(results[0],input).lead_id);
  }, 30_000);

  it("supplemental SQL: different sessions racing one key cannot bypass structured-context conflict", async () => {
    const seed = await submit(fixture()); const key = randomUUID(); const email = `${key}@example.test`;
    const params = structuredClone(seed.capture.params);
    const payload = JSON.parse(String(params[1]));
    Object.assign(payload,{request_idempotency_key:key,email,normalized_email:email});
    params[1] = JSON.stringify(payload);
    const other = structuredClone(params);
    for (const values of [params,other]) values[0] = JSON.stringify({...JSON.parse(String(values[0])),id:randomUUID()});
    const changed = JSON.parse(String(other[1])); changed.address_entry.enteredText = "different typed representation of the same accepted fixture address";
    other[1] = JSON.stringify(changed);
    const results = await Promise.all([params,other].map(values => concurrent(`SET ROLE service_role; ${rpc(values)};`)));
    const decoded = results.map(result => JSON.parse(result));
    expect(decoded.filter(result => result.ok === true)).toHaveLength(1);
    expect(decoded.filter(result => result.error === "idempotency_conflict")).toHaveLength(1);
    expect(psql(`SELECT count(*) FROM leads WHERE request_idempotency_key=${literal(key)};`)).toBe("1");
    expect(psql(`SELECT count(*) FROM sessions WHERE id IN (${literal(JSON.parse(String(params[0])).id)}::uuid,${literal(JSON.parse(String(other[0])).id)}::uuid);`)).toBe("1");
  }, 30_000);

  it.each(["provider_verified","postal_verified","verified"])("supplemental SQL rejects unsupported validation=%s without a write", async validation => {
    const submitted = await submit(fixture()); const before = snapshot();
    const params = structuredClone(submitted.capture.params); const payload = JSON.parse(String(params[1]));
    payload.address_entry.validation = validation; params[1] = JSON.stringify(payload);
    expect(() => psql(`SET ROLE service_role; ${rpc(params)};`)).toThrow(/invalid_address_entry/);
    expect(snapshot()).toBe(before);
  }, 30_000);

  it.each(["raise","skip"] as const)("a post-v2 address enrichment %s fault rolls back every capture effect", async fault => {
    const input = fixture(); const before = snapshot();
    psql(`CREATE FUNCTION public.synthetic_address_enrichment_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      ${fault === "raise" ? "RAISE EXCEPTION 'synthetic required address enrichment fault' USING ERRCODE='23514';" : "RETURN NULL;"}
      END $$;
      CREATE TRIGGER synthetic_address_enrichment_fault BEFORE UPDATE OF address_entry ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.synthetic_address_enrichment_fault();`);
    try {
      const failed = await submit(input);
      expect(failed.response.status).toBe(500); expect(failed.result).toMatchObject({code:"lead_persistence_failed"});
      expect(failed.result).not.toHaveProperty("lead_id");
      expect(failed.outcome).toMatchObject({status:"unconfirmed",retryPolicy:"same_payload"});
      expect(snapshot()).toBe(before);
      expect(psql(`SELECT count(*) FROM sessions WHERE id=${literal(input.idempotency_key)}::uuid;`)).toBe("0");
      expect(psql(`SELECT count(*) FROM contact_identities WHERE normalized_value=${literal(input.email)};`)).toBe("0");
    } finally {
      psql("DROP TRIGGER synthetic_address_enrichment_fault ON public.leads; DROP FUNCTION public.synthetic_address_enrichment_fault();");
    }
  }, 30_000);
});
