import { cn } from "@/lib/utils/cn";

interface SlaRiskBadgeProps {
  /** ISO timestamp when SLA deadline occurs */
  deadline?: string | null;
  /** Whether the SLA has already been breached */
  breached?: boolean;
  size?: "sm" | "md";
  className?: string;
}

function getMinutesUntil(isoDeadline: string): number {
  return Math.floor((new Date(isoDeadline).getTime() - Date.now()) / 60_000);
}

export function SlaRiskBadge({
  deadline,
  breached = false,
  size = "sm",
  className,
}: SlaRiskBadgeProps) {
  const text = size === "sm" ? "text-[9px]" : "text-[10.5px]";

  if (breached || (deadline && getMinutesUntil(deadline) < 0)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-ruby-400/35 bg-ruby-400/[0.12] px-2 py-0.5 font-bold uppercase text-ruby-400",
          text,
          className
        )}
        aria-label="SLA breached"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ruby-400 motion-safe:animate-pulse" aria-hidden="true" />
        SLA Breach
      </span>
    );
  }

  if (deadline) {
    const mins = getMinutesUntil(deadline);
    if (mins <= 30) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/[0.10] px-2 py-0.5 font-semibold uppercase text-amber-400",
            text,
            className
          )}
          aria-label={`SLA in ${mins} minutes`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          {mins}m
        </span>
      );
    }
    if (mins <= 60) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-2 py-0.5 font-semibold uppercase text-amber-400/80",
            text,
            className
          )}
          aria-label={`SLA in ${Math.round(mins / 60)}h`}
        >
          {Math.round(mins / 60)}h
        </span>
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// FollowUpBadge
// ---------------------------------------------------------------------------

interface FollowUpBadgeProps {
  dueAt?: string | null;
  className?: string;
}

export function FollowUpBadge({ dueAt, className }: FollowUpBadgeProps) {
  if (!dueAt) return null;

  const now        = Date.now();
  const dueMs      = new Date(dueAt).getTime();
  const isOverdue  = dueMs < now;
  const isDueSoon  = dueMs < now + 24 * 60 * 60 * 1000; // within 24h

  if (isOverdue) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-ruby-400/30 bg-ruby-400/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase text-ruby-400",
          className
        )}
        aria-label="Follow-up overdue"
      >
        Overdue
      </span>
    );
  }

  if (isDueSoon) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase text-amber-400/80",
          className
        )}
        aria-label="Follow-up due today"
      >
        Due Today
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[9px] text-slate-500 uppercase",
        className
      )}
      aria-label={`Follow-up on ${new Date(dueAt).toLocaleDateString()}`}
    >
      {new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}
