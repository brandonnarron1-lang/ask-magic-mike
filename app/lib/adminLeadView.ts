import {
  buildLeadStalledSignals,
  buildLeadTimeline,
  type AdminLeadTimelineEvent,
} from "./adminLeadTimeline";
import type { StalledLeadSignal } from "./adminLeadLifecycle";
import {
  normalizeAppointment,
  normalizeTask,
  type AdminAppointmentRow,
  type AdminFollowupTaskRow,
} from "./adminAppointmentFollowupOps";

export type AdminAttributionView = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  landing_page: string | null;
  initial_path: string | null;
  current_path: string | null;
  parent_url: string | null;
  embed_host: string | null;
  placement: string | null;
  gclid: string | null;
  fbclid: string | null;
  device_category: string | null;
};

export type AdminLeadView = {
  id: string;
  created_at: string | null;
  status: string;
  funnel_type: string;
  lead_source_surface: string;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  converted_at: string | null;
  closed_won_at: string | null;
  closed_lost_at: string | null;
  closed_lost_reason: string | null;
  conversion_stage: string | null;
  lead_grade: string | null;
  timeline_months: number | null;
  source: string | null;
  source_detail: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timeline: string | null;
  condition: string | null;
  question: string | null;
  notes: string | null;
  attribution: AdminAttributionView;
  primary_detail: string;
  contact_summary: string;
  attribution_summary: string;
  routing_ready: boolean;
  stalled_signals: StalledLeadSignal[];
};

export type AdminLeadDetailResult = {
  configured: boolean;
  lead: AdminLeadView | null;
  timeline: AdminLeadTimelineEvent[];
  appointments: AdminAppointmentRow[];
  followupTasks: AdminFollowupTaskRow[];
  error?: string;
};

export type AdminLeadInboxResult = {
  configured: boolean;
  leads: AdminLeadView[];
  error?: string;
};

const ATTRIBUTION_KEYS = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "referrer",
  "landing_page",
  "initial_path",
  "current_path",
  "parent_url",
  "embed_host",
  "placement",
  "gclid",
  "fbclid",
  "device_category",
] as const;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function idText(value: unknown): string {
  return text(value) || "unknown";
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const cleaned = text(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildName(row: Record<string, unknown>): string | null {
  const explicit = firstText(row.name, row.full_name);
  if (explicit) return explicit;
  const joined = [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ");
  return joined || null;
}

function buildAttribution(row: Record<string, unknown>): AdminAttributionView {
  const nested =
    row.attribution && typeof row.attribution === "object"
      ? (row.attribution as Record<string, unknown>)
      : {};

  return ATTRIBUTION_KEYS.reduce((acc, key) => {
    const utmKey =
      key === "source"
        ? "utm_source"
        : key === "medium"
          ? "utm_medium"
          : key === "campaign"
            ? "utm_campaign"
            : null;
    acc[key] = firstText(nested[key], row[key], utmKey ? row[utmKey] : undefined);
    return acc;
  }, {} as AdminAttributionView);
}

function summarizeAttribution(attribution: AdminAttributionView): string {
  const parts = [
    attribution.source,
    attribution.medium,
    attribution.campaign,
    attribution.placement,
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "No attribution captured";
}

function summarizeContact(email: string | null, phone: string | null): string {
  if (email && phone) return `${email} / ${phone}`;
  return email || phone || "No contact on file";
}

function primaryDetail(row: {
  address: string | null;
  question: string | null;
  notes: string | null;
}): string {
  return row.address || row.question || row.notes || "No property detail";
}

export function normalizeAdminLeadRow(row: Record<string, unknown>): AdminLeadView {
  const attribution = buildAttribution(row);
  const name = buildName(row);
  const email = text(row.email);
  const phone = text(row.phone);
  const address = firstText(
    row.address,
    row.property_address,
    row.address_raw,
    row.normalized_property_address,
  );
  const question = firstText(row.question, row.question_raw);
  const notes = text(row.notes);
  const assignedAgentId = text(row.assigned_agent_id);
  const status = firstText(row.status) || "new";
  const created_at = text(row.created_at);
  const assigned_at = text(row.assigned_at);
  const last_contacted_at = text(row.last_contacted_at);

  const lead: AdminLeadView = {
    id: idText(row.id),
    created_at,
    status,
    funnel_type: firstText(row.funnel_type, row.lead_type) || "unknown",
    lead_source_surface: firstText(row.lead_source_surface, row.source) || "unknown",
    assigned_agent_id: assignedAgentId,
    assigned_at,
    last_contacted_at,
    next_follow_up_at: text(row.next_follow_up_at),
    converted_at: text(row.converted_at),
    closed_won_at: text(row.closed_won_at),
    closed_lost_at: text(row.closed_lost_at),
    closed_lost_reason: text(row.closed_lost_reason),
    conversion_stage: text(row.conversion_stage),
    lead_grade: text(row.lead_grade),
    timeline_months: numberOrNull(row.timeline_months),
    source: text(row.source),
    source_detail: text(row.source_detail),
    name,
    email,
    phone,
    address,
    timeline: text(row.timeline),
    condition: firstText(row.condition, row.property_condition),
    question,
    notes,
    attribution,
    primary_detail: "",
    contact_summary: "",
    attribution_summary: "",
    routing_ready: false,
    stalled_signals: [],
  };

  lead.primary_detail = primaryDetail(lead);
  lead.contact_summary = summarizeContact(email, phone);
  lead.attribution_summary = summarizeAttribution(attribution);
  lead.routing_ready = status === "new" && !assignedAgentId && Boolean(email || phone);
  lead.stalled_signals = buildLeadStalledSignals({
    status,
    created_at,
    assigned_agent_id: assignedAgentId,
    assigned_at,
    last_contacted_at,
    lead_grade: lead.lead_grade,
    timeline_months: lead.timeline_months,
  });
  return lead;
}

export function normalizeAdminLeadRows(rows: Array<Record<string, unknown>>): AdminLeadView[] {
  return rows.map(normalizeAdminLeadRow);
}

export async function loadAdminLeadInbox(limit = 50): Promise<AdminLeadInboxResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { configured: false, leads: [] };
  }

  const cappedLimit = Math.max(1, Math.min(limit, 100));
  const url = new URL("/rest/v1/leads", supabaseUrl);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(cappedLimit));

  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      configured: true,
      leads: [],
      error: `Lead inbox query failed with ${response.status}`,
    };
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return { configured: true, leads: normalizeAdminLeadRows(rows) };
}

