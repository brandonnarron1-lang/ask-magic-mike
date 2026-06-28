import { cn } from "@/lib/utils/cn";
import { TrendBadge } from "./trend-badge";
import { Sparkline } from "./sparkline";
import type { TrendResult } from "@/lib/admin/intelligence-engine";

interface ExecutiveMetricProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: TrendResult;
  sparkData?: number[];
  accent?: "gold" | "ruby" | "emerald" | "amber" | "slate";
  size?: "sm" | "md" | "lg";
  urgent?: boolean;
  className?: string;
}

const ACCENT_STYLES: Record<string, string> = {
  gold:    "text-gold-300",
  ruby:    "text-ruby-400",
  emerald: "text-emerald-400",
  amber:   "text-amber-400",
  slate:   "text-slate-400",
};

const SIZE_STYLES: Record<string, { value: string; label: string }> = {
  sm: { value: "text-2xl",   label: "text-[10px]" },
  md: { value: "text-3xl",   label: "text-[10.5px]" },
  lg: { value: "text-4xl",   label: "text-xs" },
};

export function ExecutiveMetric({
  label,
  value,
  sublabel,
  trend,
  sparkData,
  accent = "gold",
  size = "md",
  urgent = false,
  className,
}: ExecutiveMetricProps) {
  const sizes = SIZE_STYLES[size];
  const accentColor = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        urgent && "motion-safe:animate-pulse",
        className
      )}
    >
      <p
        className={cn(
          "tracking-label font-semibold uppercase",
          sizes.label,
          urgent ? "text-ruby-400/80" : "text-slate-500"
        )}
      >
        {label}
      </p>

      <div className="flex items-end gap-3">
        <span
          className={cn(
            "font-bebas leading-none tabular-nums",
            sizes.value,
            accentColor
          )}
        >
          {value}
        </span>

        {sparkData && sparkData.length >= 2 && (
          <Sparkline
            data={sparkData}
            width={60}
            height={24}
            color={
              accent === "gold"    ? "rgb(212,160,23)"
              : accent === "ruby" ? "rgb(193,39,45)"
              : accent === "emerald" ? "rgb(52,211,153)"
              : accent === "amber" ? "rgb(251,191,36)"
              : "rgb(100,116,139)"
            }
            aria-label={`${label} trend sparkline`}
            className="mb-1 opacity-70"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {trend && <TrendBadge trend={trend} />}
        {sublabel && (
          <p className="text-[10px] text-slate-600 leading-none">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
