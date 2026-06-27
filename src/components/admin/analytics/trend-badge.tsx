import { cn } from "@/lib/utils/cn";
import type { TrendResult } from "@/lib/admin/intelligence-engine";

interface TrendBadgeProps {
  trend: TrendResult;
  size?: "sm" | "md";
  className?: string;
}

const ARROW = {
  up: "↑",
  down: "↓",
  flat: "→",
} as const;

export function TrendBadge({ trend, size = "sm", className }: TrendBadgeProps) {
  const color =
    trend.direction === "up"
      ? "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20"
      : trend.direction === "down"
      ? "text-ruby-400 bg-ruby-400/[0.08] border-ruby-400/20"
      : "text-slate-500 bg-white/[0.04] border-white/[0.08]";

  const text = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-mono font-semibold tabular-nums",
        color,
        text,
        className
      )}
      aria-label={`Trend: ${trend.label}`}
    >
      <span aria-hidden="true">{ARROW[trend.direction]}</span>
      {trend.label}
    </span>
  );
}
