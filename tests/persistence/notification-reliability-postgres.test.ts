// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import type { NotificationProvider } from "../../app/lib/leadNotificationTypes";
import { bind, concurrent, install, literal, localQuery, psql, reliabilityMigration, startDatabase, statements, stopDatabase } from "../support/qa-audit-postgres";

vi.mock("@neondatabase/serverless", async () => { const local = await import("../support/qa-audit-postgres"); return { neon: () => local.localQuery }; });
vi.mock("../../src/lib/security/rate-limit", async (original) => ({ ...await original<object>(), checkRateLimit: vi.fn(async () => ({ allowed: true, durable: true, remaining: 50, resetAt: Date.now() + 60_000 })) }));
vi.mock("../../app/lib/serverAnalytics", () => ({ recordServerAnalyticsEvent: vi.fn(async () => undefined) }));
vi.mock("../../app/lib/growth/lead-experiment-conversion", () => ({ recordLeadExperimentConversion: vi.fn(async () => ({ attempted: false })) }));
vi.mock("../../src/lib/operations/first-live-lead-monitor", async (original) => ({ ...await original<object>(), createFirstLiveLeadMonitor: () => null }));
const provider = vi.hoisted(() => ({ send: vi.fn<NotificationProvider["send"]>() }));
vi.mock("../../app/lib/leadNotificationProvider", async (original) => ({ ...await original<object>(), selectNotificationProvider: () => ({ name: "isolated", send: provider.send }) }));

