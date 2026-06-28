import { cn } from "@/lib/utils/cn";
import type { ImpactLevel } from "@/lib/automation/workflow-engine";
import type { ImpactBreakdown } from "@/lib/automation/execution-planner";

// ---------------------------------------------------------------------------
// ImpactScore — visual score ring + description
// ---------------------------------------------------------------------------

interface ImpactScoreProps {
  score: number;          // 0–100
  level: ImpactLevel;
  label?: string;
  size?: "sm" | "lg";
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 85) return "#34d399"; // emerald
  if (score >= 65) return "#d4af37"; // gold
  if (score >= 45) return "#f59e0b"; // amber
  return "#e5405e";                  // ruby
}

function scoreTailwind(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 65) return "text-gold-300";
  if (score >= 45) return "text-amber-400";
  return "text-ruby-400";
}

export function ImpactScore({ score, level, label, size = "sm", className }: ImpactScoreProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const r       = size === "lg" ? 28 : 18;
  const dim     = size === "lg" ? 64 : 40;
  const circum  = 2 * Math.PI * r;
  const stroke  = size === "lg" ? 5 : 3.5;
  const cx      = dim / 2;

  return (
    <div className={cn("flex flex-col items-center", className)} aria-label={`Impact score: ${clamped}`}>
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90" aria-hidden="true">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={scoreColor(clamped)}
            strokeWidth={stroke}
            strokeDasharray={circum}
            strokeDashoffset={circum * (1 - clamped / 100)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bebas leading-none tabular-nums", size === "lg" ? "text-xl" : "text-xs", scoreTailwind(clamped))}>
            {clamped}
          </span>
        </div>
      </div>
      {label && (
        <p className="mt-1 text-[9px] text-slate-600 uppercase tracking-label text-center leading-tight">
          {label}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AutomationMetric — single stat tile
// ---------------------------------------------------------------------------

interface AutomationMetricProps {
  label: string;
  value: string | number;
  sublabel?: string;
  urgent?: boolean;
  accent?: boolean;
  className?: string;
}

export function AutomationMetric({
  label,
  value,
  sublabel,
  urgent = false,
  accent = false,
  className,
}: AutomationMetricProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-4 py-3",
        urgent && "bg-ruby-400/[0.03]",
        className
      )}
    >
      <p className={cn(
        "text-[9px] tracking-label font-semibold uppercase leading-none",
        urgent ? "text-ruby-400/80" : "text-slate-500"
      )}>
        {label}
      </p>
      <p className={cn(
        "font-bebas text-3xl leading-none tabular-nums",
        urgent ? "text-ruby-400" : accent ? "text-gold-300" : "text-cream"
      )}>
        {value}
      </p>
      {sublabel && (
        <p className="text-[9px] text-slate-600 leading-none">{sublabel}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImpactBreakdownRow — used in execution summary tables
// ---------------------------------------------------------------------------

interface ImpactBreakdownRowProps {
  breakdown: ImpactBreakdown;
  className?: string;
}

export function ImpactBreakdownRow({ breakdown, className }: ImpactBreakdownRowProps) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0", className)}>
      <ImpactScore score={breakdown.score} level={breakdown.level} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cream truncate">{breakdown.label}</p>
        <p className="text-[10px] text-slate-500 leading-snug">{breakdown.description}</p>
      </div>
    </div>
  );
}
