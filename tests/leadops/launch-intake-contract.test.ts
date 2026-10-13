// @vitest-environment node
// Pure contracts and injected provider transport only; no DB, browser or sends.
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeBuyerInterest } from "../../app/lib/buyerInterest";
import { normalizeLeadPayload } from "../../app/lib/leadPayload";
import { validateRawPublicLeadInput } from "../../app/lib/publicLeadIngress";
import { configuredLaunchFrom, prepareLaunchAlertDraft, inquiryRequestContext, readFrozenLaunchAlert,
  launchAttemptOutcome, launchAlertWorkerEnabled, isLaunchIntake, LAUNCH_LEAD_ALERT_TEMPLATE_VERSION } from "../../app/lib/leadAlertLaunch";
import { emailProviderConfigurationReady } from "../../app/lib/emailProviderConfiguration";
import { normalizeLeadNotificationRow } from "../../app/lib/persistence/supabase/leadNotificationRepository";
import { normalizeAdminLeadRow } from "../../app/lib/persistence/supabase/adminLeadView";
import { presentLead } from "../../app/lib/leadPresentation";
import { safeLeadCenterReturn } from "../../app/lib/leadCenterReturn";
import { readLaunchCallbackCorrelation } from "../../app/lib/launchCallbackCorrelation";
import { ResendEmailNotificationProvider } from "../../app/lib/leadNotificationProvider";

const session = "00000000-0000-4000-8000-000000000001";
const inquiry = "00000000-0000-4000-8000-000000000002";
const cutoff = "2026-10-13T18:11:00.000Z";
const env = { LEAD_ALERT_V6_CUTOFF: cutoff, LEAD_NOTIFICATION_TO: "mike@example.test",
  LEAD_NOTIFICATION_SECOND_OPERATOR_TO: "brandon@example.test", RESEND_FROM: "Our Town <sender@example.test>" };
const base = { funnel_type: "buyer", lead_source_surface: "buyer_page", name: "Synthetic Fixture",
  email: "contact@example.test", phone: "2025550100", question: "<script>synthetic</script>", consent_email: true,
  buyer_interest: { version: 1, kind: "specific", properties: [{ address_text: "101 Synthetic Road", unit: "2B" }] } };
function draft(extra = {}) {
  return prepareLaunchAlertDraft({ payload: normalizeLeadPayload({ ...base, ...extra }), sessionId: session,
    receivedAt: "2026-10-13T18:11:00.000Z", sourceLabel: '{"utm":"raw"}' }, env);
}
function frozen() {
  const d = draft();
  return { version: 1, template_version: LAUNCH_LEAD_ALERT_TEMPLATE_VERSION, launch_cutoff: cutoff,
    operator: "mike", recipient: "mike@example.test", from: env.RESEND_FROM,
    subject: d.subject, text: d.text_prefix + `Lead Center: https://www.askmagicmike.com/admin/leads/${inquiry}`,
    html: d.html_prefix + "</div>", inquiry_id: inquiry, session_id: session, submitted: d.submitted,
    is_test: false, qa_initial_authorized: false };
}
afterEach(() => vi.unstubAllEnvs());

