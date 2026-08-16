import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";

const query = vi.fn();
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));

import { POST } from "../../app/api/webhooks/email/events/route";

const secret = `whsec_${Buffer.from("phase7-webhook-test-secret-32bytes").toString("base64")}`;

function request(payload: Record<string, unknown>, valid = true) {
  const raw = JSON.stringify(payload);
  const id = "msg_phase7_webhook_1";
  const timestamp = new Date();
  const signature = valid ? new Webhook(secret).sign(id, timestamp, raw) : "v1,invalid";
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/email/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
    body: raw,
  });
}

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = secret;
  process.env.RESEND_WEBHOOK_ENABLED = "true";
  process.env.DATABASE_URL = "postgresql://test.invalid/test";
  query.mockReset();
  query.mockImplementation(async (statement: string) => {
    if (statement.includes("FROM public.provider_webhook_events")) return [];
    if (statement.includes("FROM public.lead_notifications")) return [{ id: "11111111-1111-4111-8111-111111111111", lead_id: "22222222-2222-4222-8222-222222222222", status: "sent" }];
    return [];
  });
});

describe("Phase 7 Resend webhook", () => {
  it("rejects an invalid signature before database work", async () => {
    const response = await POST(request({ type: "email.delivered", data: { email_id: "email_1" } }, false));
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("records a verified provider lifecycle event", async () => {
    const response = await POST(request({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: "email_1" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, event_type: "delivered", matched_notification: true });
    expect(query.mock.calls.some(([statement]) => String(statement).includes("INSERT INTO public.provider_webhook_events"))).toBe(true);
    expect(query.mock.calls.some(([statement]) => String(statement).includes("INSERT INTO public.communication_events"))).toBe(true);
    const notificationUpdate = query.mock.calls.find(([statement]) =>
      String(statement).includes("UPDATE public.lead_notifications"));
    expect(notificationUpdate?.[1]?.slice(0, 3)).toEqual([false, "resend_delivered", true]);
    expect(JSON.parse(String(notificationUpdate?.[1]?.[4]))).toMatchObject({
      provider_last_event: "delivered",
      provider_delivery_confirmed: true,
    });
  });

  it("records delayed delivery without marking a terminal failure", async () => {
    const response = await POST(request({ type: "email.delivery_delayed", created_at: new Date().toISOString(), data: { email_id: "email_1" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, event_type: "delivery_delayed" });
    const notificationUpdate = query.mock.calls.find(([statement]) =>
      String(statement).includes("UPDATE public.lead_notifications"));
    expect(notificationUpdate?.[1]?.slice(0, 3)).toEqual([false, "resend_delivery_delayed", false]);
  });

  it("returns an idempotent success for duplicate provider events", async () => {
    query.mockImplementation(async (statement: string) => {
      if (statement.includes("FROM public.provider_webhook_events")) {
        return [{ id: "33333333-3333-4333-8333-333333333333", processing_status: "processed" }];
      }
      return [];
    });
    const response = await POST(request({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: "email_1" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: true, event_type: "delivered" });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("suppresses email after a verified complaint", async () => {
    const response = await POST(request({ type: "email.complained", created_at: new Date().toISOString(), data: { email_id: "email_1" } }));
    expect(response.status).toBe(200);
    expect(query.mock.calls.some(([statement]) => String(statement).includes("SET email_suppressed = true"))).toBe(true);
  });

  it("marks a verified bounce terminal and suppresses future email", async () => {
    const response = await POST(request({ type: "email.bounced", created_at: new Date().toISOString(), data: { email_id: "email_1" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, event_type: "bounced" });
    const notificationUpdate = query.mock.calls.find(([statement]) =>
      String(statement).includes("UPDATE public.lead_notifications"));
    expect(notificationUpdate?.[1]?.slice(0, 3)).toEqual([true, "resend_bounced", false]);
    expect(JSON.parse(String(notificationUpdate?.[1]?.[4]))).toMatchObject({
      provider_last_event: "bounced",
      provider_terminal_failure: true,
    });
    expect(query.mock.calls.some(([statement]) => String(statement).includes("SET email_suppressed = true"))).toBe(true);
  });
});
