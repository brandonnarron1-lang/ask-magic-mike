export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { AgentShell, AgentCard, AgentSectionHeading } from "@/components/agent/agent-shell";
import { RoleGate } from "@/components/agent/role-gate";
import { resolveAgentAccess } from "@/lib/agent/agent-auth";
import { loadAgentPortalMetrics } from "@/lib/agent/agent-portal-metrics";

// ---------------------------------------------------------------------------
// Grade color helper
// ---------------------------------------------------------------------------

function gradeColor(grade: string): string {
  const map: Record<string, string> = {
    A: "text-emerald-400",
    B: "text-gold-300",
    C: "text-amber-400",
    D: "text-ruby-400/80",
    F: "text-ruby-400",
  };
  return map[grade] ?? "text-slate-400";
}

function scoreFill(score: number): string {
  if (score >= 80) return "bg-emerald-400";
  if (score >= 60) return "bg-gold-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-ruby-400";
}

// ---------------------------------------------------------------------------
// Stat row
// ---------------------------------------------------------------------------

function PerfStat({
  label,
  value,
  note,
  barPct,
  barColor = "bg-cyan-500",
}: {
  label: string;
  value: string;
  note?: string;
  barPct?: number;
  barColor?: string;
}) {
  return (
    <div className="py-3 border-b border-white/[0.05] last:border-b-0">
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="font-bebas text-lg text-cream tabular-nums leading-none">{value}</span>
      </div>
      {barPct !== undefined && (
        <div className="h-1 w-full rounded-full bg-white/[0.05]">
          <div
            className={["h-1 rounded-full", barColor].join(" ")}
            style={{ width: `${Math.min(100, barPct)}%` }}
          />
        </div>
      )}
      {note && <p className="text-[9px] text-slate-700 mt-0.5">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentPerformancePage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const access = await resolveAgentAccess(sp);

  if (!access.ok) return <RoleGate denial={access} />;

  const { agentId, agentName, isBrokerPreview } = access;
  const metrics = await loadAgentPortalMetrics(agentId);
  const p       = metrics.performance;
  const q       = metrics.queue;

  const scoreColor = scoreFill(p.healthScore);
  const gColor     = gradeColor(p.healthGrade);

  return (
    <AgentShell
      title="Performance"
      eyebrow="Ask Magic Mike · Agent Portal"
      agentId={agentId}
      agentName={agentName}
      brokerPreview={isBrokerPreview}
      devMode={!metrics.configured}
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Health score hero ── */}
        <div className="rounded-xl border border-cyan-500/15 bg-white/[0.02] p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Score ring (SVG) */}
          <div className="relative shrink-0" aria-label={`Health score: ${p.healthScore} out of 100`}>
            <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90" aria-hidden="true">
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="44" cy="44" r="36"
                fill="none"
                stroke={p.healthScore >= 80 ? "#34d399" : p.healthScore >= 60 ? "#d4af37" : p.healthScore >= 40 ? "#f59e0b" : "#e5405e"}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - p.healthScore / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
              <span className={["font-bebas text-2xl leading-none", gColor].join(" ")}>
                {p.healthGrade}
              </span>
              <span className="text-[9px] text-slate-600 tabular-nums">{p.healthScore}</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-[10.5px] tracking-label font-semibold uppercase text-cyan-400/70 mb-1">
              Overall Performance
            </p>
            <p className="font-display text-3xl font-semibold text-cream mb-1">
              Health Score
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Composite of conversion rate, response rate, SLA compliance, and follow-up compliance.
              {p.healthScore < 60 && " Improve by contacting A+ leads within 2 hours and keeping follow-ups on schedule."}
            </p>

            {/* Mini bar breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { label: "Conversion",  pct: p.conversionRate,     color: "bg-cyan-500" },
                { label: "Response",    pct: p.responseRate,        color: "bg-emerald-400" },
                { label: "SLA",         pct: p.slaCompliance,       color: "bg-gold-400" },
                { label: "Follow-up",   pct: p.followUpCompliance,  color: "bg-amber-400" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] uppercase text-slate-600">{m.label}</span>
                    <span className="text-[9px] text-slate-400 tabular-nums">{m.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/[0.05]">
                    <div className={["h-1 rounded-full", m.color].join(" ")} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Conversion metrics ── */}
        <AgentCard title="Conversion" accent>
          <PerfStat
            label="Conversion Rate"
            value={`${p.conversionRate.toFixed(1)}%`}
            note="Hot (A/A+) leads ÷ total assigned"
            barPct={p.conversionRate}
            barColor="bg-cyan-500"
          />
          <PerfStat
            label="Hot Leads"
            value={String(q.hot)}
            note="Grade A or A+ assigned leads"
          />
          <PerfStat
            label="Total Assigned"
            value={String(q.total)}
            note="All leads assigned to this agent"
          />
        </AgentCard>

        {/* ── Response & contact ── */}
        <AgentCard title="Response & Contact">
          <PerfStat
            label="Response Rate"
            value={`${p.responseRate.toFixed(1)}%`}
            note="Leads with at least one contact attempt"
            barPct={p.responseRate}
            barColor="bg-emerald-400"
          />
          <PerfStat
            label="Never Contacted"
            value={String(q.neverContacted)}
            note="Leads with no contact attempt yet"
            barPct={q.total > 0 ? (q.neverContacted / q.total) * 100 : 0}
            barColor={q.neverContacted > 0 ? "bg-ruby-400" : "bg-emerald-400"}
          />
          <PerfStat
            label="Recently Contacted"
            value={String(q.recentlyContacted)}
            note="Contacted in the last 24 hours"
          />
        </AgentCard>

        {/* ── SLA & follow-up ── */}
        <AgentCard title="SLA & Follow-up Compliance">
          <PerfStat
            label="SLA Compliance"
            value={`${p.slaCompliance.toFixed(1)}%`}
            note="(Total − SLA risk) ÷ total — target 100%"
            barPct={p.slaCompliance}
            barColor={scoreColor}
          />
          <PerfStat
            label="SLA at Risk"
            value={String(q.slaRisk)}
            note="Hot leads not yet contacted"
            barPct={q.total > 0 ? (q.slaRisk / q.total) * 100 : 0}
            barColor={q.slaRisk > 0 ? "bg-ruby-400" : "bg-emerald-400"}
          />
          <PerfStat
            label="Follow-up Compliance"
            value={`${p.followUpCompliance.toFixed(1)}%`}
            note="(Total − overdue follow-ups) ÷ total"
            barPct={p.followUpCompliance}
            barColor={scoreColor}
          />
          <PerfStat
            label="Follow-up Overdue"
            value={String(q.followUpDue)}
            note="Leads with a passed follow-up date"
          />
        </AgentCard>

        {/* ── Pipeline activity ── */}
        <AgentCard title="Pipeline Activity">
          <PerfStat
            label="Appointments Requested"
            value={String(q.appointmentsRequested)}
            note="Leads where appointment_requested = true"
          />
          <PerfStat
            label="Stale Leads (72h+)"
            value={String(q.stale)}
            note="Assigned 72+ hours ago with no contact"
            barPct={q.total > 0 ? (q.stale / q.total) * 100 : 0}
            barColor={q.stale > 0 ? "bg-amber-400" : "bg-emerald-400"}
          />
        </AgentCard>

        {/* ── Benchmarks ── */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5">
          <AgentSectionHeading className="mb-3">Performance Benchmarks</AgentSectionHeading>
          <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
            <p>• <strong className="text-slate-400">A+ lead contact SLA:</strong> First contact within 2 hours of assignment.</p>
            <p>• <strong className="text-slate-400">Response rate target:</strong> 100% — every lead should receive at least one contact.</p>
            <p>• <strong className="text-slate-400">Follow-up compliance:</strong> Scheduled follow-ups must be actioned on or before the due date.</p>
            <p>• <strong className="text-slate-400">Health score:</strong> 80+ is healthy, 60–79 needs attention, below 60 requires broker review.</p>
          </div>
        </div>

      </main>
    </AgentShell>
  );
}
