export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { WorkflowTable, WorkflowSummaryStrip } from "@/components/admin/automation/workflow-table";
import { WorkflowCard } from "@/components/admin/automation/workflow-card";
import { AUTOMATION_TEMPLATES } from "@/lib/automation/automation-templates";
import { loadWorkflowSignals, planActiveWorkflows } from "@/lib/automation/execution-planner";
import type { WorkflowCategory } from "@/lib/automation/workflow-engine";
import { CATEGORY_LABELS } from "@/lib/automation/workflow-engine";

const CATEGORIES: WorkflowCategory[] = [
  "lead_management",
  "agent_operations",
  "marketing",
  "reporting",
  "compliance",
  "coaching",
];

export default async function WorkflowsPage() {
  const signals = await loadWorkflowSignals();
  const active  = planActiveWorkflows(signals);

  // Build a map of workflowId → ExecutionPlan for display
  const planMap = new Map(active.map((p) => [p.workflowId, p]));

  return (
    <AdminShell
      title="Workflow Definitions"
      eyebrow="Ask Magic Mike · Automation"
      backHref="/admin/automation"
      backLabel="← Automation"
    >
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        <WorkflowSummaryStrip definitions={AUTOMATION_TEMPLATES} />

        {/* Table view — all workflows */}
        <div>
          <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-3">
            All Workflow Definitions — {AUTOMATION_TEMPLATES.length}
          </h2>
          <WorkflowTable definitions={AUTOMATION_TEMPLATES} />
        </div>

        {/* By category */}
        {CATEGORIES.map((cat) => {
          const defs = AUTOMATION_TEMPLATES.filter((t) => t.category === cat);
          if (defs.length === 0) return null;
          return (
            <div key={cat}>
              <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-3">
                {CATEGORY_LABELS[cat]} — {defs.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {defs.map((def) => (
                  <WorkflowCard
                    key={def.id}
                    definition={def}
                    plan={planMap.get(def.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-center">
          <Link href="/admin/automation" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to Automation Command Center
          </Link>
        </div>

      </main>
    </AdminShell>
  );
}