describe("versioned buyer interest", () => {
  it.each([
    { version: 1, kind: "specific", properties: [{ listing_url: "https://listing.example.test/123?ref=fixture" }] },
    { version: 1, kind: "specific", properties: [{ address_text: "101 Synthetic Rd", unit: "A" }, { address_text: "101 Synthetic Rd", unit: "B" }] },
    { version: 1, kind: "search", desired_area: "Wilson", budget_range: "Self-reported range" },
  ])("accepts the approved contract without address/geography inference %#", value => {
    expect(normalizeBuyerInterest(value)).toEqual(value);
    const payload = normalizeLeadPayload({ ...base, buyer_interest: value });
    expect(payload.address).toBeUndefined(); expect(payload.target_geography).toBeUndefined();
    expect(payload.buyer_interest).toEqual(value);
  });
  it.each([
    null, { version: 2, kind: "search", desired_area: "Wilson" },
    { version: 1, kind: "specific", properties: [] },
    { version: 1, kind: "specific", properties: [{ reference: "MLS only" }] },
    { version: 1, kind: "specific", properties: Array.from({ length: 4 }, () => ({ address_text: "Fixture" })) },
    { version: 1, kind: "specific", properties: [{ listing_url: "javascript:alert(1)" }] },
    { version: 1, kind: "specific", properties: [{ listing_url: "https://user:secret@example.test/" }] },
    { version: 1, kind: "specific", properties: [{ listing_url: "https://example.test\\bad" }] },
    { version: 1, kind: "specific", properties: [{ address_text: "x".repeat(501) }] },
    { version: 1, kind: "specific", properties: [{ address_text: "Fixture", unit: "x".repeat(101) }] },
    { version: 1, kind: "search", desired_area: "Wilson", properties: [] },
    { version: 1, kind: "search", desired_area: " ", validation: "verified" },
  ])("rejects malformed/foreign/unsafe context %#", value => expect(() => normalizeBuyerInterest(value)).toThrow("invalid_buyer_interest"));
  it("validates ingress before normalization can throw", () => {
    expect(validateRawPublicLeadInput({ ...base, buyer_interest: { version: 9 } })?.code).toBe("invalid_buyer_interest");
    expect(normalizeLeadPayload({ ...base, buyer_interest: null }).buyer_interest).toBeUndefined();
  });
  it("rejects sparse in-memory property arrays", () => expect(() => normalizeBuyerInterest({ version: 1, kind: "specific", properties: new Array(1) })).toThrow("invalid_buyer_interest"));
});

