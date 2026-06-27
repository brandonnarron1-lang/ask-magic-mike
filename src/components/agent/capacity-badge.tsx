import { cn } from "@/lib/utils/cn";

interface CapacityBadgeProps {
  current: number;
  max: number;
  className?: string;
}

export function CapacityBadge({ current, max, className }: CapacityBadgeProps) {
  if (max <= 0) return null;

  const pct  = Math.min(100, Math.round((current / max) * 100));
  const full = pct >= 100;
  const busy = pct >= 80;
  const warn = pct >= 60;

  const color = full ? "text-ruby-400 border-ruby-400/30 bg-ruby-400/[0.08]"
    : busy   ? "text-amber-400 border-amber-400/30 bg-amber-400/[0.08]"
    : warn   ? "text-gold-300 border-gold-400/25 bg-gold-400/[0.06]"
    :           "text-emerald-400 border-emerald-400/25 bg-emerald-400/[0.06]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums",
        color,
        className
      )}
      aria-label={`Capacity: ${current} of ${max} leads (${pct}%)`}
    >
      {current}/{max}
      <span className="text-[8px] font-normal opacity-70">{pct}%</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// AgentRosterCard — used in Assignment Control Center
// ---------------------------------------------------------------------------

interface AgentRosterCardProps {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  currentLoad: number;
  maxDailyLeads: number;
  priorityScore: number;
  conversionRate?: number;
  responseTimeHours?: number;
  slaBreaches?: number;
  className?: string;
}

export function AgentRosterCard({
  id,
  name,
  email,
  role,
  isActive,
  currentLoad,
  maxDailyLeads,
  priorityScore,
  conversionRate,
  responseTimeHours,
  slaBreaches = 0,
  className,
}: AgentRosterCardProps) {
  const pct = maxDailyLeads > 0 ? Math.min(100, Math.round((currentLoad / maxDailyLeads) * 100)) : 0;
  const barColor = pct >= 90 ? "bg-ruby-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";

  const roleLabel = role === "primary" ? "Primary" : role === "backup" ? "Backup" : role;
  const roleColor = role === "primary"
    ? "border-gold-400/30 bg-gold-400/10 text-gold-300"
    : "border-slate-400/20 bg-slate-400/5 text-slate-400";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isActive ? "border-white/[0.08] bg-white/[0.025]" : "border-white/[0.03] bg-white/[0.01] opacity-50",
        className
      )}
      aria-label={`Agent: ${name}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream leading-tight truncate">{name}</p>
          <p className="text-[10.5px] text-slate-500 truncate">{email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn("text-[9px] tracking-label font-bold uppercase border rounded-full px-2 py-0.5", roleColor)}>
            {roleLabel}
          </span>
          <span className={cn(
            "text-[9px] tracking-label font-semibold border rounded-full px-2 py-0.5 flex items-center gap-1",
            isActive
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-slate-500/20 bg-slate-500/5 text-slate-600"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-600")} aria-hidden="true" />
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[9px] tracking-label uppercase text-slate-600">Daily Load</span>
          <span className="text-[9px] font-mono text-slate-400 tabular-nums">
            {currentLoad}/{maxDailyLeads}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
          <div
            className={cn("h-1.5 rounded-full", barColor)}
            style={{ width: `${pct}%` }}
            aria-label={`${pct}% capacity`}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">Priority</p>
          <p className="text-sm font-bebas text-cream tabular-nums">{priorityScore}</p>
        </div>
        {conversionRate !== undefined && (
          <div>
            <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">Conv.</p>
            <p className="text-sm font-bebas text-cream tabular-nums">{conversionRate.toFixed(0)}%</p>
          </div>
        )}
        {slaBreaches > 0 && (
          <div>
            <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">SLA Breach</p>
            <p className="text-sm font-bebas text-ruby-400 tabular-nums">{slaBreaches}</p>
          </div>
        )}
      </div>

      {/* Agent portal link */}
      {isActive && (
        <div className="mt-3 pt-2 border-t border-white/[0.05]">
          <a
            href={`/agent?agent_id=${id}`}
            className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
            aria-label={`Open ${name}'s agent portal`}
          >
            View Agent Portal →
          </a>
        </div>
      )}
    </div>
  );
}
