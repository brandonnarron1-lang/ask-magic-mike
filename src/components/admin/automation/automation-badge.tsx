import { cn } from "@/lib/utils/cn";
import { STATUS_CONFIG, type WorkflowStatus, type ImpactLevel } from "@/lib/automation/workflow-engine";

// ---------------------------------------------------------------------------
// AutomationBadge — workflow status chip
// ---------------------------------------------------------------------------

interface AutomationBadgeProps {
  status: WorkflowStatus;
  size?: "sm" | "md";
  className?: string;
}

export function AutomationBadge({ status, size = "sm", className }: AutomationBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const text   = size === "sm" ? "text-[9px]" : "text-[10.5px]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-bold uppercase",
        text,
        config.color,
        className
      )}
      aria-label={`Status: ${config.label}`}
    >
      {status === "awaiting_approval" && (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1 motion-safe:animate-pulse" aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ExecutionBadge — result/outcome chip
// ---------------------------------------------------------------------------

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; color: string }> = {
  critical: { label: "Critical",  color: "text-ruby-400 border-ruby-400/30 bg-ruby-400/[0.08]" },
  high:     { label: "High",      color: "text-gold-300 border-gold-400/25 bg-gold-400/[0.06]" },
  medium:   { label: "Medium",    color: "text-amber-400 border-amber-400/25 bg-amber-400/[0.06]" },
  low:      { label: "Low",       color: "text-slate-400 border-white/[0.08] bg-white/[0.02]" },
};

interface ExecutionBadgeProps {
  impact: ImpactLevel;
  size?: "sm" | "md";
  className?: string;
}

export function ExecutionBadge({ impact, size = "sm", className }: ExecutionBadgeProps) {
  const config = IMPACT_CONFIG[impact] ?? IMPACT_CONFIG.low;
  const text   = size === "sm" ? "text-[9px]" : "text-[10.5px]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-bold uppercase",
        text,
        config.color,
        className
      )}
      aria-label={`Impact: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ApprovalRequiredBadge
// ---------------------------------------------------------------------------

interface ApprovalRequiredBadgeProps {
  required: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ApprovalRequiredBadge({ required, size = "sm", className }: ApprovalRequiredBadgeProps) {
  const text = size === "sm" ? "text-[9px]" : "text-[10.5px]";

  if (!required) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-2 py-0.5 font-semibold uppercase text-emerald-400/70",
          text,
          className
        )}
        aria-label="No approval required"
      >
        Auto
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-2 py-0.5 font-bold uppercase text-amber-400",
        text,
        className
      )}
      aria-label="Broker approval required"
    >
      <span className="h-1 w-1 rounded-full bg-amber-400" aria-hidden="true" />
      Approval
    </span>
  );
}
