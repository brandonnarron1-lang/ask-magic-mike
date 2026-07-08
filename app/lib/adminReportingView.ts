export type AdminReportingLeadRow = {
  id: string;
  created_at: string | null;
  status: string;
  lead_type: string | null;
  source: string | null;
  source_detail: string | null;
  page_url: string | null;
  timeline_months: number | null;
  primary_intent: string | null;
  assigned_agent_id: string | null;
  address_raw: string | null;
  email: string | null;
  phone: string | null;
  widget_session_id: string | null;
};

export type StatusBucketKey = "new" | "working" | "qualified_appointment" | "closed" | "spam_test";

export type AdminReportingGroup = {
  key: string;
  label: string;
  count: number;
  contactable: number;
  qualifiedAppointment: number;
  converted: number;
};

export type AdminReportingSummary = {
  configured: boolean;
  windowDays: 7 | 30 | 90;
  generatedAt: string;
  rows: AdminReportingLeadRow[];
  kpis: {
    leadsToday: number;
    leadsLast7Days: number;
    leadsLast30Days: number;
    contactableRate: number;
  };
  funnel: {
    captured: number;
    contacted: number;
    qualified: number;
    appointment: number;
    converted: number;
  };
  statusBuckets: Record<StatusBucketKey, number>;
  sources: AdminReportingGroup[];
  topPages: Array<{ page_url: string; count: number }>;
  leadTypes: Array<{ lead_type: string; count: number }>;
  intents: Array<{ primary_intent: string; count: number }>;
  timelines: Array<{ timeline_months: number | null; label: string; count: number }>;
  hotLeads: AdminReportingLeadRow[];
  error?: string;
};

const REPORTING_SELECT = [
  "id",
  "created_at",
  "status",
  "lead_type",
  "source",
  "source_detail",
  "page_url",
  "timeline_months",
  "primary_intent",
  "assigned_agent_id",
  "address_raw",
  "email",
  "phone",
  "widget_session_id",
].join(",");

const CONTACTED_STATUSES = new Set([
  "contacted",
  "qualified",
  "appointment_requested",
  "appointment_set",
  "converted",
  "dead",
  "nurture",
]);

const QUALIFIED_STATUSES = new Set([
  "qualified",
  "appointment_requested",
  "appointment_set",
  "converted",
]);

const APPOINTMENT_STATUSES = new Set(["appointment_requested", "appointment_set"]);
const HOT_STATUSES = new Set(["new", "scored", "qualified", "appointment_requested"]);
const HOT_LEAD_TYPES = new Set(["seller", "seller_cash_offer", "home_value"]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function statusOf(rowOrStatus: AdminReportingLeadRow | string | null | undefined) {
  if (typeof rowOrStatus === "string") return rowOrStatus.trim().toLowerCase() || "new";
  return (rowOrStatus?.status || "new").trim().toLowerCase();
}

function parseTime(value: string | null) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function emptySummary(
  configured: boolean,
  windowDays: 7 | 30 | 90,
  now: Date,
  error?: string,
): AdminReportingSummary {
  return {
    configured,
    windowDays,
    generatedAt: now.toISOString(),
    rows: [],
    kpis: {
      leadsToday: 0,
      leadsLast7Days: 0,
      leadsLast30Days: 0,
      contactableRate: 0,
    },
    funnel: {
      captured: 0,
      contacted: 0,
      qualified: 0,
      appointment: 0,
      converted: 0,
    },
    statusBuckets: {
      new: 0,
      working: 0,
      qualified_appointment: 0,
      closed: 0,
      spam_test: 0,
    },
    sources: [],
    topPages: [],
    leadTypes: [],
    intents: [],
    timelines: [],
    hotLeads: [],
    error,
  };
}

function countSince(rows: AdminReportingLeadRow[], now: Date, days: number) {
  const start = now.getTime() - days * 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const createdAt = parseTime(row.created_at);
    return Number.isFinite(createdAt) && createdAt >= start && createdAt <= now.getTime();
  }).length;
}

function countToday(rows: AdminReportingLeadRow[], now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = start + 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const createdAt = parseTime(row.created_at);
    return Number.isFinite(createdAt) && createdAt >= start && createdAt < end;
  }).length;
}

function groupSimple(
  rows: AdminReportingLeadRow[],
  key: keyof Pick<AdminReportingLeadRow, "lead_type" | "primary_intent">,
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key] || "Unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((a, b) => b.count - a.count || String(a[key]).localeCompare(String(b[key])));
}

export function normalizeReportingLeadRow(row: Record<string, unknown>): AdminReportingLeadRow {
  return {
    id: text(row.id) || "unknown",
    created_at: text(row.created_at),
    status: text(row.status) || "new",
    lead_type: text(row.lead_type),
    source: text(row.source),
    source_detail: text(row.source_detail),
    page_url: text(row.page_url),
    timeline_months: numberOrNull(row.timeline_months),
    primary_intent: text(row.primary_intent),
    assigned_agent_id: text(row.assigned_agent_id),
    address_raw: text(row.address_raw),
    email: text(row.email),
    phone: text(row.phone),
    widget_session_id: text(row.widget_session_id),
  };
}

export function bucketLeadStatus(status: string | null | undefined): StatusBucketKey {
  const normalized = statusOf(status);
  if (["spam", "test", "internal_qa"].includes(normalized)) return "spam_test";
  if (["contacted", "nurture"].includes(normalized)) return "working";
  if (["qualified", "appointment_requested", "appointment_set"].includes(normalized)) {
    return "qualified_appointment";
  }
  if (["converted", "dead", "closed", "closed_won", "closed_lost"].includes(normalized)) {
    return "closed";
  }
  return "new";
}

