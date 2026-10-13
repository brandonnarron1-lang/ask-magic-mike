// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publicIntakeCapability } from "../../src/lib/public-intake-capability";
import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";
import { GET } from "../../app/api/health/live/route";

const productionEndpoint = "ep-production-safe-123456";
const previewEndpoint = "ep-preview-safe-654321";
const databaseUrl = (endpoint: string) => `postgresql://fixture:fictional@${endpoint}.us-east-2.aws.neon.tech/fixture`;
const production = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://www.askmagicmike.com",
  DATABASE_URL: databaseUrl(productionEndpoint),
};
const preview = {
  VERCEL_ENV: "preview",
  DATABASE_ENV: "preview",
  DATABASE_URL: databaseUrl(previewEndpoint),
  PREVIEW_NEON_ENDPOINT_ID: previewEndpoint,
  PRODUCTION_NEON_ENDPOINT_ID: productionEndpoint,
  PREVIEW_DATA_MODE: "enabled",
  ALLOW_PREVIEW_DB_MUTATION: "true",
};
const isolatedAcceptance = {
  AMM_ISOLATED_SESSION_ACCEPTANCE: "1",
  AMM_QA_POSTGRES_TEST: "1",
  VERCEL_ENV: "development",
  NODE_ENV: "production", // next start exercises the real compiled app.
  DATABASE_URL: "postgresql://postgres@localhost:34567/amm_qa_upgrade",
  AMM_E2E_PORT: "34568",
  NEXT_PUBLIC_SITE_URL: "http://localhost:34568",
  BETTER_AUTH_URL: "http://localhost:34568",
  NODE_OPTIONS: `--dns-result-order=ipv4first --import=${resolve("tests/support/isolated-neon-transport.mjs")}`,
  LEAD_ALLOCATION_SENDS_ENABLED: "false",
  LEAD_ALLOCATION_DUE_ENABLED: "false",
  EMAIL_ENABLED: "false",
  CUSTOMER_EMAIL_ENABLED: "false",
  CUSTOMER_SMS_ENABLED: "false",
  AGENT_SMS_NOTIFICATIONS_ENABLED: "false",
  AGENT_EMAIL_NOTIFICATIONS_ENABLED: "false",
  LEAD_NOTIFICATION_ENABLED: "false",
  WEB_PUSH_ENABLED: "false",
};

afterEach(() => vi.unstubAllEnvs());

