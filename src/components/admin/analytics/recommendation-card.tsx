import { cn } from "@/lib/utils/cn";
import type { Recommendation, RecommendationPriority } from "@/lib/admin/recommendation-engine";

interface RecommendationCardProps {
  rec: Recommendation;
  expanded?: boolean;
  className?: string;
}

const PRIORITY_STYLES: Record<RecommendationPriority, {
  border: string; dot: string; label: string; labelColor: string;
}> = {
  critical: {
    border: "border-ruby-400/30 bg-ruby-400/[0.04]",
    dot: "bg-ruby-400",
    label: "Critical",
    labelColor: "text-ruby-400",
  },
  high: {
    border: "border-amber-400/30 bg-amber-400/[0.03]",
    dot: "bg-amber-400",
    label: "High",
    labelColor: "text-amber-400",
  },
  medium: {
    border: "border-white/[0.08] bg-white/[0.02]",
    dot: "bg-gold-400",
    label: "Medium",
    labelColor: "text-gold-300/70",
  },
  low: {
    border: "border-white/[0.05] bg-white/[0.01]",
    dot: "bg-slate-600",
    label: "Low",
    labelColor: "text-slate-500",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  leads: "Leads",
  campaigns: "Campaigns",
  agents: "Agents",
  sources: "Sources",
  conversations: "Conversations",
  pipeline: "Pipeline",
  system: "System",
};

export function RecommendationCard({
  rec,
  expanded = false,
  className,
}: RecommendationCardProps) {
  const style = PRIORITY_STYLES[rec.priority];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-2",
        style.border,
        className
      )}
      role="article"
      aria-label={`${style.label} priority recommendation: ${rec.title}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", style.dot)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[9px] tracking-label font-bold uppercase", style.labelColor)}>
              {style.label}
            </span>
            <span className="text-[9px] tracking-label font-semibold uppercase text-slate-600">
              {CATEGORY_LABELS[rec.category] ?? rec.category}
            </span>
            {rec.metric && (
              <span className="text-[9px] font-mono text-slate-600 ml-auto shrink-0">
                {rec.metric}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-cream leading-snug">{rec.title}</p>
        </div>
      </div>

      {/* Reason */}
      <p className="text-xs text-slate-400 leading-relaxed pl-5">{rec.reason}</p>

      {/* Action */}
      <div className="pl-5">
        <p className="text-[10px] tracking-label font-semibold uppercase text-gold-300/60 mb-0.5">
          Action
        </p>
        <p className="text-xs text-slate-300 leading-snug">{rec.action}</p>
      </div>

      {/* Expanded: impact + expected gain + confidence */}
      {expanded && (
        <div className="pl-5 grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
          <div>
            <p className="text-[10px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">Impact</p>
            <p className="text-xs text-slate-400">{rec.impact}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">Expected Gain</p>
            <p className="text-xs text-emerald-400/80">{rec.expectedGain}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">Confidence</p>
            <div className="flex items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold-400/50"
                  style={{ width: `${rec.confidence}%` }}
                  aria-label={`${rec.confidence}% confidence`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">{rec.confidence}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
