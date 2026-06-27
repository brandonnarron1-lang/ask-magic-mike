import { cn } from "@/lib/utils/cn";

interface InsightCardProps {
  title: string;
  value: string | number;
  description?: string;
  status?: "positive" | "negative" | "neutral" | "warning";
  badge?: string;
  className?: string;
}

const STATUS_STYLES: Record<string, { border: string; value: string; badge: string }> = {
  positive: {
    border: "border-emerald-400/20",
    value: "text-emerald-400",
    badge: "text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20",
  },
  negative: {
    border: "border-ruby-400/20",
    value: "text-ruby-400",
    badge: "text-ruby-400 bg-ruby-400/[0.08] border-ruby-400/20",
  },
  warning: {
    border: "border-amber-400/20",
    value: "text-amber-400",
    badge: "text-amber-400 bg-amber-400/[0.08] border-amber-400/20",
  },
  neutral: {
    border: "border-white/[0.07]",
    value: "text-cream",
    badge: "text-slate-400 bg-white/[0.04] border-white/[0.08]",
  },
};

export function InsightCard({
  title,
  value,
  description,
  status = "neutral",
  badge,
  className,
}: InsightCardProps) {
  const style = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.025] p-4",
        style.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] tracking-label font-semibold uppercase text-slate-500 leading-none">
          {title}
        </p>
        {badge && (
          <span className={cn("text-[9px] tracking-label font-bold uppercase border rounded-full px-1.5 py-0.5 shrink-0", style.badge)}>
            {badge}
          </span>
        )}
      </div>
      <p className={cn("font-bebas text-3xl leading-none tabular-nums", style.value)}>
        {value}
      </p>
      {description && (
        <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">{description}</p>
      )}
    </div>
  );
}
