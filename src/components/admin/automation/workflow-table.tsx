import { cn } from "@/lib/utils/cn";
import type { WorkflowDefinition } from "@/lib/automation/workflow-engine";
import { TRIGGER_LABELS, CATEGORY_LABELS } from "@/lib/automation/workflow-engine";
import { AutomationBadge, ExecutionBadge, ApprovalRequiredBadge } from "./automation-badge";
import { PriorityDot } from "./workflow-status";

// ---------------------------------------------------------------------------
// WorkflowTable — tabular view of multiple workflow definitions
// ---------------------------------------------------------------------------

interface WorkflowTableProps {
  definitions: WorkflowDefinition[];
  className?: string;
}

const HEADERS = ["Workflow", "Trigger", "Category", "Priority", "Steps", "Time", "Approval"] as const;

export function WorkflowTable({ definitions, className }: WorkflowTableProps) {
  if (definitions.length === 0) {
    return (
      <div
        className={cn("text-center py-12 text-slate-600 text-xs", className)}
        role="status"
        aria-label="No workflows"
      >
        No workflows defined.
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[640px]"
          role="table"
          aria-label="Workflow definitions"
        >
          <thead>
            <tr className="border-b border-white/[0.05]">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-label text-slate-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {definitions.map((def) => (
              <WorkflowTableRow key={def.id} definition={def} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkflowTableRow({ definition }: { definition: WorkflowDefinition }) {
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
      {/* Workflow name */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <PriorityDot priority={definition.priority} pulse={definition.priority === "critical"} />
          <div>
            <p className="text-xs font-semibold text-cream leading-snug">{definition.name}</p>
            <p className="text-[9px] text-slate-600 font-mono">v{definition.version}</p>
          </div>
        </div>
      </td>

      {/* Trigger */}
      <td className="px-3 py-2.5 text-[10px] text-slate-400 whitespace-nowrap">
        {TRIGGER_LABELS[definition.trigger]}
      </td>

      {/* Category */}
      <td className="px-3 py-2.5">
        <span className="text-[9px] text-slate-500 uppercase">{CATEGORY_LABELS[definition.category]}</span>
      </td>

      {/* Priority */}
      <td className="px-3 py-2.5">
        <ExecutionBadge impact={definition.estimatedImpact} />
      </td>

      {/* Steps */}
      <td className="px-3 py-2.5 text-[10px] text-slate-500 tabular-nums">
        {definition.steps.length}
      </td>

      {/* Time */}
      <td className="px-3 py-2.5 text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
        ~{definition.estimatedTotalMinutes}m
      </td>

      {/* Approval */}
      <td className="px-3 py-2.5">
        <ApprovalRequiredBadge required={definition.requiresBrokerApproval} />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// WorkflowSummaryStrip — compact metric row
// ---------------------------------------------------------------------------

interface WorkflowSummaryStripProps {
  definitions: WorkflowDefinition[];
  className?: string;
}

export function WorkflowSummaryStrip({ definitions, className }: WorkflowSummaryStripProps) {
  const counts = {
    total:     definitions.length,
    critical:  definitions.filter((d) => d.priority === "critical").length,
    approval:  definitions.filter((d) => d.requiresBrokerApproval).length,
    auto:      definitions.filter((d) => !d.requiresBrokerApproval).length,
  };

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]",
        className
      )}
      aria-label="Workflow summary"
    >
      {[
        { label: "Total Workflows",   value: counts.total,    accent: true },
        { label: "Critical Priority", value: counts.critical, urgent: counts.critical > 0 },
        { label: "Require Approval",  value: counts.approval, accent: false },
        { label: "Auto-prepare",      value: counts.auto,     accent: false },
      ].map((m) => (
        <div key={m.label} className="bg-[#0A0906] px-4 py-3">
          <p className={cn(
            "text-[9px] tracking-label font-semibold uppercase leading-none mb-0.5",
            m.urgent ? "text-ruby-400/80" : "text-slate-500"
          )}>
            {m.label}
          </p>
          <p className={cn(
            "font-bebas text-2xl leading-none tabular-nums",
            m.urgent ? "text-ruby-400" : m.accent ? "text-gold-300" : "text-cream"
          )}>
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
