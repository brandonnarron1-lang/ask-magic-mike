export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AgentShell, AgentCard, AgentSectionHeading } from "@/components/agent/agent-shell";
import { RoleGate } from "@/components/agent/role-gate";
import { AgentLeadRow } from "@/components/agent/agent-lead-row";
import { TaskList } from "@/components/agent/task-list";
import { resolveAgentAccess } from "@/lib/agent/agent-auth";
import { loadAgentPortalMetrics } from "@/lib/agent/agent-portal-metrics";

// ---------------------------------------------------------------------------
// Metric cell (agent-specific, NOT imported from admin analytics)
// ---------------------------------------------------------------------------

function AgentMetricCell({
  label,
  value,
  urgent = false,
  accent = false,
}: {
  label: string;
  value: string | number;
  urgent?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#0A0906] px-4 py-4 flex flex-col gap-1">
      <p className={[
        "text-[10px] tracking-label font-semibold uppercase leading-none",
        urgent ? "text-ruby-400/80" : "text-slate-500",
      ].join(" ")}>
        {label}
      </p>
      <p className={[
        "font-bebas text-2xl leading-none tabular-nums",
        urgent ? "text-ruby-400" : accent ? "text-cyan-400" : "text-cream",
      ].join(" ")}>
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentHomePage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const access = await resolveAgentAccess(sp);

  if (!access.ok) return <RoleGate denial={access} />;

  const { agentId, agentName, isBrokerPreview } = access;
  const metrics = await loadAgentPortalMetrics(agentId);
  const q       = metrics.queue;
  const p       = metrics.performance;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const hasCritical = q.urgent > 0 || q.slaRisk > 0;

  return (
    <AgentShell
      title={agentName ? `${agentName}'s Dashboard` : "Agent Dashboard"}
      eyebrow="Ask Magic Mike · Agent Portal"
      agentId={agentId}
      agentName={agentName}
      brokerPreview={isBrokerPreview}
      devMode={!metrics.configured}
      headerRight={
        <span className="text-xs text-slate-600">{today}</span>
      }
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Critical attention strip ── */}
        {hasCritical && (
          <div
            className="rounded-xl border border-ruby-400/25 bg-ruby-400/[0.04] px-5 py-4 flex items-center gap-4"
            role="alert"
            aria-live="polite"
          >
            <div className="h-2 w-2 rounded-full bg-ruby-400 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
            <p className="text-sm font-semibold text-ruby-400 flex-1">
              {q.urgent > 0 && `${q.urgent} urgent lead${q.urgent > 1 ? "s" : ""} — contact required. `}
              {q.slaRisk > 0 && `${q.slaRisk} SLA at risk.`}
            </p>
            <Link
              href={`/agent/leads?agent_id=${agentId}&filter=urgent`}
              className="text-xs text-gold-300 hover:text-gold-200 transition-colors shrink-0"
            >
              View Urgent →
            </Link>
          </div>
        )}

        {/* ── Queue overview ── */}
        <div>
          <AgentSectionHeading className="mb-3">Your Queue</AgentSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/[0.07]">
            <AgentMetricCell label="Assigned"        value={q.total}                  accent />
            <AgentMetricCell label="New Today"       value={q.newToday}               />
            <AgentMetricCell label="Hot / A+"        value={q.hot}                    accent />
            <AgentMetricCell label="Urgent"          value={q.urgent}                 urgent={q.urgent > 0} />
            <AgentMetricCell label="Follow-up Due"   value={q.followUpDue}            urgent={q.followUpDue > 0} />
          </div>
        </div>

        {/* ── Activity snapshot ── */}
        <div>
          <AgentSectionHeading className="mb-3">Activity Snapshot</AgentSectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/[0.07]">
            <AgentMetricCell label="Appointments"     value={q.appointmentsRequested}   />
            <AgentMetricCell label="Never Contacted"  value={q.neverContacted}           urgent={q.neverContacted > 0} />
            <AgentMetricCell label="Recently Contacted" value={q.recentlyContacted}       />
            <AgentMetricCell label="Stale (72h+)"     value={q.stale}                    urgent={q.stale > 0} />
            <AgentMetricCell label="SLA Risk"         value={q.slaRisk}                  urgent={q.slaRisk > 0} />
          </div>
        </div>

        {/* ── Performance snapshot ── */}
        <AgentCard title="Performance Today" accent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Conversion Rate",    value: `${p.conversionRate.toFixed(0)}%`,    note: "Hot leads / total" },
              { label: "Response Rate",      value: `${p.responseRate.toFixed(0)}%`,      note: "Leads contacted" },
              { label: "SLA Compliance",     value: `${p.slaCompliance.toFixed(0)}%`,     note: "Within SLA window" },
              { label: "Health Grade",       value: p.healthGrade,                        note: `Score: ${p.healthScore}/100` },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">{m.label}</p>
                <p className="font-bebas text-2xl text-cream tabular-nums">{m.value}</p>
                <p className="text-[9px] text-slate-600">{m.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href={`/agent/performance?agent_id=${agentId}`}
              className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              View full performance →
            </Link>
          </div>
        </AgentCard>

        {/* ── Recent leads ── */}
        {metrics.recentLeads.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <AgentSectionHeading>Recent Leads</AgentSectionHeading>
              <Link
                href={`/agent/leads?agent_id=${agentId}`}
                className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {metrics.recentLeads.slice(0, 6).map((lead) => (
                <AgentLeadRow key={lead.id} lead={lead} agentId={agentId} />
              ))}
            </div>
          </div>
        )}

        {metrics.recentLeads.length === 0 && (
          <AgentCard title="Assigned Leads">
            <p className="text-xs text-slate-600 text-center py-4">
              {metrics.configured
                ? "No leads assigned to this agent yet."
                : "Database not configured — connect Supabase to see assigned leads."}
            </p>
          </AgentCard>
        )}

        {/* ── Task list ── */}
        {metrics.tasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <AgentSectionHeading>Open Tasks</AgentSectionHeading>
              <Link
                href={`/agent/tasks?agent_id=${agentId}`}
                className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
              >
                View all →
              </Link>
            </div>
            <TaskList tasks={metrics.tasks.slice(0, 5)} agentId={agentId} />
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: `/agent/leads?agent_id=${agentId}&filter=urgent`,    label: "Urgent Queue",     desc: "Hot leads requiring immediate contact" },
            { href: `/agent/leads?agent_id=${agentId}&filter=followup`,  label: "Follow-up Due",    desc: "Leads with overdue follow-up schedules" },
            { href: `/agent/tasks?agent_id=${agentId}`,                  label: "Open Tasks",       desc: "All tasks linked to your assigned leads" },
            { href: `/agent/performance?agent_id=${agentId}`,            label: "Performance",      desc: "Your conversion rates, SLA compliance, trend" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-cyan-500/20 hover:bg-white/[0.03] transition-colors p-5"
            >
              <p className="text-[10.5px] tracking-label font-semibold uppercase text-cyan-400/60 group-hover:text-cyan-400 transition-colors mb-1">
                {card.label}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
            </Link>
          ))}
        </div>

      </main>
    </AgentShell>
  );
}