const source = readFileSync(`supabase/migrations/${reliabilityMigration}`, "utf8");
const webhookSecret = `whsec_${Buffer.from("synthetic-isolated-webhook-only").toString("base64")}`;
type CaptureInput = { session: Record<string, unknown>; lead: Record<string, unknown>; attribution: Record<string, unknown>; notificationMode: string; internalNotification: Record<string, unknown> };
let templateInput: CaptureInput;
let qaId: string;
let ordinaryId: string;
function tableCounts() {
  return psql("SELECT jsonb_build_object('leads',(SELECT count(*) FROM leads),'contacts',(SELECT count(*) FROM contacts),'sessions',(SELECT count(*) FROM sessions),'attribution',(SELECT count(*) FROM source_attribution),'consents',(SELECT count(*) FROM consents),'audits',(SELECT count(*) FROM audit_logs),'assignments',(SELECT count(*) FROM agent_assignments),'outbox',(SELECT count(*) FROM lead_notifications),'receipts',(SELECT count(*) FROM provider_webhook_events),'communications',(SELECT count(*) FROM communication_events));");
}
function cloneInput(qa = true): CaptureInput {
  const key = randomUUID(); const input = structuredClone(templateInput);
  input.session.id = key;
  Object.assign(input.lead, { request_idempotency_key: key, email: `${key}@example.test`, normalized_email: `${key}@example.test`, is_test: qa, communication_suppressed: qa, email_suppressed: qa, sms_suppressed: qa });
  return input;
}
function captureSql(input: CaptureInput, version = "v2") {
  return bind(`SELECT capture_public_lead_${version}($1::jsonb,$2::jsonb,$3::jsonb,$4::text${version === "v2" ? ",$5::jsonb" : ""})`, [JSON.stringify(input.session), JSON.stringify(input.lead), JSON.stringify(input.attribution), input.notificationMode, JSON.stringify(input.internalNotification)]);
}
async function submit(qa = true, key: string = randomUUID()) {
  const { POST } = await import("../../app/api/leads/route");
  const { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } = await import("../../app/lib/leadConsent");
  const body = { funnel_type: "home_value", lead_source_surface: "home_value_page", name: qa ? "INTERNAL QA — DO NOT CONTACT" : "SYNTHETIC FIXTURE — NOT A CONSUMER", email: `${key}@example.test`, address: "1 Synthetic QA Test Street", city: "Synthetic QA", timeline: "0-3 months", consent: true, consent_email: true, consent_sms: false, consent_call: false, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, idempotency_key: key, attribution: { source: "ourtownproperties", medium: "owned_media", campaign: "amm_owned_demand_2026", content: "wordpress_home_value_page", landing_page: "https://www.askmagicmike.com/home-value", first_touch: { source: "ourtownproperties", medium: "owned_media" }, last_touch: { source: "ourtownproperties", medium: "owned_media" }, gclid: "SYNTHETIC_ONLY" }, page_url: "https://www.askmagicmike.com/home-value" };
  const response = await POST(new Request("https://www.askmagicmike.com/api/leads", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://www.askmagicmike.com", Referer: "https://www.ourtownproperties.com/how-much-is-your-home-worth/", "Idempotency-Key": key }, body: JSON.stringify(body) }));
  return { response, result: await response.json(), key };
}
function eventRequest(message: string, type: string, when: string, id = `synthetic_${randomUUID()}`, valid = true) {
  const raw = JSON.stringify({ type: `email.${type}`, created_at: when, data: { email_id: message } });
  const timestamp = new Date();
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/email/events", { method: "POST", headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)), "svix-signature": valid ? new Webhook(webhookSecret).sign(id, timestamp, raw) : "v1,invalid" }, body: raw });
}
async function callbackFixture() {
  const input = cloneInput(false);
  const lead = JSON.parse(psql(`${captureSql(input)};`));
  const message = `synthetic_${randomUUID()}`;
  psql(`UPDATE lead_notifications SET status='sent',attempt_count=1,provider='resend',provider_message_id=${literal(message)} WHERE id=${literal(lead.notification_id)};`);
  return { ...lead, message };
}

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("PR279 successor: real PostgreSQL and actual no-send orchestration", () => {
  beforeAll(async () => {
    await startDatabase(); install("amm_qa_upgrade", true);
    vi.stubEnv("NODE_ENV", "development"); // Deliberately NOT test: exercise post-commit branch.
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "operator@example.test");
    vi.stubEnv("LEAD_NOTIFICATION_BCC", "audit@example.test");
    vi.stubEnv("CONSUMER_ACKNOWLEDGMENT_ENABLED", "false");
    vi.stubEnv("AGENT_SMS_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("AGENT_PUSH_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("RESEND_WEBHOOK_ENABLED", "true"); vi.stubEnv("RESEND_WEBHOOK_SECRET", webhookSecret);
    vi.stubEnv("ADMIN_SECRET", "synthetic-isolated-admin"); vi.stubEnv("CRON_SECRET", "synthetic-isolated-cron");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("external_network_forbidden"); }));
  }, 120_000);
  beforeEach(() => {
    provider.send.mockReset();
    provider.send.mockImplementation(async (request) => {
      // A separate connection can see every required effect before send.
      expect(psql(`SELECT count(*) FROM lead_notifications n JOIN leads l ON l.id=n.lead_id WHERE n.id=${literal(request.notificationId)} AND n.status='processing' AND (SELECT count(*) FROM consents c WHERE c.lead_id=l.id)=3;`)).toBe("1");
      return { ok: false, provider: "isolated", retryable: true, errorCode: "synthetic_provider_failure", errorSummary: "Synthetic unavailable provider" };
    });
  });
  afterAll(() => { stopDatabase(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }, 20_000);

  it("actual root handler preserves repaired QA, enrichment/consent/UTMs and dispatches the one permitted internal intent AFTER commit", async () => {
    const { response, result } = await submit();
    expect(response.status, JSON.stringify(result)).toBe(200); qaId = result.lead_id;
    const captured = statements.filter((entry) => entry.sql.includes("capture_public_lead_v2(")).at(-1)!;
    templateInput = { session: JSON.parse(String(captured.params[0])), lead: JSON.parse(String(captured.params[1])), attribution: JSON.parse(String(captured.params[2])), notificationMode: String(captured.params[3]), internalNotification: JSON.parse(String(captured.params[4])) };
    expect(psql(`SELECT is_test,communication_suppressed,email_suppressed,sms_suppressed FROM leads WHERE id=${literal(qaId)};`)).toBe("t|t|t|t");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(qaId)} AND action='lead.qa_suppressed' AND actor='system/public_lead_capture';`)).toBe("1");
    expect(psql(`SELECT utm_source,utm_medium,utm_campaign,utm_content FROM source_attribution WHERE lead_id=${literal(qaId)};`)).toBe("ourtownproperties|owned_media|amm_owned_demand_2026|wordpress_home_value_page");
    expect(psql(`SELECT count(*) FROM consents WHERE lead_id=${literal(qaId)} AND language_text IS NOT NULL;`)).toBe("3");
    expect(psql(`SELECT first_touch IS NOT NULL,last_touch IS NOT NULL,click_ids->>'gclid' FROM source_attribution WHERE lead_id=${literal(qaId)};`)).toBe("t|t|SYNTHETIC_ONLY");
    expect(psql(`SELECT assignment_status, score=(${literal(String(templateInput.lead.score))})::int FROM leads WHERE id=${literal(qaId)};`)).toBe("assigned|t");
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(provider.send.mock.calls[0][0].subject).toMatch(/^\[TEST\]/);
    expect(provider.send.mock.calls[0][0].bcc).toEqual(["audit@example.test"]);
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(qaId)} AND notification_type='lead_alert' AND channel='email';`)).toBe("1");
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(qaId)} AND (notification_type='consumer_ack' OR channel IN ('sms','push'));`)).toBe("0");
    const { FirstLiveLeadMonitor } = await import("../../src/lib/operations/first-live-lead-monitor");
    expect((await new FirstLiveLeadMonitor(localQuery).run({ leadId: qaId })).queue).toMatchObject({ unsuppressedQa: 0, qaWithoutExplicitEvidence: 0 });
  });

  it("ordinary actual orchestration has one internal intent and keeps provider failure recoverable", async () => {
    const { response, result } = await submit(false);
    expect(response.status).toBe(200); ordinaryId = result.lead_id;
    expect(psql(`SELECT is_test,communication_suppressed FROM leads WHERE id=${literal(ordinaryId)};`)).toBe("f|f");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE action='lead.qa_suppressed' AND resource_id=${literal(ordinaryId)};`)).toBe("0");
    expect(psql(`SELECT status,attempt_count,provider_message_id IS NULL FROM lead_notifications WHERE lead_id=${literal(ordinaryId)} AND notification_type='lead_alert';`)).toBe("retry_scheduled|1|t");
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it.each(["audit", "enrichment", "attribution", "consent", "outbox"])("required %s failure rolls back actual handler capture and dispatches nothing", async (stage) => {
    const tables: Record<string, string> = { audit: "audit_logs", enrichment: "leads", attribution: "source_attribution", consent: "consents", outbox: "lead_notifications" };
    const table = tables[stage]; const operation = ["enrichment", "attribution"].includes(stage) ? "UPDATE" : "INSERT";
    const predicate = stage === "audit" ? "NEW.action='lead.qa_suppressed'" : stage === "outbox" ? "NEW.notification_type='lead_alert'" : "true";
    psql(`CREATE FUNCTION synthetic_required_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${predicate} THEN RAISE EXCEPTION 'synthetic required-stage failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_failure BEFORE ${operation} ON ${table} FOR EACH ROW EXECUTE FUNCTION synthetic_required_failure();`);
    const before = tableCounts();
    try { const result = await submit(); expect(result.response.status).toBe(500); expect(tableCounts()).toBe(before); expect(provider.send).not.toHaveBeenCalled(); }
    finally { psql(`DROP TRIGGER synthetic_failure ON ${table}; DROP FUNCTION synthetic_required_failure();`); }
  });

  it("sequential/concurrent exact replay, conflicting payload, pre-cutover capture and template changes have no duplicate or retroactive effects", async () => {
    const input = cloneInput(); const first = JSON.parse(psql(`${captureSql(input)};`));
    const before = tableCounts();
    expect(JSON.parse(psql(`${captureSql(input)};`)).idempotent_replay).toBe(true);
    const replies = await Promise.all(Array.from({ length: 5 }, () => concurrent(`SET ROLE service_role; ${captureSql(input)};`)));
    expect(replies.map((reply) => JSON.parse(reply).lead_id)).toEqual(Array(5).fill(first.lead_id)); expect(tableCounts()).toBe(before);
    input.internalNotification.template_version = "synthetic_future_template";
    expect(JSON.parse(psql(`${captureSql(input)};`)).notification_id).toBe(first.notification_id); expect(tableCounts()).toBe(before);
    const conflict = structuredClone(input); conflict.lead.normalized_email = "conflict@example.test";
    expect(JSON.parse(psql(`${captureSql(conflict)};`))).toMatchObject({ ok: false, error: "idempotency_conflict" }); expect(tableCounts()).toBe(before);
    const fresh = cloneInput(); const raced = await Promise.all(Array.from({ length: 5 }, () => concurrent(`SET ROLE service_role; ${captureSql(fresh)};`)));
    expect(raced.filter((reply) => !JSON.parse(reply).idempotent_replay)).toHaveLength(1);
    const racedLead = JSON.parse(raced[0]).lead_id;
    expect(psql(`SELECT (SELECT count(*) FROM audit_logs WHERE resource_id=${literal(racedLead)} AND action='lead.qa_suppressed'),(SELECT count(*) FROM agent_assignments WHERE lead_id=${literal(racedLead)}),(SELECT count(*) FROM consents WHERE lead_id=${literal(racedLead)}),(SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(racedLead)} AND notification_type='lead_alert');`)).toBe("1|1|3|1");
    const preCutover = cloneInput(); JSON.parse(psql(`${captureSql(preCutover, "v1")};`)); const legacy = tableCounts();
    expect(JSON.parse(psql(`${captureSql(preCutover)};`))).toMatchObject({ idempotent_replay: true, notification_id: null }); expect(tableCounts()).toBe(legacy);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("actual handler replay skips post-commit sends; accepted provider/local-write ambiguity remains processing and is not retryable", async () => {
    provider.send.mockImplementation(async () => ({ ok: true, provider: "isolated", providerMessageId: `synthetic_${randomUUID()}` }));
    psql("CREATE FUNCTION synthetic_accept_write_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='sent' THEN RAISE EXCEPTION 'synthetic acceptance storage failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_failure BEFORE UPDATE ON lead_notifications FOR EACH ROW EXECUTE FUNCTION synthetic_accept_write_failure();");
    let key = ""; let id = "";
    try { const result = await submit(false); key = result.key; id = result.result.lead_id; expect(result.response.status).toBe(200); expect(provider.send).toHaveBeenCalledTimes(1); }
    finally { psql("DROP TRIGGER synthetic_failure ON lead_notifications; DROP FUNCTION synthetic_accept_write_failure();"); }
    const before = tableCounts(); const replay = await submit(false, key); expect(replay.response.headers.get("x-amm-idempotent-replay")).toBe("1"); expect(tableCounts()).toBe(before); expect(provider.send).toHaveBeenCalledTimes(1);
    expect(psql(`SELECT status,attempt_count FROM lead_notifications WHERE lead_id=${literal(id)} AND notification_type='lead_alert';`)).toBe("processing|1");
    const { NeonLeadNotificationRepository } = await import("../../app/lib/persistence/neonLeadNotificationRepository");
    expect((await new NeonLeadNotificationRepository(localQuery as never).listRetryable()).some((row) => row.lead_id === id)).toBe(false);
  });

  it("one requested readable QA copy preserves the original sent receipt and concurrent repeats cannot send twice", async () => {
    const { result } = await submit();
    // The public handler returns the lead identity; recover its one original intent.
    const originalId = psql(`SELECT id FROM lead_notifications WHERE lead_id=${literal(result.lead_id)} AND notification_type='lead_alert' LIMIT 1;`);
    psql(`UPDATE lead_notifications SET template_version='lead_alert_email_v3',status='sent',provider_message_id='synthetic_original_receipt' WHERE id=${literal(originalId)};`);
    const original = psql(`SELECT row_to_json(n) FROM lead_notifications n WHERE id=${literal(originalId)};`);
    const leadsBefore = psql("SELECT jsonb_build_array((SELECT count(*) FROM leads),(SELECT count(*) FROM contacts),(SELECT count(*) FROM consents),(SELECT count(*) FROM agent_assignments));");
    provider.send.mockReset(); provider.send.mockImplementation(async request => {
      expect(request.channel).toBe("email"); expect(request.recipient).toBe("operator@example.test"); expect(request.bcc).toEqual(["audit@example.test"]);
      expect(request.text).toContain("QA TEST — DO NOT CONTACT"); expect(request.text).not.toContain("First touch:");
      expect(psql(`SELECT status FROM lead_notifications WHERE id=${literal(request.notificationId)};`)).toBe("processing");
      return {ok:true,provider:"isolated",providerMessageId:"synthetic_review_receipt"};
    });
    const { sendOwnerRequestedQaReviewCopy } = await import("../../app/lib/leadAlertService");
    await Promise.all(Array.from({length:5},()=>sendOwnerRequestedQaReviewCopy(originalId)));
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect((await sendOwnerRequestedQaReviewCopy(originalId)).ok).toBe(true); expect(provider.send).toHaveBeenCalledTimes(1);
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE metadata->>'review_copy_of'=${literal(originalId)} AND template_version='lead_alert_email_v4' AND status='sent' AND max_attempts=1;`)).toBe("1");
    expect(psql(`SELECT row_to_json(n) FROM lead_notifications n WHERE id=${literal(originalId)};`)).toBe(original);
    expect(psql("SELECT jsonb_build_array((SELECT count(*) FROM leads),(SELECT count(*) FROM contacts),(SELECT count(*) FROM consents),(SELECT count(*) FROM agent_assignments));")).toBe(leadsBefore);
  });

  it("requested QA copy fails closed on live records and Preview; failed copy is not silently resent", async () => {
    const { sendOwnerRequestedQaReviewCopy } = await import("../../app/lib/leadAlertService");
    const { result } = await submit();
    const originalId=psql(`SELECT id FROM lead_notifications WHERE lead_id=${literal(result.lead_id)} AND notification_type='lead_alert' LIMIT 1;`);
    psql(`UPDATE lead_notifications SET template_version='lead_alert_email_v3',status='sent',provider_message_id='synthetic_original_receipt' WHERE id=${literal(originalId)};`);
    provider.send.mockReset();
    vi.stubEnv("VERCEL_ENV","preview");
    try { expect((await sendOwnerRequestedQaReviewCopy(originalId)).error).toBe("qa_review_delivery_not_ready"); }
    finally { vi.stubEnv("VERCEL_ENV","development"); }
    psql(`UPDATE leads SET is_test=false WHERE id=${literal(result.lead_id)};`);
    expect((await sendOwnerRequestedQaReviewCopy(originalId)).error).toBe("qa_review_requires_suppressed_test"); expect(provider.send).not.toHaveBeenCalled();
    psql(`UPDATE leads SET is_test=true WHERE id=${literal(result.lead_id)};`);
    provider.send.mockResolvedValue({ok:false,provider:"isolated",retryable:true,errorCode:"synthetic_failure",errorSummary:"Synthetic provider failure"});
    expect((await sendOwnerRequestedQaReviewCopy(originalId)).notification?.status).toBe("permanently_failed");
    const before=tableCounts();
    expect((await sendOwnerRequestedQaReviewCopy(originalId)).ok).toBe(false);
    expect(provider.send).toHaveBeenCalledTimes(1); expect(tableCounts()).toBe(before);
  });

  it("actual signed callbacks are atomic, duplicate-safe, ordered, conflict-safe and conservatively suppress bounce", async () => {
    const { POST } = await import("../../app/api/webhooks/email/events/route"); const fixture = await callbackFixture();
    const now = Date.now(); const old = new Date(now - 60_000).toISOString(); const current = new Date(now).toISOString(); const later = new Date(now + 60_000).toISOString(); const id = `synthetic_${randomUUID()}`;
    expect((await POST(eventRequest(fixture.message, "delivered", current, id))).status).toBe(200);
    const before = tableCounts(); const duplicate = await POST(eventRequest(fixture.message, "delivered", current, id)); expect((await duplicate.json()).duplicate).toBe(true); expect(tableCounts()).toBe(before);
    expect((await POST(eventRequest(fixture.message, "sent", old))).status).toBe(200);
    expect(psql(`SELECT metadata->>'provider_last_event' FROM lead_notifications WHERE id=${literal(fixture.notification_id)};`)).toBe("delivered");
    expect((await POST(eventRequest(fixture.message, "bounced", later))).status).toBe(200);
    expect(psql(`SELECT email_suppressed FROM leads WHERE id=${literal(fixture.lead_id)};`)).toBe("t");
    expect((await POST(eventRequest(fixture.message, "failed", new Date(now + 90_000).toISOString()))).status).toBe(200);
    expect((await POST(eventRequest(fixture.message, "delivered", new Date(now + 120_000).toISOString()))).status).toBe(200);
    expect(psql(`SELECT status,error_code FROM lead_notifications WHERE id=${literal(fixture.notification_id)};`)).toBe("permanently_failed|resend_bounced");
    expect(psql(`SELECT email_suppressed FROM leads WHERE id=${literal(fixture.lead_id)};`)).toBe("t");
    const invalidBefore = tableCounts(); expect((await POST(eventRequest(fixture.message, "delivered", current, undefined, false))).status).toBe(400); expect(tableCounts()).toBe(invalidBefore);
    const collision = await POST(eventRequest(fixture.message, "opened", later, id)); expect(collision.status).toBe(409); expect(tableCounts()).toBe(invalidBefore);
  });

  it("callback downstream failure rolls back receipt; same-payload retry and failed-then-delivered recovery clear transient failure only", async () => {
    const { POST } = await import("../../app/api/webhooks/email/events/route"); const fixture = await callbackFixture(); const when = new Date().toISOString(); const id = `synthetic_${randomUUID()}`;
    psql("CREATE FUNCTION synthetic_callback_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic communication failure'; END $$; CREATE TRIGGER synthetic_failure BEFORE INSERT ON communication_events FOR EACH ROW EXECUTE FUNCTION synthetic_callback_failure();");
    const before = tableCounts();
    try { expect((await POST(eventRequest(fixture.message, "failed", when, id))).status).toBe(503); expect(tableCounts()).toBe(before); }
    finally { psql("DROP TRIGGER synthetic_failure ON communication_events; DROP FUNCTION synthetic_callback_failure();"); }
    expect((await POST(eventRequest(fixture.message, "failed", when, id))).status).toBe(200);
    expect((await POST(eventRequest(fixture.message, "delivered", new Date(Date.now() + 60_000).toISOString()))).status).toBe(200);
    expect(psql(`SELECT status,error_code IS NULL,error_summary IS NULL,failed_at IS NULL,next_attempt_at IS NULL,metadata->>'provider_terminal_failure' FROM lead_notifications WHERE id=${literal(fixture.notification_id)};`)).toBe("sent|t|t|t|t|false");
    // A legacy failed receipt ID cannot be overwritten with a different body.
    const failedId = `synthetic_${randomUUID()}`;
    psql(`INSERT INTO provider_webhook_events(provider,provider_event_id,event_type,signature_verified,processing_status,payload_hash) VALUES ('resend',${literal(failedId)},'sent',true,'failed','synthetic_previous_hash');`);
    const collisionBefore = tableCounts(); expect((await POST(eventRequest(fixture.message, "sent", when, failedId))).status).toBe(409); expect(tableCounts()).toBe(collisionBefore);
    // A failed receipt with the SAME payload can be reclaimed; history remains one event.
    psql(`UPDATE provider_webhook_events SET processing_status='failed' WHERE provider_event_id=${literal(id)};`);
    expect((await POST(eventRequest(fixture.message, "failed", when, id))).status).toBe(200);
    expect(psql(`SELECT count(*) FROM communication_events WHERE provider_event_id=${literal(id)};`)).toBe("1");
  });

  it("concurrent callback SQL serializes one receipt and prevents timestamp regression", async () => {
    const { POST } = await import("../../app/api/webhooks/email/events/route"); const fixture = await callbackFixture(); const when = new Date().toISOString();
    expect((await POST(eventRequest(fixture.message, "delivered", when))).status).toBe(200);
    const statement = statements.filter((entry) => entry.sql.includes("WITH notification_candidate AS MATERIALIZED")).at(-1)!;
    const id = `synthetic_${randomUUID()}`; const params = [...statement.params]; params[0] = id;
    const command = `SET ROLE service_role; ${bind(statement.sql, params)};`;
    await Promise.all(Array.from({ length: 5 }, () => concurrent(command)));
    expect(psql(`SELECT count(*) FROM provider_webhook_events WHERE provider_event_id=${literal(id)};`)).toBe("1");
    expect(psql(`SELECT count(*) FROM communication_events WHERE provider_event_id=${literal(id)};`)).toBe("1");
    const newest = new Date(Date.now() + 120_000).toISOString(); const stale = new Date(Date.now() - 120_000).toISOString();
    const variants = [newest, stale].map((at) => { const values = [...params]; values[0] = `synthetic_${randomUUID()}`; values[4] = at; values[8] = JSON.stringify({ provider_last_event: "delivered", provider_last_event_at: at, provider_delivery_confirmed: true }); return `SET ROLE service_role; ${bind(statement.sql, values)};`; });
    await Promise.all(variants.map(concurrent));
    expect(psql(`SELECT metadata->>'provider_last_event_at' FROM lead_notifications WHERE id=${literal(fixture.notification_id)};`)).toBe(newest);
  });

  it("safe stale eligibility and five concurrent claims exclude QA, holds, exhausted, permanent and ambiguous rows", async () => {
    const { NeonLeadNotificationRepository } = await import("../../app/lib/persistence/neonLeadNotificationRepository"); const repo = new NeonLeadNotificationRepository(localQuery as never);
    const ids: Record<string, string> = {};
    for (const state of ["pending", "claimed_pending", "processing", "permanent", "provider_id", "exhausted", "held"]) {
      const lead = JSON.parse(psql(`${captureSql(cloneInput(false))};`)); ids[state] = lead.notification_id;
      psql(`UPDATE lead_notifications SET created_at=now()-interval '20 minutes',updated_at=now()-interval '20 minutes' WHERE id=${literal(lead.notification_id)};`);
      if (state === "claimed_pending") psql(`UPDATE lead_notifications SET attempt_count=1 WHERE id=${literal(lead.notification_id)};`);
      if (state === "processing") psql(`UPDATE lead_notifications SET status='processing',attempt_count=1 WHERE id=${literal(lead.notification_id)};`);
      if (state === "permanent") psql(`UPDATE lead_notifications SET status='permanently_failed' WHERE id=${literal(lead.notification_id)};`);
      if (state === "provider_id") psql(`UPDATE lead_notifications SET provider_message_id='synthetic_accepted' WHERE id=${literal(lead.notification_id)};`);
      if (state === "exhausted") psql(`UPDATE lead_notifications SET attempt_count=max_attempts WHERE id=${literal(lead.notification_id)};`);
      if (state === "held") psql(`UPDATE leads SET communication_suppressed=true WHERE id=${literal(lead.lead_id)};`);
    }
    const eligible = await repo.listRetryable(50); expect(eligible.map((row) => row.id)).toContain(ids.pending);
    for (const state of Object.keys(ids).filter((value) => value !== "pending")) expect(eligible.map((row) => row.id)).not.toContain(ids[state]);
    expect(eligible.some((row) => row.lead_id === qaId)).toBe(false);
    await repo.claimForProcessing(ids.pending, { status: "processing", attempt_count: 1 });
    const claim = statements.at(-1)!; // Claim's actual production SQL, not a test approximation.
    psql(`UPDATE lead_notifications SET status='pending',attempt_count=0 WHERE id=${literal(ids.pending)};`);
    const claims = await Promise.all(Array.from({ length: 5 }, () => concurrent(`SET ROLE service_role; WITH claimed AS (${bind(claim.sql, claim.params)}) SELECT count(*) FROM claimed;`)));
    expect(claims.filter((value) => value === "1")).toHaveLength(1);
    expect(psql(`SELECT status,attempt_count FROM lead_notifications WHERE id=${literal(ids.pending)};`)).toBe("processing|1");
    expect((await repo.listRetryable(1)).length).toBeLessThanOrEqual(1); expect(provider.send).not.toHaveBeenCalled();
  });

  it("administrator GET is read-only; cron GET is held; unauthenticated and Preview processing fail before writes or providers", async () => {
    const { GET, POST } = await import("../../app/api/admin/notifications/retry/route"); const before = tableCounts(); const queries = statements.length;
    const request = (method: string, headers: Record<string, string> = {}) => new NextRequest("https://www.askmagicmike.com/api/admin/notifications/retry", { method, headers });
    expect((await GET(request("GET", { "x-admin-secret": "synthetic-isolated-admin" }))).status).toBe(200);
    expect((await GET(request("GET", { authorization: "Bearer synthetic-isolated-cron" }))).status).toBe(409);
    expect((await POST(request("POST"))).status).toBe(401); expect((await POST(request("POST", { authorization: "Bearer synthetic-isolated-cron" }))).status).toBe(401);
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("PREVIEW_DATA_MODE", "disabled");
    try { expect((await POST(request("POST", { "x-admin-secret": "synthetic-isolated-admin" }))).status).toBe(503); expect((await submit()).response.status).toBe(503); }
    finally { vi.stubEnv("VERCEL_ENV", "development"); }
    expect(statements.length).toBe(queries); expect(tableCounts()).toBe(before); expect(provider.send).not.toHaveBeenCalled();
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("LEAD_NOTIFICATION_PRODUCTION_ENABLED", "false");
    try { expect((await POST(request("POST", { "x-admin-secret": "synthetic-isolated-admin" }))).status).toBe(503); expect(tableCounts()).toBe(before); }
    finally { vi.stubEnv("VERCEL_ENV", "development"); }
  });

  it("authorized bounded manual processing uses the actual worker and honors later suppression", async () => {
    const { POST } = await import("../../app/api/admin/notifications/retry/route"); const input = cloneInput(false);
    const pending = JSON.parse(psql(`${captureSql(input)};`));
    psql(`UPDATE lead_notifications SET created_at=now()-interval '30 minutes' WHERE id=${literal(pending.notification_id)};`);
    const result = await POST(new NextRequest("https://www.askmagicmike.com/api/admin/notifications/retry", { method: "POST", headers: { "x-admin-secret": "synthetic-isolated-admin", "content-type": "application/json" }, body: JSON.stringify({ limit: 1 }) }));
    expect(result.status).toBe(200); expect((await result.json()).processed).toBe(1); expect(provider.send).toHaveBeenCalledTimes(1);
    const { retryLeadAlertNotification } = await import("../../app/lib/leadAlertService");
    psql(`UPDATE leads SET communication_suppressed=true WHERE id=${literal(pending.lead_id)}; UPDATE lead_notifications SET next_attempt_at=now()-interval '1 minute' WHERE id=${literal(pending.notification_id)};`);
    expect((await retryLeadAlertNotification(pending.notification_id))?.status).toBe("skipped"); expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it("actual Today/timeline/reporting reads preserve assigned-only scope, QA exclusion, pagination and all supported roles", async () => {
    const { loadNeonAdminTodayQueue } = await import("../../app/lib/persistence/neonAdminTodayView");
    const { loadNeonAdminLeadDetail } = await import("../../app/lib/persistence/neonAdminLeadView");
    const { loadNeonAdminLeadInbox } = await import("../../app/lib/persistence/neonAdminLeadView");
    const { loadNeonAdminReportingSummary } = await import("../../app/lib/persistence/neonAdminReportingView");
    const agent = psql(`SELECT assigned_agent_id FROM leads WHERE id=${literal(ordinaryId)};`);
    const principal = { userId: "synthetic-operator", email: "operator@example.test", name: "SYNTHETIC OPERATOR", role: "administrator" as const, agentId: null };
    for (const role of ["administrator", "primary_lead_owner", "approved_agent", "read_only_analyst"] as const) {
      const scoped = { ...principal, role, agentId: agent };
      if (role === "read_only_analyst") {
        // Even an analyst supplied with an agentId must not acquire a private
        // projection through a lower-level repository call. Deny before SQL.
        const beforeDenied = statements.length;
        expect(await loadNeonAdminTodayQueue(scoped)).toMatchObject({ error: "lead_center_lead_permission_required", items: [] });
        expect(await loadNeonAdminLeadDetail(ordinaryId, scoped)).toMatchObject({ error: "lead_center_lead_permission_required", lead: null, timeline: [] });
        expect(await loadNeonAdminLeadInbox(50, scoped)).toMatchObject({ error: "lead_center_lead_permission_required", leads: [] });
        expect(statements.length).toBe(beforeDenied);
        const report = await loadNeonAdminReportingSummary(30, scoped);
        expect(report.error).toBeUndefined(); expect(report.rows).toEqual([]);
        expect(JSON.stringify(report)).not.toContain(ordinaryId);
        continue;
      }
      const today = await loadNeonAdminTodayQueue(scoped); expect(today.error).toBeUndefined(); expect(today.items.some((row) => row.leadId === qaId)).toBe(false);
      const detail = await loadNeonAdminLeadDetail(ordinaryId, scoped, { offset: 0, limit: 1 }); expect(detail.error).toBeUndefined(); expect(detail.lead?.id).toBe(ordinaryId);
      const report = await loadNeonAdminReportingSummary(30, scoped);
      if (role === "approved_agent") {
        expect(report.error).toBe("lead_center_report_permission_required"); expect(report.rows).toEqual([]);
      } else {
        expect(report.error).toBeUndefined(); expect(report.rows.some((row) => row.id === qaId)).toBe(false);
      }
    }
    const denied = await loadNeonAdminLeadDetail(ordinaryId, { ...principal, role: "approved_agent", agentId: randomUUID() }); expect(denied.lead).toBeNull();
    expect(JSON.stringify((await loadNeonAdminLeadDetail(qaId, principal, { limit: 100 })).timeline)).not.toContain(webhookSecret);
  }, 30_000);

  it("fresh/upgrade, conditional Neon roles, server-only ACL, v1 compatibility and function-only rollback preserve repaired invariant/history", () => {
    install("amm_qa_fresh", true);
    const v1Hash = "SELECT encode(sha256(convert_to(pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'UTF8')),'hex');";
    expect(psql(v1Hash)).toBe("df6ff62de38467617eaf2c0e8a39f0d7cbdb527d0066ae370587b3003fa78130"); expect(psql(v1Hash, "amm_qa_fresh")).toBe(psql(v1Hash));
    psql("ALTER ROLE anon RENAME TO synthetic_anon; ALTER ROLE authenticated RENAME TO synthetic_authenticated;");
    try { psql(source); } finally { psql("ALTER ROLE synthetic_anon RENAME TO anon; ALTER ROLE synthetic_authenticated RENAME TO authenticated;"); }
    expect(psql("SELECT has_function_privilege('anon','capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)','EXECUTE'),has_function_privilege('authenticated','capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)','EXECUTE'),has_function_privilege('service_role','capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)','EXECUTE');")).toBe("f|f|t");
    const before = tableCounts(); psql("DROP FUNCTION capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb);"); expect(tableCounts()).toBe(before); expect(psql(v1Hash)).toBe("df6ff62de38467617eaf2c0e8a39f0d7cbdb527d0066ae370587b3003fa78130");
    const compatible = JSON.parse(psql(`${captureSql(cloneInput(), "v1")};`)); expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(compatible.lead_id)} AND action='lead.qa_suppressed';`)).toBe("1");
    const retained = tableCounts(); psql(source); expect(tableCounts()).toBe(retained);
    console.info("Isolated reliability receipt", { migration: reliabilityMigration, migrationSourceSha256: createHash("sha256").update(source).digest("hex"), externalProviderCalls: 0, productionWrites: 0 });
  });
});
