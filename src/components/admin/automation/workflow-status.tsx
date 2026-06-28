import { cn } from "@/lib/utils/cn";
import type { WorkflowStatus as WFStatus, WorkflowCategory, ImpactLevel } from "@/lib/automation/workflow-engine";
import { STATUS_CONFIG, CATEGORY_LABELS } from "@/lib/automation/workflow-engine";

// ---------------------------------------------------------------------------
// WorkflowStatus — compact status chip with optional pulse
// ---------------------------------------------------------------------------

interface WorkflowStatusProps {
  status: WFStatus;
  className?: string;
}

export function WorkflowStatus({ status, className }: WorkflowStatusProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase",
        config.color,
        className
      )}
      aria-label={`Status: ${config.label}`}
    >
      {(status === "awaiting_approval" || status === "retrying") && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            status === "awaiting_approval" ? "bg-amber-400 motion-safe:animate-pulse" : "bg-gold-400 motion-safe:animate-pulse"
          )}
          aria-hidden="true"
        />
      )}
      {(status === "queued" || status === "running" as string) && (
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CategoryTag
// ---------------------------------------------------------------------------

interface CategoryTagProps {
  category: WorkflowCategory;
  className?: string;
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 text-[9px] uppercase text-slate-500",
        className
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PriorityDot
// ---------------------------------------------------------------------------

const PRIORITY_DOT_COLORS: Record<ImpactLevel, string> = {
  critical: "bg-ruby-400",
  high:     "bg-gold-400",
  medium:   "bg-amber-400",
  low:      "bg-slate-500",
};

interface PriorityDotProps {
  priority: ImpactLevel;
  pulse?: boolean;
  className?: string;
}

export function PriorityDot({ priority, pulse = false, className }: PriorityDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        PRIORITY_DOT_COLORS[priority],
        pulse && priority === "critical" && "motion-safe:animate-pulse",
        className
      )}
      aria-label={`Priority: ${priority}`}
    />
  );
}
