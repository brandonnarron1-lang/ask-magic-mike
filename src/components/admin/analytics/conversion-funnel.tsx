import { cn } from "@/lib/utils/cn";
import { calculateConversion, calculateDropoff } from "@/lib/admin/intelligence-engine";
import { TrendBadge } from "./trend-badge";
import type { TrendResult } from "@/lib/admin/intelligence-engine";

export interface FunnelStage {
  label: string;
  count: number;
  trend?: TrendResult;
  sublabel?: string;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  className?: string;
}

const STAGE_COLORS = [
  "bg-gold-400/70",
  "bg-gold-400/55",
  "bg-gold-400/42",
  "bg-emerald-400/50",
  "bg-emerald-400/38",
  "bg-emerald-400/28",
  "bg-emerald-400/18",
  "bg-emerald-400/12",
];

export function ConversionFunnel({ stages, className }: ConversionFunnelProps) {
  if (!stages || stages.length === 0) return null;

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div
      className={cn("space-y-1", className)}
      role="list"
      aria-label="Conversion funnel"
    >
      {stages.map((stage, i) => {
        const widthPct = Math.max(8, (stage.count / maxCount) * 100);
        const barColor = STAGE_COLORS[i] ?? STAGE_COLORS[STAGE_COLORS.length - 1];
        const prev = stages[i - 1];
        const dropoff = prev ? calculateDropoff(stage.count, prev.count) : null;
        const overallConv = i > 0 ? calculateConversion(stage.count, stages[0].count) : null;

        return (
          <div key={stage.label} role="listitem">
            {/* Dropoff connector */}
            {dropoff && (
              <div className="flex items-center gap-2 pl-4 py-0.5">
                <div className="w-px h-3 bg-white/[0.08] ml-2" aria-hidden="true" />
                <span className="text-[9px] text-slate-600 tabular-nums">
                  {dropoff.lost > 0
                    ? `−${dropoff.lost.toLocaleString()} (${dropoff.label} dropoff)`
                    : "no dropoff"}
                </span>
              </div>
            )}

            {/* Stage bar */}
            <div className="flex items-center gap-3">
              {/* Label column */}
              <div className="w-32 shrink-0 text-right">
                <p className="text-[10.5px] font-semibold tracking-label uppercase text-slate-400 leading-none">
                  {stage.label}
                </p>
                {stage.sublabel && (
                  <p className="text-[9px] text-slate-600 mt-0.5">{stage.sublabel}</p>
                )}
              </div>

              {/* Bar */}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "h-8 rounded-r-sm flex items-center px-3 transition-all",
                    barColor
                  )}
                  style={{ width: `${widthPct}%` }}
                  role="presentation"
                >
                  <span
                    className="font-bebas text-lg leading-none text-midnight tabular-nums whitespace-nowrap"
                    aria-label={`${stage.count.toLocaleString()} ${stage.label}`}
                  >
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Stats column */}
              <div className="w-28 shrink-0 flex flex-col gap-0.5">
                {overallConv && (
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {overallConv.label} of total
                  </span>
                )}
                {stage.trend && <TrendBadge trend={stage.trend} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