describe("configuration-only public intake capability", () => {
  it("keeps valid Production live without demanding Preview-era endpoint IDs", () => {
    expect(publicIntakeCapability(production)).toBe("live");
    expect(publicIntakeCapability({ ...production, DATABASE_ENV: "production" })).toBe("live");
    expect(publicIntakeCapability({ ...production, PREVIEW_DATA_MODE: "disabled" })).toBe("live");
  });

  it("honors an explicitly configured Production endpoint without requiring a Preview ID", () => {
    expect(publicIntakeCapability({ ...production, PRODUCTION_NEON_ENDPOINT_ID: productionEndpoint })).toBe("live");
    expect(publicIntakeCapability({ ...production, PRODUCTION_NEON_ENDPOINT_ID: previewEndpoint })).toBe("read_only");
    expect(publicIntakeCapability({ ...production, PRODUCTION_NEON_ENDPOINT_ID: "invalid" })).toBe("read_only");
    expect(publicIntakeCapability({ ...production, PREVIEW_NEON_ENDPOINT_ID: productionEndpoint })).toBe("read_only");
  });

  it.each([
    {},
    { ...production, VERCEL_ENV: undefined, NODE_ENV: "production" },
    { ...production, VERCEL_ENV: "development" },
    { ...production, VERCEL_ENV: "unknown" },
    { ...production, DATABASE_ENV: "development" },
    { ...production, DATABASE_ENV: "unknown" },
    { ...production, DATABASE_ENV: "preview" },
    { ...production, DATABASE_URL: undefined },
    { ...production, DATABASE_URL: "https://example.test" },
    { ...production, DATABASE_URL: "postgresql://fixture:fictional@localhost/fixture" },
  ])("fails closed for unknown, conflicting, or unavailable runtime evidence (%#)", (env) => {
    expect(publicIntakeCapability(env)).toBe("read_only");
  });

  it.each([
    undefined, "", "not-a-url", "http://www.askmagicmike.com",
    "https://www.askmagicmike.com.attacker.test", "https://www.ourtownproperties.com",
    "https://ask-magic-mike.vercel.app", "https://fixture:fictional@www.askmagicmike.com",
  ])("does not infer owned Production from a default or unapproved canonical config (%#)", (url) => {
    expect(publicIntakeCapability({ ...production, NEXT_PUBLIC_SITE_URL: url })).toBe("read_only");
  });

  it("reuses approved owned origins, including the legacy server-side canonical setting", () => {
    expect(publicIntakeCapability({ ...production, NEXT_PUBLIC_SITE_URL: "https://askmagicmike.com/" })).toBe("live");
    expect(publicIntakeCapability({ ...production, NEXT_PUBLIC_SITE_URL: undefined,
      PUBLIC_SITE_URL: "https://www.askmagicmike.com" })).toBe("live");
  });

  it("reports synthetic QA only with the existing isolated Preview evidence", () => {
    expect(publicIntakeCapability(preview)).toBe("synthetic_qa");
    expect(publicIntakeCapability({ ...preview, DATABASE_URL: databaseUrl(`${previewEndpoint}-pooler`) })).toBe("synthetic_qa");
    expect(assertDatabaseMutationAllowed(preview)).toEqual({ ok: true });
  });

  it.each([
    { PREVIEW_DATA_MODE: undefined }, { PREVIEW_DATA_MODE: "disabled" },
    { ALLOW_PREVIEW_DB_MUTATION: undefined }, { ALLOW_PREVIEW_DB_MUTATION: "false" },
    { DATABASE_ENV: undefined }, { DATABASE_ENV: "production" },
    { VERCEL_ENV: undefined }, { VERCEL_ENV: "production" },
    { PREVIEW_NEON_ENDPOINT_ID: undefined }, { PRODUCTION_NEON_ENDPOINT_ID: undefined },
    { PREVIEW_NEON_ENDPOINT_ID: productionEndpoint },
    { PRODUCTION_NEON_ENDPOINT_ID: previewEndpoint },
    { DATABASE_URL: databaseUrl(productionEndpoint) },
    { DATABASE_URL: databaseUrl("ep-unattested-safe-111111") },
  ])("rejects incomplete or contradictory Preview authority (%#)", (override) => {
    expect(publicIntakeCapability({ ...preview, ...override })).toBe("read_only");
  });

  it.each([
    "ENABLE_EMAIL", "EMAIL_ENABLED", "AGENT_NOTIFICATIONS_ENABLED",
    "LEAD_NOTIFICATION_PRODUCTION_ENABLED", "AGENT_PUSH_NOTIFICATIONS_ENABLED",
    "ENABLE_SMS", "AGENT_SMS_NOTIFICATIONS_ENABLED", "CUSTOMER_EMAIL_ENABLED",
    "CUSTOMER_SMS_ENABLED", "CONSUMER_ACKNOWLEDGMENT_ENABLED", "QA_EMAIL_ENABLED",
    "CONSUMER_FOLLOWUP_EMAIL_ENABLED", "MESSAGE_AUTO_SEND_ENABLED",
    "MESSAGE_SEQUENCE_SCHEDULER_ENABLED", "AI_AUTOMATIC_ACTION_ENABLED",
    "AGENT_EMAIL_NOTIFICATIONS_ENABLED", "LEAD_NOTIFICATION_ENABLED", "WEB_PUSH_ENABLED",
    "LEAD_ALLOCATION_SENDS_ENABLED", "LEAD_ALLOCATION_STAFF_PILOT_SENDS_ENABLED",
  ])("requires independently disabled outbound gate %s", (key) => {
    expect(publicIntakeCapability({ ...preview, [key]: "true" })).toBe("read_only");
    expect(publicIntakeCapability({ ...preview, [key]: "unknown" })).toBe("read_only");
    expect(publicIntakeCapability({ ...preview, [key]: "false" })).toBe("synthetic_qa");
  });

  it.each(["LEAD_NOTIFICATION_MODE", "NOTIFICATION_PROVIDER_MODE"])("rejects delivery-capable or unknown %s", (key) => {
    for (const mode of ["production", "sandbox", "console", "unknown"]) {
      expect(publicIntakeCapability({ ...preview, [key]: mode })).toBe("read_only");
    }
    expect(publicIntakeCapability({ ...preview, [key]: "disabled" })).toBe("synthetic_qa");
  });

  it("never treats a failed Preview mutation guard as client-authorizable", () => {
    const unattested = { ...preview, PRODUCTION_NEON_ENDPOINT_ID: undefined };
    expect(assertDatabaseMutationAllowed(unattested).ok).toBe(false);
    expect(publicIntakeCapability(unattested)).toBe("read_only");
    // Independent delivery refusal does not change the authoritative DB guard.
    const deliveryEnabled = { ...preview, EMAIL_ENABLED: "true" };
    expect(assertDatabaseMutationAllowed(deliveryEnabled).ok).toBe(true);
    expect(publicIntakeCapability(deliveryEnabled)).toBe("read_only");
  });
});

