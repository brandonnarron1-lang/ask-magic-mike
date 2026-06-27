import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "data" | "locked";
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  variant = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border",
        variant === "locked"
          ? "border-ruby-400/15 bg-ruby-400/[0.03]"
          : variant === "data"
          ? "border-white/[0.06] bg-white/[0.01]"
          : "border-white/[0.07] bg-white/[0.02]",
        className
      )}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-3 text-slate-600 opacity-50" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-400 leading-snug mb-1">{title}</p>
      {description && (
        <p className="text-xs text-slate-600 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center py-12 text-slate-600"
      role="status"
      aria-label={label}
    >
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-gold-400/40 motion-safe:animate-bounce [animation-delay:0ms]" aria-hidden="true" />
        <div className="h-1 w-1 rounded-full bg-gold-400/40 motion-safe:animate-bounce [animation-delay:150ms]" aria-hidden="true" />
        <div className="h-1 w-1 rounded-full bg-gold-400/40 motion-safe:animate-bounce [animation-delay:300ms]" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export function NoDataState({ label = "No data available" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center py-8 text-slate-700 text-xs"
      role="status"
      aria-label={label}
    >
      {label}
    </div>
  );
}
