export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AgentShell, AgentSectionHeading } from "@/components/agent/agent-shell";
import { RoleGate } from "@/components/agent/role-gate";
import { AgentLeadRow } from "@/components/agent/agent-lead-row";
import { resolveAgentAccess } from "@/lib/agent/agent-auth";

// ---------------------------------------------------------------------------
// Data loader scoped to this page — separate from the portal-metrics loader
// ---------------------------------------------------------------------------

interface LeadRow {
  id: string;
  name: string | null;
  leadType: string;
  grade: string | null;
  status: string;
  temperature: string | null;
  createdAt: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  source: string | null;
}

type FilterKey = "all" | "urgent" | "followup" | "stale" | "appointments" | "new";

async function loadAgentLeads(agentId: string): Promise<{ leads: LeadRow[]; configured: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { leads: [], configured: false };

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const { data, error } = await client
      .from("leads")
      .select(
        "id, first_name, last_name, lead_type, lead_grade, status, last_contacted_at, next_follow_up_at, created_at, utm_source"
      )
      .eq("assigned_agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return { leads: [], configured: true };

    const leads: LeadRow[] = (data as Array<Record<string, unknown>>).map((r) => ({
      id:              r.id as string,
      name:            r.first_name ? `${r.first_name} ${r.last_name ?? ""}`.trim() : null,
      leadType:        (r.lead_type as string) ?? "unknown",
      grade:           (r.lead_grade as string | null) ?? null,
      status:          (r.status as string) ?? "new",
      temperature:     null,
      createdAt:       r.created_at as string,
      lastContactedAt: (r.last_contacted_at as string | null) ?? null,
      nextFollowUpAt:  (r.next_follow_up_at as string | null) ?? null,
      source:          (r.utm_source as string | null) ?? null,
    }));

    return { leads, configured: true };
  } catch {
    return { leads: [], configured: false };
  }
}

function applyFilter(leads: LeadRow[], filter: FilterKey): LeadRow[] {
  const now = new Date().toISOString();
  const ago72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  switch (filter) {
    case "urgent":
      return leads.filter(
        (l) => (l.grade === "A+" || l.grade === "A") && !l.lastContactedAt
      );
    case "followup":
      return leads.filter(
        (l) => l.nextFollowUpAt && l.nextFollowUpAt <= now
      );
    case "stale":
      return leads.filter(
        (l) => !l.lastContactedAt && l.createdAt <= ago72h
      );
    case "appointments":
      return leads.filter((l) => l.status === "appointment_requested");
    case "new":
      return leads.filter((l) => l.status === "new");
    case "all":
    default:
      return leads;
  }
}

const FILTER_LABELS: Record<FilterKey, string> = {
  all:          "All Assigned",
  urgent:       "Urgent",
  followup:     "Follow-up Due",
  stale:        "Stale",
  appointments: "Appointments",
  new:          "New",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentLeadQueuePage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const access = await resolveAgentAccess(sp);

  if (!access.ok) return <RoleGate denial={access} />;

  const { agentId, agentName, isBrokerPreview } = access;

  const rawFilter = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  const filter: FilterKey =
    rawFilter && rawFilter in FILTER_LABELS ? (rawFilter as FilterKey) : "all";

  const { leads: allLeads, configured } = await loadAgentLeads(agentId);
  const visible = applyFilter(allLeads, filter);

  const urgentCount   = allLeads.filter((l) => (l.grade === "A+" || l.grade === "A") && !l.lastContactedAt).length;
  const followupCount = allLeads.filter((l) => l.nextFollowUpAt && l.nextFollowUpAt <= new Date().toISOString()).length;

  return (
    <AgentShell
      title="Lead Queue"
      eyebrow="Ask Magic Mike · Agent Portal"
      agentId={agentId}
      agentName={agentName}
      brokerPreview={isBrokerPreview}
      devMode={!configured}
      headerRight={
        <span className="text-xs text-slate-600 tabular-nums">
          {allLeads.length} assigned
        </span>
      }
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none border border-white/[0.06] rounded-xl overflow-hidden">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
            const active  = key === filter;
            const count   = key === "all"
              ? allLeads.length
              : applyFilter(allLeads, key).length;
            const isAlert = (key === "urgent" && urgentCount > 0) || (key === "followup" && followupCount > 0);

            return (
              <Link
                key={key}
                href={`/agent/leads?agent_id=${agentId}&filter=${key}`}
                className={[
                  "flex items-center gap-1.5 px-4 py-3 text-[10.5px] tracking-label font-semibold uppercase whitespace-nowrap border-r border-white/[0.06] last:border-r-0 transition-colors",
                  active
                    ? "bg-white/[0.04] text-cream"
                    : "text-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                {FILTER_LABELS[key]}
                {count > 0 && (
                  <span className={[
                    "rounded-full px-1.5 py-0.5 text-[8px] font-bold tabular-nums",
                    isAlert
                      ? "bg-ruby-400/20 text-ruby-400"
                      : active
                      ? "bg-white/10 text-slate-400"
                      : "bg-white/[0.05] text-slate-600",
                  ].join(" ")}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Lead list ── */}
        {visible.length > 0 ? (
          <div>
            <AgentSectionHeading className="mb-3">
              {FILTER_LABELS[filter]} — {visible.length} lead{visible.length !== 1 ? "s" : ""}
            </AgentSectionHeading>
            <div className="space-y-2" role="list" aria-label="Lead queue">
              {visible.map((lead) => (
                <div key={lead.id} role="listitem">
                  <AgentLeadRow lead={lead} agentId={agentId} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-2 text-center py-16"
            role="status"
            aria-label="No leads in this filter"
          >
            <p className="text-xs text-slate-600">
              {configured
                ? `No ${FILTER_LABELS[filter].toLowerCase()} leads.`
                : "Database not configured — connect Supabase to load lead queue."}
            </p>
            {configured && filter !== "all" && (
              <Link
                href={`/agent/leads?agent_id=${agentId}`}
                className="text-xs text-gold-400/70 hover:text-gold-300 transition-colors"
              >
                ← View all assigned leads
              </Link>
            )}
          </div>
        )}

      </main>
    </AgentShell>
  );
}
