import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { leadCenterAuth } from "./rbac-auth";
import {
  getLeadCenterRbacState,
  hasLeadCenterPermission,
  isLeadCenterRole,
  type LeadCenterPermission,
  type LeadCenterPrincipal,
} from "./rbac-policy";

function principalFromSession(session: typeof leadCenterAuth.$Infer.Session): LeadCenterPrincipal | null {
  const role = session.user.role;
  if (!isLeadCenterRole(role)) return null;
  return {
    userId: session.user.id,
    role,
    agentId: typeof session.user.agentId === "string" ? session.user.agentId : null,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function getLeadCenterPrincipal(): Promise<LeadCenterPrincipal | null> {
  const state = getLeadCenterRbacState();
  if (!state.ready) return null;
  const session = await leadCenterAuth.api.getSession({ headers: await headers() });
  return session ? principalFromSession(session) : null;
}

export async function requireLeadCenterPermission(
  permission: LeadCenterPermission,
): Promise<LeadCenterPrincipal | null> {
  const state = getLeadCenterRbacState();
  if (!state.enabled) return null;
  if (!state.configured) redirect("/lead-center-login?error=configuration");
  const principal = await getLeadCenterPrincipal();
  if (!principal) redirect("/lead-center-login?error=session");
  if (!hasLeadCenterPermission(principal.role, permission)) {
    redirect("/lead-center-login?error=forbidden");
  }
  return principal;
}

export async function requireLeadCenterAuthenticated(): Promise<LeadCenterPrincipal | null> {
  const state = getLeadCenterRbacState();
  if (!state.enabled) return null;
  if (!state.configured) redirect("/lead-center-login?error=configuration");
  const principal = await getLeadCenterPrincipal();
  if (!principal) redirect("/lead-center-login?error=session");
  return principal;
}

export async function requireLeadCenterLeadPermission(
  leadId: string,
  permission: "lead:view_assigned" | "lead:update_assigned" | "task:manage_assigned" | "lead:record_revenue",
): Promise<LeadCenterPrincipal | null> {
  const principal = await requireLeadCenterPermission(permission);
  if (!principal || hasLeadCenterPermission(principal.role, "lead:view_all")) return principal;
  if (!principal.agentId || !/^[0-9a-f-]{36}$/i.test(leadId)) {
    redirect("/lead-center-login?error=forbidden");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) redirect("/lead-center-login?error=configuration");
  const sql = neon(databaseUrl);
  const rows = (await sql.query(
    "SELECT assigned_agent_id FROM public.leads WHERE id = $1::uuid LIMIT 1",
    [leadId],
  )) as Array<{ assigned_agent_id: string | null }>;
  const assigned = rows[0]?.assigned_agent_id || null;
  if (!assigned || assigned.toLowerCase() !== principal.agentId.toLowerCase()) {
    redirect("/lead-center-login?error=forbidden");
  }
  return principal;
}

export async function requireLeadCenterApiPermission(
  request: NextRequest,
  permission: LeadCenterPermission,
): Promise<{ ok: true; principal: LeadCenterPrincipal } | { ok: false; response: NextResponse }> {
  const state = getLeadCenterRbacState();
  if (!state.enabled) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "rbac_not_enabled" }, { status: 409 }) };
  }
  if (!state.configured) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "rbac_not_configured" }, { status: 503 }) };
  }
  const session = await leadCenterAuth.api.getSession({ headers: request.headers });
  const principal = session ? principalFromSession(session) : null;
  if (!principal) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }
  if (!hasLeadCenterPermission(principal.role, permission)) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, principal };
}
