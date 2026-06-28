export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Users, AlertTriangle, CheckCircle2, Clock, ArrowLeft, Info } from "lucide-react";
import { loadRoutingCommand } from "@/lib/admin/routing-command";
import type { AgentRosterRow, RoutingHistoryRow } from "@/lib/admin/routing-command";

function timeSince(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status: string, slaBreached: boolean) {
  if (slaBreached) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ruby-400/30 bg-ruby-400/[0.12] px-2 py-0.5 text-[10px] font-bold uppercase text-ruby-300">
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
        SLA Breach
      </span>
    );
  }
  const map: Record<string, string> = {
    pending:    "border-amber-400/25 bg-amber-400/10 text-amber-300",
    accepted:   "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    contacted:  "border-emerald-400/35 bg-emerald-400/15 text-emerald-200",
    reassigned: "border-slate-400/20 bg-slate-400/5 text-slate-400",
    escalated:  "border-ruby-400/25 bg-ruby-400/[0.08] text-ruby-400",
  };
  const cls = map[status] ?? "border-slate-400/20 bg-slate-400/5 text-slate-400";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

function temperatureDot(temp: string | null) {
  const map: Record<string, string> = {
    urgent: "bg-ruby-400",
    hot:    "bg-gold-400",
    warm:   "bg-amber-400",
    nurture:"bg-slate-400",
    low:    "bg-slate-600",
  };
  const cls = temp ? (map[temp] ?? "bg-slate-600") : "bg-slate-600";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls} shrink-0`} aria-label={temp ?? "unknown"} />;
}

function AgentCard({ agent }: { agent: AgentRosterRow }) {
  const pct = agent.maxDailyLeads > 0
    ? Math.min(100, Math.round((agent.currentLoad / agent.maxDailyLeads) * 100))
    : 0;
  const barColor = pct >= 90 ? "bg-ruby-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  const roleLabel = agent.role === "primary" ? "Primary" : agent.role === "backup" ? "Backup" : "Admin";

  return (
    <div className={`rounded-xl border p-4 ${agent.isActive ? "border-white/[0.08] bg-white/[0.025]" : "border-white/[0.03] bg-white/[0.01] opacity-50"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream leading-tight truncate">{agent.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{agent.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            agent.role === "primary"
              ? "border-gold-400/30 bg-gold-400/10 text-gold-300"
              : agent.role === "backup"
              ? "border-slate-400/20 bg-slate-400/5 text-slate-400"
              : "border-ruby-400/20 bg-ruby-400/5 text-ruby-400"
          }`}>
            {roleLabel}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
            agent.isActive
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-slate-500/20 bg-slate-500/5 text-slate-600"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${agent.isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
            {agent.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Load bar */}
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-[0.08em]">Daily Load</span>
          <span className="text-[10px] text-slate-400 font-bebas tracking-wide">
            {agent.currentLoad} / {agent.maxDailyLeads}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
          <div
            className={`h-1.5 rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={agent.currentLoad}
            aria-valuemax={agent.maxDailyLeads}
            aria-label={`${pct}% of daily lead capacity`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-600">
        <span>Priority: <span className="text-slate-400 font-bebas">{agent.priorityScore}</span></span>
        <span className="text-slate-700">·</span>
        <span>{agent.timezone.split("/")[1]?.replace("_", " ") ?? agent.timezone}</span>
        {agent.notificationEmail && <span title="Email notifications">✉</span>}
        {agent.notificationSms && <span title="SMS notifications">📱</span>}
      </div>

      {/* Agent portal link — broker can preview the agent's view */}
      {agent.isActive && (
        <div className="mt-3 pt-2 border-t border-white/[0.04]">
          <Link
            href={`/agent?agent_id=${agent.id}`}
            className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
            aria-label={`Open ${agent.name}'s agent portal`}
          >
            View Agent Portal →
          </Link>
        </div>
      )}
    </div>
  );
}

function RoutingRow({ row }: { row: RoutingHistoryRow }) {
  const slaBreached = row.slaAcceptBreached || row.slaContactBreached;
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors group">
      <td className="py-2.5 px-3 text-[12px]">
        <div className="flex items-center gap-2">
          {temperatureDot(row.leadTemperature)}
          <Link
            href={`/admin/leads/${row.leadId}`}
            className="font-medium text-slate-200 group-hover:text-gold-300 transition-colors truncate max-w-[140px] block"
          >
            {row.leadName ?? "—"}
          </Link>
        </div>
      </td>
      <td className="py-2.5 px-3 text-[12px] text-slate-300 truncate max-w-[120px]">{row.agentName}</td>
      <td className="py-2.5 px-3">{statusBadge(row.status, slaBreached)}</td>
      <td className="py-2.5 px-3 text-[11px] text-slate-500">{timeSince(row.assignedAt)}</td>
      <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-[160px] truncate">{row.assignmentReason || "—"}</td>
    </tr>
  );
}

