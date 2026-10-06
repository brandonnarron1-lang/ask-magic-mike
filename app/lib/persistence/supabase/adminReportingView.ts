import { buildStalledLeadSignals } from "../../adminLeadLifecycle";

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
  assigned_at: string | null;
  last_contacted_at: string | null;
  lead_grade: string | null;
  conversion_stage: string | null;
  address_raw: string | null;
  email: string | null;
  phone: string | null;
  widget_session_id: string | null;
  first_touch_source?: string | null;
  last_touch_source?: string | null;
  attribution_campaign?: string | null;
  attribution_placement?: string | null;
  outcome_types?: string[];
  is_test?: boolean;
  communication_suppressed?: boolean;
  is_duplicate?: boolean;
  duplicate_of_lead_id?: string | null;
  has_contact?: boolean;
  first_human_response_recorded?: boolean;
  manual_attempt_recorded?: boolean;
  two_way_contact_recorded?: boolean;
};

export const REPORTING_APPOINTMENT_STATES = [
  "requested", "scheduled", "confirmed", "completed", "no_show", "canceled",
] as const;
export type ReportingAppointmentState = typeof REPORTING_APPOINTMENT_STATES[number];
export type ReportingScope = "all_live_leads" | "assigned_live_leads" | "aggregate_only";
export type ReportingDrillthroughCursor = { end: Date; createdAt: string; id: string };
export type AdminReportingDrillthrough = {
  configured: boolean;
  rows: Array<{ id: string; created_at: string; assigned_agent_id: string | null }>;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  error?: string;
};

/** Cursor contains only a cohort anchor and stable (created_at, UUID) key, not
 * contact/search text or authority. Every page rechecks the principal in SQL. */
export function parseReportingDrillthroughCursor(
  value: string, windowDays: 7 | 30 | 90, now = new Date(),
): ReportingDrillthroughCursor | null {
  const [window, end, createdAt, id, extra] = value.split("~");
  if (extra !== undefined || window !== String(windowDays) || !end || !createdAt ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) return null;
  const anchor = new Date(end);
  const created = new Date(createdAt);
  if (!Number.isFinite(anchor.getTime()) || !Number.isFinite(created.getTime()) ||
    anchor.getTime() > now.getTime() || now.getTime() - anchor.getTime() > 24 * 60 * 60 * 1000 ||
    created.getTime() >= anchor.getTime() || created.getTime() < anchor.getTime() - windowDays * 24 * 60 * 60 * 1000) return null;
  // Keep PostgreSQL microseconds: Date.toISOString() would truncate the key
  // and skip rows sharing the last page record's millisecond.
  return { end: anchor, createdAt, id };
}

export type ConversionReportingGroup = {
  source: string;
  captured: number;
  qualified: number;
  firstHumanResponse: number;
  manualAttempted: number | null;
  twoWayContact: number | null;
  manualEvidenceUnknown: number;
  appointments: number;
  appointmentStates: Record<ReportingAppointmentState, number>;
  otherAppointmentStates: number;
  appointmentEvidenceUnknown: number;
  closedWon: number;
  outcomeEvidenceUnknown: number;
  commissions: number | null;
  conversionRate: number | null;
};

export type AdminConversionReporting = {
  available: boolean;
  cohort: {
    basis: "lead_created_at";
    timezone: "UTC";
    startInclusive: string;
    endExclusive: string;
    denominator: number | null;
    scope: ReportingScope;
    totals: "complete" | "unavailable";
    calculation: "full_scoped_cohort_in_memory";
  };
  totals: ConversionReportingGroup | null;
  sources: ConversionReportingGroup[];
  limitations: string[];
};

export type StatusBucketKey = "new" | "working" | "qualified_appointment" | "closed" | "spam_test";

export type AdminReportingGroup = {
  key: string;
  label: string;
  count: number;
  contactable: number;
  qualifiedAppointment: number;
  converted: number;
  conversionRate: number;
};

export type AdminAgentPerformanceGroup = {
  agent_id: string;
  agent_name: string;
  assigned: number;
  qualified: number;
  appointments: number;
  converted: number;
  closedLost: number;
  stalled: number;
  conversionRate: number;
};

