import { cn } from "@/lib/utils/cn";

interface AnalyticsCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  accent?: "gold" | "ruby" | "emerald" | "amber" | "slate" | "none";
  className?: string;
}

const ACCENT_BORDER: Record<string, string> = {
  gold:    "border-gold-400/20",
  ruby:    "border-ruby-400/25",
  emerald: "border-emerald-400/20",
  amber:   "border-amber-400/20",
  slate:   "border-white/[0.07]",
  none:    "border-white/[0.07]",
};

const ACCENT_BAR: Record<string, string> = {
  gold:    "bg-gold-400/40",
  ruby:    "bg-ruby-400/50",
  emerald: "bg-emerald-400/40",
  amber:   "bg-amber-400/40",
  slate:   "bg-white/[0.12]",
  none:    "",
};

export function AnalyticsCard({
  children,
  title,
  subtitle,
  action,
  accent = "none",
  className,
}: AnalyticsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.025] overflow-hidden",
        ACCENT_BORDER[accent],
        className
      )}
    >
      {accent !== "none" && (
        <div className={cn("h-px", ACCENT_BAR[accent])} aria-hidden="true" />
      )}
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-0">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[10.5px] tracking-label font-semibold uppercase text-gold-300/80 leading-none">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5 pt-4">{children}</div>
    </div>
  );
}

/** Compact grid of executive metrics */
export function MetricGrid({
  children,
  cols = 4,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const colClass: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };
  return (
    <div className={cn("grid gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/[0.07]", colClass[cols], className)}>
      {children}
    </div>
  );
}

/** Individual cell in a MetricGrid */
export function MetricTile({
  label,
  value,
  sub,
  accent = false,
  urgent = false,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  urgent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#0A0906] px-4 py-4 flex flex-col gap-1",
        urgent && "bg-ruby-400/[0.04]",
        className
      )}
    >
      <p className={cn(
        "text-[10px] tracking-label font-semibold uppercase leading-none",
        urgent ? "text-ruby-400/80" : "text-slate-500"
      )}>
        {label}
      </p>
      <p className={cn(
        "font-bebas text-2xl leading-none tabular-nums",
        urgent ? "text-ruby-400" : accent ? "text-gold-300" : "text-cream"
      )}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-600 leading-none">{sub}</p>}
    </div>
  );
}
