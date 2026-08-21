import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHONE_SETUP_COOKIE, mintPhoneSetupToken } from "../../app/lib/phoneSetupSession";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findActiveById: vi.fn(),
  send: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { phoneSetup: { limit: 10, windowMs: 600_000 } },
  rateLimitKey: () => "test-ip",
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock("../../app/lib/persistence/neonPushSubscriptionRepository", () => ({
  NeonPushSubscriptionRepository: class {
    upsert = mocks.upsert;
    findActiveById = mocks.findActiveById;
  },
}));

vi.mock("../../app/lib/leadNotificationProvider", () => ({
  WebPushNotificationProvider: class { send = mocks.send; },
}));

import { POST as invite } from "../../app/api/phone-alerts/invite/route";
import { POST as adminInvite } from "../../app/admin/api/phone-alerts/invite/route";
import { POST as subscribe } from "../../app/api/phone-alerts/subscription/route";
import { POST as sendTest } from "../../app/api/phone-alerts/test/route";
import { GET as claim } from "../../app/phone-alerts/setup/claim/route";
import { GET as installManifest } from "../../app/phone-alerts/install/[token]/manifest.webmanifest/route";
import { generateMetadata as installMetadata } from "../../app/phone-alerts/install/[token]/page";

const COPY_ID = "11111111-1111-4111-8111-111111111111";
const originalEnv = {
  admin: process.env.ADMIN_SECRET,
  signing: process.env.PHONE_SETUP_SIGNING_SECRET,
  site: process.env.NEXT_PUBLIC_SITE_URL,
};

