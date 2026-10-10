import { describe, expect, it } from "vitest";
import {
  canAccessAssignedLead,
  getLeadCenterRbacState,
  hasLeadCenterPermission,
  hasLeadCenterSessionCookie,
  type LeadCenterPrincipal,
} from "../../src/lib/admin/rbac-policy";
import { leadCenterAuth, normalizeAuthDatabaseUrl, leadCenterTrustedOrigins } from "../../src/lib/admin/rbac-auth";
import { betterAuth } from "better-auth";

function principal(overrides: Partial<LeadCenterPrincipal> = {}): LeadCenterPrincipal {
  return {
    userId: "user-1",
    role: "approved_agent",
    agentId: "11111111-1111-4111-8111-111111111111",
    email: "agent@example.test",
    name: "Internal QA Agent",
    ...overrides,
  };
}

describe("Lead Center RBAC policy", () => {
  const previewHost = "ask-magic-mike-exact-eyes-up-industries.vercel.app";
  const configuredOrigin = "https://ask-magic-mike-git-codex-review-eyes-up-industries.vercel.app";
  const previewEnv: NodeJS.ProcessEnv = { ...process.env, VERCEL_ENV: "preview", VERCEL_URL: previewHost, BETTER_AUTH_URL: configuredOrigin };

  it("trusts only the exact immutable Preview and configured login origin, without wildcard trust", () => {
    expect(leadCenterTrustedOrigins(previewEnv)).toEqual([
      "https://www.askmagicmike.com", "https://askmagicmike.com", configuredOrigin, `https://${previewHost}`,
    ]);
    expect(leadCenterTrustedOrigins(previewEnv)).not.toContain("https://unrelated.vercel.app");
    expect(leadCenterTrustedOrigins(previewEnv).some(origin => origin.includes("*"))).toBe(false);
  });

  it("preserves Production origins and ignores stale Preview metadata outside Preview", () => {
    for (const VERCEL_ENV of ["production", "development", undefined]) {
      expect(leadCenterTrustedOrigins({ ...previewEnv, VERCEL_ENV })).toEqual([
        "https://www.askmagicmike.com", "https://askmagicmike.com", configuredOrigin,
      ]);
    }
  });

  it.each(["not a host", "attacker.test", "user:password@ask-magic-mike.vercel.app", "ask-magic-mike.vercel.app/path", "ask-magic-mike.vercel.app?query=1", "ask-magic-mike.vercel.app#fragment", "ask-magic-mike.vercel.app:8443"])("rejects malformed or non-deployment metadata: %s", VERCEL_URL => {
    expect(leadCenterTrustedOrigins({ ...previewEnv, VERCEL_URL })).toHaveLength(3);
  });

  it("reproduces immutable-origin 403 through real Better Auth, and allows credential validation only after the exact-origin correction", async () => {
    const request = () => new Request(`https://${previewHost}/api/lead-center-auth/sign-in/email`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: `https://${previewHost}` },
      body: JSON.stringify({ email: "nonexistent-synthetic@example.test", password: "SYNTHETIC-not-a-real-account" }),
    });
    const make = (trustedOrigins: string[]) => betterAuth({
      secret: "synthetic-unit-fixture-only-never-a-runtime-secret",
      baseURL: configuredOrigin, basePath: "/api/lead-center-auth", trustedOrigins,
      emailAndPassword: { enabled: true, disableSignUp: true }, telemetry: { enabled: false },
      advanced: { disableCSRFCheck: false, disableOriginCheck: false }, // Match real non-test enforcement.
    });
    const denied = await make([configuredOrigin]).handler(request());
    expect(denied.status).toBe(403);
    expect((await denied.json()).code).toBe("INVALID_ORIGIN");
    const acceptedOrigin = await make(leadCenterTrustedOrigins(previewEnv)).handler(request());
    expect(acceptedOrigin.status).toBe(401); // Real credential validation; no invented successful login.
    expect((await acceptedOrigin.json()).code).toBe("INVALID_EMAIL_OR_PASSWORD");
    const unrelated = new Request(request(), { headers: { "Content-Type": "application/json", Origin: "https://unrelated.vercel.app" } });
    expect((await make(leadCenterTrustedOrigins(previewEnv)).handler(unrelated)).status).toBe(403);
  });
  it("pins Neon/PostgreSQL auth connections to full TLS verification", () => {
    expect(normalizeAuthDatabaseUrl("postgresql://role:secret@example.test/db?sslmode=require"))
      .toBe("postgresql://role:secret@example.test/db?sslmode=verify-full");
    expect(normalizeAuthDatabaseUrl("postgresql://role:secret@example.test/db?sslmode=verify-full"))
      .toBe("postgresql://role:secret@example.test/db?sslmode=verify-full");
    expect(normalizeAuthDatabaseUrl("not-a-database-url")).toBe("not-a-database-url");
  });
  it("uses the same authentication base path as the browser client and App Router handler", () => {
    expect(leadCenterAuth.options.basePath).toBe("/api/lead-center-auth");
  });
  it("grants user administration and exports only to administrators", () => {
    expect(hasLeadCenterPermission("administrator", "user:manage")).toBe(true);
    expect(hasLeadCenterPermission("administrator", "lead:export")).toBe(true);
    expect(hasLeadCenterPermission("primary_lead_owner", "lead:export")).toBe(false);
    expect(hasLeadCenterPermission("approved_agent", "user:manage")).toBe(false);
    expect(hasLeadCenterPermission("read_only_analyst", "lead:view_assigned")).toBe(false);
  });

  it("limits publication-proof recording to administrators and the primary lead owner", () => {
    expect(hasLeadCenterPermission("administrator", "growth:manage")).toBe(true);
    expect(hasLeadCenterPermission("primary_lead_owner", "growth:manage")).toBe(true);
    expect(hasLeadCenterPermission("approved_agent", "growth:manage")).toBe(false);
    expect(hasLeadCenterPermission("read_only_analyst", "growth:manage")).toBe(false);
  });

  it("limits agents and primary owners to their assigned lead identity", () => {
    const agent = principal();
    expect(canAccessAssignedLead(agent, agent.agentId)).toBe(true);
    expect(canAccessAssignedLead(agent, "22222222-2222-4222-8222-222222222222")).toBe(false);
    expect(canAccessAssignedLead(agent, null)).toBe(false);
    expect(canAccessAssignedLead(principal({ role: "administrator", agentId: null }), null)).toBe(true);
  });

  it("keeps the feature disabled until every required server variable exists", () => {
    expect(getLeadCenterRbacState({})).toEqual({
      enabled: false,
      configured: false,
      ready: false,
      missing: ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"],
    });
    expect(getLeadCenterRbacState({
      LEAD_CENTER_RBAC_ENABLED: "true",
      DATABASE_URL: "redacted",
      BETTER_AUTH_SECRET: "redacted",
      BETTER_AUTH_URL: "https://www.askmagicmike.com",
    }).ready).toBe(true);
  });

  it("recognizes only the configured Lead Center session-cookie names", () => {
    expect(hasLeadCenterSessionCookie("foo=1; amm-lead-center.session_token=opaque")).toBe(true);
    expect(hasLeadCenterSessionCookie("__Secure-amm-lead-center.session_token=opaque")).toBe(true);
    expect(hasLeadCenterSessionCookie("session_token=forged")).toBe(false);
  });
});
