// @vitest-environment node
/**
 * Opt-in, actual root POST -> NeonPostgresAdapter -> capture_public_lead_v2.
 * The shared harness owns an isolated PG17 database, never an app DB URL.
 * Rate limiting, analytics/experiment writes and the internal email transport
 * are mocked, NOT lifecycle persistence or the notification repository.
 *
 * Existing notification-reliability-postgres coverage owns concurrent claims,
 * all required-stage rollback injections, provider callbacks and retry workers;
 * automatic-qa-audit-evidence owns repair/upgrade and broader QA permission proof.
 * This file adds Home Value field fidelity and repeat-inquiry preservation.
 * It proves neither browser input handling nor hosted/provider acceptance.
 *
 * Important existing contract limit: Home Value request fingerprints cover
 * email/phone/address/intent/type, NOT timeline/consent/source-only edits.
 * Conflict cases below change fingerprint-covered fields; immutable browser
 * payload protection is separately covered by the repair's client tests.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEAD_CONSENT_LANGUAGE_TEXT,
  LEAD_CONSENT_LANGUAGE_VERSION,
} from "../../app/lib/leadConsent";
import { LEAD_ALERT_TEMPLATE_VERSION } from "../../app/lib/leadAlertTemplates";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../app/lib/publicLeadErrors";
import { publicLeadOutcomeFromResponse } from "../../app/lib/publicLeadReceipt";
import type { NotificationProvider, NotificationRequest } from "../../app/lib/leadNotificationTypes";
import {
  install, literal, psql, startDatabase, statements, stopDatabase,
} from "../support/qa-audit-postgres";

vi.mock("@neondatabase/serverless", async () => {
  const local = await import("../support/qa-audit-postgres");
  return { neon: () => local.localQuery };
});
vi.mock("../../src/lib/security/rate-limit", async (original) => ({
  ...await original<object>(),
  checkRateLimit: vi.fn(async () => ({ allowed: true, durable: true, remaining: 50, resetAt: Date.now() + 60_000 })),
}));
vi.mock("../../app/lib/serverAnalytics", () => ({ recordServerAnalyticsEvent: vi.fn(async () => undefined) }));
vi.mock("../../app/lib/growth/lead-experiment-conversion", () => ({ recordLeadExperimentConversion: vi.fn(async () => ({ attempted: false })) }));
vi.mock("../../src/lib/operations/first-live-lead-monitor", async (original) => ({
  ...await original<object>(), createFirstLiveLeadMonitor: () => null,
}));
const transport = vi.hoisted(() => ({ send: vi.fn<NotificationProvider["send"]>(), network: vi.fn() }));
vi.mock("../../app/lib/leadNotificationProvider", async (original) => ({
  ...await original<object>(), selectNotificationProvider: () => ({ name: "isolated", send: transport.send }),
}));

const AGENT_ID = "00000000-0000-4000-8000-000000009901";
const USER_AGENT = "SYNTHETIC INTERNAL QA - DO NOT CONTACT";
const CLIENT_TIMESTAMP = "2000-01-01T00:00:00.000Z";
type Row = Record<string, unknown>;
let phoneOrdinal = 0;

function syntheticPhone() {
  // NANPA fictional 555-0100..0199 range, unique across this bounded suite.
  const suffix = 100 + ++phoneOrdinal;
  if (suffix > 199) throw new Error("synthetic_phone_fixture_range_exhausted");
  return `+1 (202) 555-${String(suffix).padStart(4, "0")}`;
}

function fixture() {
  const key = randomUUID();
  return {
    funnel_type: "home_value",
    lead_type: "home_value",
    lead_source_surface: "home_value_page",
    name: "INTERNAL QA DO NOT CONTACT",
    email: `${key}@example.test`,
    phone: syntheticPhone(),
    address: "123 Synthetic QA Avenue, Wilson, NC",
    city: "Synthetic QA",
    timeline: "30-60 days",
    notes: "SYNTHETIC HOME VALUE FIDELITY — NOT A CONSUMER",
    is_test: false, // The paired markers, not this client boolean, classify QA.
    consent: true,
    consent_email: true,
    consent_call: true,
    consent_sms: false,
    consent_timestamp: CLIENT_TIMESTAMP,
    consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
    consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
    consent_source: "home_value_page:home-value",
    idempotency_key: key,
    widget_session_id: key,
    page_url: "https://www.askmagicmike.com/home-value",
    attribution: {
      source: "ourtownproperties", medium: "owned_media",
      campaign: "amm_owned_demand_2026", content: "wordpress_home_value_page",
      landing_page: "https://www.askmagicmike.com/home-value",
      first_touch: { source: "ourtownproperties", medium: "owned_media" },
      last_touch: { source: "ourtownproperties", medium: "owned_media" },
      placement_id: "home-value-page", page_title: "Synthetic Home Value QA",
      device_category: "mobile", gclid: "SYNTHETIC_ONLY",
    },
  };
}
type Fixture = ReturnType<typeof fixture>;

async function submit(input: Fixture, expectedCaptures: 0 | 1 = 1) {
  const { POST } = await import("../../app/api/leads/route");
  const queryStart = statements.length;
  const startedAt = Date.now();
  const response = await POST(new Request("https://www.askmagicmike.com/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", Origin: "https://www.askmagicmike.com",
      Referer: "https://www.ourtownproperties.com/how-much-is-your-home-worth/",
      "User-Agent": USER_AGENT, "Idempotency-Key": input.idempotency_key,
    },
    body: JSON.stringify(input),
  }));
  const finishedAt = Date.now();
  const outcome = await publicLeadOutcomeFromResponse(response.clone());
  const result = await response.json() as Row;
  // No direct RPC substitute, mocked success object or adapter early replay.
  const captures = statements.slice(queryStart).filter((entry) => /capture_public_lead_v[234]\(/.test(entry.sql));
  expect(captures, JSON.stringify(result)).toHaveLength(expectedCaptures);
  return { response, outcome, result, startedAt, finishedAt, capture: captures[0] };
}

function saved(result: Awaited<ReturnType<typeof submit>>, input: Fixture) {
  expect(result.response.status, JSON.stringify(result.result)).toBe(200);
  expect(result.outcome.status).toBe("saved");
  if (result.outcome.status !== "saved") throw new Error("expected_actual_committed_public_receipt");
  expect(result.outcome.receipt.session_id).toBe(input.idempotency_key);
  expect(result.outcome.receipt.correlation_id).toBe(result.response.headers.get("X-AMM-Correlation-Id"));
  return result.outcome.receipt;
}

function rows(sql: string): Row[] {
  return JSON.parse(psql(`SELECT COALESCE(jsonb_agg(fixture_rows), '[]'::jsonb) FROM (${sql}) fixture_rows;`)) as Row[];
}

function lead(id: string) {
  const result = rows(`SELECT * FROM public.leads WHERE id=${literal(id)}::uuid`);
  expect(result).toHaveLength(1);
  return result[0];
}

function counts(): Record<string, number> {
  return JSON.parse(psql(`SELECT jsonb_build_object(
    'leads',(SELECT count(*) FROM leads), 'contacts',(SELECT count(*) FROM contacts),
    'identities',(SELECT count(*) FROM contact_identities), 'sessions',(SELECT count(*) FROM sessions),
    'attribution',(SELECT count(*) FROM source_attribution), 'consents',(SELECT count(*) FROM consents),
    'audits',(SELECT count(*) FROM audit_logs), 'assignments',(SELECT count(*) FROM agent_assignments),
    'routing',(SELECT count(*) FROM lead_routing), 'outbox',(SELECT count(*) FROM lead_notifications),
    'communications',(SELECT count(*) FROM communication_events), 'webhooks',(SELECT count(*) FROM provider_webhook_events)
  );`)) as Record<string, number>;
}

function snapshot(id?: string) {
  // Snapshot values as well as counts: retries/failures may not silently
  // rewrite a historical row while leaving aggregate counts unchanged.
  const scope = id ? `WHERE lead_id=${literal(id)}::uuid` : "";
  return psql(`SELECT jsonb_build_object(
    'leads',(SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY id),'[]') FROM leads l ${id ? `WHERE id=${literal(id)}::uuid` : ""}),
    'contacts',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM contacts c ${id ? `WHERE id=(SELECT contact_id FROM leads WHERE id=${literal(id)}::uuid)` : ""}),
    'sessions',(SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM sessions s ${id ? `WHERE id=(SELECT session_id FROM leads WHERE id=${literal(id)}::uuid)` : ""}),
    'attribution',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM source_attribution a ${scope}),
    'consents',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM consents c ${scope}),
    'audits',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM audit_logs a ${id ? `WHERE resource_id=${literal(id)}::uuid` : ""}),
    'assignments',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM agent_assignments a ${scope}),
    'routing',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY id),'[]') FROM lead_routing r ${scope}),
    'outbox',(SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY id),'[]') FROM lead_notifications n ${scope}),
    'identities',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY identity_type,normalized_value),'[]') FROM contact_identities i ${id ? `WHERE normalized_value=(SELECT normalized_email FROM leads WHERE id=${literal(id)}::uuid)` : ""}),
    'agents',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM agents a)
  );`);
}

function consents(id: string, contactId: unknown, email: boolean, call: boolean) {
  const evidence = rows(`SELECT * FROM consents WHERE lead_id=${literal(id)}::uuid ORDER BY consent_type`);
  expect(evidence).toHaveLength(3);
  expect(evidence.map((row) => [row.consent_type, row.granted])).toEqual([["call", call], ["email", email], ["sms", false]]);
  for (const row of evidence) expect(row).toMatchObject({
    contact_id: contactId, language_version: LEAD_CONSENT_LANGUAGE_VERSION,
    language_text: LEAD_CONSENT_LANGUAGE_TEXT, user_agent: USER_AGENT, ip_address: null,
  });
  return evidence;
}

function qaAudits(id: string, sessionId: string) {
  const audits = rows(`SELECT * FROM audit_logs WHERE resource_id=${literal(id)}::uuid ORDER BY action`);
  expect(audits.filter((row) => row.action === "lead.created")).toHaveLength(1);
  const qa = audits.filter((row) => row.action === "lead.qa_suppressed");
  expect(qa).toHaveLength(1);
  expect(qa[0]).toMatchObject({
    actor: "system/public_lead_capture", resource_type: "lead",
    after_state: { is_test: true, communication_suppressed: true, email_suppressed: true, sms_suppressed: true },
    metadata: { source: "api_leads", session_id: sessionId, classification_policy: "qa_marker_pair_v1" },
  });
  return audits;
}

const deliveryEvidence: Array<{ request: NotificationRequest; committed: Row }> = [];

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("Home Value intake fidelity — real isolated PG17, no external sends", () => {
  beforeAll(async () => {
    await startDatabase();
    install("amm_qa_upgrade", true);
    // Remove seeded real directory destinations even from inactive agents.
    // Emails stay unique; only the harness's synthetic agent remains active.
    psql(`UPDATE public.agents SET name='SYNTHETIC QA — DO NOT CONTACT',
      email=id::text||'@example.test',phone=NULL,notification_phone=NULL,
      notification_sms=false,notification_email=false,is_active=false;
      UPDATE public.agents SET is_active=true,notification_email=true,max_daily_leads=0,priority_score=100
      WHERE id=${literal(AGENT_ID)}::uuid;`);
    vi.stubEnv("NODE_ENV", "development"); // Exercise actual postcommit branch.
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("DATABASE_ENV", "local");
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-only.invalid/amm_qa_upgrade");
    vi.stubEnv("LEAD_NOTIFICATION_MODE", "production");
    vi.stubEnv("LEAD_NOTIFICATION_TO", "operator@example.test");
    vi.stubEnv("LEAD_NOTIFICATION_BCC", "audit@example.test");
    vi.stubEnv("LEAD_NOTIFICATION_PRODUCTION_ENABLED", "false");
    vi.stubEnv("CONSUMER_ACKNOWLEDGMENT_ENABLED", "true"); // QA must still deny it.
    vi.stubEnv("AGENT_SMS_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("AGENT_PUSH_NOTIFICATIONS_ENABLED", "false");
    vi.stubEnv("LEAD_SMS_TO", "");
    vi.stubEnv("LEAD_SMS_COPY_TO", "");
    for (const name of ["RESEND_API_KEY", "OPENAI_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CONSENT_IP_HASH_SALT"]) vi.stubEnv(name, "");
    vi.stubGlobal("fetch", transport.network);
    expect(rows("SELECT id FROM agents WHERE is_active=true")).toEqual([{ id: AGENT_ID }]);
    expect(psql("SELECT count(*) FROM agents WHERE email NOT LIKE '%@example.test' OR phone IS NOT NULL OR notification_phone IS NOT NULL;")).toBe("0");
  }, 120_000);

  beforeEach(() => {
    deliveryEvidence.length = 0;
    transport.network.mockReset().mockImplementation(async () => { throw new Error("external_network_forbidden"); });
    transport.send.mockReset().mockImplementation(async (request) => {
      // Separate psql connection: required records must already be visible.
      // Assert outside this callback, since postcommit errors are caught by POST.
      const committed = rows(`SELECT l.id AS lead_id,l.contact_id,l.is_test,l.communication_suppressed,
        n.status,n.metadata->>'capture_transaction' AS capture_transaction,
        (SELECT count(*) FROM consents WHERE lead_id=l.id) AS consent_count,
        (SELECT count(*) FROM audit_logs WHERE resource_id=l.id AND action='lead.qa_suppressed') AS qa_audit_count,
        (SELECT count(*) FROM audit_logs WHERE resource_id=l.id AND action='lead.created') AS capture_audit_count
        FROM lead_notifications n JOIN leads l ON l.id=n.lead_id WHERE n.id=${literal(request.notificationId)}::uuid`)[0];
      deliveryEvidence.push({ request, committed });
      return { ok: false, provider: "isolated", retryable: true, errorCode: "synthetic_provider_failure", errorSummary: "Synthetic unavailable internal transport" };
    });
  });

  afterAll(() => {
    try { stopDatabase(); }
    finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
  }, 20_000);

  it("commits the submitted fields, authoritative consent, QA audits, ownership and one internal intent before a failed mock send", async () => {
    const input = fixture();
    const before = counts();
    const submitted = await submit(input);
    const receipt = saved(submitted, input);
    expect(receipt).toMatchObject({ duplicate_of_lead_id: null, idempotentReplay: false });
    const row = lead(receipt.lead_id);
    const digits = input.phone.replace(/\D/g, "");
    expect(row).toMatchObject({
      session_id: input.idempotency_key, widget_session_id: input.idempotency_key,
      request_idempotency_key: input.idempotency_key,
      first_name: "INTERNAL", last_name: "QA DO NOT CONTACT", email: input.email,
      normalized_email: input.email, phone: input.phone, phone_normalized: digits, normalized_phone: digits.slice(1),
      address_raw: input.address, normalized_property_address: "123 synthetic qa avenue wilson nc",
      timeline_months: 3, city: input.city, state: "NC", lead_type: "home_value", primary_intent: "sell",
      source: input.attribution.source,
      source_detail: "home_value_page / owned_media / amm_owned_demand_2026 / home-value-page",
      page_url: input.page_url, consent_email: true, consent_call: true, consent_sms: false,
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source: input.consent_source, consent_user_agent: USER_AGENT, consent_ip_hash: null,
      is_test: true, communication_suppressed: true, email_suppressed: true, sms_suppressed: true,
      is_duplicate: false, duplicate_of_lead_id: null, assigned_agent_id: AGENT_ID,
      assignment_status: "assigned", status: "assigned", conversion_stage: "assigned", lead_grade: "A",
    });
    expect(String(row.question_raw)).toContain(`Timeline: ${input.timeline}`);
    expect(String(row.question_raw)).toContain(`Address: ${input.address}`);
    const incomingLead = JSON.parse(String(submitted.capture.params[1])) as Row;
    expect(row.score).toBe(incomingLead.score);
    expect(row.score).toBe(90);
    expect(row.score_factors).toEqual(incomingLead.score_factors);
    expect(row.score_version).toBe("deterministic_v1");
    expect(row.routing_reason).toBe(incomingLead.routing_reason);
    expect(row.contact_id).toEqual(expect.any(String));
    expect(rows(`SELECT first_name,last_name,email,phone,phone_normalized FROM contacts WHERE id=${literal(row.contact_id)}::uuid`))
      .toEqual([{ first_name: "INTERNAL", last_name: "QA DO NOT CONTACT", email: input.email, phone: input.phone, phone_normalized: digits.slice(1) }]);
    const timestamp = Date.parse(String(row.consent_timestamp));
    expect(timestamp).toBeGreaterThanOrEqual(submitted.startedAt);
    expect(timestamp).toBeLessThanOrEqual(submitted.finishedAt);
    expect(timestamp).not.toBe(Date.parse(CLIENT_TIMESTAMP));
    for (const consent of consents(receipt.lead_id, row.contact_id, true, true)) {
      expect(Date.parse(String(consent.collected_at))).toBe(timestamp);
    }
    const audits = qaAudits(receipt.lead_id, receipt.session_id);
    const assigned = audits.filter((audit) => audit.action === "lead.assigned");
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toMatchObject({ actor: "system/public_lead_capture", after_state: { assigned_agent_id: AGENT_ID, assignment_status: "assigned" } });
    expect(rows(`SELECT agent_id,status,idempotency_key FROM agent_assignments WHERE lead_id=${literal(receipt.lead_id)}::uuid`))
      .toEqual([{ agent_id: AGENT_ID, status: "pending", idempotency_key: `public-capture:${receipt.lead_id}` }]);
    expect(rows(`SELECT agent_id,status FROM lead_routing WHERE lead_id=${literal(receipt.lead_id)}::uuid`))
      .toEqual([{ agent_id: AGENT_ID, status: "pending" }]);
    expect(rows(`SELECT * FROM source_attribution WHERE lead_id=${literal(receipt.lead_id)}::uuid`)).toMatchObject([{
      session_id: input.idempotency_key, utm_source: input.attribution.source, utm_medium: input.attribution.medium,
      utm_campaign: input.attribution.campaign, utm_content: input.attribution.content, is_paid: false,
      first_touch: input.attribution.first_touch, last_touch: input.attribution.last_touch,
      placement_id: input.attribution.placement_id, page_title: null,
      click_ids: { gclid: null },
    }]);
    expect(rows(`SELECT * FROM sessions WHERE id=${literal(receipt.session_id)}::uuid`)).toMatchObject([{
      initial_address: input.address, utm_source: input.attribution.source, utm_campaign: input.attribution.campaign,
      status: "completed", step_reached: 5, user_agent: USER_AGENT, device_type: "mobile",
    }]);
    const outbox = rows(`SELECT * FROM lead_notifications WHERE lead_id=${literal(receipt.lead_id)}::uuid ORDER BY notification_type`);
    expect(outbox.map((notification) => notification.notification_type)).toEqual(["agent_assignment", "lead_alert"]);
    expect(outbox[0]).toMatchObject({ status: "skipped", attempt_count: 0, provider: "disabled", assignment_audit_id: assigned[0].id });
    expect(outbox[1]).toMatchObject({
      channel: "email", recipient_type: "internal", recipient_reference: "email_configured", agent_id: null,
      template_version: LEAD_ALERT_TEMPLATE_VERSION, idempotency_key: `lead_alert:${receipt.lead_id}:${LEAD_ALERT_TEMPLATE_VERSION}`,
      assignment_audit_id: assigned[0].id, status: "retry_scheduled", attempt_count: 1, max_attempts: 3,
      provider_message_id: null, error_code: "synthetic_provider_failure",
      metadata: { capture_transaction: "capture_public_lead_v2", is_test: true, correlation_id: receipt.correlation_id },
    });
    expect(deliveryEvidence).toHaveLength(1);
    expect(deliveryEvidence[0]).toMatchObject({
      request: { channel: "email", recipient: "operator@example.test", bcc: ["audit@example.test"], replyTo: input.email },
      committed: { lead_id: receipt.lead_id, is_test: true, communication_suppressed: true, status: "processing", capture_transaction: "capture_public_lead_v2", consent_count: 3, qa_audit_count: 1, capture_audit_count: 1 },
    });
    expect(deliveryEvidence[0].request.subject).toMatch(/^\[TEST\]/);
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.network).not.toHaveBeenCalled();
    const after = counts();
    for (const [table, delta] of Object.entries({ leads: 1, contacts: 1, identities: 2, sessions: 1, attribution: 1, consents: 3, audits: 3, assignments: 1, routing: 1, outbox: 2, communications: 0, webhooks: 0 })) {
      expect(after[table] - before[table], table).toBe(delta);
    }
  }, 30_000);

  it("exact key replay returns the original receipt without any additional durable or postcommit effect", async () => {
    const input = fixture();
    const first = saved(await submit(input), input);
    const before = snapshot();
    const beforeCounts = counts();
    expect(transport.send).toHaveBeenCalledTimes(1);
    const replay = await submit(input);
    expect(saved(replay, input)).toMatchObject({ lead_id: first.lead_id, session_id: first.session_id, duplicate_of_lead_id: null, idempotentReplay: true });
    expect(replay.response.headers.get("X-AMM-Idempotent-Replay")).toBe("1");
    expect(snapshot()).toBe(before);
    expect(counts()).toEqual(beforeCounts);
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(deliveryEvidence).toHaveLength(1);
    expect(transport.network).not.toHaveBeenCalled();
  }, 30_000);

  it.each(["phone", "address"] as const)("changed %s under the existing key is 409 with the original durable record unchanged", async (field) => {
    const input = fixture();
    const receipt = saved(await submit(input), input);
    const before = snapshot();
    const changed = { ...input, [field]: field === "phone" ? syntheticPhone() : "456 Different Synthetic QA Road, Wilson, NC" };
    const conflict = await submit(changed);
    expect(conflict.response.status).toBe(409);
    expect(conflict.result).toMatchObject({ code: "idempotency_conflict" });
    expect(conflict.result).not.toHaveProperty("lead_id");
    expect(conflict.outcome).toMatchObject({ status: "not_saved", retryPolicy: "blocked", code: "idempotency_conflict" });
    expect(snapshot()).toBe(before);
    expect(lead(receipt.lead_id).phone).toBe(input.phone);
    expect(lead(receipt.lead_id).address_raw).toBe(input.address);
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.network).not.toHaveBeenCalled();
  }, 30_000);

  it("new key / existing identity keeps current inquiry fields in an alias, with one contact and untouched canonical history/owner", async () => {
    const original = fixture();
    const canonical = saved(await submit(original), original);
    const canonicalRow = lead(canonical.lead_id);
    const originalSnapshot = snapshot(canonical.lead_id);
    const before = counts();
    const repeat: Fixture = {
      ...fixture(), email: original.email, timeline: "3-6 months", consent: false,
      consent_email: false, consent_call: false,
      consent_source: "home_value_page:repeat-inquiry",
      attribution: {
        ...original.attribution, source: "facebook", medium: "email",
        campaign: "amm_seller_buyer_launch_2026", content: "seller_facebook",
        last_touch: { source: "facebook", medium: "email" },
        placement_id: "seller-page",
      },
    };
    const inquiry = saved(await submit(repeat), repeat);
    expect(inquiry.lead_id).not.toBe(canonical.lead_id);
    expect(inquiry).toMatchObject({ duplicate_of_lead_id: canonical.lead_id, idempotentReplay: false });
    const alias = lead(inquiry.lead_id);
    expect(alias).toMatchObject({
      contact_id: canonicalRow.contact_id, session_id: repeat.idempotency_key,
      request_idempotency_key: repeat.idempotency_key, email: original.email, phone: repeat.phone,
      normalized_phone: repeat.phone.replace(/\D/g, "").slice(1), address_raw: repeat.address,
      timeline_months: 6, consent_email: false, consent_call: false, consent_sms: false, consent_timestamp: null,
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source: repeat.consent_source, source: "facebook",
      source_detail: "home_value_page / email / amm_seller_buyer_launch_2026 / seller-page",
      is_duplicate: true, duplicate_of_lead_id: canonical.lead_id,
      is_test: true, communication_suppressed: true, email_suppressed: true, sms_suppressed: true,
      // v1 returns assignment_status='duplicate' in its RPC result, but does
      // not fill the nullable stored assignment_status on an unassigned alias.
      assigned_agent_id: null, assignment_status: null, status: "new", lead_grade: "D", conversion_stage: "duplicate",
    });
    expect(String(alias.question_raw)).toContain("Timeline: 3-6 months");
    consents(inquiry.lead_id, canonicalRow.contact_id, false, false);
    expect(rows(`SELECT utm_source,utm_medium,utm_campaign,utm_content,last_touch FROM source_attribution WHERE lead_id=${literal(inquiry.lead_id)}::uuid`))
      .toEqual([{
        utm_source: repeat.attribution.source, utm_medium: repeat.attribution.medium,
        utm_campaign: repeat.attribution.campaign, utm_content: repeat.attribution.content,
        last_touch: repeat.attribution.last_touch,
      }]);
    expect(qaAudits(inquiry.lead_id, inquiry.session_id).map((audit) => audit.action)).toEqual(["lead.created", "lead.qa_suppressed"]);
    expect(rows(`SELECT * FROM agent_assignments WHERE lead_id=${literal(inquiry.lead_id)}::uuid`)).toEqual([]);
    expect(rows(`SELECT * FROM lead_routing WHERE lead_id=${literal(inquiry.lead_id)}::uuid`)).toEqual([]);
    const outbox = rows(`SELECT * FROM lead_notifications WHERE lead_id=${literal(inquiry.lead_id)}::uuid`);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ notification_type: "lead_alert", recipient_type: "internal", assignment_audit_id: null, status: "retry_scheduled", attempt_count: 1 });
    expect(snapshot(canonical.lead_id)).toBe(originalSnapshot);
    expect(psql(`SELECT count(DISTINCT contact_id) FROM leads WHERE id IN (${literal(canonical.lead_id)}::uuid,${literal(inquiry.lead_id)}::uuid);`)).toBe("1");
    expect(rows(`SELECT identity_type,normalized_value FROM contact_identities WHERE contact_id=${literal(canonicalRow.contact_id)}::uuid ORDER BY identity_type,normalized_value`))
      .toEqual([
        { identity_type: "email", normalized_value: original.email },
        { identity_type: "phone", normalized_value: original.phone.replace(/\D/g, "").slice(1) },
        { identity_type: "phone", normalized_value: repeat.phone.replace(/\D/g, "").slice(1) },
      ]);
    const after = counts();
    for (const [table, delta] of Object.entries({ leads: 1, contacts: 0, identities: 1, sessions: 1, attribution: 1, consents: 3, audits: 2, assignments: 0, routing: 0, outbox: 1, communications: 0, webhooks: 0 })) {
      expect(after[table] - before[table], table).toBe(delta);
    }
    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(deliveryEvidence.map((entry) => entry.committed.lead_id)).toEqual([canonical.lead_id, inquiry.lead_id]);
    expect(transport.network).not.toHaveBeenCalled();
  }, 30_000);

  it.each([false, true])("recovers a retained pre-minimization general-question fingerprint; structured=%s", async structured => {
    const input = fixture();
    const address = structured ? "123 Synthetic QA Avenue, Wilson, NC 27893" : input.address;
    const body = { ...input, funnel_type: "chat", lead_type: "general_question", lead_source_surface: "ask_page", question: "Synthetic explicit follow-up request",
      address,
      attribution: { ...input.attribution, initial_path: "/home-value?private=synthetic-only", current_path: "/ask?private=synthetic-only" },
      ...(structured ? { address_entry: { version: 1, enteredText: address, acceptedText: address, components: { line1: "123 Synthetic QA Avenue", line2: "", locality: "Wilson", region: "NC", postalCode: "27893", country: "US" }, confirmation: "manual", validation: "not_performed" } } : {}) };
    const first = await submit(body as unknown as Fixture); expect(first.response.status).toBe(200);
    const mockAttemptsBeforeReplay = transport.send.mock.calls.length;
    const { legacyAttributionReplayPayload } = await import("../../app/lib/persistence/legacyAttributionReplay");
    const { normalizeLeadPayload } = await import("../../app/lib/leadPayload");
    const legacy = legacyAttributionReplayPayload(normalizeLeadPayload(body), body);
    const [session, captured, attribution, mode, metadata] = first.capture.params.map((value, index) => index === 3 ? value : JSON.parse(String(value))) as [Row, Row, Row, string, Row];
    const key = randomUUID(); session.id = key; captured.session_id = key; captured.widget_session_id = key; captured.request_idempotency_key = key; attribution.session_id = key;
    captured.question_raw = String(captured.question_raw).replace(/Attribution: [^\n]+/, `Attribution: ${JSON.stringify(legacy.attribution)}`);
    const old = JSON.parse(psql(`SELECT public.${structured ? "capture_public_lead_v3" : "capture_public_lead_v2"}(${literal(JSON.stringify(session))}::jsonb,${literal(JSON.stringify(captured))}::jsonb,${literal(JSON.stringify(attribution))}::jsonb,${literal(mode)},${literal(JSON.stringify(metadata))}::jsonb);`));
    expect(old.ok).toBe(true); const before = snapshot();
    const replay = await submit({ ...body, idempotency_key: key, widget_session_id: key } as unknown as Fixture, 0);
    expect(replay.response.status).toBe(200); expect(replay.result.lead_id).toBe(old.lead_id);
    expect(replay.response.headers.get("X-AMM-Idempotent-Replay")).toBe("1"); expect(snapshot()).toBe(before);
    if (structured) {
      const changed = await submit({ ...body, idempotency_key: key, widget_session_id: key, address_entry: { ...body.address_entry, enteredText: "Changed synthetic entered text only" } } as unknown as Fixture);
      expect(changed.response.status).toBe(409); expect(snapshot()).toBe(before);
    }
    expect(transport.send.mock.calls.length).toBe(mockAttemptsBeforeReplay);
  });
  it("an actual terminal-outbox SQL exception rolls back all capture effects and can never become SAVED", async () => {
    const input = fixture();
    const before = snapshot();
    const beforeCounts = counts();
    // Ephemeral trigger in the owned test DB only; no migration/schema file edit.
    // This runs after contact/session/lead/audit/assignment/consent writes, so
    // the independent reads below test full transaction rollback, not a stub.
    psql(`CREATE FUNCTION public.synthetic_home_value_outbox_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.notification_type='lead_alert' THEN
        RAISE EXCEPTION 'synthetic home value required-outbox failure' USING ERRCODE='23514';
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER synthetic_home_value_outbox_failure BEFORE INSERT ON public.lead_notifications
      FOR EACH ROW EXECUTE FUNCTION public.synthetic_home_value_outbox_failure();`);
    try {
      const failed = await submit(input);
      expect(failed.response.status).toBe(500);
      expect(failed.result).toMatchObject({ code: "lead_persistence_failed", error: PUBLIC_LEAD_SAVE_ERROR });
      expect(failed.result).not.toHaveProperty("lead_id");
      expect(failed.result).not.toHaveProperty("session_id");
      expect(JSON.stringify(failed.result)).not.toContain("synthetic home value required-outbox failure");
      // The browser cannot infer rollback from a generic 500: it remains
      // UNCONFIRMED even though this isolated test independently proves rollback.
      expect(failed.outcome).toMatchObject({ status: "unconfirmed", retryPolicy: "same_payload" });
      expect(snapshot()).toBe(before);
      expect(counts()).toEqual(beforeCounts);
      expect(psql(`SELECT count(*) FROM sessions WHERE id=${literal(input.idempotency_key)}::uuid;`)).toBe("0");
      expect(psql(`SELECT count(*) FROM contact_identities WHERE normalized_value=${literal(input.email)};`)).toBe("0");
      expect(transport.send).not.toHaveBeenCalled();
      expect(deliveryEvidence).toEqual([]);
      expect(transport.network).not.toHaveBeenCalled();
    } finally {
      psql("DROP TRIGGER synthetic_home_value_outbox_failure ON public.lead_notifications; DROP FUNCTION public.synthetic_home_value_outbox_failure();");
    }
  }, 30_000);
});