describe("private frozen v6", () => {
  it.each(["sender@example.test", "Our Town <sender@example.test>", '"Our Town Properties" <sender@example.test>'])("accepts the configured sender envelope %s", value => {
    expect(configuredLaunchFrom(value)).toBe(value);
    expect(emailProviderConfigurationReady({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "synthetic-no-key", RESEND_FROM: value })).toBe(true);
  });
  it.each(["Our Town <sender@example.test>\r\nBcc: bad@example.test", "sender@example.test,second@example.test", "Our Town <bad>"])("rejects unsafe sender %s", value => expect(configuredLaunchFrom(value)).toBeNull());
  it("uses compact private facts, escaped HTML, human source and labeled Eastern time", () => {
    const d = draft();
    expect(d.from).toBe(env.RESEND_FROM); expect(d.recipients).toHaveLength(2);
    expect(d.text_prefix).toContain("Unit: 2B"); expect(d.text_prefix).not.toContain("Reference: Not provided");
    expect(d.text_prefix).toContain("Received: Oct 13, 2026, 2:11 PM EDT");
    expect(d.text_prefix).not.toContain("America/New_York"); expect(d.text_prefix).toContain("Source: Buyer form (reported)");
    expect(d.text_prefix).not.toContain('{"utm"'); expect(d.html_prefix).toContain("&lt;script&gt;");
    expect(d.html_prefix).not.toContain("<script>"); expect(d.subject).not.toContain("contact@example.test");
    expect(d.html_prefix).toContain("OUR TOWN PROPERTIES"); expect(d.html_prefix).toContain("background:#090909");
    expect(d.text_prefix).not.toContain("Consent wording:");
    expect(d.subject).not.toContain("101 Synthetic"); expect(d.html_prefix).not.toContain("mailto:");
  });
  it("omits absent search budget and prevents a second envelope to the primary mailbox", () => {
    const d = draft({ buyer_interest: { version: 1, kind: "search", desired_area: "Wilson" } });
    expect(d.text_prefix).not.toContain("Budget range:");
    const duplicate = prepareLaunchAlertDraft({ payload: normalizeLeadPayload(base), sessionId: session, receivedAt: cutoff, sourceLabel: "Buyer" }, { ...env, LEAD_NOTIFICATION_SECOND_OPERATOR_TO: "MIKE@example.test" });
    expect(duplicate.recipients[1].recipient).toBeNull();
  });
  it("authorizes only explicitly allowlisted initial QA, never from a browser flag", () => {
    const payload = normalizeLeadPayload({ ...base, name: "INTERNAL QA / DO NOT CONTACT" });
    const prepare = (configured = env) => prepareLaunchAlertDraft({ payload, sessionId: session, receivedAt: cutoff, sourceLabel: "Buyer" }, configured);
    expect(prepare().qa_initial_authorized).toBe(false);
    expect(prepare({ ...env, LEAD_ALERT_V6_QA_SESSION_IDS: session } as typeof env).qa_initial_authorized).toBe(true);
  });
  it("marks recognized QA in identity-free subject/preheader without marking an ordinary inquiry", () => {
    const qa = draft({ name: "INTERNAL QA / DO NOT CONTACT" });
    expect(qa.subject).toContain("[TEST] INTERNAL QA — DO NOT CONTACT");
    expect(qa.subject).not.toContain("contact@example.test"); expect(qa.subject).not.toContain("101 Synthetic");
    expect(qa.html_prefix).toContain('<span style="display:none">INTERNAL QA — DO NOT CONTACT. Synthetic request.</span>');
    expect(draft().subject).not.toContain("[TEST]"); expect(draft({ is_test: true }).subject).not.toContain("[TEST]");
  });
  it("compares all stable submitted facts while excluding server receipt/transport identity", () => {
    const first = normalizeLeadPayload(base);
    expect(inquiryRequestContext({ ...first, created_at: "different", consent_timestamp: "different", widget_session_id: "different" })).toEqual(inquiryRequestContext(first));
    expect(inquiryRequestContext(normalizeLeadPayload({ ...base, timeline: "Later" }))).not.toEqual(inquiryRequestContext(first));
    expect(inquiryRequestContext(normalizeLeadPayload({ ...base, buyer_interest: { version: 1, kind: "search", desired_area: "Wilson" } }))).not.toEqual(inquiryRequestContext(first));
  });
  it("retains the exact v6 reader without live configuration substitution or unknown-version fallback", () => {
    expect(readFrozenLaunchAlert(frozen())).toEqual(frozen());
    expect(readFrozenLaunchAlert({ ...frozen(), template_version: "unknown" })).toBeNull();
    expect(readFrozenLaunchAlert({ ...frozen(), recipient: "bad\r\nBcc: x" })).toBeNull();
  });
  it("omits the dedicated snapshot from notification and lead DTOs", () => {
    const notification = normalizeLeadNotificationRow({ id: inquiry, lead_id: inquiry, private_intake_snapshot: frozen(), metadata: { operator: "mike" } });
    expect(notification).not.toHaveProperty("private_intake_snapshot");
    expect(JSON.stringify(notification)).not.toContain("contact@example.test");
    expect(normalizeAdminLeadRow({ id: inquiry, private_intake_snapshot: frozen() })).not.toHaveProperty("private_intake_snapshot");
  });
  it("keeps preclaim presentation free of submitted interests and contact/body facts", () => {
    const lead = normalizeAdminLeadRow({ id: inquiry, first_name: "Private fixture", email: "contact@example.test", buyer_interest: base.buyer_interest });
    const view = presentLead({ lead, principal: { role: "approved_agent", agentId: session, userId: session, email: "agent@example.test", name: "Fixture" }, tier: "pre_claim",
      offer: { id: session, reference: "Synthetic offer", version: 1, agentId: session, deadline: cutoff, state: "offered" } });
    expect(view.identity).toBeUndefined(); expect(JSON.stringify(view)).not.toContain("101 Synthetic");
    expect(JSON.stringify(view)).not.toContain("contact@example.test");
  });
  it("preserves the actual inquiry path and duplicate query through the existing login return sanitizer", () => {
    const path = `/admin/leads/${inquiry}?duplicate_of=${session}#property-evidence-review`;
    expect(safeLeadCenterReturn(path)).toBe(path);
  });
  it("keeps worker default off and rejects a missing cutoff", () => {
    expect(launchAlertWorkerEnabled({})).toBe(false);
    expect(launchAlertWorkerEnabled({ LEAD_ALERT_V6_WORKER_ENABLED: "true" })).toBe(false);
    expect(launchAlertWorkerEnabled({ LEAD_ALERT_V6_WORKER_ENABLED: "true", LEAD_ALERT_V6_CUTOFF: cutoff })).toBe(true);
  });
  it.each(["chat", "renter", "open_house", "appointment"] as const)("keeps %s on legacy v4", funnel_type => {
    expect(isLaunchIntake({ funnel_type })).toBe(false);
  });
  it("scopes launch to seller/Home Value/buyer and only normalized Home Value widgets", () => {
    for (const funnel_type of ["seller", "home_value", "buyer"] as const) expect(isLaunchIntake({ funnel_type })).toBe(true);
    expect(isLaunchIntake({ funnel_type: "widget", lead_type: "home_value" })).toBe(true);
    expect(isLaunchIntake({ funnel_type: "widget", lead_type: "general_question" })).toBe(false);
  });
});