export async function loadAdminLeadDetail(leadId: string): Promise<AdminLeadDetailResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { configured: false, lead: null, timeline: [], appointments: [], followupTasks: [] };
  }

  const leadUrl = new URL("/rest/v1/leads", supabaseUrl);
  leadUrl.searchParams.set("id", "eq." + leadId);
  leadUrl.searchParams.set("select", "*");
  leadUrl.searchParams.set("limit", "1");

  const leadResponse = await fetch(leadUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!leadResponse.ok) {
    return {
      configured: true,
      lead: null,
      timeline: [],
      appointments: [],
      followupTasks: [],
      error: `Lead detail query failed with ${leadResponse.status}`,
    };
  }

  const leadRows = (await leadResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
  const leadRow = leadRows[0];
  if (!leadRow) {
    return { configured: true, lead: null, timeline: [], appointments: [], followupTasks: [], error: "lead_not_found" };
  }
  const lead = normalizeAdminLeadRow(leadRow);

  const auditUrl = new URL("/rest/v1/audit_logs", supabaseUrl);
  auditUrl.searchParams.set("select", "id,created_at,actor,action,resource_type,resource_id,before_state,after_state,metadata");
  auditUrl.searchParams.set("resource_type", "eq.lead");
  auditUrl.searchParams.set("resource_id", "eq." + leadId);
  auditUrl.searchParams.set("order", "created_at.desc");
  auditUrl.searchParams.set("limit", "100");

  const notificationUrl = new URL("/rest/v1/lead_notifications", supabaseUrl);
  notificationUrl.searchParams.set("select", "id,created_at,updated_at,sent_at,notification_type,channel,status,provider");
  notificationUrl.searchParams.set("lead_id", "eq." + leadId);
  notificationUrl.searchParams.set("order", "created_at.desc");
  notificationUrl.searchParams.set("limit", "100");

  const appointmentsUrl = new URL("/rest/v1/lead_appointments", supabaseUrl);
  appointmentsUrl.searchParams.set("select", "*");
  appointmentsUrl.searchParams.set("lead_id", "eq." + leadId);
  appointmentsUrl.searchParams.set("order", "created_at.desc");
  appointmentsUrl.searchParams.set("limit", "100");

  const tasksUrl = new URL("/rest/v1/tasks", supabaseUrl);
  tasksUrl.searchParams.set("select", "*");
  tasksUrl.searchParams.set("lead_id", "eq." + leadId);
  tasksUrl.searchParams.set("category", "like.followup:%");
  tasksUrl.searchParams.set("order", "due_at.asc");
  tasksUrl.searchParams.set("limit", "100");

  const [auditResponse, notificationResponse, appointmentsResponse, tasksResponse] = await Promise.all([
    fetch(auditUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    }),
    fetch(notificationUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    }),
    fetch(appointmentsUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    }),
    fetch(tasksUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    }),
  ]);

  const auditRows = auditResponse.ok
    ? ((await auditResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];
  const notificationRows = notificationResponse.ok
    ? ((await notificationResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];
  const appointmentRows = appointmentsResponse.ok
    ? ((await appointmentsResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];
  const taskRows = tasksResponse.ok
    ? ((await tasksResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];
  const appointments = appointmentRows
    .map(normalizeAppointment)
    .filter((row): row is AdminAppointmentRow => Boolean(row));
  const followupTasks = taskRows
    .map(normalizeTask)
    .filter((row): row is AdminFollowupTaskRow => Boolean(row));

  return {
    configured: true,
    lead,
    appointments,
    followupTasks,
    timeline: buildLeadTimeline({ lead, auditRows, notificationRows, appointmentRows: appointments, taskRows: followupTasks }),
  };
}
