import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { Temperature } from "@/types/domain.types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gold" | "ruby" | Temperature;
}

const TEMPERATURE_STYLES: Record<Temperature, string> = {
  urgent: "bg-ruby-400/20 text-ruby-300 border border-ruby-400/30",
  hot: "bg-gold-400/20 text-gold-300 border border-gold-400/30",
  warm: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  nurture: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  low: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const isTemperature = [
      "urgent",
      "hot",
      "warm",
      "nurture",
      "low",
    ].includes(variant);

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          {
            "bg-white/10 text-cream border border-white/20": variant === "default",
            "bg-gold-400/20 text-gold-300 border border-gold-400/30":
              variant === "gold",
            "bg-ruby-400/20 text-ruby-300 border border-ruby-400/30":
              variant === "ruby",
          },
          isTemperature && TEMPERATURE_STYLES[variant as Temperature],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
