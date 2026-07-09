export type AdminAgentAvailability = "active" | "inactive" | "unavailable";

export type AdminAgentAllocationAgent = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  availability: AdminAgentAvailability;
  is_active: boolean;
  max_daily_leads: number | null;
  current_load: number | null;
  priority_score: number | null;
  timezone: string | null;
  currentAssignedLeadCount: number;
  hotLeadCount: number;
};

export type AdminAssignableLead = {
  id: string;
  created_at: string | null;
  status: string;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  assignment_status: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_raw: string | null;
  primary_intent: string | null;
  timeline_months: number | null;
  lead_type: string | null;
  source: string | null;
  source_detail: string | null;
  page_url: string | null;
  contactSummary: string;
  displayName: string;
  assignmentScore: number;
  isHot: boolean;
  isStaleUnassigned: boolean;
};

export type AdminAgentAllocationSummary = {
  configured: boolean;
  agents: AdminAgentAllocationAgent[];
  leads: AdminAssignableLead[];
  kpis: {
    unassignedLeads: number;
    hotUnassigned: number;
    assignedActiveLeads: number;
    availableAgents: number;
  };
  unassignedHotLeads: AdminAssignableLead[];
  unassignedRecentLeads: AdminAssignableLead[];
  staleUnassignedLeads: AdminAssignableLead[];
  assignedLeadsByAgent: Array<{
    agent: AdminAgentAllocationAgent;
    leads: AdminAssignableLead[];
  }>;
  sourceMix: Array<{ value: string; count: number }>;
  timelineMix: Array<{ value: string; count: number }>;
  intentMix: Array<{ value: string; count: number }>;
  error?: string;
};

const LEAD_SELECT = [
  "id",
  "created_at",
  "status",
  "assigned_agent_id",
  "assigned_at",
  "assignment_status",
  "first_name",
  "last_name",
  "email",
  "phone",
  "address_raw",
  "primary_intent",
  "timeline_months",
  "lead_type",
  "source",
  "source_detail",
  "page_url",
].join(",");

const AGENT_SELECT = [
  "id",
  "name",
  "email",
  "phone",
  "role",
  "is_active",
  "max_daily_leads",
  "current_load",
  "priority_score",
  "availability",
  "timezone",
].join(",");

const ACTIVE_LEAD_STATUSES = new Set([
  "new",
  "scored",
  "assigned",
  "contacted",
  "qualified",
  "appointment_requested",
  "appointment_set",
  "nurture",
  "escalated",
]);

