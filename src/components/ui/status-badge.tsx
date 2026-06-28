import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { Temperature } from "@/types/domain.types";

const TEMPERATURE_STYLES: Record<Temperature, string> = {
  urgent: "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30",
  hot:    "bg-gold-400/20 text-gold-300 border-gold-400/30",
  warm:   "bg-amber-400/20 text-amber-300 border-amber-400/30",
  nurture:"bg-blue-400/15 text-blue-300 border-blue-400/25",
  low:    "bg-slate-700/50 text-slate-400 border-slate-600/40",
};

const REFERRER_STYLES: Record<string, string> = {
  paid:     "bg-gold-400/20 text-gold-300 border-gold-400/30",
  organic:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  social:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  email:    "bg-purple-500/15 text-purple-300 border-purple-500/30",
  referral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  direct:   "bg-white/[0.06] text-slate-400 border-white/10",
};

const RWA_STYLES: Record<string, string> = {
  urgent: "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30",
  hot:    "bg-gold-400/20 text-gold-300 border-gold-400/30",
  warm:   "bg-amber-500/10 text-amber-300 border-amber-500/30",
  cold:   "bg-white/[0.05] text-slate-400 border-white/10",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "temperature" | "referrer" | "rwa" | "grade" | "default" | "gold";
  value?: string;
  uppercase?: boolean;
}

const GRADE_STYLES = (grade: string) => {
  if (grade === "A+" || grade === "A") return "bg-gold-400 text-midnight border-transparent";
  if (grade === "B+" || grade === "B") return "bg-amber-400/20 text-amber-300 border-amber-400/30";
  return "bg-white/[0.08] text-slate-300 border-white/10";
};

export function StatusBadge({
  variant = "default",
  value = "",
  uppercase = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const display = children ?? (uppercase ? value.toUpperCase() : value);

  let colorClass = "bg-white/10 text-cream border-white/20";
  if (variant === "temperature" && value in TEMPERATURE_STYLES) {
    colorClass = TEMPERATURE_STYLES[value as Temperature];
  } else if (variant === "referrer") {
    colorClass = REFERRER_STYLES[value] ?? REFERRER_STYLES.direct;
  } else if (variant === "rwa") {
    colorClass = RWA_STYLES[value] ?? RWA_STYLES.cold;
  } else if (variant === "grade") {
    colorClass = GRADE_STYLES(value);
  } else if (variant === "gold") {
    colorClass = "bg-gold-400/20 text-gold-300 border-gold-400/30";
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5",
        "text-[10px] font-bold uppercase tracking-wide",
        colorClass,
        className
      )}
      {...props}
    >
      {display}
    </span>
  );
}
