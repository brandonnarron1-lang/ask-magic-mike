import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";

const query = vi.fn();
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));

import { POST } from "../../app/api/webhooks/email/events/route";

const secret = `whsec_${Buffer.from("phase7-webhook-test-secret-32bytes").toString("base64")}`;

function request(
  payload: Record<string, unknown>,
  options: {
    validSignature?: boolean;
    eventId?: string;
    contentType?: string;
    contentLength?: string;
    raw?: string;
  } = {},
) {
  const raw = options.raw ?? JSON.stringify(payload);
  const id = options.eventId ?? "msg_phase7_webhook_1";
  const timestamp = new Date();
  const signature = options.validSignature === false
    ? "v1,invalid"
    : new Webhook(secret).sign(id, timestamp, raw);
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/email/events", {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/json",
      ...(options.contentLength ? { "content-length": options.contentLength } : {}),
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1_000)),
      "svix-signature": signature,
    },
    body: raw,
  });
}

function resultFor(params: unknown[] | undefined, overrides: Record<string, unknown> = {}) {
  return [{
    claimed: true,
    matched_notification: true,
    processing_status: "processed",
    recorded_payload_hash: params?.[3],
    notification_updated: 1,
    communication_recorded: 1,
    lead_suppressed: 0,
    ...overrides,
  }];
}

async function expectPrivateCorrelation(response: Response) {
  const body = await response.json();
  expect(response.headers.get("cache-control")).toContain("private");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(body.correlation_id).toBe(response.headers.get("x-amm-correlation-id"));
  return body;
}

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = secret;
  process.env.RESEND_WEBHOOK_ENABLED = "true";
  process.env.DATABASE_URL = "postgresql://test.invalid/test";
  delete process.env.VERCEL_ENV;
  delete process.env.DATABASE_ENV;
  query.mockReset();
  query.mockImplementation(async (_statement: string, params?: unknown[]) => resultFor(params));
});

describe("Phase 7 Resend webhook", () => {
  it("rejects an invalid signature before database work", async () => {
    const response = await POST(request(
      { type: "email.delivered", data: { email_id: "email_1" } },
      { validSignature: false },
    ));
    expect(response.status).toBe(400);
    expect(await expectPrivateCorrelation(response)).toMatchObject({
      ok: false,
      error: "invalid_signature",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("refuses Preview before reading or writing provider data", async () => {
    process.env.VERCEL_ENV = "preview";
    const response = await POST(request({
      type: "email.delivered",
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(503);
    expect(await expectPrivateCorrelation(response)).toMatchObject({
      ok: false,
      error: "preview_data_disabled",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("requires JSON and rejects a declared oversized body before database work", async () => {
    const unsupported = await POST(request(
      { type: "email.sent", data: { email_id: "email_1" } },
      { contentType: "text/plain" },
    ));
    expect(unsupported.status).toBe(415);
    expect((await unsupported.json()).error).toBe("unsupported_media_type");

    const oversized = await POST(request(
      { type: "email.sent", data: { email_id: "email_1" } },
      { contentLength: "256001" },
    ));
    expect(oversized.status).toBe(413);
    expect((await oversized.json()).error).toBe("payload_too_large");
    expect(query).not.toHaveBeenCalled();
  });

  it("stream-bounds a body when Content-Length is absent", async () => {
    const raw = JSON.stringify({
      type: "email.sent",
      data: { email_id: "email_1", padding: "x".repeat(256_000) },
    });
    const response = await POST(request({}, { raw }));
    expect(response.status).toBe(413);
    expect((await response.json()).error).toBe("payload_too_large");
    expect(query).not.toHaveBeenCalled();
  });

  it("records a verified provider lifecycle event in one atomic statement", async () => {
    const rawPayload = {
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1", to: ["private-recipient@example.com"] },
    };
    const response = await POST(request(rawPayload));
    expect(response.status).toBe(200);
    expect(await expectPrivateCorrelation(response)).toMatchObject({
      ok: true,
      duplicate: false,
      event_type: "delivered",
      matched_notification: true,
    });
    expect(query).toHaveBeenCalledTimes(1);
    const [statement, params] = query.mock.calls[0] as [string, unknown[]];
    expect(statement).toContain("WITH notification_candidate AS MATERIALIZED");
    expect(statement).toContain("claimed_webhook AS");
    expect(statement).toContain("notification_update AS");
    expect(statement).toContain("communication_insert AS");
    expect(statement).toContain("lead_suppression AS");
    expect(statement).toContain("WHERE receipt.processing_status = 'failed'");
    expect(params[5]).toBe(false);
    expect(params[7]).toBe(true);
    expect(params[9]).toBe(false);
    expect(JSON.parse(String(params[8]))).toMatchObject({
      provider_last_event: "delivered",
      provider_delivery_confirmed: true,
    });
    expect(JSON.stringify(params)).not.toContain("private-recipient@example.com");
  });

  it("records delayed delivery without marking a terminal failure", async () => {
    const response = await POST(request({
      type: "email.delivery_delayed",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, event_type: "delivery_delayed" });
    const params = query.mock.calls[0]?.[1] as unknown[];
    expect(params[5]).toBe(false);
    expect(params[7]).toBe(false);
    expect(params[9]).toBe(false);
  });

  it("returns an idempotent success for an exact duplicate provider event", async () => {
    query.mockImplementation(async (_statement: string, params?: unknown[]) => resultFor(params, {
      claimed: false,
      matched_notification: false,
      notification_updated: 0,
      communication_recorded: 0,
    }));
    const response = await POST(request({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      duplicate: true,
      event_type: "delivered",
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rejects a provider event id reused with a different payload", async () => {
    query.mockImplementation(async (_statement: string, params?: unknown[]) => resultFor(params, {
      claimed: false,
      matched_notification: false,
      recorded_payload_hash: createHash("sha256").update("different").digest("hex"),
    }));
    const response = await POST(request({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: "event_id_conflict" });
  });

  it("marks a verified bounce terminal and suppresses future email", async () => {
    const response = await POST(request({
      type: "email.bounced",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(200);
    const params = query.mock.calls[0]?.[1] as unknown[];
    expect(params[5]).toBe(true);
    expect(params[6]).toBe("resend_bounced");
    expect(params[7]).toBe(false);
    expect(params[9]).toBe(true);
    expect(JSON.parse(String(params[8]))).toMatchObject({
      provider_last_event: "bounced",
      provider_terminal_failure: true,
    });
  });

  it("rejects unsupported signed events before database work", async () => {
    const response = await POST(request({
      type: "email.scheduled",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe("event_not_supported");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a retryable private failure without exposing database errors", async () => {
    query.mockRejectedValueOnce(new Error("postgresql://secret@example.invalid leaked detail"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(request({
      type: "email.sent",
      created_at: new Date().toISOString(),
      data: { email_id: "email_1" },
    }));
    expect(response.status).toBe(503);
    expect(await expectPrivateCorrelation(response)).toMatchObject({
      ok: false,
      error: "database_unavailable",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret@example.invalid");
    errorSpy.mockRestore();
  });
});
