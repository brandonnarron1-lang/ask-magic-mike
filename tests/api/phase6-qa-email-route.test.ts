import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/admin/qa/email/route";

const ORIGINAL_ENV = { ...process.env };

function request(secret = "qa-secret") {
  return new NextRequest("https://preview.example.test/api/admin/qa/email", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("Phase 6 Brandon-only QA email route", () => {
  it("is unavailable in Production without a separate production QA gate", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await POST(request());
    expect(response.status).toBe(409);
  });

  it("permits the exact test-only contract when the production QA gate is explicit", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.QA_EMAIL_PRODUCTION_ENABLED = "true";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "provider_test_2" }), { status: 200 })));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mike_delivery_requested: false, consumer_delivery_requested: false });
  });

  it("rejects an invalid bearer secret", async () => {
    const response = await POST(request("wrong"));
    expect(response.status).toBe(401);
  });

  it("fails closed when the exact recipient is not allowlisted", async () => {
    process.env.QA_EMAIL_ALLOWED_RECIPIENTS = "someone-else@example.test";
    const response = await POST(request());
    expect(response.status).toBe(409);
  });

  it("sends one idempotent test-only message without BCC or consumer recipients", async () => {
    const transport = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.to).toBe("brandon@example.test");
      expect(body.subject).toMatch(/^\[TEST — BRANDON QA\]/);
      expect(body).not.toHaveProperty("bcc");
      expect(String(init?.headers)).not.toContain("mike");
      return new Response(JSON.stringify({ id: "provider_test_1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", transport);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      recipient: "approved_brandon_qa",
      mike_delivery_requested: false,
      consumer_delivery_requested: false,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
