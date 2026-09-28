import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const query = vi.fn();
const verify = vi.fn();

vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
vi.mock("@/lib/adapters/twilio-signature", () => ({
  verifyTwilioSignature: (...args: unknown[]) => verify(...args),
}));

import { POST } from "../../app/api/webhooks/sms/status/route";

const MESSAGE_SID = `SM${"a".repeat(32)}`;

function request(
  status = "delivered",
  options: {
    messageSid?: string;
    errorCode?: string;
    contentType?: string;
    body?: string;
    url?: string;
    contentLength?: string;
  } = {},
) {
  const body = options.body ?? new URLSearchParams({
    MessageSid: options.messageSid ?? MESSAGE_SID,
    MessageStatus: status,
    ...(options.errorCode === undefined ? {} : { ErrorCode: options.errorCode }),
  }).toString();
  const headers = new Headers({
    "Content-Type": options.contentType ?? "application/x-www-form-urlencoded",
    "X-Twilio-Signature": "synthetic-signature",
  });
  if (options.contentLength !== undefined) headers.set("Content-Length", options.contentLength);
  return new NextRequest(
    options.url ?? "https://www.askmagicmike.com/api/webhooks/sms/status",
    { method: "POST", headers, body },
  );
}

function atomicResult(overrides: Record<string, unknown> = {}) {
  return {
    claimed: true,
    matched_notification: true,
    processing_status: "processed",
    recorded_payload_hash: "a".repeat(64),
    notification_updated: 1,
    communication_recorded: 1,
    ...overrides,
  };
}

describe("Twilio internal lead delivery status callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.VERCEL_ENV;
    delete process.env.DATABASE_ENV;
    process.env.DATABASE_URL = "postgresql://synthetic.invalid/test";
    process.env.TWILIO_AUTH_TOKEN = "synthetic-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com";
    verify.mockReturnValue({ ok: true });
    query.mockResolvedValue([atomicResult()]);
  });

  it("verifies the exact callback URL and atomically records a matched delivery", async () => {
    const response = await POST(request("delivered", {
      url: "https://preview.invalid/api/webhooks/sms/status?attempt=2",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      duplicate: false,
      matched: 1,
      status: "delivered",
      applied: true,
    });
    expect(body.correlation_id).toBe(response.headers.get("x-amm-correlation-id"));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://www.askmagicmike.com/api/webhooks/sms/status?attempt=2",
      authToken: "synthetic-token",
    }));

    const [statement, parameters] = query.mock.calls[0];
    expect(String(statement)).toContain("public.provider_webhook_events");
    expect(String(statement)).toContain("public.communication_events");
    expect(String(statement)).toContain("processing_contract', 'atomic_v1'");
    expect(String(statement)).toContain("provider_status_rank");
    expect(String(statement)).toContain("receipt.processing_status = 'ignored'");
    expect(String(statement)).toContain("EXISTS (SELECT 1 FROM notification_candidate)");
    expect(parameters).toEqual([
      `twilio:sms-status:${MESSAGE_SID}:delivered`,
      MESSAGE_SID,
      "delivered",
      null,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      60,
      false,
    ]);
  });

  it("returns an idempotent no-op for an already claimed provider status", async () => {
    query.mockResolvedValue([atomicResult({
      claimed: false,
      notification_updated: 0,
      communication_recorded: 0,
    })]);
    const response = await POST(request());
    expect(await response.json()).toMatchObject({
      ok: true,
      duplicate: true,
      matched: 1,
      applied: false,
    });
  });

  it("acknowledges an unmatched signed event after recording it as ignored", async () => {
    query.mockResolvedValue([atomicResult({
      matched_notification: false,
      processing_status: "ignored",
      notification_updated: 0,
      communication_recorded: 0,
    })]);
    const response = await POST(request("sent"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched: 0, status: "sent", applied: false });
  });

  it("normalizes a provider error code and accepts the documented MM SID form", async () => {
    const mmSid = `MM${"b".repeat(32)}`;
    const response = await POST(request("undelivered", { messageSid: mmSid, errorCode: "30007" }));
    expect(response.status).toBe(200);
    expect(query.mock.calls[0][1]).toEqual([
      `twilio:sms-status:${mmSid}:undelivered`,
      mmSid,
      "undelivered",
      "twilio_30007",
      expect.stringMatching(/^[a-f0-9]{64}$/),
      50,
      true,
    ]);
  });

  it("rejects Preview before signature verification or database access", async () => {
    process.env.VERCEL_ENV = "preview";
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: "preview_data_disabled" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("fails closed when the provider verification secret is absent", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "webhook_not_configured" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("accepts only form-encoded provider callbacks", async () => {
    const response = await POST(request("delivered", { contentType: "application/json", body: "{}" }));
    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ error: "unsupported_media_type" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a declared oversized payload before reading or authenticating it", async () => {
    const response = await POST(request("delivered", { contentLength: "20001" }));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "payload_too_large" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a streamed oversized payload even without a trusted length", async () => {
    const response = await POST(request("delivered", { body: `MessageSid=${MESSAGE_SID}&Pad=${"x".repeat(20_001)}` }));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "payload_too_large" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a forged callback before any database write", async () => {
    verify.mockReturnValue({ ok: false, reason: "mismatch" });
    const response = await POST(request("failed"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "unauthorized" });
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    { label: "message SID", options: { messageSid: "invalid" }, status: "delivered" },
    { label: "status", options: {}, status: "unknown" },
    { label: "error code", options: { errorCode: "header-injection\n" }, status: "failed" },
  ])("rejects an invalid $label", async ({ options, status }) => {
    const response = await POST(request(status, options));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_status_payload" });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects duplicate form keys that the canonical signature adapter cannot represent", async () => {
    const response = await POST(request("delivered", {
      body: `MessageSid=${MESSAGE_SID}&MessageSid=${MESSAGE_SID}&MessageStatus=delivered`,
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_status_payload" });
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects conflicting Twilio alias fields after signature verification", async () => {
    const response = await POST(request("delivered", {
      body: new URLSearchParams({
        MessageSid: MESSAGE_SID,
        SmsSid: `SM${"c".repeat(32)}`,
        MessageStatus: "delivered",
      }).toString(),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_status_payload" });
    expect(verify).toHaveBeenCalledOnce();
    expect(query).not.toHaveBeenCalled();
  });

  it("fails safely when the database is not configured", async () => {
    delete process.env.DATABASE_URL;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "database_not_configured" });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a retryable safe failure when the atomic write fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    query.mockRejectedValue(new Error("synthetic database detail that must stay private"));
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ error: "database_unavailable" });
    expect(JSON.stringify(body)).not.toContain("synthetic database detail");
    expect(error).toHaveBeenCalledWith(
      "[twilio-status-webhook] atomic persistence failed",
      expect.objectContaining({ error: "database_unavailable" }),
    );
    error.mockRestore();
  });

  it("fails safely when persistence cannot confirm a durable receipt", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    query.mockResolvedValue([]);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "database_unavailable" });
    expect(error).toHaveBeenCalledWith(
      "[twilio-status-webhook] atomic persistence returned no receipt",
      expect.objectContaining({ error: "receipt_not_confirmed" }),
    );
    error.mockRestore();
  });
});
