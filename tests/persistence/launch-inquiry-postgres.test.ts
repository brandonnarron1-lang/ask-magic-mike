// @vitest-environment node
// Opt-in isolated PG: actual root HTTP capture/SQL, signed callback and claims.
// Neon transport is bound to the owned local harness; provider I/O is mocked.
// Not Production delivery, a built browser, or Neon PG18 compatibility proof.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bind, concurrent, install, launchIntakeMigration, literal, psql, startDatabase, statements, stopDatabase } from "../support/qa-audit-postgres";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../app/lib/leadConsent";
import { normalizeLeadNotificationRow } from "../../app/lib/persistence/supabase/leadNotificationRepository";
import { LAUNCH_LEAD_ALERT_TEMPLATE_VERSION } from "../../app/lib/leadAlertLaunch";
import { queryGrowthPlacementDelivery } from "../../app/lib/persistence/neonGrowthIntelligenceView";
vi.mock("@neondatabase/serverless", async () => { const local = await import("../support/qa-audit-postgres"); return { neon: () => local.localQuery }; });
vi.mock("../../src/lib/security/rate-limit", async original => ({ ...await original<object>(), checkRateLimit: vi.fn(async () => ({ allowed: true, durable: true, remaining: 50, resetAt: Date.now() + 60000 })) }));
vi.mock("../../app/lib/serverAnalytics", () => ({ recordServerAnalyticsEvent: vi.fn(async () => undefined) }));
vi.mock("../../app/lib/growth/lead-experiment-conversion", () => ({ recordLeadExperimentConversion: vi.fn(async () => ({ attempted: false })) }));
vi.mock("../../src/lib/operations/first-live-lead-monitor", async original => ({ ...await original<object>(), createFirstLiveLeadMonitor: () => null }));
const provider = vi.hoisted(() => ({ send: vi.fn(), enqueue: vi.fn(async () => ({ internal: null, warning: "synthetic_no_send" })) }));
vi.mock("../../app/lib/leadAlertService", async original => ({ ...await original<object>(), enqueueLeadNotifications: provider.enqueue }));
vi.mock("../../app/lib/leadNotificationProvider", async original => ({ ...await original<object>(), selectNotificationProvider: () => ({ name: "isolated", send: provider.send }) }));

