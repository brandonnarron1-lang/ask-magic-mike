/**
 * Lead list query for the admin inbox.
 *
 * Pure helper around the Supabase admin client. Returns a stable empty
 * shape when not configured. Filters are validated upstream.
 *
 * Attribution and scoring are loaded as optional supplements so the list
 * degrades gracefully when those tables are absent or return errors.
 */
import { neon } from "@neondatabase/serverless";
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
  error?: string;
}

const MAX_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function validIso(value: string | null | undefined): value is string {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

async function loadNeonLeadList(
  filters: LeadListFilters,
  databaseUrl: string,
  limit: number,
  offset: number,
): Promise<LeadListResult> {
  const sql = neon(databaseUrl);
  const params: unknown[] = [];
  const where: string[] = [];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.leadType && (LEAD_TYPES as readonly string[]).includes(filters.leadType)) {
    where.push(`l.lead_type = ${bind(filters.leadType)}`);
  }
  if (filters.status && (LEAD_STATUSES as readonly string[]).includes(filters.status)) {
    where.push(`l.status = ${bind(filters.status)}`);
  }
  if (filters.grade && (LEAD_GRADES as readonly string[]).includes(filters.grade)) {
    where.push(`l.lead_grade = ${bind(filters.grade)}`);
  }
  if (filters.source) where.push(`l.source = ${bind(filters.source.slice(0, 200))}`);
  if (filters.assignedAgentId && UUID.test(filters.assignedAgentId)) {
    where.push(`l.assigned_agent_id = ${bind(filters.assignedAgentId)}::uuid`);
  }
  if (filters.unassignedOnly) where.push("l.assigned_agent_id IS NULL");
  if (filters.spamSuspect) where.push(`l.spam_score >= ${bind(SPAM_SUSPECT_THRESHOLD)}`);
  if (filters.city) where.push(`l.city ILIKE ${bind(`%${filters.city.slice(0, 120)}%`)}`);
  if (validIso(filters.createdFromIso)) {
    where.push(`l.created_at >= ${bind(filters.createdFromIso)}::timestamptz`);
  }
  if (validIso(filters.createdToIso)) {
    where.push(`l.created_at <= ${bind(filters.createdToIso)}::timestamptz`);
  }
  if (filters.followUpDue) {
    where.push("l.next_follow_up_at IS NOT NULL");
    where.push(`l.next_follow_up_at <= ${bind(new Date().toISOString())}::timestamptz`);
  }
  if (filters.neverContacted) {
    where.push("l.status = 'assigned'");
    where.push("l.last_contacted_at IS NULL");
    where.push(`l.created_at < ${bind(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())}::timestamptz`);
  }
  if (filters.urgentOnly) where.push("l.lead_grade IN ('A+', 'A')");
  if (filters.slaBreach) {
    where.push("l.lead_grade IN ('A+', 'A')");
    where.push("l.last_contacted_at IS NULL");
    where.push(`l.created_at < ${bind(new Date(Date.now() - 5 * 60_000).toISOString())}::timestamptz`);
  }
  if (filters.q) {
    const search = bind(`%${filters.q.trim().slice(0, 200)}%`);
    where.push(`(
      l.email ILIKE ${search}
      OR l.first_name ILIKE ${search}
      OR l.last_name ILIKE ${search}
      OR l.phone ILIKE ${search}
      OR l.normalized_property_address ILIKE ${search}
    )`);
  }

  const orderBy = filters.sort === "highest_score"
    ? "sc.composite_score DESC NULLS LAST, l.created_at DESC"
    : filters.sort === "last_activity"
      ? "l.last_contacted_at DESC NULLS LAST, l.created_at DESC"
      : filters.sort === "sla_deadline"
        ? "l.next_follow_up_at ASC NULLS LAST, l.created_at DESC"
        : "l.created_at DESC";
  const limitToken = bind(limit);
  const offsetToken = bind(offset);

  try {
    const rows = await sql.query(
      `SELECT l.id, l.created_at, l.first_name, l.last_name, l.email, l.phone,
              l.lead_type, l.status, l.lead_grade, l.source, l.assigned_agent_id,
              l.last_contacted_at, l.spam_score, l.city, l.state,
              sa.utm_source AS attr_utm_source,
              sa.utm_medium AS attr_utm_medium,
              sa.utm_campaign AS attr_utm_campaign,
              sa.referrer_type AS attr_referrer_type,
              sa.is_paid AS attr_is_paid,
              sa.landing_page AS attr_landing_page,
              sc.composite_score,
              sc.temperature,
              COUNT(*) OVER() AS total_count
         FROM public.leads AS l
         LEFT JOIN LATERAL (
           SELECT source_attribution.utm_source,
                  source_attribution.utm_medium,
                  source_attribution.utm_campaign,
                  source_attribution.referrer_type,
                  source_attribution.is_paid,
                  source_attribution.landing_page
             FROM public.source_attribution
            WHERE source_attribution.lead_id = l.id
            ORDER BY source_attribution.created_at DESC
            LIMIT 1
         ) AS sa ON true
         LEFT JOIN public.lead_scores AS sc ON sc.lead_id = l.id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
         ORDER BY ${orderBy}
         LIMIT ${limitToken} OFFSET ${offsetToken}`,
      params,
    ) as Array<Record<string, unknown>>;

    const items = rows.map((row) => mapLeadListRow(
      row,
      row.attr_utm_source !== null && row.attr_utm_source !== undefined ||
        row.attr_utm_medium !== null && row.attr_utm_medium !== undefined ||
        row.attr_utm_campaign !== null && row.attr_utm_campaign !== undefined ||
        row.attr_referrer_type !== null && row.attr_referrer_type !== undefined ||
        row.attr_landing_page !== null && row.attr_landing_page !== undefined
        ? {
            utm_source: typeof row.attr_utm_source === "string" ? row.attr_utm_source : null,
            utm_medium: typeof row.attr_utm_medium === "string" ? row.attr_utm_medium : null,
            utm_campaign: typeof row.attr_utm_campaign === "string" ? row.attr_utm_campaign : null,
            referrer_type: typeof row.attr_referrer_type === "string" ? row.attr_referrer_type : null,
            is_paid: row.attr_is_paid === true,
            landing_page: typeof row.attr_landing_page === "string" ? row.attr_landing_page : null,
          }
        : null,
      row.composite_score !== null && row.composite_score !== undefined ||
        row.temperature !== null && row.temperature !== undefined
        ? {
            composite_score: typeof row.composite_score === "number"
              ? row.composite_score
              : Number.isFinite(Number(row.composite_score))
                ? Number(row.composite_score)
                : null,
            temperature: typeof row.temperature === "string" ? row.temperature : null,
          }
        : null,
    ));
    const rawTotal = rows[0]?.total_count;
    const total = Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : items.length;
    return { configured: true, items, total, limit, offset };
  } catch {
    return {
      configured: true,
      items: [],
      total: 0,
      limit,
      offset,
      error: "lead_list_unavailable",
    };
  }
}

export async function loadLeadList(
  filters: LeadListFilters
): Promise<LeadListResult> {
  const rawLimit = Number.isFinite(filters.limit) ? Number(filters.limit) : 25;
  const rawOffset = Number.isFinite(filters.offset) ? Number(filters.offset) : 0;
  const limit = Math.max(1, Math.min(Math.trunc(rawLimit), MAX_LIMIT));
  const offset = Math.max(Math.trunc(rawOffset), 0);

  if (process.env.DATABASE_URL) {
    return loadNeonLeadList(filters, process.env.DATABASE_URL, limit, offset);
  }

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
    return { configured: true, items: [], total: 0, limit, offset, error: "lead_list_unavailable" };
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
