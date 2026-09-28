import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const query = vi.fn();
const verify = vi.fn();

vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
vi.mock("@/lib/adapters/twilio-signature", () => ({
  verifyTwilioSignature: (...args: unknown[]) => verify(...args),
}));

import { POST } from "../../app/api/webhooks/sms/inbound/route";

const TWILIO_SID = `SM${"a".repeat(32)}`;

function atomicResult(overrides: Record<string, unknown> = {}) {
  return {
    claimed: true,
    matched_leads: 1,
    processing_status: "processed",
    recorded_payload_hash: "a".repeat(64),
    communication_recorded: 1,
    suppressed_leads: 0,
    permission_rows: 0,
    stopped_sequences: 1,
    ...overrides,
  };
}

function mockRequest(
  body: Record<string, unknown> = {
    from: "+19195550101",
    body: "I have a question",
    message_id: "mock_event_001",
  },
  options: { secret?: string; contentType?: string; contentLength?: string; rawBody?: string } = {},
) {
  const headers = new Headers({
    "Content-Type": options.contentType ?? "application/json",
    "x-admin-secret": options.secret ?? "test-secret",
  });
  if (options.contentLength !== undefined) headers.set("Content-Length", options.contentLength);
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/sms/inbound", {
    method: "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
  });
}

function twilioRequest(options: {
  body?: Record<string, string>;
  rawBody?: string;
  signature?: string;
  contentType?: string;
  contentLength?: string;
  url?: string;
} = {}) {
  const body = options.rawBody ?? new URLSearchParams(options.body ?? {
    From: "+19195550101",
    Body: "STOP",
    MessageSid: TWILIO_SID,
  }).toString();
  const headers = new Headers({
    "Content-Type": options.contentType ?? "application/x-www-form-urlencoded",
    "X-Twilio-Signature": options.signature ?? "synthetic",
  });
  if (options.contentLength !== undefined) headers.set("Content-Length", options.contentLength);
  return new NextRequest(
    options.url ?? "https://preview.invalid/api/webhooks/sms/inbound",
    { method: "POST", headers, body },
  );
}