export default async function RoutingCommandPage() {
  const data = await loadRoutingCommand();

  if (!data.configured) {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="mb-4 flex justify-center">
            <Users className="h-10 w-10 text-slate-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-300 mb-3">Routing Command Unavailable</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Supabase is not configured. Set{" "}
            <code className="text-amber-400 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-amber-400 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            in your production environment to view agent routing data.
          </p>
          <Link href="/admin" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const activeAgents  = data.agents.filter((a) => a.isActive);
  const inactiveAgents = data.agents.filter((a) => !a.isActive);

  return (
    <div className="min-h-screen bg-[#080806] text-cream">
      <header className="border-b border-gold-400/10 bg-[#0D0B07] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-gold-400" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-cream">Agent Routing</div>
              <div className="text-[11px] text-slate-500">Command Center · Our Town Properties</div>
            </div>
          </div>
          <Link href="/admin" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-gold-300 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Top-line tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Agents",     value: activeAgents.length,      color: "text-emerald-400" },
            { label: "Unassigned Leads",  value: data.unassignedLeadCount, color: data.unassignedLeadCount > 0 ? "text-amber-400" : "text-cream" },
            { label: "Pending Accept",    value: data.pendingCount,         color: data.pendingCount > 0 ? "text-gold-400" : "text-cream" },
            { label: "SLA Breaches",      value: data.slaBreachCount,       color: data.slaBreachCount > 0 ? "text-ruby-400" : "text-cream" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* SLA breach alert */}
        {data.slaBreachCount > 0 && (
          <div className="mb-6 rounded-xl border border-ruby-400/30 bg-ruby-400/[0.04] px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-ruby-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[12px] font-bold text-ruby-300">
                {data.slaBreachCount} SLA {data.slaBreachCount === 1 ? "breach" : "breaches"} in the routing queue
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Accept deadline: 2 min · Contact deadline: 5 min from assignment. Review the routing history below.
              </p>
            </div>
          </div>
        )}

        {/* Agent Roster */}
        <section aria-labelledby="agent-roster-heading" className="mb-8">
          <h2
            id="agent-roster-heading"
            className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
          >
            Agent Roster
          </h2>

          {data.agents.length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-6 text-center">
              <p className="text-sm text-slate-500">No agents found. Add agents via the <code className="text-amber-400 text-xs">agents</code> table in Supabase.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                {activeAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
              {inactiveAgents.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inactiveAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Assignment Control Center */}
        <section aria-labelledby="assignment-control-heading" className="mb-8">
          <h2
            id="assignment-control-heading"
            className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
          >
            Assignment Control Center
          </h2>
          <div className="rounded-xl border border-cyan-500/[0.08] bg-white/[0.01] px-5 py-4">
            <div className="h-px bg-cyan-500/20 -mx-5 mb-4" aria-hidden="true" />
            <div className="flex items-start gap-2 mb-4">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/50 shrink-0 mt-1.5" aria-hidden="true" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Each active agent has a dedicated portal. Share the portal link with an agent to give them access
                to their assigned lead queue, tasks, and performance view. Portal access is scoped strictly to
                that agent&rsquo;s assigned leads — no broker controls are visible.
              </p>
            </div>
            {activeAgents.length === 0 ? (
              <p className="text-xs text-slate-600 py-2">No active agents. Activate agents in Supabase to generate portal links.</p>
            ) : (
              <div className="space-y-2">
                {activeAgents.map((agent) => {
                  const pct = agent.maxDailyLeads > 0
                    ? Math.min(100, Math.round((agent.currentLoad / agent.maxDailyLeads) * 100))
                    : 0;
                  const capColor = pct >= 90 ? "text-ruby-400" : pct >= 70 ? "text-amber-400" : "text-emerald-400";
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-4 rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cream truncate">{agent.name}</p>
                        <p className="text-[10px] text-slate-600 truncate">{agent.email}</p>
                      </div>
                      <span className={["font-bebas text-lg tabular-nums", capColor].join(" ")}>
                        {agent.currentLoad}/{agent.maxDailyLeads}
                      </span>
                      <Link
                        href={`/agent?agent_id=${agent.id}`}
                        className="shrink-0 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] hover:bg-cyan-500/10 px-3 py-1.5 text-[10.5px] font-semibold text-cyan-400 transition-colors whitespace-nowrap"
                        aria-label={`Open ${agent.name}'s agent portal`}
                      >
                        Open Portal →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Routing Rules */}
        <section aria-labelledby="routing-rules-heading" className="mb-8">
          <h2
            id="routing-rules-heading"
            className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3"
          >
            Routing Rules
          </h2>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[11px] text-slate-500">
                Assignment is automatic on lead submission. Agents are selected by priority score, availability, and current load.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Accept Window", value: "2 min", desc: "Agent must accept assignment or it escalates" },
                { label: "Contact Window", value: "5 min", desc: "Agent must contact lead within 5 min of assignment" },
                { label: "Escalation", value: "Admin Role", desc: "Unaccepted leads route to admin escalation agent" },
              ].map((rule) => (
                <div key={rule.label} className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-0.5">{rule.label}</p>
                  <p className="font-bebas text-xl text-gold-400 leading-tight">{rule.value}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Routing History */}
        <section aria-labelledby="routing-history-heading">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="routing-history-heading"
              className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500"
            >
              Recent Routing Decisions
              <span className="ml-2 normal-case tracking-normal font-normal text-slate-700">· last 50</span>
            </h2>
            {data.unassignedLeadCount > 0 && (
              <Link
                href="/admin/leads?unassigned_only=true"
                className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
              >
                {data.unassignedLeadCount} unassigned →
              </Link>
            )}
          </div>

          {data.recentRouting.length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-slate-500">No routing decisions yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Assignments appear here as leads are routed.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]" role="table" aria-label="Recent routing decisions">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {["Lead", "Agent", "Status", "Assigned", "Reason"].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRouting.map((row) => (
                      <RoutingRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Unassigned alert */}
        {data.unassignedLeadCount > 0 && (
          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 flex items-start gap-3">
            <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[12px] font-semibold text-amber-300">
                {data.unassignedLeadCount} lead{data.unassignedLeadCount !== 1 ? "s" : ""} without a routing assignment
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                These leads submitted but were not matched to an agent.{" "}
                <Link href="/admin/leads?unassigned_only=true" className="text-amber-400 hover:text-amber-300 transition-colors">
                  View unassigned leads →
                </Link>
              </p>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-slate-700 text-center">
          Agent Routing · Ask Magic Mike Admin · Our Town Properties, Inc. · Wilson, NC
        </p>
      </main>
    </div>
  );
}
