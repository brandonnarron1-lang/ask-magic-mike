export const LEAD_CENTER_ROLES = [
  "administrator",
  "primary_lead_owner",
  "approved_agent",
  "read_only_analyst",
] as const;

export type LeadCenterRole = (typeof LEAD_CENTER_ROLES)[number];

export const LEAD_CENTER_PERMISSIONS = [
  "lead:view_all",
  "lead:view_assigned",
  "lead:update_assigned",
  "lead:assign",
  "lead:export",
  "lead:record_revenue",
  "report:view",
  "task:manage_assigned",
  "notification:manage",
  "routing:manage",
  "user:manage",
  "audit:view",
] as const;

export type LeadCenterPermission = (typeof LEAD_CENTER_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<LeadCenterRole, ReadonlySet<LeadCenterPermission>> = {
  administrator: new Set(LEAD_CENTER_PERMISSIONS),
  primary_lead_owner: new Set([
    "lead:view_assigned",
    "lead:update_assigned",
    "lead:record_revenue",
    "report:view",
    "task:manage_assigned",
    "audit:view",
  ]),
  approved_agent: new Set([
    "lead:view_assigned",
    "lead:update_assigned",
    "task:manage_assigned",
  ]),
  read_only_analyst: new Set(["report:view"]),
};

export interface LeadCenterPrincipal {
  userId: string;
  role: LeadCenterRole;
  agentId: string | null;
  email: string;
  name: string;
}

export function isLeadCenterRole(value: unknown): value is LeadCenterRole {
  return typeof value === "string" && LEAD_CENTER_ROLES.includes(value as LeadCenterRole);
}

export function hasLeadCenterPermission(
  role: LeadCenterRole,
  permission: LeadCenterPermission,
): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function canAccessAssignedLead(
  principal: LeadCenterPrincipal,
  assignedAgentId: string | null,
): boolean {
  if (hasLeadCenterPermission(principal.role, "lead:view_all")) return true;
  return Boolean(
    assignedAgentId &&
      principal.agentId &&
      assignedAgentId.toLowerCase() === principal.agentId.toLowerCase() &&
      hasLeadCenterPermission(principal.role, "lead:view_assigned"),
  );
}

export interface LeadCenterRbacState {
  enabled: boolean;
  configured: boolean;
  ready: boolean;
  missing: string[];
}

export function getLeadCenterRbacState(
  env: Record<string, string | undefined> = process.env,
): LeadCenterRbacState {
  const enabled = env.LEAD_CENTER_RBAC_ENABLED === "true";
  const missing = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"].filter(
    (name) => !env[name],
  );
  return { enabled, configured: missing.length === 0, ready: enabled && missing.length === 0, missing };
}

export function hasLeadCenterSessionCookie(cookieHeader: string): boolean {
  return cookieHeader
    .split(";")
    .map((part) => part.trim().split("=", 1)[0])
    .some(
      (name) =>
        name === "amm-lead-center.session_token" ||
        name === "__Secure-amm-lead-center.session_token",
    );
}