export function isSpamOrTest(row: AdminReportingLeadRow): boolean {
  return bucketLeadStatus(row.status) === "spam_test";
}

export function isContactable(row: AdminReportingLeadRow): boolean {
  return Boolean(row.email || row.phone);
}

export function isQualified(row: AdminReportingLeadRow): boolean {
  return QUALIFIED_STATUSES.has(statusOf(row));
}

export function isAppointment(row: AdminReportingLeadRow): boolean {
  return APPOINTMENT_STATUSES.has(statusOf(row));
}

export function isConverted(row: AdminReportingLeadRow): boolean {
  return statusOf(row) === "converted";
}

export function timelineLabel(months: number | null | undefined): string {
  if (months === 0) return "Immediate / 0-30 days";
  if (months === 3) return "30-90 days";
  if (months === 6) return "3-6 months";
  if (months === 12) return "6-12 months";
  if (months === 24) return "12+ months / not sure";
  return "Unknown";
}

export function summarizeReportingRows(
  rows: AdminReportingLeadRow[],
  now = new Date(),
  windowDays: 7 | 30 | 90 = 30,
): AdminReportingSummary {
  const normalizedRows = rows.map((row) => normalizeReportingLeadRow(row as unknown as Record<string, unknown>));
  const nonSpamRows = normalizedRows.filter((row) => !isSpamOrTest(row));
  const contactableCount = nonSpamRows.filter(isContactable).length;
  const statusBuckets: Record<StatusBucketKey, number> = {
    new: 0,
    working: 0,
    qualified_appointment: 0,
    closed: 0,
    spam_test: 0,
  };

  for (const row of normalizedRows) {
    statusBuckets[bucketLeadStatus(row.status)] += 1;
  }

  const sourceMap = new Map<string, AdminReportingGroup>();
  const pageMap = new Map<string, number>();
  const timelineMap = new Map<number | null, number>();

  for (const row of nonSpamRows) {
    const source = row.source || "Unknown source";
    const detail = row.source_detail || "No detail";
    const key = `${source}||${detail}`;
    const group = sourceMap.get(key) || {
      key,
      label: `${source} / ${detail}`,
      count: 0,
      contactable: 0,
      qualifiedAppointment: 0,
      converted: 0,
    };
    group.count += 1;
    if (isContactable(row)) group.contactable += 1;
    if (isQualified(row) || isAppointment(row)) group.qualifiedAppointment += 1;
    if (isConverted(row)) group.converted += 1;
    sourceMap.set(key, group);

    if (row.page_url) pageMap.set(row.page_url, (pageMap.get(row.page_url) || 0) + 1);
    timelineMap.set(row.timeline_months, (timelineMap.get(row.timeline_months) || 0) + 1);
  }

  const sources = [...sourceMap.values()].sort(
    (a, b) =>
      b.count - a.count ||
      b.contactable - a.contactable ||
      b.qualifiedAppointment - a.qualifiedAppointment ||
      b.converted - a.converted ||
      a.label.localeCompare(b.label),
  );

  const topPages = [...pageMap.entries()]
    .map(([page_url, count]) => ({ page_url, count }))
    .sort((a, b) => b.count - a.count || a.page_url.localeCompare(b.page_url))
    .slice(0, 10);

  const timelines = [...timelineMap.entries()]
    .map(([months, count]) => ({ timeline_months: months, label: timelineLabel(months), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const hotLeads = nonSpamRows
    .filter((row) => {
      const leadType = (row.lead_type || "").toLowerCase();
      const primaryIntent = (row.primary_intent || "").toLowerCase();
      return (
        Boolean(row.phone) &&
        row.timeline_months === 0 &&
        primaryIntent === "sell" &&
        HOT_LEAD_TYPES.has(leadType) &&
        HOT_STATUSES.has(statusOf(row))
      );
    })
    .slice(0, 12);

  return {
    configured: true,
    windowDays,
    generatedAt: now.toISOString(),
    rows: normalizedRows,
    kpis: {
      leadsToday: countToday(nonSpamRows, now),
      leadsLast7Days: countSince(nonSpamRows, now, 7),
      leadsLast30Days: countSince(nonSpamRows, now, 30),
      contactableRate: nonSpamRows.length ? Math.round((contactableCount / nonSpamRows.length) * 100) : 0,
    },
    funnel: {
      captured: nonSpamRows.length,
      contacted: nonSpamRows.filter((row) => CONTACTED_STATUSES.has(statusOf(row))).length,
      qualified: nonSpamRows.filter(isQualified).length,
      appointment: nonSpamRows.filter(isAppointment).length,
      converted: nonSpamRows.filter(isConverted).length,
    },
    statusBuckets,
    sources,
    topPages,
    leadTypes: groupSimple(nonSpamRows, "lead_type") as Array<{ lead_type: string; count: number }>,
    intents: groupSimple(nonSpamRows, "primary_intent") as Array<{ primary_intent: string; count: number }>,
    timelines,
    hotLeads,
  };
}

export async function loadAdminReportingSummary(
  windowDays: 7 | 30 | 90 = 30,
): Promise<AdminReportingSummary> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const now = new Date();
  if (!supabaseUrl || !serviceKey) {
    return emptySummary(false, windowDays, now);
  }

  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const url = new URL("/rest/v1/leads", supabaseUrl);
  url.searchParams.set("select", REPORTING_SELECT);
  url.searchParams.set("created_at", "gte." + cutoff.toISOString());
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1000");

  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptySummary(true, windowDays, now, `Reporting query failed with ${response.status}`);
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return summarizeReportingRows(rows.map(normalizeReportingLeadRow), now, windowDays);
}
