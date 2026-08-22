import { beforeEach, describe, expect, it, vi } from "vitest";

const neonState = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(vi.fn(), { query: neonState.query }),
}));

import { NeonPushSubscriptionRepository } from "../../app/lib/persistence/neonPushSubscriptionRepository";

const subscription = {
  endpoint: "https://push.example.test/device",
  keys: {
    p256dh: "abcdefghijklmnopqrstuvwxyz123456",
    auth: "abcdefghijklmnopqrstuvwxyz123456",
  },
};

const savedCopy = {
  id: "11111111-1111-4111-8111-111111111111",
  recipient_role: "copy",
  endpoint: subscription.endpoint,
  p256dh: subscription.keys.p256dh,
  auth: subscription.keys.auth,
  device_label: "Brandon iPhone",
  user_agent: "Synthetic browser",
  is_active: true,
};

describe("NeonPushSubscriptionRepository scoped enrollment", () => {
  beforeEach(() => {
    neonState.query.mockReset();
  });

  it("prevents copy setup from changing an existing recipient role", async () => {
    neonState.query
      .mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([savedCopy]);
    const repository = new NeonPushSubscriptionRepository("postgresql://unit.invalid/neondb");

    await expect(repository.upsertCopy(subscription, "Synthetic browser", "Brandon iPhone"))
      .resolves.toMatchObject({ recipientRole: "copy", deviceLabel: "Brandon iPhone" });

    const [sql, params] = neonState.query.mock.calls[1];
    expect(sql).toContain("WHERE $7::boolean OR existing.recipient_role = EXCLUDED.recipient_role");
    expect(params[0]).toBe("copy");
    expect(params[6]).toBe(false);
  });

  it("returns a controlled conflict when the endpoint belongs to the primary role", async () => {
    neonState.query
      .mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([]);
    const repository = new NeonPushSubscriptionRepository("postgresql://unit.invalid/neondb");

    await expect(repository.upsertCopy(subscription, null, "Brandon iPhone"))
      .rejects.toThrow("push_subscription_role_conflict");
  });

  it("retains explicit role reassignment for the authenticated admin operation", async () => {
    neonState.query
      .mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([savedCopy]);
    const repository = new NeonPushSubscriptionRepository("postgresql://unit.invalid/neondb");

    await repository.upsert("copy", subscription, null, "Brandon iPhone");
    const [, params] = neonState.query.mock.calls[1];
    expect(params[6]).toBe(true);
  });
});
