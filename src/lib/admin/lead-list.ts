/**
 * Lead list query for the admin inbox.
 *
 * Pure helper around the Supabase admin client. Returns a stable empty
 * shape when not configured. Filters are validated upstream.
 *
 * Attribution and scoring are loaded as optional supplements so the list
 * degrades gracefully when those tables are absent or return errors.
 */
import { LEAD_TYPES, LEAD_STATUSES, LEAD_GRADES } from "@/lib/leads/lead-types";
import { SPAM_SUSPECT_THRESHOLD } from "@/lib/leads/spam-detector";

export interface LeadListFilters {
  q?: string | null;
  leadType?: string | null;
  status?: string | null;
  grade?: string | null;
  source?: string | null;
  assignedAgentId?: string | null;
  unassignedOnly?: boolean;
  spamSuspect?: boolean;
  city?: string | null;
  createdFromIso?: string | null;
  createdToIso?: string | null;
  sort?: "newest" | "highest_score" | "sla_deadline" | "last_activity";
  followUpDue?: boolean;
  neverContacted?: boolean;
  /** Grade A+/A leads — highest priority inbox view. */
  urgentOnly?: boolean;
  /** A+/A grade, no last_contacted_at, created > 5 min ago — SLA at risk. */
  slaBreach?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeadListRow {
  id: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  leadType: string;
  status: string;
  grade: string | null;
  source: string | null;
  /** Referrer classification written by classifyReferrer() on capture. */
  referrerType: string | null;
  /** Whether source_attribution.is_paid is true for this lead. */
  isPaid: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  /** Attribution evidence tier: source_attribution > sessions > lead_row > none */
  attributionEvidence: "source_attribution" | "lead_row" | "none";
  score: number | null;
  temperature: string | null;
  assignedAgentId: string | null;
  lastContactedAt: string | null;
  spamScore: number | null;
  city: string | null;
  state: string | null;
}

export interface LeadListResult {
  configured: boolean;
  items: LeadListRow[];
  total: number;
  limit: number;
  offset: number;
}

const MAX_LIMIT = 100;

interface AttributionSupplement {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_type: string | null;
  is_paid: boolean;
  landing_page: string | null;
}

interface ScoreSupplement {
  composite_score: number | null;
  temperature: string | null;
}

export async function loadLeadList(
  filters: LeadListFilters
): Promise<LeadListResult> {
  const limit = Math.min(filters.limit ?? 25, MAX_LIMIT);
  const offset = Math.max(filters.offset ?? 0, 0);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { configured: false, items: [], total: 0, limit, offset };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  let q = client
    .from("leads")
    .select(
      "id, created_at, first_name, last_name, email, phone, lead_type, status, lead_grade, source, assigned_agent_id, last_contacted_at, spam_score, city, state",
      { count: "exact" }
    )
    .range(offset, offset + limit - 1);

  if (filters.leadType && (LEAD_TYPES as readonly string[]).includes(filters.leadType)) {
    q = q.eq("lead_type", filters.leadType);
  }
  if (filters.status && (LEAD_STATUSES as readonly string[]).includes(filters.status)) {
    q = q.eq("status", filters.status);
  }
  if (filters.grade && (LEAD_GRADES as readonly string[]).includes(filters.grade)) {
    q = q.eq("lead_grade", filters.grade);
  }
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.assignedAgentId) q = q.eq("assigned_agent_id", filters.assignedAgentId);
  if (filters.unassignedOnly) q = q.is("assigned_agent_id", null);
  if (filters.spamSuspect) q = q.gte("spam_score", SPAM_SUSPECT_THRESHOLD);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.createdFromIso) q = q.gte("created_at", filters.createdFromIso);
  if (filters.createdToIso) q = q.lte("created_at", filters.createdToIso);
  if (filters.followUpDue) {
    const now = new Date().toISOString();
    q = q.lte("next_follow_up_at", now).not("next_follow_up_at", "is", null);
  }
  if (filters.neverContacted) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    q = q.eq("status", "assigned").is("last_contacted_at", null).lt("created_at", twoHoursAgo);
  }
  if (filters.urgentOnly) {
    q = q.in("lead_grade", ["A+", "A"]);
  }
  if (filters.slaBreach) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    q = q.in("lead_grade", ["A+", "A"]).is("last_contacted_at", null).lt("created_at", fiveMinAgo);
  }
  if (filters.q) {
    q = q.or(
      [
        `email.ilike.%${filters.q}%`,
        `first_name.ilike.%${filters.q}%`,
        `last_name.ilike.%${filters.q}%`,
        `phone.ilike.%${filters.q}%`,
        `normalized_property_address.ilike.%${filters.q}%`,
      ].join(",")
    );
  }

  switch (filters.sort) {
    case "highest_score":
      q = q.order("lead_grade", { ascending: true }).order("created_at", { ascending: false });
      break;
    case "last_activity":
      q = q.order("last_contacted_at", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      q = q.order("created_at", { ascending: false });
      break;
  }

  const { data, count, error } = await q;
  if (error) {
    return { configured: true, items: [], total: 0, limit, offset };
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = rows.map((r) => r.id as string).filter(Boolean);

  // Batch-fetch attribution and scores — failures are non-fatal
  const [attributionMap, scoreMap] = await Promise.all([
    loadAttributionSupplements(client, ids),
    loadScoreSupplements(client, ids),
  ]);

  const items: LeadListRow[] = rows.map((r) => {
    const id = r.id as string;
    const attr = attributionMap.get(id) ?? null;
    const sc = scoreMap.get(id) ?? null;
    return mapLeadListRow(r, attr, sc);
  });

  return { configured: true, items, total: count ?? items.length, limit, offset };
}

async function loadAttributionSupplements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  ids: string[]
): Promise<Map<string, AttributionSupplement>> {
  const map = new Map<string, AttributionSupplement>();
  if (ids.length === 0) return map;
  try {
    const { data } = await client
      .from("source_attribution")
      .select("lead_id, utm_source, utm_medium, utm_campaign, referrer_type, is_paid, landing_page")
      .in("lead_id", ids);
    for (const row of data ?? []) {
      map.set(row.lead_id, {
        utm_source: row.utm_source ?? null,
        utm_medium: row.utm_medium ?? null,
        utm_campaign: row.utm_campaign ?? null,
        referrer_type: row.referrer_type ?? null,
        is_paid: Boolean(row.is_paid),
        landing_page: row.landing_page ?? null,
      });
    }
  } catch {
    // Non-fatal: attribution supplement unavailable
  }
  return map;
}

