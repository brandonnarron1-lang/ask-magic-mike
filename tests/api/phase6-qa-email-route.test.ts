import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BRANDED_EMAIL_TEMPLATE_VERSION } from "../../src/lib/messaging/template-registry";

const query = vi.fn();
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
import { POST } from "../../app/api/admin/qa/email/route";

const ORIGINAL_ENV = { ...process.env };
const leadId = "11111111-1111-4111-8111-111111111111";

function request(secret = "qa-secret", body: Record<string, unknown> = { leadId, qaAudience: "brandon" }) {
  return new NextRequest("https://preview.example.test/api/admin/qa/email", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.VERCEL_ENV = "preview";
  process.env.QA_EMAIL_SEND_SECRET = "qa-secret";
  process.env.QA_EMAIL_ENABLED = "true";
  process.env.QA_TEST_RECIPIENT_OVERRIDE_ENABLED = "true";
  process.env.QA_EMAIL_RECIPIENT = "brandon@example.test";
  process.env.QA_EMAIL_ALLOWED_RECIPIENTS = "brandon@example.test";
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM = "qa@example.test";
  process.env.VERCEL_GIT_COMMIT_SHA = "test-sha";
  process.env.DATABASE_URL = "postgresql://test.invalid/test";
  query.mockReset();
  query.mockImplementation(async (statement: string) => {
    if (statement.includes("FROM public.leads")) return [{ id: leadId, is_test: true, communication_suppressed: true }];
    if (statement.includes("count(*)")) return [{ count: 0 }];
    if (statement.includes("WHERE idempotency_key")) return [];
    if (statement.includes("INSERT INTO public.lead_notifications")) return [{ id: "22222222-2222-4222-8222-222222222222" }];
    return [];
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("Phase 7 Brandon-only QA email route", () => {
  it("is unavailable in Production without a separate production QA gate", async () => {
    process.env.VERCEL_ENV = "production";
    expect((await POST(request())).status).toBe(409);
  });

  it("rejects an invalid bearer secret", async () => {
    expect((await POST(request("wrong"))).status).toBe(401);
  });

  it("fails closed unless the QA lead is both test and suppressed", async () => {
    query.mockImplementation(async (statement: string) => statement.includes("FROM public.leads")
      ? [{ id: leadId, is_test: true, communication_suppressed: false }]
      : []);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "qa_record_not_suppressed" });
  });

  it("sends one idempotent test-only message without BCC or consumer recipients", async () => {
    const transport = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.to).toBe("brandon@example.test");
      expect(body.subject).toMatch(/^\[TEST — BRANDON QA\]/);
      expect(body.text).toContain("3301 Nash St. NW Suite E, Wilson, NC 27896");
      expect(body.html).toContain("3301 Nash St. NW Suite E, Wilson, NC 27896");
      expect(body).not.toHaveProperty("bcc");
      return new Response(JSON.stringify({ id: "provider_test_1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", transport);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, recipient: "approved_brandon_qa", mike_delivery_requested: false, consumer_delivery_requested: false });
    expect(transport).toHaveBeenCalledTimes(1);
    const notificationInsert = query.mock.calls.find((call) => String(call[0]).includes("INSERT INTO public.lead_notifications"));
    expect(notificationInsert?.[1]?.[2]).toBe(BRANDED_EMAIL_TEMPLATE_VERSION);
  });
});
