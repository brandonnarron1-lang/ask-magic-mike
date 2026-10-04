// @vitest-environment node
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { acceptedFunction, bind, concurrent, install, literal, localQuery, migration, psql, startDatabase, statements, stopDatabase } from "../support/qa-audit-postgres";
import { NeonPostgresAdapter } from "../../app/lib/persistence/neonPostgresAdapter";
import { normalizeLeadPayload } from "../../app/lib/leadPayload";
import { FirstLiveLeadMonitor } from "../../src/lib/operations/first-live-lead-monitor";
import { decideCommunicationPermission, MESSAGE_PURPOSES } from "../../src/lib/messaging/permission-engine";
import { buildLeadTimelinePage } from "../../app/lib/adminLeadTimeline";

vi.mock("@neondatabase/serverless", async () => {
  const local = await import("../support/qa-audit-postgres");
  return { neon: () => local.localQuery };
});

const provider = vi.hoisted(() => ({ send: vi.fn(async () => ({ ok: false, provider: "isolated", retryable: true, errorCode: "synthetic_failure", errorSummary: "Synthetic unavailable provider" })) }));
vi.mock("../../app/lib/leadNotificationProvider", async (original) => ({
  ...await original<object>(), selectNotificationProvider: () => ({ name: "isolated", send: provider.send }),
}));

const repair = readFileSync(`supabase/migrations/${migration}`, "utf8");
const adapter = new NeonPostgresAdapter(localQuery as never);
const owned = { utm_source: "ourtownproperties", utm_medium: "owned_media", utm_campaign: "amm_owned_demand_2026", utm_content: "wordpress_home_value_page", landing_page: "https://www.askmagicmike.com/home-value", referrer_type: "referral" };
function fixture(qa = true) {
  const id = randomUUID();
  return {
    session: { id, ...owned },
    lead: { first_name: qa ? "INTERNAL QA" : "SYNTHETIC FIXTURE", last_name: "DO NOT CONTACT", email: `${id}@example.test`, normalized_email: `${id}@example.test`, address_raw: "1 Synthetic QA Test Street", normalized_property_address: "1 synthetic qa test street", lead_type: "home_value", primary_intent: "sell", source: "ourtownproperties", source_detail: "home_value_page / owned_media / amm_owned_demand_2026", consent_email: true, consent_call: false, consent_sms: false, consent_language_version: "synthetic-v1", consent_timestamp: new Date().toISOString(), is_test: qa, communication_suppressed: qa, email_suppressed: qa, sms_suppressed: qa, request_idempotency_key: id },
    attribution: { ...owned }, notificationMode: "disabled" as const,
  };
}
function captureSql(input: ReturnType<typeof fixture>) {
  return bind("SELECT capture_public_lead_v1($1::jsonb,$2::jsonb,$3::jsonb,$4::text)", [JSON.stringify(input.session), JSON.stringify(input.lead), JSON.stringify(input.attribution), input.notificationMode]);
}
function counts() {
  return psql("SELECT jsonb_build_object('lead',(SELECT count(*) FROM leads),'contact',(SELECT count(*) FROM contacts),'session',(SELECT count(*) FROM sessions),'attribution',(SELECT count(*) FROM source_attribution),'audit',(SELECT count(*) FROM audit_logs),'assignment',(SELECT count(*) FROM agent_assignments),'outbox',(SELECT count(*) FROM lead_notifications));");
}