export type AdminOperationalTrust = {
  responseSla: {
    available: boolean;
    measured: number;
    withinTarget: number;
    targetMinutes: number;
    unknown: number;
    rate: number | null;
  };
  assignmentAcceptance: {
    available: boolean;
    measured: number;
    accepted: number;
    pending: number;
    rate: number | null;
  };
  notifications: {
    available: boolean;
    intents: number;
    providerAccepted: number;
    delivered: number;
    failed: number;
    deliveryUnknown: number;
    providerAcceptanceRate: number | null;
    deliveryRate: number | null;
  };
  duplicates: {
    available: boolean;
    canonicalLeads: number;
    excludedAliases: number;
    submissionRecords: number;
    rate: number | null;
  };
  aiUsage: {
    available: boolean;
    requests: number;
    providerResponses: number;
    deterministicFallbacks: number;
    blocked: number;
    fallbackRate: number | null;
    estimatedCostUsd: number;
  };
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
    lostDisqualified: number;
  };
  rates: {
    qualificationRate: number;
    appointmentRate: number;
    conversionRate: number;
    closeRate: number;
    disqualificationRate: number;
  };
  stalledLeadCount: number;
  statusBuckets: Record<StatusBucketKey, number>;
  sources: AdminReportingGroup[];
  campaigns: AdminReportingGroup[];
  agentPerformance: AdminAgentPerformanceGroup[];
  appointmentOps: {
    requested: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    canceled: number;
    noShow: number;
    requestToScheduledRate: number | null;
    scheduledToCompletedRate: number | null;
    noShowRate: number | null;
  };
  followupOps: {
    open: number;
    overdue: number;
    dueToday: number;
    completed: number;
    cancelled: number;
    completionRate: number;
  };
  topPages: Array<{ page_url: string; count: number }>;
  leadTypes: Array<{ lead_type: string; count: number }>;
  intents: Array<{ primary_intent: string; count: number }>;
  timelines: Array<{ timeline_months: number | null; label: string; count: number }>;
  hotLeads: AdminReportingLeadRow[];
  sourceConversion: Array<{
    source: string;
    captured: number;
    qualified: number;
    appointments: number;
    closedWon: number;
    commissions: number | null;
    conversionRate: number | null;
  }>;
  dataTrust: {
    included: number;
    excludedTest: number;
    excludedSuppressed: number;
    excludedDuplicates: number;
    unknownFirstTouch: number;
    unknownLastTouch: number;
    outcomesObserved: number;
  };
  operationalTrust: AdminOperationalTrust;
  conversionReporting: AdminConversionReporting;
  error?: string;
};

export function unavailableOperationalTrust(canonicalLeads = 0): AdminOperationalTrust {
  return {
    responseSla: {
      available: false,
      measured: 0,
      withinTarget: 0,
      targetMinutes: 5,
      unknown: canonicalLeads,
      rate: null,
    },
    assignmentAcceptance: {
      available: false,
      measured: 0,
      accepted: 0,
      pending: 0,
      rate: null,
    },
    notifications: {
      available: false,
      intents: 0,
      providerAccepted: 0,
      delivered: 0,
      failed: 0,
      deliveryUnknown: 0,
      providerAcceptanceRate: null,
      deliveryRate: null,
    },
    duplicates: {
      available: false,
      canonicalLeads,
      excludedAliases: 0,
      submissionRecords: canonicalLeads,
      rate: null,
    },
    aiUsage: {
      available: false,
      requests: 0,
      providerResponses: 0,
      deterministicFallbacks: 0,
      blocked: 0,
      fallbackRate: null,
      estimatedCostUsd: 0,
    },
  };
}

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
  "assigned_at",
  "last_contacted_at",
  "lead_grade",
  "conversion_stage",
  "address_raw",
  "email",
  "phone",
  "widget_session_id",
  "is_test",
  "communication_suppressed",
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