const CLOSED_OR_SPAM_STATUSES = new Set(["dead", "converted", "spam"]);
const HOT_LEAD_TYPES = new Set(["seller", "seller_cash_offer", "home_value"]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function statusOf(value: string | null | undefined) {
  return (value || "new").trim().toLowerCase();
}

function parseTime(value: string | null) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function fullName(row: Record<string, unknown>) {
  const name = [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ");
  return name || text(row.name) || "Unknown lead";
}

function contactSummary(email: string | null, phone: string | null) {
  if (email && phone) return `${email} / ${phone}`;
  return email || phone || "No contact on file";
}

function emptySummary(configured: boolean, error?: string): AdminAgentAllocationSummary {
  return {
    configured,
    agents: [],
    leads: [],
    kpis: {
      unassignedLeads: 0,
      hotUnassigned: 0,
      assignedActiveLeads: 0,
      availableAgents: 0,
    },
    unassignedHotLeads: [],
    unassignedRecentLeads: [],
    staleUnassignedLeads: [],
    assignedLeadsByAgent: [],
    sourceMix: [],
    timelineMix: [],
    intentMix: [],
    error,
  };
}

export function bucketAgentAvailability(row: Record<string, unknown>): AdminAgentAvailability {
  if (!bool(row.is_active, true)) return "inactive";
  const maxDailyLeads = numberOrNull(row.max_daily_leads);
  const currentLoad = numberOrNull(row.current_load);
  if (maxDailyLeads !== null && currentLoad !== null && currentLoad >= maxDailyLeads) {
    return "unavailable";
  }
  return "active";
}

export function normalizeAgentRow(row: Record<string, unknown>): AdminAgentAllocationAgent {
  return {
    id: text(row.id) || "unknown",
    name: text(row.name) || "Unknown agent",
    email: text(row.email),
    phone: text(row.phone),
    role: text(row.role) || "agent",
    availability: bucketAgentAvailability(row),
    is_active: bool(row.is_active, true),
    max_daily_leads: numberOrNull(row.max_daily_leads),
    current_load: numberOrNull(row.current_load),
    priority_score: numberOrNull(row.priority_score),
    timezone: text(row.timezone),
    currentAssignedLeadCount: 0,
    hotLeadCount: 0,
  };
}

export function scoreLeadForAssignment(row: {
  status: string;
  phone: string | null;
  email: string | null;
  timeline_months: number | null;
  primary_intent: string | null;
  lead_type: string | null;
  created_at: string | null;
}): number {
  if (CLOSED_OR_SPAM_STATUSES.has(statusOf(row.status))) return 0;

  let score = 10;
  if (row.phone) score += 25;
  if (row.email) score += 10;
  if ((row.primary_intent || "").toLowerCase() === "sell") score += 20;
  if (row.timeline_months === 0) score += 25;
  else if (row.timeline_months === 3) score += 15;
  else if (row.timeline_months === 6) score += 8;
  if (HOT_LEAD_TYPES.has((row.lead_type || "").toLowerCase())) score += 15;

  const ageMs = Date.now() - parseTime(row.created_at);
  if (Number.isFinite(ageMs) && ageMs <= 24 * 60 * 60 * 1000) score += 10;
  return Math.min(score, 100);
}

export function normalizeAssignableLeadRow(row: Record<string, unknown>): AdminAssignableLead {
  const email = text(row.email);
  const phone = text(row.phone);
  const status = text(row.status) || "new";
  const created_at = text(row.created_at);
  const lead: AdminAssignableLead = {
    id: text(row.id) || "unknown",
    created_at,
    status,
    assigned_agent_id: text(row.assigned_agent_id),
    assigned_at: text(row.assigned_at),
    assignment_status: text(row.assignment_status),
    first_name: text(row.first_name),
    last_name: text(row.last_name),
    email,
    phone,
    address_raw: text(row.address_raw),
    primary_intent: text(row.primary_intent),
    timeline_months: numberOrNull(row.timeline_months),
    lead_type: text(row.lead_type),
    source: text(row.source),
    source_detail: text(row.source_detail),
    page_url: text(row.page_url),
    contactSummary: contactSummary(email, phone),
    displayName: fullName(row),
    assignmentScore: 0,
    isHot: false,
    isStaleUnassigned: false,
  };
  lead.assignmentScore = scoreLeadForAssignment(lead);
  lead.isHot = lead.assignmentScore >= 70;

  const ageMs = Date.now() - parseTime(lead.created_at);
  lead.isStaleUnassigned =
    !lead.assigned_agent_id &&
    ACTIVE_LEAD_STATUSES.has(statusOf(lead.status)) &&
    Number.isFinite(ageMs) &&
    ageMs >= 24 * 60 * 60 * 1000;
  return lead;
}

function mix(rows: AdminAssignableLead[], key: "source" | "primary_intent" | "timeline_months") {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[key];
    const value = key === "timeline_months" ? timelineLabel(row.timeline_months) : String(raw || "Unknown");
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, 8);
}

function timelineLabel(months: number | null) {
  if (months === 0) return "Immediate / 0-30 days";
  if (months === 3) return "30-90 days";
  if (months === 6) return "3-6 months";
  if (months === 12) return "6-12 months";
  if (months === 24) return "12+ months / not sure";
  return "Unknown";
}

export function summarizeAgentAllocation(
  agentsInput: AdminAgentAllocationAgent[],
  leadsInput: AdminAssignableLead[],
): AdminAgentAllocationSummary {
  const agents = agentsInput.map((agent) => ({ ...agent }));
  const leads = leadsInput.map((lead) => ({ ...lead }));
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));

  for (const lead of leads) {
    if (!lead.assigned_agent_id) continue;
    const agent = agentById.get(lead.assigned_agent_id);
    if (!agent || !ACTIVE_LEAD_STATUSES.has(statusOf(lead.status))) continue;
    agent.currentAssignedLeadCount += 1;
    if (lead.isHot) agent.hotLeadCount += 1;
  }

  const assignableLeads = leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(statusOf(lead.status)));
  const unassigned = assignableLeads.filter((lead) => !lead.assigned_agent_id);
  const assigned = assignableLeads.filter((lead) => Boolean(lead.assigned_agent_id));

  return {
    configured: true,
    agents,
    leads,
    kpis: {
      unassignedLeads: unassigned.length,
      hotUnassigned: unassigned.filter((lead) => lead.isHot).length,
      assignedActiveLeads: assigned.length,
      availableAgents: agents.filter((agent) => agent.availability === "active").length,
    },
    unassignedHotLeads: unassigned
      .filter((lead) => lead.isHot)
      .sort((a, b) => b.assignmentScore - a.assignmentScore || compareCreatedDesc(a, b))
      .slice(0, 25),
    unassignedRecentLeads: unassigned
      .sort((a, b) => b.assignmentScore - a.assignmentScore || compareCreatedDesc(a, b))
      .slice(0, 50),
    staleUnassignedLeads: unassigned.filter((lead) => lead.isStaleUnassigned).slice(0, 25),
    assignedLeadsByAgent: agents.map((agent) => ({
      agent,
      leads: assigned
        .filter((lead) => lead.assigned_agent_id === agent.id)
        .sort((a, b) => compareCreatedDesc(a, b))
        .slice(0, 25),
    })),
    sourceMix: mix(assignableLeads, "source"),
    timelineMix: mix(assignableLeads, "timeline_months"),
    intentMix: mix(assignableLeads, "primary_intent"),
  };
}

