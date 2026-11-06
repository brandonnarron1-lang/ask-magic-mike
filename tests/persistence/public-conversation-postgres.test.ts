// @vitest-environment node
// Opt-in, owned local PostgreSQL only. No application/provider credentials.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { concurrent, install, literal, localQuery, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { processRequestResponses } from "../../app/lib/requestResponseService";
import { EMPTY_CONVERSATION_PREFERENCES } from "../../app/lib/conversationPreferences";
import { requestResponseDraft } from "../../app/lib/requestResponseTemplates";
import { REQUEST_RECEIPT_COPY, REQUEST_RECEIPT_VERSION } from "../../app/lib/requestReceiptContract";
import { LEAD_CONSENT_LANGUAGE_TEXT } from "../../app/lib/leadConsent";

function fixture() {
  const lead = randomUUID(), session = randomUUID();
  psql(`INSERT INTO sessions(id) VALUES (${literal(session)});
    INSERT INTO leads(id,session_id,email) VALUES (${literal(lead)},${literal(session)},'synthetic@example.test');`);
  return { lead, session };
}
function request(lead: string, session: string) {
  return JSON.parse(psql(`SET ROLE service_role; SELECT request_public_appointment_v1(${literal(lead)},${literal(session)},'home_value_page',now());`));
}
const cutoff = "2000-01-01T00:00:00.000Z";
const prefs = { ...EMPTY_CONVERSATION_PREFERENCES, channel: "email" as const, day: "2026-11-12", window: "afternoon" as const };
const draft = requestResponseDraft({ REQUEST_RECEIPTS_ENABLED: "true", REQUEST_RECEIPTS_ACTIVATED_AT: cutoff,
  REQUEST_RECEIPTS_REPLY_TO: "reply@example.test", RESEND_FROM: "Our Town <sender@example.test>",
  LEAD_NOTIFICATION_TO: "mike@example.test", LEAD_NOTIFICATION_SECOND_OPERATOR_TO: "brandon@example.test" }, prefs);
