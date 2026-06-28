import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { WorkflowDefinition } from "@/lib/automation/workflow-engine";
import { TRIGGER_LABELS } from "@/lib/automation/workflow-engine";
import { AutomationBadge, ExecutionBadge, ApprovalRequiredBadge } from "./automation-badge";
import { PriorityDot, CategoryTag } from "./workflow-status";
import { ImpactScore } from "./impact-score";
import { scoreExecutionImpact } from "@/lib/automation/execution-planner";
import type { ExecutionPlan } from "@/lib/automation/workflow-engine";

// ---------------------------------------------------------------------------
// WorkflowCard — shows a workflow definition with optional execution plan data
// ---------------------------------------------------------------------------

interface WorkflowCardProps {
  definition: WorkflowDefinition;
  plan?: ExecutionPlan;
  href?: string;
  compact?: boolean;
  className?: string;
}

export function WorkflowCard({
  definition,
  plan,
  href,
  compact = false,
  className,
}: WorkflowCardProps) {
  const impact = plan ? scoreExecutionImpact(plan) : null;

  const content = (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.02] transition-colors overflow-hidden",
        plan?.status === "awaiting_approval"
          ? "border-amber-400/20 hover:border-amber-400/30"
          : definition.priority === "critical"
          ? "border-ruby-400/15 hover:border-ruby-400/25"
          : "border-white/[0.07] hover:border-white/[0.12]",
        href && "cursor-pointer",
        className
      )}
      aria-label={`Workflow: ${definition.name}`}
    >
      {/* Priority accent line */}
      {definition.priority === "critical" && (
        <div className="h-px bg-ruby-400/40" aria-hidden="true" />
      )}
      {definition.priority === "high" && (
        <div className="h-px bg-gold-400/30" aria-hidden="true" />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <PriorityDot priority={definition.priority} pulse={definition.priority === "critical"} />
              <p className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 truncate">
                {TRIGGER_LABELS[definition.trigger]}
              </p>
            </div>
            <h3 className="text-sm font-semibold text-cream leading-snug">{definition.name}</h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {plan ? (
              <AutomationBadge status={plan.status} />
            ) : (
              <ExecutionBadge impact={definition.estimatedImpact} />
            )}
            <ApprovalRequiredBadge required={definition.requiresBrokerApproval} />
          </div>
        </div>

        {!compact && (
          <p className="text-xs text-slate-500 leading-relaxed mb-3">{definition.description}</p>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryTag category={definition.category} />
          <span className="text-[9px] text-slate-700">
            {definition.steps.length} step{definition.steps.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[9px] text-slate-700">·</span>
          <span className="text-[9px] text-slate-700">~{definition.estimatedTotalMinutes}m</span>
          <span className="text-[9px] text-slate-700">·</span>
          <span className="text-[9px] text-slate-500 font-mono">v{definition.version}</span>
        </div>

        {/* Impact score if available */}
        {impact && !compact && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center gap-3">
            <ImpactScore score={impact.score} level={impact.level} label="Impact" />
            <p className="text-[10px] text-slate-500 leading-relaxed flex-1">{impact.description}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// WorkflowStepRow — inline step display within a workflow card
// ---------------------------------------------------------------------------

interface WorkflowStepRowProps {
  step: WorkflowDefinition["steps"][0];
  index: number;
  total: number;
}

const STEP_TYPE_ICONS: Record<string, string> = {
  prepare:      "◈",
  notify_draft: "✎",
  assign:       "→",
  schedule:     "◷",
  flag:         "⚑",
  escalate:     "↑",
  log:          "·",
  route:        "⇄",
  score:        "◎",
  review:       "✓",
};

export function WorkflowStepRow({ step, index, total }: WorkflowStepRowProps) {
  const isLast = index === total - 1;

  return (
    <div className="flex gap-3">
      {/* Step connector */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="h-6 w-6 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-[10px] text-slate-500"
          aria-label={`Step ${index + 1}: ${step.type}`}
        >
          {STEP_TYPE_ICONS[step.type] ?? "·"}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-white/[0.04] my-1" aria-hidden="true" />
        )}
      </div>

      {/* Step content */}
      <div className={cn("pb-3", isLast && "pb-0")}>
        <p className="text-xs font-semibold text-cream leading-snug">{step.label}</p>
        <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{step.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-slate-700">{step.estimatedMinutes}m</span>
          {step.approvalRequired !== "never" && (
            <span className="text-[9px] font-semibold text-amber-400/70">
              {step.approvalRequired === "always" ? "Approval required" : "Approval if high impact"}
            </span>
          )}
          {step.rollbackCapable && (
            <span className="text-[9px] text-emerald-400/50">↩ rollback</span>
          )}
        </div>
      </div>
    </div>
  );
}