function compareCreatedDesc(a: AdminAssignableLead, b: AdminAssignableLead) {
  return (parseTime(b.created_at) || 0) - (parseTime(a.created_at) || 0);
}

export async function loadAdminAgentAllocationView(limit = 200): Promise<AdminAgentAllocationSummary> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return emptySummary(false);
  }

  const cappedLimit = Math.max(1, Math.min(limit, 300));
  const agentUrl = new URL("/rest/v1/agents", supabaseUrl);
  agentUrl.searchParams.set("select", AGENT_SELECT);
  agentUrl.searchParams.set("order", "priority_score.desc");
  agentUrl.searchParams.set("limit", "100");

  const leadUrl = new URL("/rest/v1/leads", supabaseUrl);
  leadUrl.searchParams.set("select", LEAD_SELECT);
  leadUrl.searchParams.set("order", "created_at.desc");
  leadUrl.searchParams.set("limit", String(cappedLimit));

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Cache-Control": "no-store",
  };

  const [agentResponse, leadResponse] = await Promise.all([
    fetch(agentUrl, { headers, cache: "no-store" }),
    fetch(leadUrl, { headers, cache: "no-store" }),
  ]);

  if (!agentResponse.ok) {
    return emptySummary(true, `Agent query failed with ${agentResponse.status}`);
  }
  if (!leadResponse.ok) {
    return emptySummary(true, `Lead allocation query failed with ${leadResponse.status}`);
  }

  const agentRows = (await agentResponse.json()) as Array<Record<string, unknown>>;
  const leadRows = (await leadResponse.json()) as Array<Record<string, unknown>>;
  return summarizeAgentAllocation(
    agentRows.map(normalizeAgentRow),
    leadRows.map(normalizeAssignableLeadRow),
  );
}
