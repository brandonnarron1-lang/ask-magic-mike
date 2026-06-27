import { cn } from "@/lib/utils/cn";
import type { RankResult } from "@/lib/admin/intelligence-engine";

interface PerformanceBadgeProps {
  tier: RankResult["tier"] | "top" | "above_avg" | "avg" | "below_avg" | "bottom";
  label?: string;
  className?: string;
}

const TIER_STYLES: Record<string, { color: string; defaultLabel: string }> = {
  top:        { color: "text-gold-300 bg-gold-400/[0.10] border-gold-400/30",       defaultLabel: "Top Performer" },
  above_avg:  { color: "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20", defaultLabel: "Above Average" },
  avg:        { color: "text-slate-400 bg-white/[0.04] border-white/[0.08]",        defaultLabel: "Average" },
  below_avg:  { color: "text-amber-400 bg-amber-400/[0.08] border-amber-400/20",    defaultLabel: "Below Average" },
  bottom:     { color: "text-ruby-400 bg-ruby-400/[0.08] border-ruby-400/20",       defaultLabel: "Needs Attention" },
};

export function PerformanceBadge({ tier, label, className }: PerformanceBadgeProps) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.avg;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-label uppercase",
        style.color,
        className
      )}
    >
      {label ?? style.defaultLabel}
    </span>
  );
}
