import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const query = vi.fn();
const verify = vi.fn();

vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
vi.mock("@/lib/adapters/twilio-signature", () => ({
  verifyTwilioSignature: (...args: unknown[]) => verify(...args),
}));

import { POST } from "../../app/api/webhooks/sms/inbound/route";

function mockRequest(body: Record<string, unknown> = {
  from: "+19195550101",
  body: "I have a question",
  message_id: "mock_event_001",
}) {
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/sms/inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": "test-secret" },
    body: JSON.stringify(body),
  });
}

function twilioRequest() {
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/sms/inbound", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "synthetic" },
    body: new URLSearchParams({
      From: "+19195550101",
      Body: "STOP",
      MessageSid: `SM${"a".repeat(32)}`,
    }).toString(),
  });
}

describe("POST /api/webhooks/sms/inbound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://synthetic.invalid/test";
    process.env.ADMIN_SECRET = "test-secret";
    process.env.SMS_PROVIDER = "mock";
    process.env.ENABLE_SMS = "false";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com";
    verify.mockReturnValue({ ok: true });
    query.mockResolvedValue([{
      lead_id: "11111111-1111-4111-8111-111111111111",
      inserted: true,
      stop_applied: false,
      stopped_sequences: 1,
    }]);
  });

  it("accepts an authorized mock reply and stops eligible test sequences without storing raw content", async () => {
    const response = await POST(mockRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      mode: "mock",
      classification: "reply",
      duplicate: false,
      matched_lead: true,
      stopped_sequences: 1,
    });
    const [statement, parameters] = query.mock.calls[0];
    expect(String(statement)).toContain("public.communication_events");
    expect(String(statement)).toContain("public.message_sequence_instances");
    expect(String(statement)).not.toContain("supabase");
    expect(JSON.stringify(parameters)).not.toContain("I have a question");
  });

  it("applies STOP to the lead, every SMS purpose, and active sequence state", async () => {
    query.mockResolvedValue([{
      lead_id: "11111111-1111-4111-8111-111111111111",
      inserted: true,
      stop_applied: true,
      stopped_sequences: 2,
    }]);
    const response = await POST(mockRequest({ from: "+19195550101", body: "STOP", message_id: "mock_event_stop_001" }));
    expect(await response.json()).toMatchObject({
      classification: "stop",
      stop_applied: true,
      stopped_sequences: 2,
    });
    const statement = String(query.mock.calls[0][0]);
    expect(statement).toContain("sms_suppressed = true");
    expect(statement).toContain("public.communication_permissions");
    expect(statement).toContain("state = 'opted_out'");
    expect(statement).toContain("stop_reason = CASE WHEN $3 = 'stop' THEN 'opt_out'");
  });

  it("classifies HELP without canceling a sequence", async () => {
    query.mockResolvedValue([{
      lead_id: "11111111-1111-4111-8111-111111111111",
      inserted: true,
      stop_applied: false,
      stopped_sequences: 0,
    }]);
    const response = await POST(mockRequest({ from: "+19195550101", body: "HELP", message_id: "mock_event_help_001" }));
    expect(await response.json()).toMatchObject({ classification: "help", stopped_sequences: 0 });
  });

  it("returns an idempotent success for a duplicate provider event", async () => {
    query.mockResolvedValue([{
      lead_id: "11111111-1111-4111-8111-111111111111",
      inserted: false,
      stop_applied: false,
      stopped_sequences: 0,
    }]);
    const response = await POST(mockRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true });
  });

  it("rejects an unauthorized mock request before database access", async () => {
    const request = mockRequest();
    request.headers.set("x-admin-secret", "wrong");
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects an oversized payload before authentication or database work", async () => {
    const request = mockRequest();
    request.headers.set("content-length", "20001");
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false, error: "payload_too_large" });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects invalid number, message, or provider-event inputs", async () => {
    const response = await POST(mockRequest({ from: "not-a-number", body: "", message_id: "bad" }));
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a forged Twilio callback before database access", async () => {
    process.env.SMS_PROVIDER = "twilio";
    process.env.ENABLE_SMS = "true";
    verify.mockReturnValue({ ok: false, reason: "mismatch" });
    const response = await POST(twilioRequest());
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
});
