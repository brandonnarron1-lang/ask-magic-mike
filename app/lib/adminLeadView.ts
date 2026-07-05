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

  const lead: AdminLeadView = {
    id: idText(row.id),
    created_at: text(row.created_at),
    status,
    funnel_type: firstText(row.funnel_type, row.lead_type) || "unknown",
    lead_source_surface: firstText(row.lead_source_surface, row.source) || "unknown",
    assigned_agent_id: assignedAgentId,
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
  };

  lead.primary_detail = primaryDetail(lead);
  lead.contact_summary = summarizeContact(email, phone);
  lead.attribution_summary = summarizeAttribution(attribution);
  lead.routing_ready = status === "new" && !assignedAgentId && Boolean(email || phone);
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
