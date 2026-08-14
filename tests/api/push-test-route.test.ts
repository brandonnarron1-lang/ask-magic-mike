import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findActiveById: vi.fn(),
  send: vi.fn(),
}));

vi.mock("../../app/lib/persistence/neonPushSubscriptionRepository", () => ({
  NeonPushSubscriptionRepository: class {
    findActiveById = mocks.findActiveById;
  },
}));

vi.mock("../../app/lib/leadNotificationProvider", () => ({
  WebPushNotificationProvider: class {
    send = mocks.send;
  },
}));

import { POST } from "../../app/admin/api/push/test/route";

const COPY_ID = "11111111-1111-4111-8111-111111111111";
const PRIMARY_ID = "22222222-2222-4222-8222-222222222222";

const originalAdminSecret = process.env.ADMIN_SECRET;

function request(subscriptionId: string, origin = "http://localhost", password = "test-admin-secret") {
  return new NextRequest("http://localhost/admin/api/push/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin,
      authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`,
    },
    body: JSON.stringify({ subscription_id: subscriptionId }),
  });
}

describe("POST /admin/api/push/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "test-admin-secret";
    mocks.findActiveById.mockResolvedValue({ id: COPY_ID, recipientRole: "copy" });
    mocks.send.mockResolvedValue({ ok: true, provider: "web_push", providerMessageId: "test-id" });
  });

  afterEach(() => {
    if (originalAdminSecret === undefined) delete (process.env as Record<string, string | undefined>).ADMIN_SECRET;
    else process.env.ADMIN_SECRET = originalAdminSecret;
  });

  it("enforces route-level admin authentication even if middleware is bypassed", async () => {
    const response = await POST(request(COPY_ID, "http://localhost", "wrong"));
    expect(response.status).toBe(401);
    expect(mocks.findActiveById).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends an unmistakable QA alert only to an active Brandon copy subscription", async () => {
    const response = await POST(request(COPY_ID));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, provider: "web_push", test: true });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      recipient: COPY_ID,
      subject: "[TEST] Ask Magic Mike phone alerts",
      text: expect.stringContaining("No lead was created"),
    }));
  });

  it("refuses primary/Mike subscriptions", async () => {
    mocks.findActiveById.mockResolvedValue({ id: PRIMARY_ID, recipientRole: "primary" });
    const response = await POST(request(PRIMARY_ID));
    expect(response.status).toBe(404);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("enforces exact same-origin requests", async () => {
    const response = await POST(request(COPY_ID, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.findActiveById).not.toHaveBeenCalled();
  });
});