const APPOINTMENT_STATUSES = new Set(["appointment_requested", "appointment_set", "converted"]);
const CLOSED_LOST_STATUSES = new Set(["dead"]);
const HOT_STATUSES = new Set(["new", "scored", "qualified", "appointment_requested"]);
const HOT_LEAD_TYPES = new Set(["seller", "seller_cash_offer", "home_value"]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

// Neon decodes timestamptz into Date objects; REST compatibility reads return
// strings. Preserve strings (including microseconds), normalize only real Dates.
function timestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  return text(value);
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
      lostDisqualified: 0,
    },
    rates: {
      qualificationRate: 0,
      appointmentRate: 0,
      conversionRate: 0,
      closeRate: 0,
      disqualificationRate: 0,
    },
    stalledLeadCount: 0,
    statusBuckets: {
      new: 0,
      working: 0,
      qualified_appointment: 0,
      closed: 0,
      spam_test: 0,
    },
    sources: [],
    campaigns: [],
    agentPerformance: [],
    appointmentOps: {
      requested: 0,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      canceled: 0,
      noShow: 0,
      requestToScheduledRate: 0,
      scheduledToCompletedRate: 0,
      noShowRate: 0,
    },
    followupOps: {
      open: 0,
      overdue: 0,
      dueToday: 0,
      completed: 0,
      cancelled: 0,
      completionRate: 0,
    },
    topPages: [],
    leadTypes: [],
    intents: [],
    timelines: [],
    hotLeads: [],
    sourceConversion: [],
    dataTrust: {
      included: 0,
      excludedTest: 0,
      excludedSuppressed: 0,
      excludedDuplicates: 0,
      unknownFirstTouch: 0,
      unknownLastTouch: 0,
      outcomesObserved: 0,
    },
    operationalTrust: unavailableOperationalTrust(),
    conversionReporting: reconcileConversionReporting([], now, windowDays),
    error,
  };
}

function summarizeAppointmentOps(rows: Array<Record<string, unknown>>) {
  const requested = rows.filter((row) => statusOf(String(row.status || "")) === "requested").length;
  const scheduled = rows.filter((row) => ["scheduled", "confirmed", "completed", "no_show"].includes(statusOf(String(row.status || "")))).length;
  const confirmed = rows.filter((row) => ["confirmed", "completed", "no_show"].includes(statusOf(String(row.status || "")))).length;
  const completed = rows.filter((row) => statusOf(String(row.status || "")) === "completed").length;
  const canceled = rows.filter((row) => statusOf(String(row.status || "")) === "canceled").length;
  const noShow = rows.filter((row) => statusOf(String(row.status || "")) === "no_show").length;
  return {
    requested,
    scheduled,
    confirmed,
    completed,
    canceled,
    noShow,
    requestToScheduledRate: percent(scheduled, requested + scheduled),
    scheduledToCompletedRate: percent(completed, scheduled),
    noShowRate: percent(noShow, confirmed),
  };
}