type Row = Record<string, unknown>;
const cutoff = "2000-01-01T00:00:00.000Z";
const secret = `whsec_${Buffer.from("synthetic-launch-webhook-only").toString("base64")}`;
const migration = readFileSync(`supabase/migrations/${launchIntakeMigration}`, "utf8");
let predecessor: string; let legacy: Row; let legacyBody: Row; let oldEvidence: string;
function fixture(extra: Row = {}): Row {
  const key = randomUUID();
  return { funnel_type: "buyer", lead_source_surface: "buyer_page", name: "SYNTHETIC INQUIRY FIXTURE — NOT A CONSUMER", email: `${key}@example.test`, phone: "",
    buyer_interest: { version: 1, kind: "specific", properties: [{ address_text: "101 Synthetic Fixture Road", unit: "A" }] },
    question: "Synthetic property question", timeline: "3-6 months", consent: true, consent_email: true, consent_call: false, consent_sms: false,
    consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
    idempotency_key: key, widget_session_id: key, attribution: { source: "ourtownproperties", medium: "owned_media", campaign: "synthetic_launch" },
    page_url: "https://www.askmagicmike.com/buy", ...extra };
}
async function submit(body: Row, extraHeaders: Record<string, string> = {}) {
  const { POST } = await import("../../app/api/leads/route"); const start = statements.length;
  const response = await POST(new Request("https://www.askmagicmike.com/api/leads", { method: "POST", headers: {
    "Content-Type": "application/json", Origin: "https://www.askmagicmike.com", "Idempotency-Key": String(body.idempotency_key), ...extraHeaders }, body: JSON.stringify(body) }));
  return { response, result: await response.json() as Row, capture: statements.slice(start).find(value => value.sql.includes("capture_public_lead_v4(")) };
}
function rows(sql: string): Row[] { return JSON.parse(psql(`SELECT coalesce(jsonb_agg(q),'[]') FROM (${sql}) q;`)); }
function allNotifications(id: unknown) { return rows(`SELECT * FROM lead_notifications WHERE lead_id=${literal(id)}::uuid ORDER BY recipient_reference`); }
function notifications(id: unknown) { return allNotifications(id).filter(record => record.notification_type==='lead_alert' && record.template_version===LAUNCH_LEAD_ALERT_TEMPLATE_VERSION); }
function lead(id: unknown) { return rows(`SELECT * FROM leads WHERE id=${literal(id)}::uuid`)[0]; }
function counts() { return psql("SELECT jsonb_build_object('leads',(SELECT count(*) FROM leads),'contacts',(SELECT count(*) FROM contacts),'identities',(SELECT count(*) FROM contact_identities),'sessions',(SELECT count(*) FROM sessions),'source',(SELECT count(*) FROM source_attribution),'consents',(SELECT count(*) FROM consents),'audits',(SELECT count(*) FROM audit_logs),'assignments',(SELECT count(*) FROM agent_assignments),'outbox',(SELECT count(*) FROM lead_notifications));"); }
function hashes(db: "amm_qa_upgrade" | "amm_qa_fresh" = "amm_qa_upgrade") {
  return psql("SELECT jsonb_build_object('v1',pg_get_functiondef('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'v2',pg_get_functiondef('public.capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)'::regprocedure),'v3',pg_get_functiondef('public.capture_public_lead_v3(jsonb,jsonb,jsonb,text,jsonb)'::regprocedure),'fingerprint',pg_get_functiondef('public.amm_public_lead_request_fingerprint(jsonb,jsonb)'::regprocedure));", db);
}
function originalEvidence() {
  return psql(`SELECT jsonb_build_object('lead',(SELECT to_jsonb(l)-ARRAY['buyer_interest','inquiry_request_fingerprint'] FROM leads l WHERE id=${literal(legacy.lead_id)}::uuid),
    'notifications',(SELECT jsonb_agg(to_jsonb(n)-ARRAY['private_intake_snapshot','first_provider_attempt_at','provider_accepted_at','launch_batch_lease_token','launch_batch_lease_until'] ORDER BY id) FROM lead_notifications n WHERE lead_id=${literal(legacy.lead_id)}::uuid));`);
}
function callback(id: unknown, recipient: string, type = "delivered", eventId = `synthetic_${randomUUID()}`, valid = true, occurredAt = new Date().toISOString()) {
  const when = new Date(); const raw = JSON.stringify({ type: `email.${type}`, created_at: occurredAt, data: {
    email_id: `synthetic_message_${id}`, to: [recipient], tags: { amm_notification_id: id } } });
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/email/events", { method: "POST", headers: {
    "content-type": "application/json", "svix-id": eventId, "svix-timestamp": String(Math.floor(when.getTime()/1000)),
    "svix-signature": valid ? new Webhook(secret).sign(eventId,when,raw) : "v1,invalid" }, body: raw });
}
function claim(id: unknown, initial = false, lease: string | null = null) {
  const query = bind("SELECT * FROM public.claim_launch_lead_alert_v1($1::uuid,$2::timestamptz,$3::boolean,$4::uuid)", [id,cutoff,initial,lease]);
  return JSON.parse(psql(`SET ROLE service_role; SELECT coalesce(jsonb_agg(q),'[]') FROM (${query}) q;`)) as Row[];
}
async function pending() { const result = await submit(fixture()); expect(result.response.status).toBe(200); return notifications(result.result.lead_id); }

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("launch inquiry: isolated actual PostgreSQL", () => {
  beforeAll(async () => {
    await startDatabase(); install("amm_qa_upgrade", true, new Set([launchIntakeMigration]));
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL_ENV", "development");
    // Fake URL is never connected: only mocked Neon -> owned localQuery can run.
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production"); vi.stubEnv("LEAD_ALERT_V6_ENABLED", "false");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "mike@example.test"); vi.stubEnv("LEAD_NOTIFICATION_SECOND_OPERATOR_TO", "brandon@example.test");
    vi.stubEnv("RESEND_FROM", "Our Town <sender@example.test>");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("external_network_forbidden"); }));
    legacyBody = fixture({ buyer_interest: undefined }); legacy = (await submit(legacyBody)).result;
    expect(legacy.lead_id).toBeDefined(); predecessor = hashes(); oldEvidence = originalEvidence();
    psql(migration); install("amm_qa_fresh", true);
  }, 120000);
  beforeEach(() => {
    vi.stubEnv("LEAD_ALERT_V6_ENABLED", "true"); vi.stubEnv("LEAD_ALERT_V6_WORKER_ENABLED", "true"); vi.stubEnv("LEAD_ALERT_V6_CUTOFF", cutoff);
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production"); vi.stubEnv("LEAD_NOTIFICATION_SECOND_OPERATOR_TO", "brandon@example.test");
    vi.stubEnv("RESEND_WEBHOOK_ENABLED", "true"); vi.stubEnv("RESEND_WEBHOOK_SECRET", secret); vi.stubEnv("LEAD_ALERT_V6_QA_SESSION_IDS", "");
    provider.send.mockClear(); provider.enqueue.mockClear();
  });
  afterAll(() => { stopDatabase(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("upgrades/fresh-installs without changing v1/v2/v3/fingerprint bodies or old evidence", () => {
    expect(hashes()).toBe(predecessor); expect(hashes("amm_qa_fresh")).toBe(predecessor); expect(originalEvidence()).toBe(oldEvidence);
    expect(lead(legacy.lead_id).buyer_interest).toBeNull(); expect(allNotifications(legacy.lead_id).every(record => record.private_intake_snapshot===null)).toBe(true);
  });
  it("grants capture/claim only to the server role, not PUBLIC/browser roles", () => {
    for (const signature of ["public.capture_public_lead_v4(jsonb,jsonb,jsonb,text,jsonb)","public.claim_launch_lead_alert_v1(uuid,timestamptz,boolean,uuid)","public.acquire_launch_alert_batch_v1(timestamptz)"]) {
      expect(psql(`SELECT has_function_privilege('service_role',${literal(signature)},'EXECUTE');`)).toBe("t");
      for (const role of ["anon","authenticated"]) expect(psql(`SELECT has_function_privilege(${literal(role)},${literal(signature)},'EXECUTE');`)).toBe("f");
    }
    expect(() => psql("SET ROLE anon; SELECT private_intake_snapshot FROM lead_notifications;")).toThrow();
  });
  it("root HTTP captures two private exact envelopes and preserves consent/source without sending", async () => {
    const body = fixture(); const saved = await submit(body); expect(saved.response.status).toBe(200); expect(saved.capture).toBeDefined();
    expect(saved.result).not.toHaveProperty("private_intake_snapshot"); expect(saved.result).not.toHaveProperty("notification_ids");
    expect(lead(saved.result.lead_id).buyer_interest).toEqual(body.buyer_interest);
    const records = notifications(saved.result.lead_id); expect(records).toHaveLength(2);
    const retainedAssignment = allNotifications(saved.result.lead_id).filter(record => record.notification_type==='agent_assignment');
    expect(retainedAssignment.every(record => record.status==='skipped')).toBe(true);
    expect(records.map(record => record.recipient_reference)).toEqual(["operator:brandon","operator:mike"]);
    for (const record of records) {
      expect(record.template_version).toBe(LAUNCH_LEAD_ALERT_TEMPLATE_VERSION); expect(record.status).toBe("pending");
      const snapshot = record.private_intake_snapshot as Row; expect(snapshot.from).toBe("Our Town <sender@example.test>");
      expect(snapshot.inquiry_id).toBe(saved.result.lead_id); expect(snapshot.submitted).toMatchObject({ name: body.name, email: body.email, buyer_interest: body.buyer_interest });
      expect(String(snapshot.text)).toContain(String(body.email)); expect(String(snapshot.text)).toContain("Unit: A");
      expect(String(snapshot.html)).toContain("min-height:44px"); expect(String(snapshot.text)).toContain(`/admin/leads/${saved.result.lead_id}`);
      expect(String(snapshot.text)).not.toContain("00000000-0000-4000-8000-000000009901");
      expect(normalizeLeadNotificationRow(record)).not.toHaveProperty("private_intake_snapshot");
    }
    expect(rows(`SELECT * FROM consents WHERE lead_id=${literal(saved.result.lead_id)}::uuid`)).toHaveLength(3);
    expect(rows(`SELECT * FROM source_attribution WHERE lead_id=${literal(saved.result.lead_id)}::uuid`)[0].utm_source).toBe("ourtownproperties");
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("recovers an exact pre-minimization frozen v4 request without rewriting old evidence or duplicating intents", async () => {
    const { legacyAttributionReplayContext } = await import("../../app/lib/persistence/legacyAttributionReplay");
    const body = fixture({ attribution: { source: "ourtownproperties", campaign: "legacy_unregistered", parent_url: "https://www.ourtownproperties.com/home-value/?private=synthetic-only#old" }, page_url: "https://www.askmagicmike.com/buy?private=synthetic-only#old" });
    const donor = await submit(body); expect(donor.response.status).toBe(200);
    const [session, captured, attribution, mode, metadata] = donor.capture!.params.map((value, index) => index === 3 ? value : JSON.parse(String(value))) as [Row, Row, Row, string, Row];
    // Produce a historical fixture through real retained v4, using the exact
    // old normalization shape, a fresh request/session and synthetic facts.
    const key = randomUUID(); const context = legacyAttributionReplayContext((metadata.request_context as import("../../app/lib/leadPayload").LeadPayload), body);
    session.id = key; captured.session_id = key; captured.widget_session_id = key; captured.request_idempotency_key = key; attribution.session_id = key;
    metadata.request_context = context; (metadata.launch_draft as Row).submitted = context;
    const historical = JSON.parse(psql(`SELECT public.capture_public_lead_v4(${literal(JSON.stringify(session))}::jsonb,${literal(JSON.stringify(captured))}::jsonb,${literal(JSON.stringify(attribution))}::jsonb,${literal(mode)},${literal(JSON.stringify(metadata))}::jsonb);`));
    expect(historical.ok).toBe(true);
    const before = JSON.stringify({ lead: lead(historical.lead_id), notifications: allNotifications(historical.lead_id), counts: counts() });
    const replay = await submit({ ...body, idempotency_key: key, widget_session_id: key });
    expect(replay.response.status).toBe(200); expect(replay.result.lead_id).toBe(historical.lead_id); expect(replay.response.headers.get("X-AMM-Idempotent-Replay")).toBe("1");
    expect(JSON.stringify({ lead: lead(historical.lead_id), notifications: allNotifications(historical.lead_id), counts: counts() })).toBe(before);
    expect((await submit({ ...body, idempotency_key: key, widget_session_id: key, question: "Changed actual inquiry" })).response.status).toBe(409);
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("minimizes public URLs/headers/snapshots before real SQL and both v6 outbox snapshots", async () => {
    const saved = await submit(fixture({ page_url: "https://www.askmagicmike.com/buy?email=private-synthetic%40example.test#private-synthetic",
      attribution: { source: "ourtownproperties", medium: "owned_media", campaign: "amm_owned_demand_2026", content: "wordpress_home_value_page",
        parent_url: "https://user:private-synthetic@www.ourtownproperties.com/home-value/?next=https%253A%252F%252Fprivate-synthetic.test",
        first_touch: { source: "private-synthetic", landing_page: "https://private-synthetic.test/private-address" },
        last_touch: { page_title: "private-synthetic", gclid: "private-synthetic", placement: "private-synthetic" } } }),
    { Referer: "https://www.ourtownproperties.com/home-value/?private=private-synthetic#private-synthetic" });
    expect(saved.response.status).toBe(200); const id = saved.result.lead_id;
    expect(lead(id).page_url).toBe("https://www.askmagicmike.com/buy");
    const retained = { lead: lead(id), session: rows(`SELECT * FROM sessions WHERE id=${literal(saved.result.session_id)}::uuid`), attribution: rows(`SELECT * FROM source_attribution WHERE lead_id=${literal(id)}::uuid`), outbox: notifications(id) };
    expect(JSON.stringify(retained)).not.toContain("private-synthetic");
    expect(retained.attribution[0]).toMatchObject({ utm_source: "ourtownproperties", utm_campaign: "amm_owned_demand_2026", utm_content: "wordpress_home_value_page", referrer_url: "https://www.ourtownproperties.com/home-value/" });
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("rejects a missing name on the new structured request before any durable write", async () => {
    const before = counts();
    expect((await submit(fixture({ name: "" }))).response.status).toBe(400);
    expect(counts()).toBe(before);
  });
  it.each([
    "Consider an as-is/direct-purchase option.",
    "Compare listing with an as-is option.",
    "Get general selling guidance.",
  ])("stores structured seller purpose and both immutable v6 envelopes without sending: %s", async purpose => {
    const components = { line1: "103 Synthetic Seller Fixture Road", line2: "Unit C", locality: "Wilson", region: "NC", postalCode: "27893", country: "US" };
    const address = "103 Synthetic Seller Fixture Road, Unit C, Wilson, NC 27893";
    const question = `Seller option requested: ${purpose}\nReported condition: Needs repairs\nSynthetic property review context.`;
    const body = fixture({ funnel_type: "seller", lead_source_surface: "seller_page", buyer_interest: undefined,
      address, address_entry: { version: 1, enteredText: address, acceptedText: address, components, confirmation: "manual", validation: "not_performed" },
      question, consent: false, consent_email: false, consent_call: false, consent_sms: false,
      attribution: { source: "ourtownproperties", medium: "owned_media", campaign: "amm_owned_demand_2026", content: "wordpress_we_buy_homes" },
      page_url: "https://www.askmagicmike.com/sell?seller_option=compare" });
    const saved = await submit(body); expect(saved.response.status).toBe(200);
    const stored = lead(saved.result.lead_id);
    expect(stored.address_line2).toBe("Unit C"); expect(stored.address_entry).toMatchObject({ validation: "not_performed", components });
    expect(stored.primary_intent).toBe("sell"); expect(stored.lead_type).toBe("seller"); expect(stored.question_raw).toContain(question);
    expect(stored.consent_email).toBe(false); expect(stored.consent_call).toBe(false);
    expect(stored.source_detail).toBe("seller_page / owned_media / amm_owned_demand_2026");
    expect(rows(`SELECT utm_source,utm_medium,utm_campaign,utm_content FROM source_attribution WHERE lead_id=${literal(saved.result.lead_id)}::uuid`)[0])
      .toMatchObject({ utm_source: "ourtownproperties", utm_medium: "owned_media", utm_campaign: "amm_owned_demand_2026", utm_content: "wordpress_we_buy_homes" });
    const records = notifications(saved.result.lead_id); expect(records).toHaveLength(2);
    expect(records.map(record => record.recipient_reference)).toEqual(["operator:brandon", "operator:mike"]);
    for (const record of records) {
      const snapshot = record.private_intake_snapshot as Row;
      expect(snapshot.submitted).toMatchObject({ question, address_entry: { components }, consent_email: false, consent_call: false });
      expect(String(snapshot.text)).toContain(purpose); expect(String(snapshot.text)).toContain("Unit C");
      expect(String(snapshot.text)).toContain(String(body.email)); expect(snapshot.template_version).toBe("lead_alert_email_v6");
      expect(snapshot.subject).not.toContain(String(body.email)); expect(snapshot.subject).not.toContain(address);
      expect(record.status).toBe("pending");
    }
    const { localQuery } = await import("../support/qa-audit-postgres");
    const cohort = rows(`SELECT l.id,sa.utm_source,sa.utm_medium,sa.utm_campaign,sa.utm_content FROM leads l JOIN source_attribution sa ON sa.lead_id=l.id WHERE l.id=${literal(saved.result.lead_id)}::uuid`);
    const delivery = await queryGrowthPlacementDelivery(localQuery, cohort);
    expect(delivery.configured).toBe(true); expect(delivery.placements).toHaveLength(1);
    expect(delivery.placements[0].acceptedInquiries).toBe(1);
    for (const operator of delivery.placements[0].operators) {
      expect(operator.counts).toMatchObject({ envelopes: 1, pending: 1, delivered: 0, no_v6_envelope_recorded: 0 });
    }
    const after = counts();
    const replay = await submit(body); expect(replay.response.status).toBe(200);
    expect(replay.response.headers.get("X-AMM-Idempotent-Replay")).toBe("1"); expect(counts()).toBe(after);
    expect((await submit({ ...body, question: `${question}\nChanged purpose` })).response.status).toBe(409); expect(counts()).toBe(after);
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("keeps unstructured legacy sellers phone-required and rejects missing contacts on structured sellers", async () => {
    const before = counts();
    const body = fixture({ funnel_type: "seller", buyer_interest: undefined, address: "104 Synthetic Legacy Road", phone: "" });
    expect((await submit(body)).response.status).toBe(400);
    const address = { version: 1, enteredText: String(body.address), acceptedText: String(body.address),
      components: { line1: "", line2: "", locality: "", region: "", postalCode: "", country: "" }, confirmation: "manual", validation: "not_performed" };
    expect((await submit({ ...body, address_entry: address, email: "" })).response.status).toBe(400);
    expect((await submit({ ...body, address_entry: address, name: "" })).response.status).toBe(400);
    expect(counts()).toBe(before); expect(provider.send).not.toHaveBeenCalled();
  });
  it("root search capture invents neither a subject address nor a geography field", async () => {
    const saved = await submit(fixture({ buyer_interest: { version:1,kind:"search",desired_area:"Wilson",budget_range:"Self-reported fixture range" } }));
    expect(saved.response.status).toBe(200); const stored = lead(saved.result.lead_id);
    expect(stored.address_raw).toBeNull(); expect(stored.target_geography).toBeNull();
    expect(String((notifications(saved.result.lead_id)[0].private_intake_snapshot as Row).text)).toContain("Desired area: Wilson");
  });
  it("replays an identical root request unchanged with no second inquiry or alert", async () => {
    const body = fixture(); const first = await submit(body); const before = counts(); const second = await submit(body);
    expect(second.response.status).toBe(200); expect(second.response.headers.get("X-AMM-Idempotent-Replay")).toBe("1");
    expect(second.result.lead_id).toBe(first.result.lead_id); expect(counts()).toBe(before); expect(provider.enqueue).toHaveBeenCalledOnce();
  });
  it.each(["timeline","question","email","buyer_interest"])("rejects material same-key %s differences", async field => {
    const body = fixture(); const first = await submit(body); expect(first.response.status).toBe(200); const before = counts();
    const value = field === "buyer_interest" ? { version:1,kind:"specific",properties:[{address_text:"101 Synthetic Fixture Road",unit:"B"}] }
      : field === "email" ? "other@example.test" : "Changed synthetic context";
    expect((await submit({ ...body,[field]:value })).response.status).toBe(409); expect(counts()).toBe(before);
  });
  it("rejects foreign buyer context on a legacy key instead of upgrading its old record", async () => {
    expect((await submit({ ...legacyBody,buyer_interest:fixture().buyer_interest })).response.status).toBe(409); expect(originalEvidence()).toBe(oldEvidence);
  });
  it("keeps different units for one contact as separate inquiries; different people at one building remain distinct", async () => {
    const firstBody = fixture(); const first = await submit(firstBody); const original = JSON.stringify(lead(first.result.lead_id));
    const second = await submit(fixture({ email:firstBody.email,buyer_interest:{version:1,kind:"specific",properties:[{address_text:"101 Synthetic Fixture Road",unit:"B"}]} }));
    expect(second.response.status).toBe(200); expect(second.result.lead_id).not.toBe(first.result.lead_id);
    expect(lead(second.result.lead_id).contact_id).toBe(lead(first.result.lead_id).contact_id); expect(second.result.duplicate_of_lead_id).toBe(first.result.lead_id);
    expect(JSON.stringify(lead(first.result.lead_id))).toBe(original);
    const third = await submit(fixture()); expect(lead(third.result.lead_id).contact_id).not.toBe(lead(first.result.lead_id).contact_id);
    expect(String((notifications(second.result.lead_id)[0].private_intake_snapshot as Row).text)).toContain("Existing contact; this is a separate new inquiry.");
  });
  it("email-to-one / phone-to-another refuses ambiguous identity atomically without a false receipt", async () => {
    const first = fixture({ phone: "+12525550181" });
    const second = fixture({ phone: "+12525550182" });
    const a = await submit(first); const b = await submit(second);
    expect(a.response.status).toBe(200); expect(b.response.status).toBe(200);
    expect(lead(a.result.lead_id).contact_id).not.toBe(lead(b.result.lead_id).contact_id);
    const before = counts();
    const conflict = await submit(fixture({ email: first.email, phone: second.phone }));
    expect(conflict.response.status).toBe(409);
    expect(conflict.result.code).toBe("identity_conflict");
    expect(conflict.result.lead_id).toBeUndefined();
    expect(counts()).toBe(before);
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("another property/intent remains a separate inquiry requiring direct assignment and supervisor review", async () => {
    const { reviewRepeatInquiry, repeatInquiryReviewState } = await import("../../app/lib/repeatInquiryReview");
    const { assignCanonicalAdminLead } = await import("../../src/lib/admin/lead-operations");
    const { normalizeAdminLeadRow } = await import("../../app/lib/adminLeadView");
    const { isTerminalContactRecord } = await import("../../app/lib/manualContactReview");
    const original = fixture(); const first = await submit(original); expect(first.response.status).toBe(200);
    const old = JSON.stringify(lead(first.result.lead_id));
    const repeat = fixture({ email: original.email, funnel_type: "home_value", lead_source_surface: "home_value_page", buyer_interest: undefined,
      address: "202 Synthetic Other Property Road", consent: false, consent_email: false, consent_call: false,
      attribution: { source: "facebook", medium: "social_organic", campaign: "amm_owned_demand_2026", content: "facebook_local_question_seller_review" } });
    const next = await submit(repeat); expect(next.response.status).toBe(200);
    expect(next.result.lead_id).not.toBe(first.result.lead_id); const id = String(next.result.lead_id);
    expect(lead(id)).toMatchObject({ contact_id: lead(first.result.lead_id).contact_id, duplicate_of_lead_id: first.result.lead_id, assigned_agent_id: null, conversion_stage: "duplicate" });
    expect(repeatInquiryReviewState(normalizeAdminLeadRow(lead(id)))).toBe("direct_assignment_required");
    const admin = { userId: "00000000-0000-4000-8000-000000000123", agentId: null, role: "administrator" as const, name: "SYNTHETIC", email: "admin@example.test" };
    psql(`INSERT INTO lead_center_users(id,name,email,role,"emailVerified") VALUES(${literal(admin.userId)},'SYNTHETIC ADMIN','repeat-review-admin@example.test','administrator',true);`);
    expect(await reviewRepeatInquiry(id, admin, true)).toMatchObject({ ok: false, error: "repeat_review_held" });
    const intentsBefore = JSON.stringify(notifications(id)); vi.stubEnv("AGENT_NOTIFICATIONS_ENABLED", "false");
    expect(await assignCanonicalAdminLead({ leadId: id, agentId: "00000000-0000-4000-8000-000000009901", reason: "Reviewed synthetic separate inquiry", actor: `lead_center:${admin.userId}` })).toMatchObject({ ok: true });
    const expected = { agentId: String(lead(id).assigned_agent_id), assignedAt: String(lead(id).assigned_at) };
    expect(isTerminalContactRecord(String(lead(id).status), String(lead(id).conversion_stage))).toBe(true);
    expect(await reviewRepeatInquiry(id, admin, false, expected)).toMatchObject({ ok: false, error: "confirmation_required" });
    expect(await reviewRepeatInquiry(id, admin, true, { ...expected, assignedAt: "2000-01-01T00:00:00Z" })).toMatchObject({ ok: false });
    expect(await reviewRepeatInquiry(id, admin, true, { ...expected, agentId: randomUUID() })).toMatchObject({ ok: false });
    psql(`UPDATE lead_center_users SET role='approved_agent' WHERE id=${literal(admin.userId)};`);
    expect(await reviewRepeatInquiry(id, admin, true, expected)).toMatchObject({ ok: false }); // cached principal is not authority
    psql(`UPDATE lead_center_users SET role='administrator' WHERE id=${literal(admin.userId)}; UPDATE leads SET communication_suppressed=true WHERE id=${literal(id)}::uuid;`);
    expect(await reviewRepeatInquiry(id, admin, true, expected)).toMatchObject({ ok: false });
    psql(`UPDATE leads SET communication_suppressed=false WHERE id=${literal(id)}::uuid;`);
    expect(await reviewRepeatInquiry(id, admin, true, expected)).toMatchObject({ ok: true });
    expect(lead(id)).toMatchObject({ status: "assigned", conversion_stage: "assigned", duplicate_of_lead_id: first.result.lead_id, consent_email: false, consent_call: false, consent_sms: false });
    expect(isTerminalContactRecord(String(lead(id).status), String(lead(id).conversion_stage))).toBe(false);
    expect(JSON.stringify(lead(first.result.lead_id))).toBe(old); expect(JSON.stringify(notifications(id))).toBe(intentsBefore);
    expect(allNotifications(id).filter(row => row.notification_type === "agent_assignment").every(row => row.status === "skipped" && row.provider_message_id === null)).toBe(true);
    expect(rows(`SELECT * FROM audit_logs WHERE resource_id=${literal(id)}::uuid AND actor=${literal(`lead_center:${admin.userId}`)} AND action='lead.lifecycle_changed'`).length).toBeGreaterThan(0);
    expect(provider.send).not.toHaveBeenCalled();
  });
  it("a second-envelope fault rolls back capture/contact/consent/assignment/audit and both intents", async () => {
    const before = counts(); psql("CREATE FUNCTION public.amm_test_fail_brandon() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.recipient_reference='operator:brandon' THEN RAISE EXCEPTION 'synthetic_second_envelope_failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER amm_test_fail_brandon BEFORE INSERT ON lead_notifications FOR EACH ROW EXECUTE FUNCTION public.amm_test_fail_brandon();");
    try { expect((await submit(fixture())).response.status).toBe(500); expect(counts()).toBe(before); }
    finally { psql("DROP TRIGGER amm_test_fail_brandon ON lead_notifications; DROP FUNCTION public.amm_test_fail_brandon();"); }
  });
  it("missing bindings/mode-off retain the request and two held immutable intents", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_MODE","disabled"); vi.stubEnv("LEAD_NOTIFICATION_SECOND_OPERATOR_TO","");
    const saved = await submit(fixture()); expect(saved.response.status).toBe(200); const records = notifications(saved.result.lead_id);
    expect(records).toHaveLength(2); expect(records.every(record => record.status!=='pending')).toBe(true); expect(provider.send).not.toHaveBeenCalled();
    expect((records[0].private_intake_snapshot as Row).recipient).toBeNull();
    expect(() => psql(`UPDATE lead_notifications SET private_intake_snapshot='{}' WHERE id=${literal(records[0].id)}::uuid;`)).toThrow();
  });
  it("SQL generic processing is blocked, while batch leases exclude overlapping workers", async () => {
    const records = await pending(); const id = records[0].id;
    expect(() => psql(`SET ROLE service_role; UPDATE lead_notifications SET status='processing',attempt_count=1 WHERE id=${literal(id)}::uuid;`)).toThrow();
    const tokens = await Promise.all([1,2].map(() => concurrent(`SET ROLE service_role; SELECT public.acquire_launch_alert_batch_v1(${literal(cutoff)}::timestamptz);`)));
    expect(tokens.filter(Boolean)).toHaveLength(1); const token = tokens.find(Boolean)!;
    expect(claim(id,false,token)).toHaveLength(1); expect(claim(id,false,token)).toHaveLength(0);
    psql(`UPDATE lead_notifications SET launch_batch_lease_token=NULL,launch_batch_lease_until=NULL WHERE launch_batch_lease_token=${literal(token)}::uuid;`);
    expect(claim(id,true)).toHaveLength(0); // Processing is ambiguous, never a stale retry.
  });
  it("fixed provider retry retention excludes seeded old rejection evidence", async () => {
    const records = await pending(); const id = records[0].id;
    psql(`UPDATE lead_notifications SET status='retry_scheduled',attempt_count=1,error_code='resend_http_429',next_attempt_at=now()-interval '1 minute',first_provider_attempt_at=now()-interval '25 hours' WHERE id=${literal(id)}::uuid;`);
    const token = psql(`SELECT public.acquire_launch_alert_batch_v1(${literal(cutoff)}::timestamptz);`);
    try { expect(claim(id,false,token)).toHaveLength(0); expect(() => psql(`UPDATE lead_notifications SET first_provider_attempt_at=now() WHERE id=${literal(id)}::uuid;`)).toThrow(); }
    finally { psql(`UPDATE lead_notifications SET launch_batch_lease_token=NULL,launch_batch_lease_until=NULL WHERE launch_batch_lease_token=${literal(token)}::uuid;`); }
  });
  it("signed recipient callbacks can win the HTTP race, dedupe and avoid customer suppression on an operator bounce", async () => {
    const records = await pending(); const id = records.find(record => record.recipient_reference==='operator:mike')!.id;
    expect(claim(id,true)).toHaveLength(1); const { POST } = await import("../../app/api/webhooks/email/events/route");
    const event = callback(id,"mike@example.test"); const duplicate = event.clone() as NextRequest;
    expect((await POST(event)).status).toBe(200); expect((await POST(duplicate)).status).toBe(200);
    const updated = notifications(records[0].lead_id).find(record => record.id===id)!;
    expect(updated.status).toBe("sent"); expect(updated.provider_accepted_at).not.toBeNull(); expect(updated.provider_message_id).toBe(`synthetic_message_${id}`);
    expect(updated.metadata).toMatchObject({provider_delivery_confirmed:true});
    expect(rows(`SELECT * FROM communication_events WHERE lead_notification_id=${literal(id)}::uuid`)).toHaveLength(1);
    expect((await POST(callback(id,"mike@example.test","bounced"))).status).toBe(200);
    expect(lead(records[0].lead_id).email_suppressed).toBe(false);
    expect(notifications(records[0].lead_id).find(record => record.recipient_reference==='operator:brandon')!.status).toBe("pending");
    expect((await POST(callback(records[0].id,"brandon@example.test","delivered",undefined,false))).status).toBe(400);
  });
  it("records stale signed delivery cumulatively without regressing opened or terminal state", async () => {
    const records = await pending(); const id = records.find(record => record.recipient_reference==='operator:mike')!.id;
    expect(claim(id,true)).toHaveLength(1); const { POST } = await import("../../app/api/webhooks/email/events/route");
    const time = Date.now(), newer = new Date(time).toISOString(), older = new Date(time-1000).toISOString();
    expect((await POST(callback(id,"mike@example.test","opened",undefined,true,newer))).status).toBe(200);
    const delivery = callback(id,"mike@example.test","delivered",undefined,true,older), duplicate = delivery.clone() as NextRequest;
    const receipt = await (await POST(delivery)).json();
    expect(receipt).toMatchObject({ state_transition_applied:false, state_transition_ignored_reason:"out_of_order_event", delivery_evidence_recorded:true });
    let updated = notifications(records[0].lead_id).find(record=>record.id===id)!;
    expect(updated.status).toBe("sent"); expect(updated.metadata).toMatchObject({provider_delivery_confirmed:true,provider_last_event:"opened",provider_last_event_at:newer});
    expect(rows(`SELECT * FROM communication_events WHERE lead_notification_id=${literal(id)}::uuid`)).toHaveLength(2);
    expect((await POST(duplicate)).status).toBe(200);
    expect(rows(`SELECT * FROM communication_events WHERE lead_notification_id=${literal(id)}::uuid`)).toHaveLength(2);
    expect((await POST(callback(id,"mike@example.test","bounced",undefined,true,new Date(time+1000).toISOString()))).status).toBe(200);
    expect((await POST(callback(id,"mike@example.test","delivered",undefined,true,older))).status).toBe(200);
    updated = notifications(records[0].lead_id).find(record=>record.id===id)!;
    expect(updated.status).toBe("permanently_failed"); expect(updated.metadata).toMatchObject({provider_delivery_confirmed:true,provider_last_event:"bounced"});
    expect(lead(records[0].lead_id).email_suppressed).toBe(false);
  });
  it.each([false,true])("persists provider %s outcome without lead loss or a second envelope attempt", async accepted => {
    const records = await pending(); const id = records.find(record=>record.recipient_reference==='operator:mike')!.id;
    const before = counts();
    vi.stubEnv("EMAIL_ENABLED","true"); vi.stubEnv("LEAD_NOTIFICATION_PRODUCTION_ENABLED","true");
    vi.stubEnv("EMAIL_PROVIDER","resend"); vi.stubEnv("RESEND_API_KEY","synthetic-no-network-key");
    provider.send.mockResolvedValue(accepted
      ? {ok:true,provider:"resend",providerMessageId:`synthetic_api_${id}`}
      : {ok:false,provider:"resend",retryable:false,ambiguous:true,errorCode:"resend_network_error"});
    const { dispatchLaunchAlertEnvelope } = await import("../../app/lib/leadAlertService");
    const first = await dispatchLaunchAlertEnvelope(String(id),{initial:true});
    expect(first?.status).toBe(accepted?"sent":"processing");
    expect(provider.send).toHaveBeenCalledOnce(); expect(counts()).toBe(before);
    const after = notifications(records[0].lead_id).find(record=>record.id===id)!;
    expect(after.first_provider_attempt_at).not.toBeNull();
    expect(after.provider_message_id).toBe(accepted?`synthetic_api_${id}`:null);
    expect(after.private_intake_snapshot).toEqual(records.find(record=>record.id===id)!.private_intake_snapshot);
    await dispatchLaunchAlertEnvelope(String(id),{initial:true});
    expect(provider.send).toHaveBeenCalledOnce(); expect(counts()).toBe(before);
    expect(notifications(records[0].lead_id).find(record=>record.recipient_reference==='operator:brandon')!.status).toBe("pending");
  });
});