describe("explicit isolated real-session acceptance capability", () => {
  it("recognizes only the existing local harness as synthetic, including next start", () => {
    expect(publicIntakeCapability(isolatedAcceptance)).toBe("synthetic_qa");
    expect(publicIntakeCapability({ ...isolatedAcceptance, NODE_ENV: "development" })).toBe("synthetic_qa");
    expect(assertDatabaseMutationAllowed(isolatedAcceptance)).toEqual({ ok: true });
  });

  it.each([
    { AMM_ISOLATED_SESSION_ACCEPTANCE: undefined }, { AMM_QA_POSTGRES_TEST: undefined },
    { AMM_ISOLATED_SESSION_ACCEPTANCE: "true" }, { AMM_QA_POSTGRES_TEST: "true" },
    { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: undefined },
    { VERCEL: "1" }, { VERCEL_URL: "unexpected.vercel.app" }, { PREVIEW_URL: "https://unexpected.vercel.app" },
    { DATABASE_ENV: "production" }, { DATABASE_ENV: "preview" },
    { DATABASE_URL: databaseUrl(productionEndpoint) }, { DATABASE_URL: databaseUrl(previewEndpoint) },
    { DATABASE_URL: "postgresql://postgres@localhost:34567/other_database" },
    { DATABASE_URL: "postgresql://other@localhost:34567/amm_qa_upgrade" },
    { DATABASE_URL: "postgresql://postgres@127.0.0.1:34567/amm_qa_upgrade" },
    { DATABASE_URL: "postgresql://postgres@localhost.attacker.test:34567/amm_qa_upgrade" },
    { DATABASE_URL: "postgresql://postgres@localhost/amm_qa_upgrade" },
    { DATABASE_URL: "https://postgres@localhost:34567/amm_qa_upgrade" },
    { DATABASE_URL: "postgresql://postgres:fictional@localhost:34567/amm_qa_upgrade" },
    { DATABASE_URL: "postgresql://postgres@localhost:34567/amm_qa_upgrade?host=external.test" },
    { NODE_OPTIONS: undefined }, { NODE_OPTIONS: "--import=/not-the-existing-adapter.mjs" },
    { AMM_E2E_PORT: undefined }, { AMM_E2E_PORT: "0" }, { AMM_E2E_PORT: "65536" },
    { NEXT_PUBLIC_SITE_URL: "https://www.askmagicmike.com" },
    { NEXT_PUBLIC_SITE_URL: "http://localhost:34569" }, { BETTER_AUTH_URL: "http://localhost:34569" },
    { NEXT_PUBLIC_SITE_URL: "http://localhost:34568?capability=live" },
    { EMAIL_ENABLED: "true" }, { AGENT_PUSH_NOTIFICATIONS_ENABLED: "true" },
    { LEAD_ALLOCATION_SENDS_ENABLED: "true" }, { LEAD_NOTIFICATION_MODE: "sandbox" },
  ])("refuses a local global flag without exact existing venue evidence (%#)", (override) => {
    expect(publicIntakeCapability({ ...isolatedAcceptance, ...override })).toBe("read_only");
  });

  it("never converts development with a Production Neon URL into live or synthetic", () => {
    expect(publicIntakeCapability({ ...production, VERCEL_ENV: "development",
      AMM_ISOLATED_SESSION_ACCEPTANCE: "1", AMM_QA_POSTGRES_TEST: "1" })).toBe("read_only");
    expect(publicIntakeCapability({ ...production, AMM_ISOLATED_SESSION_ACCEPTANCE: "1" })).toBe("read_only");
  });
});

describe("existing public health capability contract", () => {
  it("adds only the category to the no-store GET without I/O or identity disclosure", async () => {
    for (const key of ["DATABASE_ENV", "PREVIEW_NEON_ENDPOINT_ID", "PRODUCTION_NEON_ENDPOINT_ID", "PUBLIC_SITE_URL",
      "AMM_ISOLATED_SESSION_ACCEPTANCE", "AMM_QA_POSTGRES_TEST"]) {
      vi.stubEnv(key, undefined);
    }
    for (const [key, value] of Object.entries(production)) vi.stubEnv(key, value);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No external I/O allowed"));
    try {
      const response = await GET();
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const body = await response.json();
      expect(body.public_intake).toBe("live");
      expect(Object.keys(body).sort()).toEqual([
        "ok", "service", "environment", "database_configured", "database_provider",
        "notification_mode", "email_enabled", "public_intake", "checked_at",
      ].sort());
      expect(JSON.stringify(body)).not.toContain(productionEndpoint);
      expect(JSON.stringify(body)).not.toContain("fictional");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("keeps server logic outside the client module and adds no new database/provider dependency", () => {
    const server = readFileSync(new URL("../../src/lib/public-intake-capability.ts", import.meta.url), "utf8");
    const client = readFileSync(new URL("../../app/lib/publicIntakeCapability.ts", import.meta.url), "utf8");
    expect(server).toContain('from "node:process"');
    expect(server).not.toMatch(/from ["'](?:pg|@neondatabase|.*persistence|.*Provider)/);
    expect(client).not.toContain("public-intake-capability");
    expect(client).not.toContain("process.env");
    expect(client).not.toMatch(/localStorage|sessionStorage/);
  });
});
