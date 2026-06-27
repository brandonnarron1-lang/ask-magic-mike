export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ExecutionLog, FailureCard } from "@/components/admin/automation/execution-log";
import { AutomationMetric } from "@/components/admin/automation/impact-score";
import { loadAuditHistory, buildAuditSummary } from "@/lib/automation/audit-log";

export default async function ExecutionHistoryPage() {
  const events  = await loadAuditHistory(100);
  const summary = buildAuditSummary(events);
  const failures = events.filter((e) => e.eventType === "failure_detected");

  return (
    <AdminShell
      title="Execution History"
      eyebrow="Ask Magic Mike · Automation"
      backHref="/admin/automation"
      backLabel="← Automation"
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Summary metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]">
          <AutomationMetric label="Total Events"      value={summary.totalEvents}                                  accent />
          <AutomationMetric label="Created"           value={summary.workflowsCreated}                             />
          <AutomationMetric label="Approved"          value={summary.approvalsGranted}                             />
          <AutomationMetric label="Rejected"          value={summary.approvalsRejected}                            />
          <AutomationMetric label="Failures"          value={summary.failuresDetected}     urgent={summary.failuresDetected > 0} />
        </div>

        {/* ── Failures ── */}
        {failures.length > 0 && (
          <div>
            <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-ruby-400/80 mb-3">
              Recent Failures — {failures.length}
            </h2>
            <div className="space-y-3">
              {failures.slice(0, 5).map((f) => (
                <FailureCard
                  key={f.id}
                  workflowName={f.workflowName}
                  reason={f.detail}
                  occurredAt={f.timestamp}
                  workflowId={f.workflowId}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Audit log ── */}
        <div>
          <ExecutionLog
            events={events}
            title={`Audit Log — ${events.length} event${events.length !== 1 ? "s" : ""}`}
          />
          {events.length === 0 && (
            <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 text-center">
              <p className="text-xs text-slate-600">
                Audit events appear here as workflows are created and executed.
                Connect Supabase and perform automation actions to populate this log.
              </p>
              <p className="text-[10px] text-slate-700 mt-2">
                Events are tracked via the <code className="text-amber-400/70">analytics_events</code> table
                with <code className="text-amber-400/70">automation_</code> prefixed event names.
              </p>
            </div>
          )}
        </div>

        {/* ── Immutability notice ── */}
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-4">
          <p className="text-[10.5px] tracking-label font-semibold uppercase text-slate-600 mb-2">Audit Integrity</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            All audit events are append-only and immutable once recorded. No modification of existing audit records
            is permitted. Rollbacks create new events of type <span className="text-emerald-400/60 font-mono">rollback_executed</span> —
            they do not delete prior events.
          </p>
        </div>

        <div className="text-center">
          <Link href="/admin/automation" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to Automation Command Center
          </Link>
        </div>

      </main>
    </AdminShell>
  );
}