describe("automatic QA audit migration static contract", () => {
  it("changes only the existing function, preserves server-only invoker and locking, never backfills", () => {
    expect(repair).toContain("SECURITY INVOKER");
    expect(repair).toContain("SET search_path = public, pg_temp");
    expect(repair).toContain("pg_advisory_xact_lock(hashtextextended('amm:session:'");
    expect(repair).toContain("'system/public_lead_capture', 'lead.qa_suppressed'");
    expect(repair).not.toMatch(/CREATE TABLE|system:owner-approved-qa-reconciliation|capture_public_lead_v2/);
    expect(repair.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(1);
    expect(repair).toContain("REVOKE ALL ON FUNCTION public.capture_public_lead_v1");
  });
});

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("automatic QA evidence: real isolated PostgreSQL", () => {
  let qaId = "";
  let baselineHash = "";
  beforeAll(async () => {
    await startDatabase();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("external_network_forbidden"); }));
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "operator@example.test");
    vi.stubEnv("LEAD_NOTIFICATION_BCC", "audit@example.test");
    vi.stubEnv("CONSUMER_ACKNOWLEDGMENT_ENABLED", "true");
    vi.stubEnv("AGENT_PUSH_NOTIFICATIONS_ENABLED", "false");
    install("amm_qa_upgrade", false);
    baselineHash = psql("SELECT encode(sha256(convert_to(pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'UTF8')),'hex');");
    // A pre-existing accepted-schema QA record is intentionally not backfilled.
    const old = fixture();
    const existing = JSON.parse(psql(`${captureSql(old)};`));
    psql(`UPDATE leads SET is_test=true,communication_suppressed=true,email_suppressed=true,sms_suppressed=true WHERE id=${literal(existing.lead_id)};`);
    const before = counts();
    psql(repair);
    expect(counts()).toBe(before);
    psql(readFileSync("supabase/migrations/20261004020000_public_lead_notification_reliability.sql", "utf8"));
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(existing.lead_id)} AND action='lead.qa_suppressed';`)).toBe("0");
    // Preserve this fixture but make monitor tests scoped to newly captured QA.
    psql(`UPDATE source_attribution SET utm_source='internal_qa_fixture',utm_medium='qa' WHERE session_id=${literal(old.session.id)};`);
  }, 120_000);
  afterAll(() => { stopDatabase(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }, 20_000);

  it("fresh installation and accepted-schema upgrade converge on the same function and grants", () => {
    install("amm_qa_fresh", true);
    const def = "SELECT pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure);";
    expect(psql(def, "amm_qa_fresh")).toBe(psql(def));
    expect(baselineHash).toBe("613c4df70c1701a24740f2fe14206ba44cfdcf3379264c635671e709548b9bf7");
    expect(psql("SELECT has_function_privilege('anon','capture_public_lead_v1(jsonb,jsonb,jsonb,text)','EXECUTE'), has_function_privilege('authenticated','capture_public_lead_v1(jsonb,jsonb,jsonb,text)','EXECUTE'), has_function_privilege('service_role','capture_public_lead_v1(jsonb,jsonb,jsonb,text)','EXECUTE');")).toBe("f|f|t");
  }, 30_000);

  it("captures through the actual root handler and SQL adapter; commits safe marker before enrichment", async () => {
    const { POST } = await import("../../app/api/leads/route");
    const { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } = await import("../../app/lib/leadConsent");
    const key = randomUUID();
    const body = { funnel_type: "home_value", lead_source_surface: "home_value_page", name: "INTERNAL QA — DO NOT CONTACT", email: `${key}@example.test`, address: "1 Synthetic QA Test Street", timeline: "0-3 months", consent: true, consent_email: true, consent_sms: false, consent_call: false, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, idempotency_key: key, attribution: { source: owned.utm_source, medium: owned.utm_medium, campaign: owned.utm_campaign, content: owned.utm_content, landing_page: owned.landing_page }, page_url: owned.landing_page };
    const response = await POST(new Request("https://www.askmagicmike.com/api/leads", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.askmagicmike.com", Referer: "https://www.ourtownproperties.com/how-much-is-your-home-worth/", "Idempotency-Key": key }, body: JSON.stringify(body) }));
    const result = await response.json();
    expect(response.status, JSON.stringify(result)).toBe(200);
    qaId = result.lead_id;
    const captured = statements.filter((entry) => entry.sql.includes("capture_public_lead_v2(")).at(-1)!;
    const serverLead = JSON.parse(String(captured.params[1]));
    expect(serverLead.is_test).toBe(true);
    const row = (await localQuery.query("SELECT * FROM leads WHERE id=$1::uuid", [qaId]))[0];
    expect(row).toMatchObject({ is_test: true, communication_suppressed: true, email_suppressed: true, sms_suppressed: true, assignment_status: "assigned" });
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(qaId)} AND action='lead.qa_suppressed' AND actor='system/public_lead_capture';`)).toBe("1");
    await adapter.enrichLeadRecord({ leadId: qaId, leadPatch: serverLead, attributionPatch: {}, consents: ["email", "call", "sms"].map((type) => ({ lead_id: qaId, consent_type: type, granted: serverLead[`consent_${type}`], language_version: LEAD_CONSENT_LANGUAGE_VERSION, language_text: LEAD_CONSENT_LANGUAGE_TEXT })) });
    expect(psql(`SELECT count(*) FROM consents WHERE lead_id=${literal(qaId)};`)).toBe("3");
    const attr = (await localQuery.query("SELECT * FROM source_attribution WHERE lead_id=$1::uuid", [qaId]))[0];
    expect(attr).toMatchObject({ ...owned, referrer_type: "direct" });
    expect(attr.placement_id).toBeNull();
    expect((await localQuery.query("SELECT score,source_detail FROM leads WHERE id=$1::uuid", [qaId]))[0]).toMatchObject({ score: serverLead.score, source_detail: serverLead.source_detail });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("sequential and five concurrent exact replays preserve every transaction effect", async () => {
    const input = fixture();
    const first = await adapter.captureLeadLifecycle(input);
    expect(first.ok).toBe(true);
    const before = counts();
    expect((await adapter.captureLeadLifecycle(input)).idempotent_replay).toBe(true);
    const replies = await Promise.all(Array.from({ length: 5 }, () => concurrent(`SET ROLE service_role; ${captureSql(input)};`)));
    expect(replies.map((value) => JSON.parse(value).lead_id)).toEqual(Array(5).fill(first.ok ? first.lead_id : ""));
    expect(counts()).toBe(before);
    const newInput = fixture();
    const initial = counts();
    const raced = await Promise.all(Array.from({ length: 5 }, () => concurrent(`SET ROLE service_role; ${captureSql(newInput)};`)));
    expect(raced.filter((value) => !JSON.parse(value).idempotent_replay)).toHaveLength(1);
    const after = JSON.parse(counts()); const prior = JSON.parse(initial);
    expect(after.lead - prior.lead).toBe(1); expect(after.contact - prior.contact).toBe(1);
    expect(after.assignment - prior.assignment).toBe(1); expect(after.outbox - prior.outbox).toBe(1);
    expect(after.audit - prior.audit).toBe(3);
    expect(psql(`SELECT count(*) FROM audit_logs a JOIN leads l ON l.id=a.resource_id WHERE l.session_id=${literal(newInput.session.id)} AND a.action='lead.qa_suppressed';`)).toBe("1");
    input.lead.normalized_email = "conflict@example.test";
    expect(await adapter.captureLeadLifecycle(input)).toMatchObject({ ok: false, error: "idempotency_conflict" });
    expect(JSON.parse(counts())).toEqual(after);
  });

  it("ordinary capture remains unmarked; public spoofed QA/audit/consent input is rejected or normalized", async () => {
    const input = fixture(false);
    const result = await adapter.captureLeadLifecycle(input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("capture_failed");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE action='lead.qa_suppressed' AND resource_id=${literal(result.lead_id)};`)).toBe("0");
    expect(psql(`SELECT is_test,communication_suppressed FROM leads WHERE id=${literal(result.lead_id)};`)).toBe("f|f");
    expect(normalizeLeadPayload({ name: "SYNTHETIC", is_test: true, attribution: { medium: "qa" } }).is_test).toBe(false);
    expect(normalizeLeadPayload({ name: "INTERNAL QA — DO NOT CONTACT", actor: "forged", audit: "forged" }).is_test).toBe(true);
    const { POST } = await import("../../app/api/leads/route");
    for (const extra of [{ is_test: true }, { communication_suppressed: true }, { score: 100 }]) {
      const key = randomUUID(); const before = counts();
      const response = await POST(new Request("https://www.askmagicmike.com/api/leads", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.askmagicmike.com", "Idempotency-Key": key }, body: JSON.stringify({ funnel_type: "home_value", lead_source_surface: "home_value_page", name: "SYNTHETIC FIXTURE", address: "1 Synthetic QA Test Street", email: `${key}@example.test`, ...extra }) }));
      expect(response.status).toBe(400); expect(counts()).toBe(before);
    }
  });

  it("actual public consent normalization and Preview refusal do not grant client-owned authority", async () => {
    const { POST } = await import("../../app/api/leads/route");
    const { LEAD_CONSENT_LANGUAGE_TEXT } = await import("../../app/lib/leadConsent");
    const key = randomUUID();
    const body = { funnel_type: "home_value", lead_source_surface: "home_value_page", name: "SYNTHETIC FIXTURE", address: "1 Synthetic QA Test Street", email: `${key}@example.test`, consent_email: true, consent_sms: true, consent_language_text: "forged", actor: "forged", audit_action: "lead.qa_suppressed" };
    const makeRequest = () => new Request("https://www.askmagicmike.com/api/leads", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.askmagicmike.com", "Idempotency-Key": key }, body: JSON.stringify(body) });
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const result = await response.json();
    const capture = statements.filter((entry) => entry.sql.includes("capture_public_lead_v2(")).at(-1)!;
    expect(JSON.parse(String(capture.params[1]))).toMatchObject({ is_test: false, consent_sms: false, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT });
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(result.lead_id)} AND actor='forged';`)).toBe("0");
    const before = counts(); const calls = statements.length;
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("PREVIEW_DATA_MODE", "disabled");
    const refused = await POST(makeRequest()); expect(refused.status).toBe(503);
    expect(statements.length).toBe(calls); expect(counts()).toBe(before);
    vi.stubEnv("VERCEL_ENV", "development");
  });

  it.each(["audit", "assignment"])("forced %s failure rolls back all effects; retry commits once", async (stage) => {
    const input = fixture(); const before = counts(); const table = stage === "audit" ? "audit_logs" : "agent_assignments";
    psql(`CREATE FUNCTION synthetic_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_TABLE_NAME = 'audit_logs' THEN IF NEW.action='lead.qa_suppressed' THEN RAISE EXCEPTION 'synthetic required-stage failure'; END IF; ELSE RAISE EXCEPTION 'synthetic required-stage failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_failure BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION synthetic_fail();`);
    await expect(adapter.captureLeadLifecycle(input)).rejects.toThrow("neon_capture_failed");
    expect(counts()).toBe(before); expect(provider.send).not.toHaveBeenCalled();
    psql(`DROP TRIGGER synthetic_failure ON ${table}; DROP FUNCTION synthetic_fail();`);
    expect((await adapter.captureLeadLifecycle(input)).ok).toBe(true);
    expect((await adapter.captureLeadLifecycle(input)).idempotent_replay).toBe(true);
  });

  it("actual monitor accepts owned QA evidence and rejects missing evidence or any unsafe suppression flag", async () => {
    const monitor = new FirstLiveLeadMonitor(localQuery);
    expect((await monitor.run({ leadId: qaId })).queue).toEqual({ unsuppressedQa: 0, qaWithoutExplicitEvidence: 0 });
    // Immutable evidence cannot be deleted: a missing-evidence fixture uses old accepted v1 then restores P0.
    const old = fixture(); psql(acceptedFunction());
    const missing = JSON.parse(psql(`${captureSql(old)};`)); psql(repair);
    psql(`UPDATE leads SET is_test=true,communication_suppressed=true,email_suppressed=true,sms_suppressed=true WHERE id=${literal(missing.lead_id)};`);
    expect((await monitor.run({ leadId: qaId })).queue.qaWithoutExplicitEvidence).toBe(1);
    psql(`UPDATE source_attribution SET utm_source='internal_qa_fixture',utm_medium='qa' WHERE session_id=${literal(old.session.id)};`);
    for (const column of ["communication_suppressed", "email_suppressed", "sms_suppressed"]) {
      psql(`UPDATE leads SET ${column}=false WHERE id=${literal(qaId)};`);
      expect((await monitor.run({ leadId: qaId })).queue.unsuppressedQa).toBe(1);
      psql(`UPDATE leads SET ${column}=true WHERE id=${literal(qaId)};`);
    }
  });

  it("provider failure after commit leaves QA marker and one recoverable internal intent; no consumer purposes", async () => {
    const { enqueueLeadNotifications } = await import("../../app/lib/leadAlertService");
    const { scoreLead } = await import("../../app/lib/leadScoring"); const { routeLead } = await import("../../app/lib/leadRouting");
    const payload = normalizeLeadPayload({ name: "INTERNAL QA — DO NOT CONTACT", email: "qa@example.test", funnel_type: "home_value", consent_email: true, city: "Synthetic QA", attribution: { source: "ourtownproperties", medium: "owned_media" } });
    const score = scoreLead(payload);
    // Compatibility proof for repaired v1 (no v2 intent). The successor suite
    // exercises v2 and actual post-commit orchestration without unit-mode skips.
    const captured = await adapter.captureLeadLifecycle(fixture());
    if (!captured.ok) throw new Error("capture_failed");
    const notificationLeadId = captured.lead_id;
    const input = { leadId: notificationLeadId, sessionId: randomUUID(), correlationId: randomUUID(), payload, score, routing: routeLead(payload, score.score), submittedAt: new Date().toISOString() };
    const result = await enqueueLeadNotifications(input);
    expect(result.internal?.status).toBe("retry_scheduled"); expect(result.internal?.attempt_count).toBe(1);
    expect(result.consumer).toBeNull(); expect(result.sms).toEqual([]); expect(result.push).toEqual([]);
    expect(provider.send).toHaveBeenCalledTimes(1);
    await enqueueLeadNotifications(input); expect(provider.send).toHaveBeenCalledTimes(1);
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(notificationLeadId)} AND notification_type='lead_alert';`)).toBe("1");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(notificationLeadId)} AND action='lead.qa_suppressed';`)).toBe("1");
    for (const purpose of MESSAGE_PURPOSES.filter((value) => !["internal_alert", "qa_test"].includes(value))) {
      for (const channel of ["email", "sms", "push", "phone"] as const) expect(decideCommunicationPermission({ channel, purpose, isTest: true, suppressed: true, autoSendEnabled: true, humanApproved: true }).allowed).toBe(false);
    }
  });

  it("browser roles cannot execute capture or read/forge audit evidence", () => {
    for (const role of ["anon", "authenticated"]) {
      expect(() => psql(`SET ROLE ${role}; ${captureSql(fixture())};`)).toThrow();
      expect(() => psql(`SET ROLE ${role}; SELECT * FROM audit_logs;`)).toThrow();
      expect(() => psql(`SET ROLE ${role}; INSERT INTO audit_logs(actor,action,resource_type,resource_id) VALUES ('forged','lead.qa_suppressed','lead',${literal(qaId)});`)).toThrow();
    }
    expect(psql("SELECT prosecdef,proconfig::text FROM pg_proc WHERE oid='capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure;")).toBe('f|{"search_path=public, pg_temp"}');
  });

  it("existing ACC timeline consumes new audit with stable IDs, paging and redaction", async () => {
    const auditRows = await localQuery.query("SELECT * FROM audit_logs WHERE resource_id=$1::uuid", [qaId]);
    const marker = auditRows.find((row) => row.action === "lead.qa_suppressed")!;
    const timeline = { lead: { id: qaId, created_at: new Date().toISOString(), attribution_summary: "Owned traffic", lead_source_surface: "home_value_page" }, auditRows };
    const full = buildLeadTimelinePage(timeline, { limit: 100 });
    expect(full.events.find((event) => event.event_type === "lead.qa_suppressed")?.id).toBe(`audit:${marker.id}`);
    expect(new Set(full.events.map((event) => event.id)).size).toBe(full.events.length);
    const pages = Array.from({ length: full.events.length }, (_, offset) => buildLeadTimelinePage(timeline, { offset, limit: 1 }).events[0]?.id);
    expect(pages).toEqual(full.events.map((event) => event.id));
    expect(JSON.stringify(marker.metadata)).not.toContain("example.test");
    expect(psql(`SELECT count(*) FROM leads WHERE id=${literal(qaId)} AND is_test=false AND communication_suppressed=false;`)).toBe("0");
    const { loadNeonAdminLeadDetail } = await import("../../app/lib/persistence/neonAdminLeadView");
    const principal = { userId: "synthetic-operator", email: "operator@example.test", name: "SYNTHETIC OPERATOR", role: "administrator" as const, agentId: null };
    const detail = await loadNeonAdminLeadDetail(qaId, principal, { limit: 100 });
    expect(detail.error).toBeUndefined(); expect(detail.lead?.is_test).toBe(true);
    expect(detail.timeline.some((event) => event.id === `audit:${marker.id}`)).toBe(true);
    const denied = await loadNeonAdminLeadDetail(qaId, { ...principal, role: "approved_agent", agentId: randomUUID() });
    expect(denied.lead).toBeNull();
    const { loadNeonAdminReportingSummary } = await import("../../app/lib/persistence/neonAdminReportingView");
    const report = await loadNeonAdminReportingSummary(30, principal);
    expect(report.error).toBeUndefined(); expect(report.rows.some((row) => row.id === qaId)).toBe(false);
  });

  it("function-only rollback retains all rows and forward repair restores QA invariant", () => {
    const before = counts(); psql(acceptedFunction());
    expect(counts()).toBe(before);
    expect(psql("SELECT strpos(pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'lead.qa_suppressed')>0;")).toBe("f");
    psql(repair); expect(counts()).toBe(before);
    expect(psql("SELECT strpos(pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'lead.qa_suppressed')>0;")).toBe("t");
    console.info("QA audit migration receipt", { migration, sha256: createHash("sha256").update(repair).digest("hex"), baselineFunctionSha256: baselineHash, providerNetworkCalls: 0 });
  });

  it("PR #279 successor delegates to repaired v1 and cannot overwrite P0 in either migration order", () => {
    const successor = readFileSync("tests/fixtures/sql/pr279-atomic-delivery-intent.sql", "utf8");
    expect(successor).not.toMatch(/CREATE OR REPLACE FUNCTION public\.capture_public_lead_v1/);
    const definition = psql("SELECT pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure);");
    for (const order of ["successor_then_p0", "p0_then_successor"]) {
      if (order === "successor_then_p0") { psql(acceptedFunction()); psql(successor); psql(repair); }
      else { psql(repair); psql(successor); }
      expect(psql("SELECT pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure);")).toBe(definition);
      const input = fixture();
      const sql = bind("SELECT capture_public_lead_v2($1::jsonb,$2::jsonb,$3::jsonb,'disabled','{}'::jsonb)", [JSON.stringify(input.session), JSON.stringify(input.lead), JSON.stringify(input.attribution)]);
      const result = JSON.parse(psql(`SET ROLE service_role; ${sql};`));
      expect(result.ok).toBe(true); expect(result.capture_version).toBe("v2");
      const before = counts(); expect(JSON.parse(psql(`SET ROLE service_role; ${sql};`)).idempotent_replay).toBe(true);
      expect(counts()).toBe(before);
      expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(result.lead_id)} AND action='lead.qa_suppressed';`)).toBe("1");
      expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(result.lead_id)} AND notification_type='lead_alert';`)).toBe("1");
      expect(psql(`SELECT is_test,communication_suppressed,email_suppressed,sms_suppressed FROM leads WHERE id=${literal(result.lead_id)};`)).toBe("t|t|t|t");
    }
  });
});
