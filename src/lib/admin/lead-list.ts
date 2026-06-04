/**
 * Lead list query for the admin inbox.
 *
 * Pure helper around the Supabase admin client. Returns a stable empty
 * shape when not configured. Filters are validated upstream.
 */
import { LEAD_TYPES, LEAD_STATUSES, LEAD_GRADES } from "@/lib/leads/lead-types";

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
  utmCampaign: string | null;
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
  if (filters.assignedAgentId)
    q = q.eq("assigned_agent_id", filters.assignedAgentId);
  if (filters.unassignedOnly) q = q.is("assigned_agent_id", null);
  if (filters.spamSuspect) q = q.gte("spam_score", 40);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.createdFromIso) q = q.gte("created_at", filters.createdFromIso);
  if (filters.createdToIso) q = q.lte("created_at", filters.createdToIso);
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
  const items: LeadListRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    firstName: (r.first_name as string | null) ?? null,
    lastName: (r.last_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    leadType: (r.lead_type as string | null) ?? "unknown",
    status: (r.status as string | null) ?? "new",
    grade: (r.lead_grade as string | null) ?? null,
    source: (r.source as string | null) ?? null,
    utmCampaign: null,
    assignedAgentId: (r.assigned_agent_id as string | null) ?? null,
    lastContactedAt: (r.last_contacted_at as string | null) ?? null,
    spamScore: (r.spam_score as number | null) ?? null,
    city: (r.city as string | null) ?? null,
    state: (r.state as string | null) ?? null,
  }));
  return { configured: true, items, total: count ?? items.length, limit, offset };
}
