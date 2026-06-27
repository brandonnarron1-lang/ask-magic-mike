import { cn } from "@/lib/utils/cn";
import type { ExecutionPlan } from "@/lib/automation/workflow-engine";
import { TRIGGER_LABELS, CATEGORY_LABELS } from "@/lib/automation/workflow-engine";
import { ImpactBreakdownRow } from "./impact-score";
import { AutomationBadge, ApprovalRequiredBadge } from "./automation-badge";
import { scoreExecutionImpact, estimateCompletionTime } from "@/lib/automation/execution-planner";

// ---------------------------------------------------------------------------
// ExecutionSummary — full execution plan summary card
// ---------------------------------------------------------------------------

interface ExecutionSummaryProps {
  plan: ExecutionPlan;
  className?: string;
}

export function ExecutionSummary({ plan, className }: ExecutionSummaryProps) {
  const impact = scoreExecutionImpact(plan);

  return (
    <div
      className={cn("rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden", className)}
      aria-label={`Execution summary for ${plan.workflowName}`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-label font-semibold uppercase text-slate-500 mb-0.5">
              {TRIGGER_LABELS[plan.trigger]} · {CATEGORY_LABELS[plan.category]}
            </p>
            <h2 className="font-display text-lg font-semibold text-cream leading-tight">
              {plan.workflowName}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <AutomationBadge status={plan.status} size="md" />
            <ApprovalRequiredBadge required={plan.requiresBrokerApproval} size="md" />
          </div>
        </div>
      </div>

      {/* Impact breakdown */}
      <div className="px-5 py-3 border-b border-white/[0.05]">
        <ImpactBreakdownRow breakdown={impact} />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.05] border-b border-white/[0.05]">
        {[
          { label: "Est. Time",     value: estimateCompletionTime(plan.estimatedTotalMinutes) },
          { label: "Steps",         value: String(plan.steps.length) },
          { label: "Confidence",    value: `${plan.confidence}%` },
          { label: "Leads Affected", value: String(plan.impact.estimatedLeadsAffected) },
        ].map((m) => (
          <div key={m.label} className="px-4 py-3">
            <p className="text-[9px] tracking-label uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-xl text-cream tabular-nums leading-tight">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Rollback strategy */}
      {plan.rollbackStrategy && (
        <div className="px-5 py-3">
          <p className="text-[9px] tracking-label uppercase text-slate-600 mb-1">Rollback Strategy</p>
          <p className="text-xs text-emerald-400/60 leading-relaxed">{plan.rollbackStrategy}</p>
        </div>
      )}
    </div>
  );
}
