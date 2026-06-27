import { cn } from "@/lib/utils/cn";
import type { ExecutionPlan, StepPlan } from "@/lib/automation/workflow-engine";
import { STATUS_CONFIG } from "@/lib/automation/workflow-engine";
import { estimateCompletionTime } from "@/lib/automation/execution-planner";

// ---------------------------------------------------------------------------
// ExecutionTimeline — step-by-step plan display
// ---------------------------------------------------------------------------

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

interface StepNodeProps {
  step: StepPlan;
  index: number;
  isLast: boolean;
}

function StepNode({ step, index, isLast }: StepNodeProps) {
  const statusConfig = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;

  return (
    <div className="flex gap-3">
      {/* Connector column */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            "h-7 w-7 rounded-full border flex items-center justify-center text-[11px]",
            step.approvalRequired
              ? "border-amber-400/30 bg-amber-400/[0.08] text-amber-400"
              : "border-white/[0.08] bg-white/[0.03] text-slate-500"
          )}
          aria-label={`Step ${index + 1}`}
        >
          {STEP_TYPE_ICONS[step.type] ?? "·"}
        </div>
        {!isLast && (
          <div className="w-px flex-1 min-h-[12px] bg-white/[0.05] my-1" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className={cn("pb-3 flex-1 min-w-0", isLast && "pb-0")}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-cream leading-snug">{step.label}</p>
          <span
            className={cn(
              "text-[9px] font-bold border rounded-full px-1.5 py-0.5 uppercase",
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-slate-600">~{estimateCompletionTime(step.estimatedMinutes)}</span>
          {step.approvalRequired && (
            <span className="text-[9px] font-semibold text-amber-400/80">· broker approval</span>
          )}
          {step.rollbackCapable && (
            <span className="text-[9px] text-emerald-400/50">· rollback capable</span>
          )}
          {step.dependencies.length > 0 && (
            <span className="text-[9px] text-slate-700">
              · depends on: {step.dependencies.join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ExecutionTimelineProps {
  plan: ExecutionPlan;
  className?: string;
}

export function ExecutionTimeline({ plan, className }: ExecutionTimelineProps) {
  return (
    <div
      className={cn("rounded-xl border border-white/[0.07] bg-white/[0.015] p-4", className)}
      aria-label={`Execution plan for ${plan.workflowName}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500">
          Execution Steps
        </h3>
        <span className="text-[9px] text-slate-700">
          {plan.steps.length} step{plan.steps.length !== 1 ? "s" : ""} · ~{estimateCompletionTime(plan.estimatedTotalMinutes)}
        </span>
      </div>

      <div role="list" aria-label="Workflow steps">
        {plan.steps.map((step, i) => (
          <div key={step.stepId} role="listitem">
            <StepNode
              step={step}
              index={i}
              isLast={i === plan.steps.length - 1}
            />
          </div>
        ))}
      </div>

      {plan.blockingDependencies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <p className="text-[9px] text-slate-600">
            Blocking dependencies: {plan.blockingDependencies.join(", ")}
          </p>
        </div>
      )}

      {plan.rollbackStrategy && (
        <div className="mt-2">
          <p className="text-[9px] text-emerald-400/50 leading-relaxed">
            ↩ Rollback: {plan.rollbackStrategy}
          </p>
        </div>
      )}
    </div>
  );
}
