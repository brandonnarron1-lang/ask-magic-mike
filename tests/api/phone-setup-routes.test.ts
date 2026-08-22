import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PHONE_SETUP_COOKIE,
  mintPhoneSetupSessionToken,
  mintPhoneSetupToken,
} from "../../app/lib/phoneSetupSession";

const mocks = vi.hoisted(() => ({
  upsertCopy: vi.fn(),
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
    upsertCopy = mocks.upsertCopy;
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
  vercel: process.env.VERCEL_ENV,
  vercelUrl: process.env.VERCEL_URL,
  vercelBranchUrl: process.env.VERCEL_BRANCH_URL,
  rbac: process.env.LEAD_CENTER_RBAC_ENABLED,
  node: process.env.NODE_ENV,
};

function sessionCookie() {
  const invite = mintPhoneSetupToken();
  return `${PHONE_SETUP_COOKIE}=${mintPhoneSetupSessionToken(invite.claims).token}`;
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

function setNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
}

describe("passwordless Brandon phone setup routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "test-admin-secret";
    process.env.PHONE_SETUP_SIGNING_SECRET = "test-phone-setup-signing-secret-that-is-long-enough";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com";
    process.env.LEAD_CENTER_RBAC_ENABLED = "false";
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: true });
    mocks.upsertCopy.mockResolvedValue({ id: COPY_ID, recipientRole: "copy" });
    mocks.findActiveById.mockResolvedValue({ id: COPY_ID, recipientRole: "copy" });
    mocks.send.mockResolvedValue({ ok: true, provider: "web_push" });
  });

  afterEach(() => {
    if (originalEnv.admin === undefined) delete (process.env as Record<string, string | undefined>).ADMIN_SECRET; else process.env.ADMIN_SECRET = originalEnv.admin;
    if (originalEnv.signing === undefined) delete process.env.PHONE_SETUP_SIGNING_SECRET; else process.env.PHONE_SETUP_SIGNING_SECRET = originalEnv.signing;
    if (originalEnv.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = originalEnv.site;
    if (originalEnv.vercel === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalEnv.vercel;
    if (originalEnv.vercelUrl === undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL = originalEnv.vercelUrl;
    if (originalEnv.vercelBranchUrl === undefined) delete process.env.VERCEL_BRANCH_URL; else process.env.VERCEL_BRANCH_URL = originalEnv.vercelBranchUrl;
    if (originalEnv.rbac === undefined) delete process.env.LEAD_CENTER_RBAC_ENABLED; else process.env.LEAD_CENTER_RBAC_ENABLED = originalEnv.rbac;
    setNodeEnv(originalEnv.node);
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

  it("disables the legacy secret-header invite path once Lead Center RBAC is enabled", async () => {
    process.env.LEAD_CENTER_RBAC_ENABLED = "true";
    const response = await invite(post("/api/phone-alerts/invite", { ttl_minutes: 10 }, {
      "x-admin-secret": "test-admin-secret",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "legacy_admin_auth_disabled" });
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

  it("constructs Preview links only on the exact Ask Magic Mike deployment origin", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "ask-magic-mike-exact-eyes-up-industries.vercel.app";
    process.env.VERCEL_BRANCH_URL = "ask-magic-mike-branch-eyes-up-industries.vercel.app";

    const exactOrigin = "https://ask-magic-mike-exact-eyes-up-industries.vercel.app";
    const exactResponse = await invite(new NextRequest(`${exactOrigin}/api/phone-alerts/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: exactOrigin,
        "x-admin-secret": "test-admin-secret",
      },
      body: JSON.stringify({ ttl_minutes: 10 }),
    }));
    expect(exactResponse.status).toBe(200);
    expect((await exactResponse.json()).url).toMatch(
      /^https:\/\/ask-magic-mike-exact-eyes-up-industries\.vercel\.app\/phone-alerts\/install\//,
    );

    process.env.NEXT_PUBLIC_SITE_URL = "https://nellyselly.com";
    const unrelatedOrigin = "https://nellyselly-preview.vercel.app";
    const unrelatedResponse = await invite(new NextRequest(`${unrelatedOrigin}/api/phone-alerts/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: unrelatedOrigin,
        "x-admin-secret": "test-admin-secret",
      },
      body: JSON.stringify({ ttl_minutes: 10 }),
    }));
    expect(unrelatedResponse.status).toBe(403);
    expect(await unrelatedResponse.json()).toEqual({ ok: false, error: "invalid_origin" });
  });

  it("exchanges a valid invite for a secure HttpOnly setup cookie and cleans the URL", async () => {
    const token = mintPhoneSetupToken().token;
    const response = await claim(new NextRequest(`https://www.askmagicmike.com/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.askmagicmike.com/phone-alerts/setup");
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toContain(`${PHONE_SETUP_COOKIE}=`);
    expect(cookie).not.toContain(token);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=strict");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("allows the installed app to reopen its claimed session but blocks token replay elsewhere", async () => {
    const token = mintPhoneSetupToken().token;
    const claimedNonces = new Set<string>();
    mocks.checkRateLimit.mockImplementation(async (key: string) => {
      if (!key.startsWith("phone-setup-claim:")) {
        return { allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: true };
      }
      const allowed = !claimedNonces.has(key);
      claimedNonces.add(key);
      return { allowed, remaining: allowed ? 0 : 0, resetAt: Date.now() + 30 * 60_000, durable: true };
    });

    const claimUrl = `https://www.askmagicmike.com/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`;
    const first = await claim(new NextRequest(claimUrl));
    expect(first.headers.get("location")).toBe("https://www.askmagicmike.com/phone-alerts/setup");
    expect(first.headers.get("set-cookie")).toContain(`${PHONE_SETUP_COOKIE}=`);

    const replay = await claim(new NextRequest(claimUrl));
    expect(replay.headers.get("location")).toContain("error=already_claimed");
    expect(replay.headers.get("set-cookie")).toBeNull();

    const setupCookie = (first.headers.get("set-cookie") || "").split(";")[0];
    const installedAppReopen = await claim(new NextRequest(claimUrl, {
      headers: { cookie: setupCookie },
    }));
    expect(installedAppReopen.headers.get("location")).toBe("https://www.askmagicmike.com/phone-alerts/setup");
    expect(installedAppReopen.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed when Production cannot durably enforce a one-time claim", async () => {
    process.env.VERCEL_ENV = "production";
    mocks.checkRateLimit.mockImplementation(async (key: string) => key.startsWith("phone-setup-claim:")
      ? { allowed: false, remaining: 0, resetAt: Date.now() + 60_000, durable: false }
      : { allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: false });
    const token = mintPhoneSetupToken().token;
    const response = await claim(new NextRequest(
      `https://www.askmagicmike.com/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`,
    ));
    expect(response.headers.get("location")).toContain("error=claim_unavailable");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("also fails closed on owned/self-hosted Production without Vercel metadata", async () => {
    delete process.env.VERCEL_ENV;
    setNodeEnv("production");
    mocks.checkRateLimit.mockImplementation(async (key: string) => key.startsWith("phone-setup-claim:")
      ? { allowed: true, remaining: 0, resetAt: Date.now() + 60_000, durable: false }
      : { allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: false });

    const token = mintPhoneSetupToken().token;
    const response = await claim(new NextRequest(
      `https://www.askmagicmike.com/phone-alerts/setup/claim?token=${encodeURIComponent(token)}`,
    ));
    expect(response.headers.get("location")).toContain("error=claim_unavailable");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("serves a private token-scoped manifest whose start URL transfers inside the installed app", async () => {
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
      id: "/phone-alerts/",
      scope: "/phone-alerts/",
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

  it("links a valid install page only to its own token-scoped manifest", async () => {
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
    expect(mocks.upsertCopy).toHaveBeenCalledWith(expect.any(Object), null, "Brandon iPhone");
  });

  it("rejects a raw bearer invite pasted directly into the setup cookie", async () => {
    const invite = mintPhoneSetupToken().token;
    const request = post("/api/phone-alerts/subscription", {
      device_name: "Brandon iPhone",
      subscription: {
        endpoint: "https://push.example.test/subscription",
        keys: { p256dh: "abcdefghijklmnopqrstuvwxyz123456", auth: "abcdefghijklmnopqrstuvwxyz123456" },
      },
    }, { cookie: `${PHONE_SETUP_COOKIE}=${invite}`, "x-amm-phone-setup": "1" });

    expect((await subscribe(request)).status).toBe(401);
    expect(mocks.upsertCopy).not.toHaveBeenCalled();
  });

  it("rejects registration without the scoped cookie or custom CSRF header", async () => {
    const body = { subscription: { endpoint: "https://push.example.test/x", keys: { p256dh: "abcdefghijklmnopqrstuvwxyz", auth: "abcdefghijklmnopqrstuvwxyz" } } };
    expect((await subscribe(post("/api/phone-alerts/subscription", body, { "x-amm-phone-setup": "1" }))).status).toBe(401);
    expect((await subscribe(post("/api/phone-alerts/subscription", body, { cookie: sessionCookie() }))).status).toBe(403);
    expect(mocks.upsertCopy).not.toHaveBeenCalled();
  });

  it("cannot relabel an existing Mike/primary endpoint as a Brandon copy device", async () => {
    mocks.upsertCopy.mockRejectedValueOnce(new Error("push_subscription_role_conflict"));
    const response = await subscribe(post("/api/phone-alerts/subscription", {
      device_name: "Brandon iPhone",
      subscription: {
        endpoint: "https://push.example.test/mike-primary-endpoint",
        keys: { p256dh: "abcdefghijklmnopqrstuvwxyz123456", auth: "abcdefghijklmnopqrstuvwxyz123456" },
      },
    }, { cookie: sessionCookie(), "x-amm-phone-setup": "1" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "push_subscription_role_conflict" });
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

  it("allows only one QA Push per setup session and copy subscription", async () => {
    const seen = new Set<string>();
    mocks.checkRateLimit.mockImplementation(async (key: string) => {
      if (!key.startsWith("phone-setup-test:")) {
        return { allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: true };
      }
      const allowed = !seen.has(key);
      seen.add(key);
      return { allowed, remaining: 0, resetAt: Date.now() + 30 * 60_000, durable: true };
    });
    const cookie = sessionCookie();
    const headers = { cookie, "x-amm-phone-setup": "1" };

    expect((await sendTest(post("/api/phone-alerts/test", { subscription_id: COPY_ID }, headers))).status).toBe(200);
    expect((await sendTest(post("/api/phone-alerts/test", { subscription_id: COPY_ID }, headers))).status).toBe(409);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("fails closed when Production cannot durably enforce the one-shot QA Push", async () => {
    process.env.VERCEL_ENV = "production";
    mocks.checkRateLimit.mockImplementation(async (key: string) => key.startsWith("phone-setup-test:")
      ? { allowed: true, remaining: 0, resetAt: Date.now() + 60_000, durable: false }
      : { allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: true });

    const response = await sendTest(post("/api/phone-alerts/test", { subscription_id: COPY_ID }, {
      cookie: sessionCookie(),
      "x-amm-phone-setup": "1",
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "push_test_guard_unavailable" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("also fails closed for QA Push on self-hosted Production", async () => {
    delete process.env.VERCEL_ENV;
    setNodeEnv("production");
    mocks.checkRateLimit.mockImplementation(async (key: string) => key.startsWith("phone-setup-test:")
      ? { allowed: true, remaining: 0, resetAt: Date.now() + 60_000, durable: false }
      : { allowed: true, remaining: 9, resetAt: Date.now() + 60_000, durable: true });

    const response = await sendTest(post("/api/phone-alerts/test", { subscription_id: COPY_ID }, {
      cookie: sessionCookie(),
      "x-amm-phone-setup": "1",
    }));
    expect(response.status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
