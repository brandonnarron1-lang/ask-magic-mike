import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { Temperature } from "@/types/domain.types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gold" | "ruby" | "emerald" | "slate" | "cyan" | "amber" | Temperature;
  dot?: boolean;
}

const TEMPERATURE_STYLES: Record<Temperature, string> = {
  urgent: "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30",
  hot:    "bg-gold-400/20 text-gold-300 border-gold-400/30",
  warm:   "bg-amber-500/15 text-amber-300 border-amber-500/25",
  nurture:"bg-blue-500/15 text-blue-300 border-blue-500/25",
  low:    "bg-slate-700/40 text-slate-400 border-slate-600/35",
};

const TEMPERATURE_DOTS: Record<Temperature, string> = {
  urgent: "bg-ruby-400",
  hot:    "bg-gold-400",
  warm:   "bg-amber-400",
  nurture:"bg-blue-400",
  low:    "bg-slate-500",
};

const VARIANT_STYLES: Record<string, string> = {
  default:  "bg-white/[0.07] text-cream border-white/[0.12]",
  gold:     "bg-gold-400/15 text-gold-300 border-gold-400/25",
  ruby:     "bg-ruby-400/15 text-ruby-300 border-ruby-400/25",
  emerald:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  slate:    "bg-slate-700/40 text-slate-400 border-slate-600/35",
  cyan:     "bg-cyan-400/[0.08] text-cyan-300 border-cyan-400/20",
  amber:    "bg-amber-500/15 text-amber-300 border-amber-500/25",
};

const TEMPERATURES = new Set<string>(["urgent", "hot", "warm", "nurture", "low"]);

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", dot = false, children, ...props }, ref) => {
    const isTemp = TEMPERATURES.has(variant);
    const colorClass = isTemp
      ? TEMPERATURE_STYLES[variant as Temperature]
      : (VARIANT_STYLES[variant] ?? VARIANT_STYLES.default);

    const dotColor = isTemp ? TEMPERATURE_DOTS[variant as Temperature] : undefined;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
          "text-[10.5px] font-semibold",
          colorClass,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full shrink-0",
              dotColor ?? "bg-current opacity-70"
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