function summarizeFollowupOps(rows: Array<Record<string, unknown>>, now: Date) {
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const openRows = rows.filter((row) => statusOf(String(row.status || "")) === "open");
  const completed = rows.filter((row) => statusOf(String(row.status || "")) === "done").length;
  const cancelled = rows.filter((row) => statusOf(String(row.status || "")) === "cancelled").length;
  return {
    open: openRows.length,
    overdue: openRows.filter((row) => {
      const dueAt = parseTime(timestamp(row.due_at));
      return Number.isFinite(dueAt) && dueAt < now.getTime();
    }).length,
    dueToday: openRows.filter((row) => {
      const dueAt = parseTime(timestamp(row.due_at));
      return Number.isFinite(dueAt) && dueAt >= todayStart && dueAt < todayEnd;
    }).length,
    completed,
    cancelled,
    completionRate: percent(completed, openRows.length + completed + cancelled),
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

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
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
    created_at: timestamp(row.created_at),
    status: text(row.status) || "new",
    lead_type: text(row.lead_type),
    source: text(row.source),
    source_detail: text(row.source_detail),
    page_url: text(row.page_url),
    timeline_months: numberOrNull(row.timeline_months),
    primary_intent: text(row.primary_intent),
    assigned_agent_id: text(row.assigned_agent_id),
    assigned_at: timestamp(row.assigned_at),
    last_contacted_at: timestamp(row.last_contacted_at),
    lead_grade: text(row.lead_grade),
    conversion_stage: text(row.conversion_stage),
    address_raw: text(row.address_raw),
    email: text(row.email),
    phone: text(row.phone),
    widget_session_id: text(row.widget_session_id),
    is_test: row.is_test === true || row.is_test === "true",
    communication_suppressed:
      row.communication_suppressed === true || row.communication_suppressed === "true",
    is_duplicate: row.is_duplicate === true || row.is_duplicate === "true",
    duplicate_of_lead_id: text(row.duplicate_of_lead_id),
    has_contact: row.has_contact === true || row.has_contact === "true",
    first_human_response_recorded:
      row.first_human_response_recorded === true || row.first_human_response_recorded === "true",
    manual_attempt_recorded: row.manual_attempt_recorded === true || row.manual_attempt_recorded === "true",
    two_way_contact_recorded: row.two_way_contact_recorded === true || row.two_way_contact_recorded === "true",
    first_touch_source: text(row.first_touch_source),
    last_touch_source: text(row.last_touch_source),
    attribution_campaign: text(row.attribution_campaign),
    attribution_placement: text(row.attribution_placement),
    outcome_types: Array.isArray(row.outcome_types)
      ? row.outcome_types.filter((value): value is string => typeof value === "string")
      : [],
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
  return Boolean(row.is_test || row.communication_suppressed) || bucketLeadStatus(row.status) === "spam_test";
}

export function isContactable(row: AdminReportingLeadRow): boolean {
  return Boolean(row.has_contact || row.email || row.phone);
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

export function isClosedLost(row: AdminReportingLeadRow): boolean {
  return CLOSED_LOST_STATUSES.has(statusOf(row));
}

export function agentNameFor(agentId: string, agentNames: ReadonlyMap<string, string>) {
  return agentNames.get(agentId) || "Unknown agent";
}

export function timelineLabel(months: number | null | undefined): string {
  if (months === 0) return "Immediate / 0-30 days";
  if (months === 3) return "30-90 days";
  if (months === 6) return "3-6 months";
  if (months === 12) return "6-12 months";
  if (months === 24) return "12+ months / not sure";
  return "Unknown";
}

/** Read-only reconciliation, not a projection writer. Appointment states are
 * exact current record states, distinct per lead within each state; they may
 * overlap when a lead has multiple appointments. No later state proves an
 * earlier state. Missing records mean no observed evidence, not a negative
 * business outcome. Legacy capped REST reads cannot establish completeness. */
export function reconcileConversionReporting(
  rows: AdminReportingLeadRow[],
  now = new Date(),
  windowDays: 7 | 30 | 90 = 30,
  appointmentRows: Array<Record<string, unknown>> = [],
  evidence?: { complete: boolean; scope: ReportingScope },
): AdminConversionReporting {
  const start = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const result: AdminConversionReporting = {
    available: evidence?.complete === true,
    cohort: {
      basis: "lead_created_at", timezone: "UTC",
      startInclusive: new Date(start).toISOString(), endExclusive: now.toISOString(),
      denominator: null, scope: evidence?.scope || "all_live_leads", totals: "unavailable",
      calculation: "full_scoped_cohort_in_memory",
    },
    totals: null, sources: [],
    limitations: [
      "Manual attempts and two-way contact require provenance-gated operator audit records. Delivery, task completion, and first human response are not substitutes for two-way evidence.",
      "Commission settlement is unavailable: a closed outcome or referral payment is not commission-settlement evidence.",
      "Appointment states are current canonical records, not a historical transition funnel; states may overlap across appointments for one lead.",
    ],
  };
  if (!result.available) return result;
  const cohort = [...new Map(rows.filter((row) => {
    const captured = parseTime(row.created_at);
    return row.id !== "unknown" && !isSpamOrTest(row) && !row.is_duplicate && !row.duplicate_of_lead_id &&
      Number.isFinite(captured) && captured >= start && captured < now.getTime();
  }).map((row) => [row.id, row])).values()];
  const leads = new Map(cohort.map((row) => [row.id, row]));
  const states = new Map<string, Set<string>>();
  for (const record of appointmentRows) {
    const leadId = text(record.lead_id);
    const lead = leadId ? leads.get(leadId) : undefined;
    const recorded = parseTime(timestamp(record.created_at));
    const state = text(record.status);
    if (!leadId || !lead || !text(record.id) || !state ||
      !Number.isFinite(recorded) || recorded < parseTime(lead.created_at) || recorded >= now.getTime()) continue;
    // All values come from the existing canonical appointment status contract.
    if (![...REPORTING_APPOINTMENT_STATES, "reschedule_requested"].includes(state as ReportingAppointmentState)) continue;
    const leadStates = states.get(leadId) || new Set<string>();
    leadStates.add(state);
    states.set(leadId, leadStates);
  }
  function group(source: string, members: AdminReportingLeadRow[]): ConversionReportingGroup {
    const closedWon = members.filter((row) => row.outcome_types?.includes("closed")).length;
    return {
      source, captured: members.length,
      qualified: members.filter((row) => statusOf(row) === "qualified" || row.outcome_types?.includes("qualified")).length,
      firstHumanResponse: members.filter((row) => row.first_human_response_recorded).length,
      manualAttempted: members.filter((row) => row.manual_attempt_recorded).length,
      twoWayContact: members.filter((row) => row.two_way_contact_recorded).length,
      manualEvidenceUnknown: members.filter((row) => !row.manual_attempt_recorded).length,
      appointments: members.filter((row) => states.has(row.id)).length,
      appointmentStates: Object.fromEntries(REPORTING_APPOINTMENT_STATES.map((state) => [
        state, members.filter((row) => states.get(row.id)?.has(state)).length,
      ])) as Record<ReportingAppointmentState, number>,
      otherAppointmentStates: members.filter((row) => states.get(row.id)?.has("reschedule_requested")).length,
      appointmentEvidenceUnknown: members.filter((row) => !states.has(row.id)).length,
      closedWon,
      outcomeEvidenceUnknown: members.filter((row) => !row.outcome_types?.length).length,
      commissions: null,
      conversionRate: members.length ? percent(closedWon, members.length) : null,
    };
  }
  const sources = new Map<string, AdminReportingLeadRow[]>();
  for (const lead of cohort) {
    const source = lead.first_touch_source || "Unknown first touch";
    const members = sources.get(source) || [];
    members.push(lead);
    sources.set(source, members);
  }
  result.cohort.denominator = cohort.length;
  result.cohort.totals = "complete";
  result.totals = group("All included leads", cohort);
  result.sources = [...sources].map(([source, members]) => group(source, members))
    .sort((a, b) => b.captured - a.captured || a.source.localeCompare(b.source));
  return result;
}

export function summarizeReportingRows(
  rows: AdminReportingLeadRow[],
  now = new Date(),
  windowDays: 7 | 30 | 90 = 30,
  agentNames: ReadonlyMap<string, string> = new Map(),
  appointmentRows: Array<Record<string, unknown>> = [],
  followupRows: Array<Record<string, unknown>> = [],
  excluded: { test?: number; suppressed?: number; duplicate?: number } = {},
  canonicalEvidence?: { complete: boolean; scope: ReportingScope },
): AdminReportingSummary {
  const normalizedRows = [...new Map(rows.map((row) => normalizeReportingLeadRow(row as unknown as Record<string, unknown>))
    .map((row) => [row.id, row])).values()].filter((row) => !canonicalEvidence || (
      parseTime(row.created_at) >= now.getTime() - windowDays * 24 * 60 * 60 * 1000 &&
      parseTime(row.created_at) < now.getTime()
    ));
  const nonSpamRows = normalizedRows.filter((row) => !isSpamOrTest(row) && !row.is_duplicate && !row.duplicate_of_lead_id);
  const conversionReporting = reconcileConversionReporting(normalizedRows, now, windowDays, appointmentRows, canonicalEvidence);
  const cohortById = new Map(nonSpamRows.map((row) => [row.id, row]));
  const appointmentLeadIds = new Set(appointmentRows.filter((record) => {
    const lead = cohortById.get(text(record.lead_id) || "");
    return lead && text(record.id) &&
      [...REPORTING_APPOINTMENT_STATES, "reschedule_requested"].includes(String(record.status)) &&
      parseTime(timestamp(record.created_at)) >= parseTime(lead.created_at) &&
      parseTime(timestamp(record.created_at)) < now.getTime();
  }).map((row) => text(row.lead_id)));
  const qualified = (row: AdminReportingLeadRow) => canonicalEvidence
    ? statusOf(row) === "qualified" || Boolean(row.outcome_types?.includes("qualified")) : isQualified(row);
  const appointment = (row: AdminReportingLeadRow) => canonicalEvidence ? appointmentLeadIds.has(row.id) : isAppointment(row);
  const converted = (row: AdminReportingLeadRow) => canonicalEvidence ? Boolean(row.outcome_types?.includes("closed")) : isConverted(row);
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
  const campaignMap = new Map<string, AdminReportingGroup>();
  const agentMap = new Map<string, AdminAgentPerformanceGroup>();
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
      conversionRate: 0,
    };
    group.count += 1;
    if (isContactable(row)) group.contactable += 1;
    if (qualified(row) || appointment(row)) group.qualifiedAppointment += 1;
    if (converted(row)) group.converted += 1;
    sourceMap.set(key, group);

    const campaign = row.attribution_campaign || row.source_detail || row.source || "Unknown campaign";
    const campaignGroup = campaignMap.get(campaign) || {
      key: campaign,
      label: campaign,
      count: 0,
      contactable: 0,
      qualifiedAppointment: 0,
      converted: 0,
      conversionRate: 0,
    };
    campaignGroup.count += 1;
    if (isContactable(row)) campaignGroup.contactable += 1;
    if (qualified(row) || appointment(row)) campaignGroup.qualifiedAppointment += 1;
    if (converted(row)) campaignGroup.converted += 1;
    campaignMap.set(campaign, campaignGroup);

    if (row.assigned_agent_id) {
      const agent = agentMap.get(row.assigned_agent_id) || {
        agent_id: row.assigned_agent_id,
        agent_name: agentNameFor(row.assigned_agent_id, agentNames),
        assigned: 0,
        qualified: 0,
        appointments: 0,
        converted: 0,
        closedLost: 0,
        stalled: 0,
        conversionRate: 0,
      };
      agent.assigned += 1;
      if (qualified(row)) agent.qualified += 1;
      if (appointment(row)) agent.appointments += 1;
      if (converted(row)) agent.converted += 1;
      if (isClosedLost(row)) agent.closedLost += 1;
      if (buildStalledLeadSignals(row, now).length) agent.stalled += 1;
      agentMap.set(row.assigned_agent_id, agent);
    }

    if (row.page_url) pageMap.set(row.page_url, (pageMap.get(row.page_url) || 0) + 1);
    timelineMap.set(row.timeline_months, (timelineMap.get(row.timeline_months) || 0) + 1);
  }

  const sources = [...sourceMap.values()].map((group) => ({
    ...group,
    conversionRate: percent(group.converted, group.count),
  })).sort(
    (a, b) =>
      b.count - a.count ||
      b.contactable - a.contactable ||
      b.qualifiedAppointment - a.qualifiedAppointment ||
      b.converted - a.converted ||
      a.label.localeCompare(b.label),
  );

  const campaigns = [...campaignMap.values()].map((group) => ({
    ...group,
    conversionRate: percent(group.converted, group.count),
  })).sort(
    (a, b) =>
      b.converted - a.converted ||
      b.count - a.count ||
      a.label.localeCompare(b.label),
  );

  const agentPerformance = [...agentMap.values()].map((agent) => ({
    ...agent,
    conversionRate: percent(agent.converted, agent.assigned),
  })).sort(
    (a, b) =>
      b.assigned - a.assigned ||
      b.converted - a.converted ||
      a.agent_name.localeCompare(b.agent_name) ||
      a.agent_id.localeCompare(b.agent_id),
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

  const sourceConversion = conversionReporting.sources.map((group) => ({
    source: group.source, captured: group.captured, qualified: group.qualified,
    appointments: group.appointments, closedWon: group.closedWon,
    commissions: group.commissions, conversionRate: group.conversionRate,
  }));

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
      contacted: nonSpamRows.filter((row) => canonicalEvidence ? row.first_human_response_recorded : CONTACTED_STATUSES.has(statusOf(row))).length,
      qualified: nonSpamRows.filter(qualified).length,
      appointment: nonSpamRows.filter(appointment).length,
      converted: nonSpamRows.filter(converted).length,
      lostDisqualified: normalizedRows.filter((row) => isClosedLost(row) || isSpamOrTest(row)).length,
    },
    rates: {
      qualificationRate: percent(nonSpamRows.filter(qualified).length, nonSpamRows.length),
      appointmentRate: percent(nonSpamRows.filter(appointment).length, canonicalEvidence ? nonSpamRows.length : nonSpamRows.filter(qualified).length),
      conversionRate: percent(nonSpamRows.filter(converted).length, nonSpamRows.length),
      closeRate: percent(
        nonSpamRows.filter(converted).length,
        nonSpamRows.filter(converted).length + nonSpamRows.filter(isClosedLost).length,
      ),
      disqualificationRate: percent(normalizedRows.filter(isSpamOrTest).length, normalizedRows.length),
    },
    stalledLeadCount: nonSpamRows.filter((row) => buildStalledLeadSignals(row, now).length > 0).length,
    statusBuckets,
    sources,
    campaigns,
    agentPerformance,
    appointmentOps: conversionReporting.totals ? {
      ...conversionReporting.totals.appointmentStates,
      noShow: conversionReporting.totals.appointmentStates.no_show,
      // Historical transition rates require transition evidence, not the
      // current-state appointment inventory available to this read model.
      requestToScheduledRate: null, scheduledToCompletedRate: null,
      noShowRate: conversionReporting.totals.captured
        ? percent(conversionReporting.totals.appointmentStates.no_show, conversionReporting.totals.captured) : null,
    } : summarizeAppointmentOps(appointmentRows),
    followupOps: summarizeFollowupOps(followupRows, now),
    topPages,
    leadTypes: groupSimple(nonSpamRows, "lead_type") as Array<{ lead_type: string; count: number }>,
    intents: groupSimple(nonSpamRows, "primary_intent") as Array<{ primary_intent: string; count: number }>,
    timelines,
    hotLeads,
    sourceConversion,
    dataTrust: {
      included: nonSpamRows.length,
      excludedTest: Math.max(0, excluded.test || 0),
      excludedSuppressed: Math.max(0, excluded.suppressed || 0),
      excludedDuplicates: Math.max(0, excluded.duplicate || 0),
      unknownFirstTouch: nonSpamRows.filter((row) => !row.first_touch_source).length,
      unknownLastTouch: nonSpamRows.filter((row) => !row.last_touch_source).length,
      outcomesObserved: nonSpamRows.filter((row) => (row.outcome_types || []).length > 0).length,
    },
    operationalTrust: unavailableOperationalTrust(nonSpamRows.length),
    conversionReporting,
  };
}