function v2Sql(f: ReturnType<typeof fixture>, preference: unknown = prefs) {
  return `SET ROLE service_role; SELECT request_public_appointment_v2(${literal(f.lead)},${literal(f.session)},'home_value_page',now(),${literal(JSON.stringify(preference))}::jsonb,${literal(JSON.stringify(draft))}::jsonb);`;
}
function v2(f: ReturnType<typeof fixture>, preference: unknown = prefs) { return JSON.parse(psql(v2Sql(f, preference))); }
function allowReceipt(lead: string) {
  psql(`UPDATE leads SET consent_email=true,consent_timestamp=now(),consent_language_version='amm_contact_v2',consent_language_text=${literal(LEAD_CONSENT_LANGUAGE_TEXT)} WHERE id=${literal(lead)};
    INSERT INTO consents(lead_id,consent_type,granted,language_version,language_text,collected_at)
    SELECT id,'email',true,'amm_contact_v2',consent_language_text,consent_timestamp FROM leads WHERE id=${literal(lead)};
    INSERT INTO communication_permissions(lead_id,channel,purpose,state,consent_text,consent_version,source,evidence_at,metadata)
    VALUES(${literal(lead)},'email','transactional_acknowledgment','allowed',${literal(REQUEST_RECEIPT_COPY)},${literal(REQUEST_RECEIPT_VERSION)},'public_request_receipt',now(),jsonb_build_object('inquiry_id',${literal(lead)}));`);
}
describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("public conversation: actual isolated PostgreSQL", () => {
  beforeAll(async () => { await startDatabase(); install("amm_qa_upgrade", true); }, 120000);
  afterAll(() => { stopDatabase(); vi.unstubAllEnvs(); });
  it("reproduces the inherited retry-after-confirmation task recreation", () => {
    const f = fixture(); request(f.lead, f.session);
    psql(`UPDATE lead_appointments SET status='confirmed' WHERE lead_id=${literal(f.lead)};
      UPDATE tasks SET status='done' WHERE lead_id=${literal(f.lead)};`);
    expect(request(f.lead, f.session)).toMatchObject({ status: "already_requested", followup_status: "created" });
    expect(psql(`SELECT count(*) FROM tasks WHERE lead_id=${literal(f.lead)} AND status='open';`)).toBe("1");
  });
  it("reproduces the inherited closed-outcome reset but rejects a mismatched session", () => {
    const f = fixture();
    psql(`UPDATE leads SET status='dead',closed_lost_at=now(),closed_lost_reason='Synthetic no follow-up' WHERE id=${literal(f.lead)};`);
    expect(request(f.lead, randomUUID()).ok).toBe(false);
    expect(request(f.lead, f.session).status).toBe("requested");
    expect(psql(`SELECT status,closed_lost_at IS NULL,closed_lost_reason IS NULL FROM leads WHERE id=${literal(f.lead)};`)).toBe("appointment_requested|t|t");
  });
  it("v2 atomically saves preferences, one task/audit and two separate staff intents under concurrent replay", async () => {
    const f = fixture();
    const results = await Promise.all(Array.from({ length: 4 }, () => concurrent(v2Sql(f))));
    expect(results.map(r => JSON.parse(r)).filter(r => r.status === "requested")).toHaveLength(1);
    expect(new Set(results.map(r => JSON.parse(r).appointment_id)).size).toBe(1);
    expect(psql(`SELECT count(*) FROM tasks WHERE lead_id=${literal(f.lead)};`)).toBe("1");
    expect(psql(`SELECT count(*) FROM audit_logs WHERE resource_id=${literal(f.lead)};`)).toBe("1");
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(f.lead)} AND notification_type='appointment_request';`)).toBe("2");
    expect(JSON.parse(psql(`SELECT request_preferences FROM lead_appointments WHERE lead_id=${literal(f.lead)};`))).toEqual(prefs);
    expect(v2(f, EMPTY_CONVERSATION_PREFERENCES).status).toBe("already_requested");
    expect(JSON.parse(psql(`SELECT request_preferences FROM lead_appointments WHERE lead_id=${literal(f.lead)};`))).toEqual(prefs);
  });
  it.each(["confirmed", "completed", "canceled"])("v2 never recreates completed/canceled follow-up on %s replay", status => {
    const f = fixture(); v2(f);
    psql(`UPDATE lead_appointments SET status=${literal(status)} WHERE lead_id=${literal(f.lead)};
      UPDATE tasks SET status='done' WHERE lead_id=${literal(f.lead)};`);
    expect(v2(f)).toMatchObject({ status: "already_requested", appointment_status: status, followup_status: "existing" });
    expect(psql(`SELECT count(*) FROM tasks WHERE lead_id=${literal(f.lead)};`)).toBe("1");
  });
  it("v2 rejects closed, stale, mismatched sessions and canceled task obligations without mutation", () => {
    for (const setup of ["status='dead',closed_lost_at=now(),closed_lost_reason='Do not follow up'", "created_at=now()-interval '25 hours'", "communication_suppressed=true"]) {
      const f = fixture(); psql(`UPDATE leads SET ${setup} WHERE id=${literal(f.lead)};`);
      expect(v2(f).ok).toBe(false);
      expect(psql(`SELECT count(*) FROM tasks WHERE lead_id=${literal(f.lead)};`)).toBe("0");
      expect(psql(`SELECT count(*) FROM lead_appointments WHERE lead_id=${literal(f.lead)};`)).toBe("0");
    }
    const f = fixture(); expect(v2({ ...f, session: randomUUID() }).error).toBe("appointment_request_not_found");
    psql(`INSERT INTO tasks(lead_id,title,status,category) VALUES(${literal(f.lead)},'Canceled obligation','cancelled','followup:appointment_confirmation');`);
    expect(v2(f).error).toBe("appointment_request_closed");
  });
  it("v2 validates preferences and the supplied channel; a genuine new inquiry is independent", () => {
    const f = fixture();
    expect(() => v2(f, { ...prefs, day: "2026-02-30" })).toThrow();
    expect(() => v2(f, { ...prefs, channel: null })).toThrow();
    expect(v2(f, { ...prefs, channel: "phone" }).error).toBe("appointment_preferred_channel_missing");
    expect(v2(f, EMPTY_CONVERSATION_PREFERENCES).status).toBe("requested");
    const repeat = fixture(); expect(v2(repeat).status).toBe("requested");
    expect(v2(repeat).appointment_id).not.toBe(v2(f).appointment_id);
  });
  it("a required outbox failure rolls back appointment, task, lifecycle and audit together", () => {
    const f = fixture();
    psql(`CREATE FUNCTION synthetic_response_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.template_version='request_response_v1' THEN RAISE EXCEPTION 'synthetic required outbox failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER synthetic_response_failure BEFORE INSERT ON lead_notifications FOR EACH ROW EXECUTE FUNCTION synthetic_response_failure();`);
    try { expect(() => v2(f)).toThrow(); }
    finally { psql("DROP TRIGGER synthetic_response_failure ON lead_notifications; DROP FUNCTION synthetic_response_failure();"); }
    expect(psql(`SELECT status,(SELECT count(*) FROM tasks WHERE lead_id=l.id),(SELECT count(*) FROM lead_appointments WHERE lead_id=l.id),(SELECT count(*) FROM audit_logs WHERE resource_id=l.id) FROM leads l WHERE id=${literal(f.lead)};`)).toBe("new|0|0|0");
  });
  it("receipt requires a new specific purpose, cutoff and unsuppressed current evidence; no historical backfill", () => {
    const f = fixture(); v2(f);
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(f.lead)} AND recipient_type='customer';`)).toBe("0");
    const eligible = fixture(); allowReceipt(eligible.lead); v2(eligible);
    expect(psql(`SELECT count(*) FROM lead_notifications WHERE lead_id=${literal(eligible.lead)} AND recipient_type='customer';`)).toBe("1");
    const old = fixture(); allowReceipt(old.lead);
    psql(`UPDATE leads SET created_at='1999-01-01' WHERE id=${literal(old.lead)};`);
    expect(psql(`SELECT request_receipt_permitted_v1(${literal(old.lead)},'synthetic@example.test',${literal(cutoff)});`)).toBe("f");
    const id = psql(`SELECT id FROM lead_notifications WHERE lead_id=${literal(eligible.lead)} AND recipient_type='customer';`);
    psql(`UPDATE communication_permissions SET state='denied' WHERE lead_id=${literal(eligible.lead)};`);
    expect(psql(`SELECT count(*) FROM claim_request_response_v1(${literal(id)},${literal(cutoff)});`)).toBe("0");
    expect(psql(`SELECT status FROM lead_notifications WHERE id=${literal(id)};`)).toBe("skipped");
  });
  it("fenced claim gives one sender; unknown provider state cannot be replayed or reset", async () => {
    const f = fixture(); v2(f);
    const id = psql(`SELECT id FROM lead_notifications WHERE lead_id=${literal(f.lead)} ORDER BY id LIMIT 1;`);
    const claims = await Promise.all(Array.from({ length: 3 }, () => concurrent(`SET ROLE service_role; SELECT count(*) FROM claim_request_response_v1(${literal(id)},NULL);`)));
    expect(claims.sort()).toEqual(["0", "0", "1"]);
    const token = psql(`SELECT response_claim_token FROM lead_notifications WHERE id=${literal(id)};`);
    psql(`SELECT finish_request_response_v1(${literal(id)},${literal(randomUUID())},'{"status":"sent","providerMessageId":"wrong"}');`);
    expect(psql(`SELECT provider_message_id IS NULL FROM lead_notifications WHERE id=${literal(id)};`)).toBe("t");
    psql(`SELECT finish_request_response_v1(${literal(id)},${literal(token)},'{"status":"processing","errorCode":"provider_acceptance_ambiguous"}');`);
    expect(psql(`SELECT count(*) FROM claim_request_response_v1(${literal(id)},NULL);`)).toBe("0");
    expect(() => psql(`UPDATE lead_notifications SET status='pending' WHERE id=${literal(id)};`)).toThrow();
    expect(() => psql(`UPDATE lead_notifications SET private_response_snapshot='{}' WHERE id=${literal(id)};`)).toThrow();
  });
  it("browser roles cannot execute the new mutation functions", () => {
    expect(() => psql(`SET ROLE anon; SELECT request_public_appointment_v2(null,null,null,now(),'{}','{}');`)).toThrow();
    expect(() => psql("SET ROLE authenticated; SELECT * FROM lead_notifications;")).toThrow();
  });
  it("current suppression prevents staff as well as customer claims", () => {
    const f = fixture(); v2(f);
    const id = psql(`SELECT id FROM lead_notifications WHERE lead_id=${literal(f.lead)} LIMIT 1;`);
    psql(`UPDATE leads SET communication_suppressed=true WHERE id=${literal(f.lead)};`);
    expect(psql(`SELECT count(*) FROM claim_request_response_v1(${literal(id)},NULL);`)).toBe("0");
  });
  it("disabled customer rows do not occupy the bounded staff worker selection", async () => {
    // Isolate this worker's selection from preceding fixture intents.
    psql("UPDATE lead_notifications SET status='skipped' WHERE template_version='request_response_v1' AND status='pending';");
    for (let i = 0; i < 4; i++) { const f = fixture(); allowReceipt(f.lead); v2(f); }
    psql("UPDATE lead_notifications SET created_at=now()-interval '1 minute' WHERE template_version='request_response_v1' AND recipient_type='customer';");
    for (const [k, v] of Object.entries({ REQUEST_RESPONSE_WORKER_ENABLED: "true", REQUEST_RECEIPTS_ENABLED: "false",
      CUSTOMER_EMAIL_ENABLED: "false", LEAD_NOTIFICATION_MODE: "production", LEAD_NOTIFICATION_PRODUCTION_ENABLED: "true",
      EMAIL_ENABLED: "true", EMAIL_PROVIDER: "resend", RESEND_FROM: "Our Town <sender@example.test>", RESEND_API_KEY: "synthetic-no-key" })) vi.stubEnv(k, v);
    const send = vi.fn(async () => ({ ok: true as const, provider: "resend", providerMessageId: `synthetic-${randomUUID()}` }));
    const result = await processRequestResponses({ sql: localQuery as never, provider: { name: "resend", send } });
    expect(result.processed).toBe(4); expect(send).toHaveBeenCalledTimes(4);
    expect(psql("SELECT count(*) FROM lead_notifications WHERE template_version='request_response_v1' AND recipient_type='customer' AND status='sent';")).toBe("0");
  });
});
