export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AgentShell, AgentCard, AgentSectionHeading } from "@/components/agent/agent-shell";
import { RoleGate, PermissionNotice } from "@/components/agent/role-gate";
import { SlaRiskBadge, FollowUpBadge } from "@/components/agent/sla-risk-badge";
import { AgentFollowUpForm } from "@/components/agent/agent-follow-up-form";
import { resolveAgentAccess, agentOwnsLead } from "@/lib/agent/agent-auth";
import { loadAgentEventLog } from "@/lib/agent/agent-portal-metrics";
import type { AgentEventLogEntry } from "@/lib/agent/agent-portal-metrics";

// ---------------------------------------------------------------------------
// Safe lead detail loader — only safe agent-visible fields
// ---------------------------------------------------------------------------

interface AgentLeadDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  leadType: string;
  grade: string | null;
  status: string;
  appointmentRequested: boolean;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  notes: string | null;
}

async function loadLeadDetail(
  leadId: string,
  agentId: string
): Promise<AgentLeadDetail | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const { data, error } = await client
      .from("leads")
      .select(
        "id, first_name, last_name, email, phone, lead_type, lead_grade, status, appointment_requested, last_contacted_at, next_follow_up_at, created_at, notes"
      )
      .eq("id", leadId)
      .eq("assigned_agent_id", agentId)
      .maybeSingle();

    if (error || !data) return null;

    const r = data as Record<string, unknown>;
    return {
      id:                   r.id as string,
      firstName:            (r.first_name as string | null) ?? null,
      lastName:             (r.last_name as string | null) ?? null,
      email:                (r.email as string | null) ?? null,
      phone:                (r.phone as string | null) ?? null,
      leadType:             (r.lead_type as string) ?? "unknown",
      grade:                (r.lead_grade as string | null) ?? null,
      status:               (r.status as string) ?? "new",
      appointmentRequested: Boolean(r.appointment_requested),
      lastContactedAt:      (r.last_contacted_at as string | null) ?? null,
      nextFollowUpAt:       (r.next_follow_up_at as string | null) ?? null,
      createdAt:            r.created_at as string,
      notes:                (r.notes as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs  = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-ruby-400 border-ruby-400/30 bg-ruby-400/[0.08]",
  "A":  "text-gold-300 border-gold-400/25 bg-gold-400/[0.06]",
  "B":  "text-amber-400 border-amber-400/20 bg-amber-400/[0.05]",
  "C":  "text-slate-400 border-white/[0.08] bg-white/[0.02]",
  "D":  "text-slate-600 border-white/[0.05]",
};

const EVENT_ICONS: Record<string, string> = {
  assigned:           "→",
  accepted:           "✓",
  contacted:          "✆",
  status_changed:     "⊙",
  note_added:         "✎",
  task_created:       "☐",
  task_completed:     "☑",
  follow_up_set:      "◷",
  appointment_marked: "◈",
  reassigned:         "⇄",
};

function EventRow({ entry }: { entry: AgentEventLogEntry }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0">
      <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px] text-slate-500">
        {EVENT_ICONS[entry.eventType] ?? "·"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-300 capitalize leading-snug">
          {entry.detail}
        </p>
      </div>
      <span className="text-[9px] text-slate-700 shrink-0">
        {relativeTime(entry.timestamp)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentLeadDetailPage({ params, searchParams }: PageProps) {
  const [{ id: leadId }, sp] = await Promise.all([params, searchParams]);
  const access = await resolveAgentAccess(sp);

  if (!access.ok) return <RoleGate denial={access} />;

  const { agentId, agentName, isBrokerPreview } = access;

  // Ownership check — fail-closed
  const owns = await agentOwnsLead(agentId, leadId);

  const lead = owns ? await loadLeadDetail(leadId, agentId) : null;
  const eventLog = lead ? await loadAgentEventLog(leadId, agentId) : [];

  const displayName = lead
    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Anonymous Lead"
    : "Lead";

  const gradeStyle = GRADE_COLORS[lead?.grade ?? ""] ?? "text-slate-600 border-white/[0.05]";

  return (
    <AgentShell
      title={displayName}
      eyebrow="Ask Magic Mike · Agent Portal"
      agentId={agentId}
      agentName={agentName}
      backHref={`/agent/leads?agent_id=${agentId}`}
      backLabel="← queue"
      brokerPreview={isBrokerPreview}
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Not found / not owned ── */}
        {!lead && (
          <PermissionNotice
            message={
              owns
                ? "Lead data could not be loaded — database may be unavailable."
                : "This lead is not assigned to you, or could not be verified."
            }
            action="Contact your broker if you believe this is an error."
          />
        )}

        {lead && (
          <>
            {/* ── Lead header ── */}
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-0.5">
                  {lead.leadType} · Created {formatDate(lead.createdAt)}
                </p>
                <h1 className="font-display text-3xl font-semibold text-cream leading-tight">
                  {displayName}
                </h1>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {lead.grade && (
                  <span
                    className={[
                      "h-10 w-10 rounded-full border flex items-center justify-center text-sm font-bold",
                      gradeStyle,
                    ].join(" ")}
                    aria-label={`Lead grade: ${lead.grade}`}
                  >
                    {lead.grade}
                  </span>
                )}
                <span className="text-[9px] uppercase tracking-label text-slate-600 border border-white/[0.06] rounded-full px-2 py-0.5">
                  {lead.status}
                </span>
              </div>
            </div>

            {/* ── SLA / follow-up warnings ── */}
            <div className="flex flex-wrap gap-2">
              <SlaRiskBadge breached={!lead.lastContactedAt && (lead.grade === "A+" || lead.grade === "A")} size="md" />
              <FollowUpBadge dueAt={lead.nextFollowUpAt} />
              {lead.appointmentRequested && (
                <span className="inline-flex items-center rounded-full border border-gold-400/25 bg-gold-400/[0.07] px-3 py-0.5 text-[10px] font-semibold text-gold-300">
                  Appointment Requested
                </span>
              )}
            </div>

            {/* ── Contact info ── */}
            <AgentCard title="Contact Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">Email</p>
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-600">Not provided</p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">Phone</p>
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-600">Not provided</p>
                  )}
                </div>
              </div>
            </AgentCard>

            {/* ── Timeline ── */}
            <AgentCard title="Contact Timeline">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">Last Contacted</p>
                  <p className="text-sm text-cream">
                    {lead.lastContactedAt
                      ? `${formatDate(lead.lastContactedAt)} (${relativeTime(lead.lastContactedAt)})`
                      : <span className="text-slate-600">Never</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">Next Follow-up</p>
                  <p className="text-sm text-cream">
                    {lead.nextFollowUpAt
                      ? formatDate(lead.nextFollowUpAt)
                      : <span className="text-slate-600">Not scheduled</span>}
                  </p>
                </div>
              </div>

              {/* Quick action links */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.05]">
                <AgentSectionHeading className="w-full mb-2">Quick Actions</AgentSectionHeading>
                <a
                  href={`/api/agent/${agentId}/leads/${leadId}/contact`}
                  className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] hover:bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors"
                >
                  Mark Contacted
                </a>
              </div>
              <AgentFollowUpForm
                agentId={agentId}
                leadId={leadId}
                currentFollowUpAt={lead.nextFollowUpAt}
              />
            </AgentCard>

            {/* ── Notes ── */}
            {lead.notes && (
              <AgentCard title="Notes">
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
              </AgentCard>
            )}

            {/* ── Assignment event log ── */}
            {eventLog.length > 0 && (
              <AgentCard title="Assignment Log">
                <div role="list" aria-label="Assignment event log">
                  {eventLog.map((entry) => (
                    <div key={entry.id} role="listitem">
                      <EventRow entry={entry} />
                    </div>
                  ))}
                </div>
              </AgentCard>
            )}

            {/* ── Back link ── */}
            <Link
              href={`/agent/leads?agent_id=${agentId}`}
              className="inline-block text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              ← Back to queue
            </Link>
          </>
        )}

      </main>
    </AgentShell>
  );
}