function sessionCookie() {
  return `${PHONE_SETUP_COOKIE}=${mintPhoneSetupToken().token}`;
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://www.askmagicmike.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://www.askmagicmike.com",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("passwordless Brandon phone setup routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "test-admin-secret";
    process.env.PHONE_SETUP_SIGNING_SECRET = "test-phone-setup-signing-secret-that-is-long-enough";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com";
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: true });
    mocks.upsert.mockResolvedValue({ id: COPY_ID, recipientRole: "copy" });
    mocks.findActiveById.mockResolvedValue({ id: COPY_ID, recipientRole: "copy" });
    mocks.send.mockResolvedValue({ ok: true, provider: "web_push" });
  });

  afterEach(() => {
    if (originalEnv.admin === undefined) delete (process.env as Record<string, string | undefined>).ADMIN_SECRET; else process.env.ADMIN_SECRET = originalEnv.admin;
    if (originalEnv.signing === undefined) delete process.env.PHONE_SETUP_SIGNING_SECRET; else process.env.PHONE_SETUP_SIGNING_SECRET = originalEnv.signing;
    if (originalEnv.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = originalEnv.site;
  });

  it("issues a short-lived link only to an authenticated same-origin admin request", async () => {
    const denied = await invite(post("/api/phone-alerts/invite", {}, { "x-admin-secret": "wrong" }));
    expect(denied.status).toBe(401);

    const response = await invite(post("/api/phone-alerts/invite", { ttl_minutes: 10 }, { "x-admin-secret": "test-admin-secret" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.url).toMatch(/^https:\/\/www\.askmagicmike\.com\/phone-alerts\/install\/[A-Za-z0-9_.-]+$/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("lets the authenticated admin page issue the same scoped invite through Basic Auth", async () => {
    const response = await adminInvite(post("/admin/api/phone-alerts/invite", { ttl_minutes: 20 }, {
      authorization: `Basic ${Buffer.from("admin:test-admin-secret").toString("base64")}`,
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.url).toMatch(/^https:\/\/www\.askmagicmike\.com\/phone-alerts\/install\/[A-Za-z0-9_.-]+$/);

    const denied = await adminInvite(post("/admin/api/phone-alerts/invite", {}, {
      authorization: `Basic ${Buffer.from("admin:wrong").toString("base64")}`,
    }));
    expect(denied.status).toBe(401);
  });

  it("exchanges a valid invite for a secure HttpOnly setup cookie and cleans the URL", async () => {
    const token = mintPhoneSetupToken().token;
    const response = await claim(new NextRequest(`https://www.askmagicmike.com/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.askmagicmike.com/phone-alerts/setup");
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toContain(`${PHONE_SETUP_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=strict");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("serves a private token-scoped install manifest whose start URL redeems inside the installed app", async () => {
    const token = mintPhoneSetupToken().token;
    const response = await installManifest(
      new Request(`https://www.askmagicmike.com/phone-alerts/install/${encodeURIComponent(token)}/manifest.webmanifest`),
      { params: Promise.resolve({ token }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/manifest+json");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(body).toMatchObject({
      id: "/phone-alerts",
      scope: "/",
      display: "standalone",
      start_url: `/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`,
    });
  });

  it("never emits an install manifest or manifest link for an invalid token", async () => {
    const response = await installManifest(
      new Request("https://www.askmagicmike.com/phone-alerts/install/invalid/manifest.webmanifest"),
      { params: Promise.resolve({ token: "invalid" }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "phone_setup_link_expired" });
    expect((await installMetadata({ params: Promise.resolve({ token: "invalid" }) })).manifest).toBeUndefined();
  });

  it("links a valid install page to only its own token-scoped manifest", async () => {
    const token = mintPhoneSetupToken().token;
    const metadata = await installMetadata({ params: Promise.resolve({ token }) });
    expect(metadata.manifest).toBe(`/phone-alerts/install/${encodeURIComponent(token)}/manifest.webmanifest`);
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });

  it("never sets a setup cookie for an invalid invite", async () => {
    const response = await claim(new NextRequest("https://www.askmagicmike.com/phone-alerts/setup/claim?token=invalid"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=expired");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("registers only a copy subscription with a valid setup cookie and CSRF header", async () => {
    const request = post("/api/phone-alerts/subscription", {
      device_name: "Brandon iPhone",
      subscription: {
        endpoint: "https://push.example.test/subscription",
        keys: { p256dh: "abcdefghijklmnopqrstuvwxyz123456", auth: "abcdefghijklmnopqrstuvwxyz123456" },
      },
    }, { cookie: sessionCookie(), "x-amm-phone-setup": "1" });
    const response = await subscribe(request);
    expect(response.status).toBe(201);
    expect(mocks.upsert).toHaveBeenCalledWith("copy", expect.any(Object), null, "Brandon iPhone");
  });

  it("rejects registration without the scoped cookie or custom CSRF header", async () => {
    const body = { subscription: { endpoint: "https://push.example.test/x", keys: { p256dh: "abcdefghijklmnopqrstuvwxyz", auth: "abcdefghijklmnopqrstuvwxyz" } } };
    expect((await subscribe(post("/api/phone-alerts/subscription", body, { "x-amm-phone-setup": "1" }))).status).toBe(401);
    expect((await subscribe(post("/api/phone-alerts/subscription", body, { cookie: sessionCookie() }))).status).toBe(403);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("sends only an unmistakable QA push to an active copy subscription", async () => {
    const response = await sendTest(post("/api/phone-alerts/test", { subscription_id: COPY_ID }, {
      cookie: sessionCookie(),
      "x-amm-phone-setup": "1",
    }));
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      recipient: COPY_ID,
      subject: "[TEST] Ask Magic Mike phone alerts",
      text: expect.stringContaining("No lead was created"),
    }));
  });

  it("refuses Mike/primary subscriptions on the scoped test route", async () => {
    mocks.findActiveById.mockResolvedValue({ id: COPY_ID, recipientRole: "primary" });
    const response = await sendTest(post("/api/phone-alerts/test", { subscription_id: COPY_ID }, {
      cookie: sessionCookie(),
      "x-amm-phone-setup": "1",
    }));
    expect(response.status).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
