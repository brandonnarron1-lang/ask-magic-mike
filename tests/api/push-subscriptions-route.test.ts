import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listActive: vi.fn(),
  upsert: vi.fn(),
  deactivate: vi.fn(),
}));

vi.mock("../../app/lib/persistence/neonPushSubscriptionRepository", () => ({
  NeonPushSubscriptionRepository: class {
    listActive = mocks.listActive;
    upsert = mocks.upsert;
    deactivate = mocks.deactivate;
  },
}));

import { DELETE, GET, POST } from "../../app/admin/api/push/subscriptions/route";

const SUBSCRIPTION_ID = "11111111-1111-4111-8111-111111111111";
const originalAdminSecret = process.env.ADMIN_SECRET;

function basic(password = "test-admin-secret") {
  return `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`;
}

function request(method: "GET" | "POST" | "DELETE", options: {
  password?: string;
  origin?: string;
  body?: unknown;
  id?: string;
} = {}) {
  const url = new URL("http://localhost/admin/api/push/subscriptions");
  if (options.id) url.searchParams.set("id", options.id);
  return new NextRequest(url, {
    method,
    headers: {
      authorization: basic(options.password),
      origin: options.origin ?? "http://localhost",
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

describe("/admin/api/push/subscriptions route-level security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "test-admin-secret";
    mocks.listActive.mockResolvedValue([]);
    mocks.upsert.mockResolvedValue({ id: SUBSCRIPTION_ID, recipientRole: "copy" });
    mocks.deactivate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalAdminSecret === undefined) delete (process.env as Record<string, string | undefined>).ADMIN_SECRET;
    else process.env.ADMIN_SECRET = originalAdminSecret;
  });

  it("rejects every operation without valid Basic authentication", async () => {
    expect((await GET(request("GET", { password: "wrong" }))).status).toBe(401);
    expect((await POST(request("POST", { password: "wrong", body: {} }))).status).toBe(401);
    expect((await DELETE(request("DELETE", { password: "wrong", id: SUBSCRIPTION_ID }))).status).toBe(401);
    expect(mocks.listActive).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it("lists only non-sensitive subscription metadata for an authenticated admin", async () => {
    mocks.listActive.mockResolvedValue([{
      id: SUBSCRIPTION_ID,
      recipientRole: "copy",
      deviceLabel: "Brandon iPhone",
      userAgent: "Synthetic QA browser",
      endpoint: "https://push.example.test/private-endpoint",
    }]);
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.subscriptions[0]).toEqual({
      id: SUBSCRIPTION_ID,
      role: "copy",
      device: "Brandon iPhone",
    });
    expect(JSON.stringify(body)).not.toContain("private-endpoint");
  });

  it("stores an operator-readable device label without returning push capability data", async () => {
    const response = await POST(request("POST", {
      body: {
        role: "copy",
        device_name: "Brandon iPhone",
        subscription: {
          endpoint: "https://push.example.test/subscription",
          keys: { p256dh: "abcdefghijklmnopqrstuvwxyz", auth: "abcdefghijklmnopqrstuvwxyz" },
        },
      },
    }));

    expect(response.status).toBe(201);
    expect(mocks.upsert).toHaveBeenCalledWith(
      "copy",
      expect.any(Object),
      null,
      "Brandon iPhone",
    );
    expect(JSON.stringify(await response.json())).not.toContain("push.example.test");
  });

  it("keeps same-origin enforcement on authenticated mutations", async () => {
    const response = await POST(request("POST", {
      origin: "https://attacker.example",
      body: {
        role: "copy",
        subscription: {
          endpoint: "https://push.example.test/subscription",
          keys: { p256dh: "abcdefghijklmnopqrstuvwxyz", auth: "abcdefghijklmnopqrstuvwxyz" },
        },
      },
    }));
    expect(response.status).toBe(403);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