describe("acceptance is not delivery; no blind retry", () => {
  const now = Date.parse(cutoff);
  const outcome = (result: Parameters<typeof launchAttemptOutcome>[0]["result"], extra = {}) => launchAttemptOutcome({ result, attempt: 1, maxAttempts: 3, firstAttemptAt: cutoff, now, ...extra });
  it("marks an API receipt accepted without claiming recipient delivery", () => {
    expect(outcome({ ok: true, provider: "resend", providerMessageId: "synthetic-id" })).toMatchObject({ status: "sent", providerMessageId: "synthetic-id", acceptedAt: cutoff });
    expect(outcome({ ok: true, provider: "resend" })).toMatchObject({ status: "processing", errorCode: "provider_acceptance_receipt_missing" });
  });
  it.each(["resend_network_error", "resend_http_408", "resend_http_409", "resend_http_500"])("holds ambiguous %s", errorCode => {
    expect(outcome({ ok: false, provider: "resend", retryable: true, errorCode, errorSummary: "synthetic" }).status).toBe("processing");
  });
  it("honors definite rejection retry guidance within a fixed bounded window", () => {
    const rejection = { ok: false as const, provider: "resend", retryable: true, errorCode: "resend_http_429", errorSummary: "synthetic", retryAfterMs: 120_000 };
    expect(outcome(rejection)).toMatchObject({ status: "retry_scheduled", nextAttemptAt: "2026-10-13T18:13:00.000Z" });
    expect(outcome(rejection, { now: now + 24 * 60 * 60 * 1000 }).status).toBe("permanently_failed");
    expect(outcome(rejection, { attempt: 3 }).status).toBe("permanently_failed");
  });
  it("parses only provider correlation shape; signature verification remains the route prerequisite", () => {
    expect(readLaunchCallbackCorrelation({ data: { tags: [{ name: "amm_notification_id", value: inquiry }], to: ["mike@example.test"] } })).toEqual({ notificationId: inquiry, recipient: "mike@example.test" });
    expect(readLaunchCallbackCorrelation({ data: { tags: { amm_notification_id: inquiry }, to: ["mike@example.test", "brandon@example.test"] } }).recipient).toBeNull();
    expect(readLaunchCallbackCorrelation({ data: { tags: { amm_notification_id: "forged" } } }).notificationId).toBeNull();
    expect(readLaunchCallbackCorrelation({ data: { to: ["private-recipient@example.test"] } })).toEqual({ notificationId: null, recipient: null });
  });
  it("sends only the frozen sender/recipient/body to an injected transport with timeout and correlation", async () => {
    for (const [key, value] of Object.entries({ LEAD_NOTIFICATION_MODE: "production", EMAIL_ENABLED: "true", LEAD_NOTIFICATION_PRODUCTION_ENABLED: "true", RESEND_API_KEY: "synthetic-no-key", RESEND_FROM: "Different <different@example.test>" })) vi.stubEnv(key, value);
    const transport = vi.fn(async () => new Response(JSON.stringify({ id: "synthetic-provider-id" }), { status: 200 }));
    const provider = new ResendEmailNotificationProvider("production", transport);
    const snapshot = frozen();
    const result = await provider.send({ notificationId: inquiry, channel: "email", recipient: snapshot.recipient,
      frozenFrom: snapshot.from, subject: snapshot.subject, text: snapshot.text, html: snapshot.html,
      intakeV6: true, deliveryTimeoutMs: 5000, idempotencyKey: `fixture:${inquiry}` });
    expect(result.ok).toBe(true); expect(transport).toHaveBeenCalledOnce();
    const request = transport.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(request[1].body));
    expect(body.from).toBe(env.RESEND_FROM); expect(body.to).toBe("mike@example.test");
    expect(body).not.toHaveProperty("bcc"); expect(body).not.toHaveProperty("reply_to");
    expect(body.tags).toEqual([{ name: "amm_notification_id", value: inquiry }]); expect(request[1].signal).toBeDefined();
  });
});
