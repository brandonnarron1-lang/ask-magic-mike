/**
 * Routing Command Center — read-only data loading.
 *
 * Queries the `agents` and `lead_routing` tables.
 * Returns a stable empty shape when Supabase isn't configured.
 * No writes. No mutations.
 */

import type { AgentRole } from "@/types/domain.types";

export interface AgentRosterRow {
  id: string;
  name: string;
  email: string;
  role: AgentRole;
  isActive: boolean;
  currentLoad: number;
  maxDailyLeads: number;
  priorityScore: number;
  timezone: string;
  notificationEmail: boolean;
  notificationSms: boolean;
}

export interface RoutingHistoryRow {
  id: string;
  leadId: string;
  leadName: string | null;
  leadTemperature: string | null;
  agentId: string;
  agentName: string;
  assignedAt: string;
  acceptDeadline: string;
  contactDeadline: string;
  acceptedAt: string | null;
  contactedAt: string | null;
  status: string;
  assignmentReason: string;
  slaAcceptBreached: boolean;
  slaContactBreached: boolean;
}

export interface RoutingCommandData {
  configured: boolean;
  agents: AgentRosterRow[];
  recentRouting: RoutingHistoryRow[];
  unassignedLeadCount: number;
  pendingCount: number;
  slaBreachCount: number;
}

const EMPTY: RoutingCommandData = {
  configured: false,
  agents: [],
  recentRouting: [],
  unassignedLeadCount: 0,
  pendingCount: 0,
  slaBreachCount: 0,
};

export async function loadRoutingCommand(): Promise<RoutingCommandData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return EMPTY;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const now = new Date().toISOString();

  // Agents roster
  const { data: agentRows, error: agentErr } = await client
    .from("agents")
    .select("id, name, email, role, is_active, current_load, max_daily_leads, priority_score, timezone, notification_email, notification_sms")
    .order("priority_score", { ascending: false });

  if (agentErr) return EMPTY;

  const agents: AgentRosterRow[] = (agentRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    role: r.role as AgentRole,
    isActive: r.is_active as boolean,
    currentLoad: (r.current_load as number) ?? 0,
    maxDailyLeads: (r.max_daily_leads as number) ?? 20,
    priorityScore: (r.priority_score as number) ?? 50,
    timezone: (r.timezone as string) ?? "America/New_York",
    notificationEmail: (r.notification_email as boolean) ?? false,
    notificationSms: (r.notification_sms as boolean) ?? false,
  }));

  // Recent routing decisions — join with leads for name/temperature
  const { data: routingRows, error: routingErr } = await client
    .from("lead_routing")
    .select(`
      id, lead_id, agent_id, assigned_at, accept_deadline, contact_deadline,
      accepted_at, contacted_at, status, assignment_reason,
      agents ( name ),
      leads ( first_name, last_name, temperature )
    `)
    .order("assigned_at", { ascending: false })
    .limit(50);

  if (routingErr) {
    return {
      configured: true,
      agents,
      recentRouting: [],
      unassignedLeadCount: 0,
      pendingCount: 0,
      slaBreachCount: 0,
    };
  }

  const recentRouting: RoutingHistoryRow[] = (routingRows ?? []).map((r: Record<string, unknown>) => {
    const agentRel = r.agents as Record<string, unknown> | null;
    const leadRel  = r.leads  as Record<string, unknown> | null;
    const acceptDeadline  = r.accept_deadline as string;
    const contactDeadline = r.contact_deadline as string;
    const acceptedAt  = r.accepted_at  as string | null;
    const contactedAt = r.contacted_at as string | null;
    const status = r.status as string;

    const slaAcceptBreached  = !acceptedAt  && status === "pending"  && new Date(acceptDeadline)  < new Date(now);
    const slaContactBreached = !contactedAt && status !== "contacted" && new Date(contactDeadline) < new Date(now);

    const firstName = (leadRel?.first_name as string | null) ?? null;
    const lastName  = (leadRel?.last_name  as string | null) ?? null;
    const leadName  = [firstName, lastName].filter(Boolean).join(" ") || null;

    return {
      id:               r.id as string,
      leadId:           r.lead_id as string,
      leadName,
      leadTemperature:  (leadRel?.temperature as string | null) ?? null,
      agentId:          r.agent_id as string,
      agentName:        agentRel?.name as string ?? "Unknown",
      assignedAt:       r.assigned_at as string,
      acceptDeadline,
      contactDeadline,
      acceptedAt,
      contactedAt,
      status,
      assignmentReason: r.assignment_reason as string ?? "",
      slaAcceptBreached,
      slaContactBreached,
    };
  });

  // Unassigned lead count — leads with no routing row
  const { count: totalLeads } = await client
    .from("leads")
    .select("*", { count: "exact", head: true });

  const assignedLeadCount = recentRouting.length;
  const unassignedLeadCount = Math.max(0, ((totalLeads as number) ?? 0) - assignedLeadCount);

  const pendingCount    = recentRouting.filter((r) => r.status === "pending").length;
  const slaBreachCount  = recentRouting.filter((r) => r.slaAcceptBreached || r.slaContactBreached).length;

  return {
    configured: true,
    agents,
    recentRouting,
    unassignedLeadCount,
    pendingCount,
    slaBreachCount,
  };
}
