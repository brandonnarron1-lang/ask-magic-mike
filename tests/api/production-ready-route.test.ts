import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  result: {
    capture_function: true,
    leads_table: true,
    notification_table: true,
    rbac_schema_ready: true,
    rate_limit_table: true,
    rate_limit_schema_ready: true,
    rate_limit_permissions_ready: true,
    rate_limit_rls_ready: true,
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
  "PHONE_SETUP_SIGNING_SECRET",
  "RATE_LIMIT_HASH_SECRET",
  "CONSENT_IP_HASH_SALT",
  "CRON_SECRET",
  "ADMIN_SECRET",
  "VERCEL_ENV",
] as const;

describe("production GET /api/health/ready", () => {
  beforeEach(() => {
    mocks.result = {
      capture_function: true,
      leads_table: true,
      notification_table: true,
      rbac_schema_ready: true,
      rate_limit_table: true,
      rate_limit_schema_ready: true,
      rate_limit_permissions_ready: true,
      rate_limit_rls_ready: true,
      push_subscription_table: true,
    };
    mocks.query.mockReset();
    mocks.query.mockImplementation(async () => [mocks.result]);
    process.env.DATABASE_URL = "postgresql://health-check.invalid/neondb";
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "false";
    process.env.VERCEL_ENV = "production";
    process.env.RATE_LIMIT_HASH_SECRET = "test-rate-limit-hash-secret-that-is-long-enough";
    delete process.env.CONSENT_IP_HASH_SALT;
    delete process.env.CRON_SECRET;
    delete (process.env as Record<string, string | undefined>).ADMIN_SECRET;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PHONE_SETUP_SIGNING_SECRET;
  });

  afterEach(() => {
    for (const key of pushEnvironmentKeys) delete process.env[key];
  });

  it("is ready when push is intentionally disabled and core lead storage is ready", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      rbac_schema_ready: true,
      rate_limit_table: true,
      rate_limit_schema_ready: true,
      rate_limit_permissions_ready: true,
      rate_limit_rls_ready: true,
      rate_limit_store_ready: true,
      rate_limit_secret_ready: true,
      rate_limit_required: true,
      rate_limit_ready: true,
      push_enabled: false,
      push_ready: true,
    });
  });

  it("is ready when enabled push has its table and complete VAPID configuration", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";
    process.env.VAPID_PRIVATE_KEY = "private-test-key";
    process.env.VAPID_SUBJECT = "mailto:alerts@example.test";
    process.env.PHONE_SETUP_SIGNING_SECRET = "test-phone-setup-signing-secret-that-is-long-enough";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      push_enabled: true,
      push_subscription_table: true,
      push_provider_configured: true,
      phone_setup_configured: true,
      push_ready: true,
    });
  });

  it("fails safely when the production database is not configured", async () => {
    delete process.env.DATABASE_URL;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      database: "not_configured",
      rate_limit_table: false,
      rate_limit_schema_ready: false,
      rate_limit_permissions_ready: false,
      rate_limit_rls_ready: false,
      rate_limit_store_ready: false,
      rate_limit_secret_ready: true,
      rate_limit_required: true,
      rate_limit_ready: false,
    });
  });

  it("fails safely when the readiness query cannot inspect Neon", async () => {
    mocks.query.mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      database: "connection_failed",
      rate_limit_table: false,
      rate_limit_schema_ready: false,
      rate_limit_permissions_ready: false,
      rate_limit_rls_ready: false,
      rate_limit_store_ready: false,
      rate_limit_secret_ready: true,
      rate_limit_required: true,
      rate_limit_ready: false,
    });
  });

  it("fails readiness when enabled push is missing its subscription table", async () => {
    mocks.result.push_subscription_table = false;
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";
    process.env.VAPID_PRIVATE_KEY = "private-test-key";
    process.env.VAPID_SUBJECT = "https://www.askmagicmike.com";
    process.env.PHONE_SETUP_SIGNING_SECRET = "test-phone-setup-signing-secret-that-is-long-enough";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, push_subscription_table: false, push_ready: false });
  });

  it("fails readiness when the durable rate-limit table is missing", async () => {
    mocks.result.rate_limit_table = false;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      rate_limit_table: false,
      rate_limit_store_ready: false,
      rate_limit_secret_ready: true,
      rate_limit_required: true,
      rate_limit_ready: false,
    });
  });

  it("fails readiness when the limiter table schema or conflict target is incomplete", async () => {
    mocks.result.rate_limit_schema_ready = false;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      rate_limit_table: true,
      rate_limit_schema_ready: false,
      rate_limit_permissions_ready: true,
      rate_limit_rls_ready: true,
      rate_limit_store_ready: false,
      rate_limit_ready: false,
    });
  });

  it("fails readiness when the runtime role lacks a required limiter table privilege", async () => {
    mocks.result.rate_limit_permissions_ready = false;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      rate_limit_schema_ready: true,
      rate_limit_permissions_ready: false,
      rate_limit_rls_ready: true,
      rate_limit_store_ready: false,
      rate_limit_ready: false,
    });
  });

  it("fails readiness when row-level security would reject the runtime role", async () => {
    mocks.result.rate_limit_rls_ready = false;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      rate_limit_schema_ready: true,
      rate_limit_permissions_ready: true,
      rate_limit_rls_ready: false,
      rate_limit_store_ready: false,
      rate_limit_ready: false,
    });
  });

  it("uses read-only catalog checks for schema, privileges, and row-level-security capability", async () => {
    await GET();

    const query = String(mocks.query.mock.calls[0]?.[0] || "");
    expect(query).toContain("information_schema.columns");
    expect(query).toContain("has_schema_privilege");
    expect(query).toContain("has_table_privilege");
    expect(query).toContain("pg_index");
    expect(query).toContain("indpred IS NULL");
    expect(query).toContain("relforcerowsecurity");
    expect(query).toContain("rolbypassrls");
    expect(query).not.toMatch(/\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM)\b/i);
  });

  it("fails readiness when no strong server-only rate-limit secret is available", async () => {
    delete process.env.RATE_LIMIT_HASH_SECRET;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      database: "ready",
      rate_limit_table: true,
      rate_limit_store_ready: true,
      rate_limit_secret_ready: false,
      rate_limit_required: true,
      rate_limit_ready: false,
    });
  });

  it("does not let a reused strong server credential satisfy production readiness", async () => {
    delete process.env.RATE_LIMIT_HASH_SECRET;
    process.env.CRON_SECRET = "test-cron-secret-fallback-that-is-long-enough";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      rate_limit_store_ready: true,
      rate_limit_secret_ready: false,
      rate_limit_required: true,
      rate_limit_ready: false,
    });
    expect(JSON.stringify(body)).not.toContain("CRON_SECRET");
    expect(JSON.stringify(body)).not.toContain(process.env.CRON_SECRET);
  });

  it("does not require durable limiter dependencies in an isolated Vercel Preview", async () => {
    process.env.VERCEL_ENV = "preview";
    delete process.env.RATE_LIMIT_HASH_SECRET;
    mocks.result.rate_limit_table = false;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      rate_limit_table: false,
      rate_limit_store_ready: false,
      rate_limit_secret_ready: false,
      rate_limit_required: false,
      rate_limit_ready: true,
    });
  });

  it("fails readiness when enabled push has incomplete provider configuration", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";
    process.env.PHONE_SETUP_SIGNING_SECRET = "test-phone-setup-signing-secret-that-is-long-enough";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, push_provider_configured: false, push_ready: false });
  });

  it("fails readiness when enabled push is missing the scoped phone setup secret", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-test-key";
    process.env.VAPID_PRIVATE_KEY = "private-test-key";
    process.env.VAPID_SUBJECT = "mailto:alerts@example.test";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, phone_setup_configured: false, push_ready: false });
  });

  it("reports only configuration booleans and never returns VAPID values", async () => {
    process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-secret-marker";
    process.env.VAPID_PRIVATE_KEY = "private-secret-marker";
    process.env.VAPID_SUBJECT = "mailto:secret-marker@example.test";
    process.env.PHONE_SETUP_SIGNING_SECRET = "phone-setup-secret-marker-that-must-never-appear";
    process.env.RATE_LIMIT_HASH_SECRET = "rate-limit-secret-marker-that-must-never-appear";

    const body = await (await GET()).json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("public-secret-marker");
    expect(serialized).not.toContain("private-secret-marker");
    expect(serialized).not.toContain("secret-marker@example.test");
    expect(serialized).not.toContain("phone-setup-secret-marker");
    expect(serialized).not.toContain("rate-limit-secret-marker");
  });
});
