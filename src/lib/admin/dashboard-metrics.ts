/**
 * Dashboard metric queries.
 *
 * Reads canonical lead columns + the new tables added by migration 00012.
 * Returns a stable shape even when Supabase isn't configured so the admin
 * UI can render an empty cockpit in dev.
 */
import type { LeadGrade } from "@/lib/leads/lead-types";

export interface DashboardMetrics {
  configured: boolean;
  generatedAt: string;
  totals: {
    newToday: number;
    hot: number;        // A+ or A
    unassigned: number;
    overdueSla: number;
    contacted: number;
    appointmentsRequested: number;
    sellerCashOffer: number;
    listingInquiries: number;
    followUpDue: number;     // next_follow_up_at <= now
    neverContacted: number;  // assigned + no last_contacted_at + created > 2h ago
  };
  bySource: Array<{ source: string; count: number }>;
  recentLeads: Array<{
    id: string;
    name: string | null;
    leadType: string;
    grade: LeadGrade | null;
    status: string;
    createdAt: string;
  }>;
}

const EMPTY: DashboardMetrics = {
  configured: false,
  generatedAt: new Date().toISOString(),
  totals: {
    newToday: 0,
    hot: 0,
    unassigned: 0,
    overdueSla: 0,
    contacted: 0,
    appointmentsRequested: 0,
    sellerCashOffer: 0,
    listingInquiries: 0,
    followUpDue: 0,
    neverContacted: 0,
  },
  bySource: [],
  recentLeads: [],
};

export async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ...EMPTY, generatedAt: new Date().toISOString() };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // New canonical columns live in migration 00012; cast through untyped.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Pull a wide-but-bounded slice; small operations, low row counts.
  const { data, error } = await client
    .from("leads")
    .select(
      "id, created_at, first_name, last_name, name:first_name, status, lead_type, lead_grade, source, assigned_agent_id, last_contacted_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { ...EMPTY, generatedAt: new Date().toISOString() };
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  // Targeted count queries for daily-operations panel.
  const now = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();

  const [followUpRes, neverContactedRes] = await Promise.all([
    client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .lte("next_follow_up_at", now)
      .not("next_follow_up_at", "is", null),
    client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "assigned")
      .is("last_contacted_at", null)
      .lt("created_at", twoHoursAgo),
  ]);

  const totals = {
    newToday: 0,
    hot: 0,
    unassigned: 0,
    overdueSla: 0,
    contacted: 0,
    appointmentsRequested: 0,
    sellerCashOffer: 0,
    listingInquiries: 0,
    followUpDue: (followUpRes.count as number | null) ?? 0,
    neverContacted: (neverContactedRes.count as number | null) ?? 0,
  };

  const sources: Record<string, number> = {};
  const recent: DashboardMetrics["recentLeads"] = [];

  for (const r of rows) {
    const createdAt = new Date(r.created_at as string);
    if (createdAt >= todayStart) totals.newToday += 1;
    const grade = r.lead_grade as LeadGrade | null;
    if (grade === "A+" || grade === "A") totals.hot += 1;
    if (!r.assigned_agent_id) totals.unassigned += 1;
    if (r.status === "contacted") totals.contacted += 1;
    if (r.status === "appointment_requested") totals.appointmentsRequested += 1;
    if (r.lead_type === "seller_cash_offer") totals.sellerCashOffer += 1;
    if (r.lead_type === "listing_inquiry") totals.listingInquiries += 1;
    const src = (r.source as string | null) ?? "unknown";
    sources[src] = (sources[src] ?? 0) + 1;
    if (recent.length < 10) {
      const first = (r.first_name as string | null) ?? null;
      const last = (r.last_name as string | null) ?? null;
      const display = [first, last].filter(Boolean).join(" ") || null;
      recent.push({
        id: r.id as string,
        name: display,
        leadType: (r.lead_type as string | null) ?? "unknown",
        grade,
        status: (r.status as string | null) ?? "new",
        createdAt: createdAt.toISOString(),
      });
    }
  }

  // overdueSla is computed via the SlaEngine on demand — here we
  // approximate by counting hot leads with no last_contacted_at older than
  // 5 minutes. Conservative; the sweep endpoint gives the canonical count.
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
  totals.overdueSla = rows.filter((r) => {
    const grade = r.lead_grade as LeadGrade | null;
    if (grade !== "A+" && grade !== "A") return false;
    if (r.last_contacted_at) return false;
    return new Date(r.created_at as string) < fiveMinAgo;
  }).length;

  const bySource = Object.entries(sources)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    configured: true,
    generatedAt: new Date().toISOString(),
    totals,
    bySource,
    recentLeads: recent,
  };
}
