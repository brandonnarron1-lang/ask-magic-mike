export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ApprovalQueue } from "@/components/admin/automation/approval-card";
import { AutomationMetric } from "@/components/admin/automation/impact-score";
import { WorkflowCard } from "@/components/admin/automation/workflow-card";
import { loadWorkflowSignals, buildMorningBrief, planActiveWorkflows, buildApprovalQueue } from "@/lib/automation/execution-planner";
import { loadAuditHistory, buildAuditSummary } from "@/lib/automation/audit-log";
import { getTemplate } from "@/lib/automation/automation-templates";

// ---------------------------------------------------------------------------
// Morning Brief Item
// ---------------------------------------------------------------------------

function BriefItem({
  question,
  answer,
  urgency,
  actionRequired,
}: {
  question: string;
  answer: string;
  urgency: "critical" | "high" | "normal";
  actionRequired: boolean;
}) {
  const dotColor =
    urgency === "critical" ? "bg-ruby-400 motion-safe:animate-pulse" :
    urgency === "high"     ? "bg-amber-400" :
    "bg-slate-600";

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-white/[0.04] last:border-b-0">
      <div className={["h-1.5 w-1.5 rounded-full shrink-0 mt-1.5", dotColor].join(" ")} aria-hidden="true" />
      <div className="flex-1">
        <p className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-0.5">
          {question}
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{answer}</p>
      </div>
      {actionRequired && (
        <span className="shrink-0 text-[9px] font-bold uppercase text-amber-400/70 border border-amber-400/20 rounded-full px-1.5 py-0.5">
          Action
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AutomationDashboardPage() {
  const [signals, auditEvents] = await Promise.all([
    loadWorkflowSignals(),
    loadAuditHistory(20),
  ]);

  const active        = planActiveWorkflows(signals);
  const approvalQueue = buildApprovalQueue(active);
  const brief         = buildMorningBrief(signals, approvalQueue.length);
  const auditSummary  = buildAuditSummary(auditEvents);

  const criticalCount = active.filter((p) => p.priority === "critical").length;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <AdminShell
      title="Automation Command Center"
      eyebrow="Ask Magic Mike · Operations"
      devMode={signals.urgentLeadCount === 0 && signals.newLeads24h === 0}
      headerRight={
        <nav className="flex items-center gap-1" aria-label="Automation navigation">
          {[
            { href: "/admin/automation",            label: "Dashboard"  },
            { href: "/admin/automation/workflows",  label: "Workflows"  },
            { href: "/admin/automation/queue",      label: "Queue"      },
            { href: "/admin/automation/templates",  label: "Templates"  },
            { href: "/admin/automation/history",    label: "History"    },
          ].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 text-[10px] tracking-label font-semibold uppercase text-slate-500 hover:text-gold-300 transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      }
    >
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Critical alert strip ── */}
        {(criticalCount > 0 || brief.urgentCount > 0) && (
          <div
            className="rounded-xl border border-ruby-400/25 bg-ruby-400/[0.03] px-5 py-4 flex items-center gap-4"
            role="alert"
            aria-live="polite"
          >
            <div className="h-2 w-2 rounded-full bg-ruby-400 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
            <p className="text-sm font-semibold text-ruby-400 flex-1">
              {criticalCount > 0 && `${criticalCount} critical workflow${criticalCount > 1 ? "s" : ""} need immediate attention. `}
              {brief.urgentCount > 0 && `${brief.urgentCount} urgent lead${brief.urgentCount > 1 ? "s" : ""} at risk.`}
            </p>
            <Link href="/admin/automation/queue" className="text-xs text-gold-300 hover:text-gold-200 transition-colors shrink-0">
              Review Queue →
            </Link>
          </div>
        )}

        {/* ── Headline metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]">
          <AutomationMetric label="Active Workflows"     value={active.length}               accent />
          <AutomationMetric label="Awaiting Approval"    value={approvalQueue.length}         urgent={approvalQueue.length > 0} />
          <AutomationMetric label="Critical Priority"    value={criticalCount}                urgent={criticalCount > 0} />
          <AutomationMetric label="Urgent Leads"         value={signals.urgentLeadCount}      urgent={signals.urgentLeadCount > 0} />
          <AutomationMetric label="SLA Breaches"         value={signals.slaBreachCount}       urgent={signals.slaBreachCount > 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Morning Command Brief ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-cream">Morning Brief</h2>
                <p className="text-xs text-slate-600">{today}</p>
              </div>
              <span className="text-[9px] text-slate-700 font-mono">Auto-generated · read-only</span>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] px-5 divide-y-0">
              {brief.items.map((item, i) => (
                <BriefItem key={i} {...item} />
              ))}
            </div>
          </div>

          {/* ── Approval queue ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-cream">Approval Queue</h2>
                <p className="text-xs text-slate-600">{approvalQueue.length} pending</p>
              </div>
              {approvalQueue.length > 3 && (
                <Link href="/admin/automation/queue" className="text-[10px] text-gold-300/70 hover:text-gold-300 transition-colors">
                  View all →
                </Link>
              )}
            </div>

            <ApprovalQueue items={approvalQueue.slice(0, 3)} />
          </div>

        </div>

        {/* ── Top workflows by priority ── */}
        {active.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-cream">Priority Workflows</h2>
              <Link href="/admin/automation/workflows" className="text-[10px] text-gold-300/70 hover:text-gold-300 transition-colors">
                View all {active.length} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {active.slice(0, 6).map((plan) => {
                const def = getTemplate(plan.workflowId);
                if (!def) return null;
                return <WorkflowCard key={plan.workflowId} definition={def} plan={plan} compact href="/admin/automation/workflows" />;
              })}
            </div>
          </div>
        )}

        {/* ── Audit summary ── */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5">
          <h2 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-4">
            Audit Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Total Events",     value: auditSummary.totalEvents },
              { label: "Workflows Created", value: auditSummary.workflowsCreated },
              { label: "Approvals Granted", value: auditSummary.approvalsGranted },
              { label: "Approvals Rejected", value: auditSummary.approvalsRejected },
              { label: "Failures Detected", value: auditSummary.failuresDetected, urgent: auditSummary.failuresDetected > 0 },
            ].map((m) => (
              <div key={m.label}>
                <p className={["text-[9px] tracking-label uppercase mb-0.5", (m as { urgent?: boolean }).urgent ? "text-ruby-400/70" : "text-slate-600"].join(" ")}>
                  {m.label}
                </p>
                <p className={["font-bebas text-xl tabular-nums", (m as { urgent?: boolean }).urgent && m.value > 0 ? "text-ruby-400" : "text-cream"].join(" ")}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
          {auditSummary.totalEvents === 0 && (
            <p className="text-[10px] text-slate-700 mt-3">
              Audit events appear here as workflows are created and executed. Connect Supabase to start logging.
            </p>
          )}
        </div>

        {/* ── Quick nav ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/automation/workflows",  label: "All Workflows",    desc: "Browse all workflow definitions" },
            { href: "/admin/automation/queue",      label: "Approval Queue",   desc: `${approvalQueue.length} pending approvals` },
            { href: "/admin/automation/templates",  label: "Template Library", desc: "20 reusable automation templates" },
            { href: "/admin/automation/history",    label: "Execution History", desc: "Audit trail and run log" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-gold-400/20 hover:bg-white/[0.025] transition-colors p-4"
            >
              <p className="text-[10.5px] tracking-label font-semibold uppercase text-gold-300/60 group-hover:text-gold-300 transition-colors mb-1">
                {card.label}
              </p>
              <p className="text-xs text-slate-500">{card.desc}</p>
            </Link>
          ))}
        </div>

      </main>
    </AdminShell>
  );
}