export async function loadAgentNameMap(input: {
  supabaseUrl: string;
  serviceKey: string;
  agentIds: string[];
}): Promise<Map<string, string>> {
  const uniqueAgentIds = [...new Set(input.agentIds.filter(Boolean))].slice(0, 100);
  if (!uniqueAgentIds.length) return new Map();

  const url = new URL("/rest/v1/agents", input.supabaseUrl);
  url.searchParams.set("select", "id,name");
  url.searchParams.set("id", `in.(${uniqueAgentIds.join(",")})`);
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: {
      apikey: input.serviceKey,
      Authorization: "Bearer " + input.serviceKey,
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!response.ok) return new Map();

  const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
  const names = new Map<string, string>();
  for (const row of rows) {
    const id = text(row.id);
    const name = text(row.name);
    if (id && name && uniqueAgentIds.includes(id) && !names.has(id)) {
      names.set(id, name);
    }
  }
  return names;
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
  const normalizedRows = rows.map(normalizeReportingLeadRow);
  const agentNames = await loadAgentNameMap({
    supabaseUrl,
    serviceKey,
    agentIds: normalizedRows.map((row) => row.assigned_agent_id).filter((id): id is string => Boolean(id)),
  });

  const appointmentsUrl = new URL("/rest/v1/lead_appointments", supabaseUrl);
  appointmentsUrl.searchParams.set("select", "id,status,starts_at,lead_id,assigned_agent_id,created_at");
  appointmentsUrl.searchParams.set("created_at", "gte." + cutoff.toISOString());
  appointmentsUrl.searchParams.set("limit", "1000");

  const followupsUrl = new URL("/rest/v1/tasks", supabaseUrl);
  followupsUrl.searchParams.set("select", "id,status,due_at,lead_id,agent_id,category,created_at");
  followupsUrl.searchParams.set("category", "like.followup:%");
  followupsUrl.searchParams.set("created_at", "gte." + cutoff.toISOString());
  followupsUrl.searchParams.set("limit", "1000");

  const [appointmentsResponse, followupsResponse] = await Promise.all([
    fetch(appointmentsUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    }),
    fetch(followupsUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    }),
  ]);

  const appointmentRows = appointmentsResponse.ok
    ? ((await appointmentsResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];
  const followupRows = followupsResponse.ok
    ? ((await followupsResponse.json().catch(() => [])) as Array<Record<string, unknown>>)
    : [];

  return summarizeReportingRows(normalizedRows, now, windowDays, agentNames, appointmentRows, followupRows);
}