describe("POST /api/webhooks/sms/inbound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.VERCEL_ENV;
    delete process.env.DATABASE_ENV;
    process.env.DATABASE_URL = "postgresql://synthetic.invalid/test";
    process.env.ADMIN_SECRET = "test-secret";
    process.env.SMS_PROVIDER = "mock";
    process.env.ENABLE_SMS = "false";
    process.env.TWILIO_AUTH_TOKEN = "synthetic-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com/path-is-ignored";
    verify.mockReturnValue({ ok: true });
    query.mockImplementation((_statement: unknown, parameters: unknown[]) => Promise.resolve([
      atomicResult({ recorded_payload_hash: parameters[3] }),
    ]));
  });

  it("accepts an authorized non-production mock reply and records it atomically without raw content", async () => {
    const response = await POST(mockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      mode: "mock",
      classification: "reply",
      duplicate: false,
      matched_lead: true,
      matched_leads: 1,
      stopped_sequences: 1,
    });
    expect(body.correlation_id).toBe(response.headers.get("x-amm-correlation-id"));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");

    const [statement, parameters] = query.mock.calls[0];
    expect(String(statement)).toContain("public.provider_webhook_events");
    expect(String(statement)).toContain("public.communication_events");
    expect(String(statement)).toContain("public.message_sequence_instances");
    expect(String(statement)).toContain("processing_contract', 'inbound_atomic_v1'");
    expect(String(statement)).not.toContain("supabase");
    expect(JSON.stringify(parameters)).not.toContain("I have a question");
    expect(parameters).toEqual([
      "mock:mock_event_001:inbound",
      "mock_event_001",
      "reply",
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      "mock",
      false,
      "mock_sms_inbound",
      "9195550101",
    ]);
  });

  it("applies STOP across every matching record and SMS purpose", async () => {
    query.mockImplementation((_statement: unknown, parameters: unknown[]) => Promise.resolve([
      atomicResult({
        recorded_payload_hash: parameters[3],
        matched_leads: 3,
        suppressed_leads: 3,
        permission_rows: 18,
        stopped_sequences: 2,
      }),
    ]));
    const response = await POST(mockRequest({
      from: "+19195550101",
      body: "STOP",
      message_id: "mock_event_stop_001",
    }));
    expect(await response.json()).toMatchObject({
      classification: "stop",
      matched_leads: 3,
      stop_applied: true,
      suppressed_leads: 3,
      permissions_updated: 18,
      stopped_sequences: 2,
    });
    const statement = String(query.mock.calls[0][0]);
    expect(statement).toContain("public.amm_normalize_phone");
    const matchingCte = statement.slice(
      statement.indexOf("WITH matched_leads"),
      statement.indexOf("canonical_lead AS"),
    );
    expect(matchingCte).not.toContain("LIMIT 1");
    expect(statement).toContain("public.communication_permissions");
    expect(statement).toContain("state = 'opted_out'");
    expect(statement).toContain("receipt.payload_hash = EXCLUDED.payload_hash");
    expect(statement).toContain("receipt.processing_status = 'ignored'");
  });

  it("classifies HELP without suppression or sequence cancellation", async () => {
    query.mockImplementation((_statement: unknown, parameters: unknown[]) => Promise.resolve([
      atomicResult({
        recorded_payload_hash: parameters[3],
        stopped_sequences: 0,
      }),
    ]));
    const response = await POST(mockRequest({
      from: "+19195550101",
      body: "HELP",
      message_id: "mock_event_help_001",
    }));
    expect(await response.json()).toMatchObject({
      classification: "help",
      stop_applied: false,
      stopped_sequences: 0,
    });
  });

  it("returns an idempotent no-op for an already claimed receipt", async () => {
    query.mockImplementation((_statement: unknown, parameters: unknown[]) => Promise.resolve([
      atomicResult({
        claimed: false,
        recorded_payload_hash: parameters[3],
        communication_recorded: 0,
        stopped_sequences: 0,
      }),
    ]));
    const response = await POST(mockRequest());
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true, stopped_sequences: 0 });
  });

  it("rejects a provider event whose immutable payload conflicts with its receipt", async () => {
    query.mockResolvedValue([atomicResult({ claimed: false, recorded_payload_hash: "f".repeat(64) })]);
    const response = await POST(mockRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: "provider_event_conflict" });
  });

  it("rejects unauthorized mock requests before reading or persisting them", async () => {
    const response = await POST(mockRequest({}, { secret: "wrong" }));
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("refuses the admin-secret mock transport in Production", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await POST(mockRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "mock_webhook_disabled" });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects Preview before authentication, signature verification, body parsing, or database access", async () => {
    process.env.VERCEL_ENV = "preview";
    const response = await POST(twilioRequest({ rawBody: "malformed=%E0%A4%A" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "preview_data_disabled" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("authenticates a Twilio form even when outbound SMS is disabled", async () => {
    process.env.SMS_PROVIDER = "mock";
    process.env.ENABLE_SMS = "false";
    const response = await POST(twilioRequest({
      url: "https://preview.invalid/api/webhooks/sms/inbound?attempt=2",
      body: {
        From: "+19195550101",
        Body: "STOP",
        MessageSid: TWILIO_SID,
        NumMedia: "0",
      },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: "twilio", classification: "stop" });
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://www.askmagicmike.com/api/webhooks/sms/inbound?attempt=2",
      authToken: "synthetic-token",
      formParams: expect.objectContaining({ NumMedia: "0" }),
    }));
    expect(query.mock.calls[0][1]).toEqual(expect.arrayContaining(["twilio", true, "9195550101"]));
  });

  it("accepts the documented MM SID shape and compatible SmsSid alias", async () => {
    const mmSid = `MM${"b".repeat(32)}`;
    const response = await POST(twilioRequest({
      body: { From: "+19195550101", Body: "HELP", SmsSid: mmSid },
    }));
    expect(response.status).toBe(200);
    expect(query.mock.calls[0][1][1]).toBe(mmSid);
  });

  it("rejects forged, ambiguous, or unconfigured Twilio callbacks before database access", async () => {
    verify.mockReturnValueOnce({ ok: false, reason: "mismatch" });
    expect((await POST(twilioRequest())).status).toBe(401);

    verify.mockReturnValueOnce({ ok: true });
    const conflicting = await POST(twilioRequest({
      body: {
        From: "+19195550101",
        Body: "STOP",
        MessageSid: TWILIO_SID,
        SmsSid: `SM${"c".repeat(32)}`,
      },
    }));
    expect(conflicting.status).toBe(400);

    const duplicate = await POST(twilioRequest({
      rawBody: `From=%2B19195550101&Body=STOP&MessageSid=${TWILIO_SID}&Body=HELP`,
    }));
    expect(duplicate.status).toBe(400);

    delete process.env.TWILIO_AUTH_TOKEN;
    expect((await POST(twilioRequest())).status).toBe(503);
    expect(query).not.toHaveBeenCalled();
  });

  it("accepts only exact supported media types and a strict mock schema", async () => {
    expect((await POST(mockRequest({}, { contentType: "text/plain" }))).status).toBe(415);
    expect((await POST(mockRequest({
      From: "+19195550101",
      Body: "STOP",
      MessageSid: "mock_event_wrong_case",
    }))).status).toBe(400);
    expect((await POST(mockRequest({
      from: "+19195550101",
      body: "STOP",
      message_id: "mock_event_extra_001",
      unexpected: "field",
    }))).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("bounds declared and streamed payload bytes before provider verification or database work", async () => {
    const declared = await POST(twilioRequest({ contentLength: "20001" }));
    expect(declared.status).toBe(413);
    expect(verify).not.toHaveBeenCalled();

    const invalidDeclared = await POST(twilioRequest({ contentLength: "not-a-number" }));
    expect(invalidDeclared.status).toBe(400);

    const streamed = await POST(mockRequest({}, {
      rawBody: JSON.stringify({
        from: "+19195550101",
        body: "x".repeat(20_001),
        message_id: "mock_event_large_001",
      }),
    }));
    expect(streamed.status).toBe(413);
    expect(query).not.toHaveBeenCalled();
  });

  it("limits matching to normalized US numbers instead of colliding on international suffixes", async () => {
    const response = await POST(mockRequest({
      from: "+4419195550101",
      body: "STOP",
      message_id: "mock_event_phone_001",
    }));
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("fails safely when atomic persistence fails or cannot confirm a receipt", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    query.mockRejectedValueOnce(new Error("sensitive database detail"));
    const unavailable = await POST(mockRequest());
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ error: "database_unavailable" });

    query.mockResolvedValueOnce([]);
    const missingReceipt = await POST(mockRequest());
    expect(missingReceipt.status).toBe(503);
    expect(await missingReceipt.json()).toMatchObject({ error: "database_unavailable" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("sensitive database detail");
    consoleError.mockRestore();
  });
});