async function loadScoreSupplements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  ids: string[]
): Promise<Map<string, ScoreSupplement>> {
  const map = new Map<string, ScoreSupplement>();
  if (ids.length === 0) return map;
  try {
    const { data } = await client
      .from("lead_scores")
      .select("lead_id, composite_score, temperature")
      .in("lead_id", ids);
    for (const row of data ?? []) {
      map.set(row.lead_id, {
        composite_score: typeof row.composite_score === "number" ? row.composite_score : null,
        temperature: typeof row.temperature === "string" ? row.temperature : null,
      });
    }
  } catch {
    // Non-fatal: score supplement unavailable
  }
  return map;
}

export function mapLeadListRow(
  r: Record<string, unknown>,
  attr: AttributionSupplement | null,
  sc: ScoreSupplement | null
): LeadListRow {
  const sourceOnRow = typeof r.source === "string" && r.source.trim() !== "" ? r.source : null;
  const attributionEvidence: LeadListRow["attributionEvidence"] = attr
    ? "source_attribution"
    : sourceOnRow
      ? "lead_row"
      : "none";

  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    firstName: (r.first_name as string | null) ?? null,
    lastName: (r.last_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    leadType: (r.lead_type as string | null) ?? "unknown",
    status: (r.status as string | null) ?? "new",
    grade: (r.lead_grade as string | null) ?? null,
    source: sourceOnRow,
    referrerType: attr?.referrer_type ?? null,
    isPaid: attr?.is_paid ?? false,
    utmSource: attr?.utm_source ?? null,
    utmMedium: attr?.utm_medium ?? null,
    utmCampaign: attr?.utm_campaign ?? null,
    landingPage: attr?.landing_page ?? null,
    attributionEvidence,
    score: sc?.composite_score ?? null,
    temperature: sc?.temperature ?? null,
    assignedAgentId: (r.assigned_agent_id as string | null) ?? null,
    lastContactedAt: (r.last_contacted_at as string | null) ?? null,
    spamScore: (r.spam_score as number | null) ?? null,
    city: (r.city as string | null) ?? null,
    state: (r.state as string | null) ?? null,
  };
}
