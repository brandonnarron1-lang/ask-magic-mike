export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ExecutionTimeline } from "@/components/admin/automation/execution-timeline";
import { ExecutionSummary } from "@/components/admin/automation/execution-summary";
import { AutomationMetric } from "@/components/admin/automation/impact-score";
import { scoreExecutionImpact } from "@/lib/automation/execution-planner";
import { loadWorkflowSignals, planActiveWorkflows } from "@/lib/automation/execution-planner";

export default async function ExecutionsPage() {
  const signals = await loadWorkflowSignals();
  const active  = planActiveWorkflows(signals);

  const awaiting  = active.filter((p) => p.status === "awaiting_approval");
  const queued    = active.filter((p) => p.status === "queued");
  const pending   = active.filter((p) => p.status === "pending");

  return (
    <AdminShell
      title="Active Executions"
      eyebrow="Ask Magic Mike · Automation"
      backHref="/admin/automation"
      backLabel="← Automation"
    >
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]">
          <AutomationMetric label="Total Active"       value={active.length}       accent />
          <AutomationMetric label="Awaiting Approval"  value={awaiting.length}     urgent={awaiting.length > 0} />
          <AutomationMetric label="Queued"             value={queued.length}       />
          <AutomationMetric label="Pending"            value={pending.length}      />
        </div>

        {active.length === 0 && (
          <div className="text-center py-16 text-slate-600 text-sm rounded-xl border border-white/[0.05] bg-white/[0.01]" role="status">
            <p className="font-bebas text-2xl text-emerald-400 mb-2">No Active Executions</p>
            <p className="text-xs">Connect Supabase to load live workflow execution data based on current lead and agent state.</p>
          </div>
        )}

        {/* Awaiting approval */}
        {awaiting.length > 0 && (
          <section aria-labelledby="awaiting-heading">
            <h2 id="awaiting-heading" className="text-[10.5px] tracking-label font-semibold uppercase text-amber-400/80 mb-4">
              Awaiting Broker Approval — {awaiting.length}
            </h2>
            <div className="space-y-6">
              {awaiting.slice(0, 5).map((plan) => (
                <div key={plan.workflowId} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ExecutionSummary plan={plan} />
                  <ExecutionTimeline plan={plan} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Queued */}
        {queued.length > 0 && (
          <section aria-labelledby="queued-heading">
            <h2 id="queued-heading" className="text-[10.5px] tracking-label font-semibold uppercase text-cyan-400/80 mb-4">
              Queued for Preparation — {queued.length}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {queued.map((plan) => {
                const impact = scoreExecutionImpact(plan);
                return (
                  <div key={plan.workflowId} className="rounded-xl border border-cyan-500/[0.08] bg-white/[0.01] p-4">
                    <p className="text-[9px] tracking-label font-semibold uppercase text-cyan-400/60 mb-1">Queued</p>
                    <h3 className="text-sm font-semibold text-cream mb-1">{plan.workflowName}</h3>
                    <p className="text-[10px] text-slate-500">{impact.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
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
