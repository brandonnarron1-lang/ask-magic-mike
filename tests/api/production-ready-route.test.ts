import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  result: {
    capture_function: true,
    leads_table: true,
    notification_table: true,
    push_subscription_table: true,
  } as Record<string, unknown>,
  query: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => ({ query: mocks.query })),
}));

import { GET } from "../../app/api/health/ready/route";

const pushEnvironmentKeys = [
  "DATABASE_URL",
  "AGENT_PUSH_NOTIFICATIONS_ENABLED",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

describe("production GET /api/health/ready", () => {
  beforeEach(() => {
    mocks.result = {
      capture_function: true,
      leads_table: true,
      notification_table: true,
      push_subscription_table: true,
    };
    mocks.query.mockReset();
    mocks.query.mockImplementation(async () => [mocks.result]);
    process.env.DATABASE_URL = "postgresql://health-check.invalid/neondb";
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "false";
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  afterEach(() => {
    for (const key of pushEnvironmentKeys) delete process.env[key];
  });

  it("is ready when push is intentionally disabled and core lead storage is ready", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, push_enabled: false, push_ready: true });
  });

  it("is ready when enabled push has its table and complete VAPID configuration", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";
    process.env.VAPID_PRIVATE_KEY = "private-test-key";
    process.env.VAPID_SUBJECT = "mailto:alerts@example.test";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      push_enabled: true,
      push_subscription_table: true,
      push_provider_configured: true,
      push_ready: true,
    });
  });

  it("fails readiness when enabled push is missing its subscription table", async () => {
    mocks.result.push_subscription_table = false;
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";
    process.env.VAPID_PRIVATE_KEY = "private-test-key";
    process.env.VAPID_SUBJECT = "https://www.askmagicmike.com";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, push_subscription_table: false, push_ready: false });
  });

  it("fails readiness when enabled push has incomplete provider configuration", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, push_provider_configured: false, push_ready: false });
  });

  it("reports only configuration booleans and never returns VAPID values", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-secret-marker";
    process.env.VAPID_PRIVATE_KEY = "private-secret-marker";
    process.env.VAPID_SUBJECT = "mailto:secret-marker@example.test";

    const body = await (await GET()).json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("public-secret-marker");
    expect(serialized).not.toContain("private-secret-marker");
    expect(serialized).not.toContain("secret-marker@example.test");
  });
});
