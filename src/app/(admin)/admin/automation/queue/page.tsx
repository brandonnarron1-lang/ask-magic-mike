export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApprovalQueue } from "@/components/admin/automation/approval-card";
import { ExecutionSummary } from "@/components/admin/automation/execution-summary";
import { AutomationMetric } from "@/components/admin/automation/impact-score";
import { loadWorkflowSignals, planActiveWorkflows, buildApprovalQueue, buildMorningBrief } from "@/lib/automation/execution-planner";

export default async function ApprovalQueuePage() {
  const signals       = await loadWorkflowSignals();
  const active        = planActiveWorkflows(signals);
  const approvalItems = buildApprovalQueue(active);
  const brief         = buildMorningBrief(signals, approvalItems.length);

  const criticalItems = approvalItems.filter((i) => i.priority === "critical");
  const highItems     = approvalItems.filter((i) => i.priority === "high");
  const otherItems    = approvalItems.filter((i) => i.priority !== "critical" && i.priority !== "high");

  // Top-priority plan for detail view
  const topPlan = brief.topPriorityWorkflow;

  return (
    <AdminShell
      title="Approval Queue"
      eyebrow="Ask Magic Mike · Automation"
      backHref="/admin/automation"
      backLabel="← Automation"
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]">
          <AutomationMetric label="Pending Approvals"  value={approvalItems.length}       urgent={approvalItems.length > 0} />
          <AutomationMetric label="Critical"           value={criticalItems.length}        urgent={criticalItems.length > 0} />
          <AutomationMetric label="High Priority"      value={highItems.length}            />
          <AutomationMetric label="Other"              value={otherItems.length}           />
        </div>

        {approvalItems.length === 0 && (
          <div
            className="text-center py-16 text-slate-500 text-sm rounded-xl border border-white/[0.05] bg-white/[0.01]"
            role="status"
          >
            <p className="text-2xl font-bebas text-emerald-400 mb-2">Queue Clear</p>
            <p className="text-xs text-slate-600">All workflows are either auto-preparing or completed. No broker approvals pending.</p>
          </div>
        )}

        {approvalItems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {criticalItems.length > 0 && (
                <div>
                  <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-ruby-400/80 mb-3">
                    Critical — Act Now
                  </h2>
                  <ApprovalQueue items={criticalItems} />
                </div>
              )}

              {highItems.length > 0 && (
                <div>
                  <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-3">
                    High Priority
                  </h2>
                  <ApprovalQueue items={highItems} />
                </div>
              )}

              {otherItems.length > 0 && (
                <div>
                  <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-3">
                    Standard
                  </h2>
                  <ApprovalQueue items={otherItems} />
                </div>
              )}
            </div>

            {/* Top priority detail */}
            <div className="space-y-4">
              <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500">
                Highest Priority Detail
              </h2>
              {topPlan ? (
                <ExecutionSummary plan={topPlan} />
              ) : (
                <p className="text-xs text-slate-600">Select a workflow to see its execution plan.</p>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/admin/automation" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to Automation Command Center
          </Link>
        </div>

      </main>
    </AdminShell>
  );
}
