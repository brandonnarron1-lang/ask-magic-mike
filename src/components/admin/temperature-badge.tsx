import { cn } from "@/lib/utils/cn";
import type { Temperature } from "@/types/domain.types";

const STYLES: Record<Temperature, string> = {
  urgent: "bg-ruby-400/20 text-ruby-300 border-ruby-400/40",
  hot:    "bg-gold-400/20 text-gold-300 border-gold-400/40",
  warm:   "bg-amber-400/20 text-amber-300 border-amber-400/40",
  nurture:"bg-blue-400/20  text-blue-300  border-blue-400/40",
  low:    "bg-slate-700/50 text-slate-400 border-slate-600/40",
};

interface TemperatureBadgeProps {
  temperature: Temperature;
  className?: string;
}

export function TemperatureBadge({ temperature, className }: TemperatureBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
      STYLES[temperature],
      className
    )}>
      {temperature}
    </span>
  );
}
