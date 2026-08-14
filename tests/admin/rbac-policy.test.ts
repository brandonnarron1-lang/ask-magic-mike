import { describe, expect, it } from "vitest";
import {
  canAccessAssignedLead,
  getLeadCenterRbacState,
  hasLeadCenterPermission,
  hasLeadCenterSessionCookie,
  type LeadCenterPrincipal,
} from "../../src/lib/admin/rbac-policy";

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
  it("grants user administration and exports only to administrators", () => {
    expect(hasLeadCenterPermission("administrator", "user:manage")).toBe(true);
    expect(hasLeadCenterPermission("administrator", "lead:export")).toBe(true);
    expect(hasLeadCenterPermission("primary_lead_owner", "lead:export")).toBe(false);
    expect(hasLeadCenterPermission("approved_agent", "user:manage")).toBe(false);
    expect(hasLeadCenterPermission("read_only_analyst", "lead:view_assigned")).toBe(false);
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
