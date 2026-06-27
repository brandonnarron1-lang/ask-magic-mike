export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { WorkflowCard, WorkflowStepRow } from "@/components/admin/automation/workflow-card";
import { WorkflowSummaryStrip } from "@/components/admin/automation/workflow-table";
import { AUTOMATION_TEMPLATES } from "@/lib/automation/automation-templates";
import { CATEGORY_LABELS } from "@/lib/automation/workflow-engine";
import type { WorkflowCategory } from "@/lib/automation/workflow-engine";

const CATEGORY_ORDER: WorkflowCategory[] = [
  "lead_management",
  "agent_operations",
  "marketing",
  "reporting",
  "coaching",
  "compliance",
];

export default function TemplateLibraryPage() {
  return (
    <AdminShell
      title="Automation Template Library"
      eyebrow="Ask Magic Mike · Automation"
      backHref="/admin/automation"
      backLabel="← Automation"
    >
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        <WorkflowSummaryStrip definitions={AUTOMATION_TEMPLATES} />

        {/* Description */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-2">Architecture</p>
          <div className="space-y-1.5 text-xs text-slate-500 leading-relaxed">
            <p>• All templates are <strong className="text-slate-400">pure, typed, versioned, and deterministic</strong>. No side effects. No API calls.</p>
            <p>• Templates <strong className="text-slate-400">PREPARE work</strong> — they never automatically send, post, or modify records.</p>
            <p>• Steps marked <strong className="text-slate-400">"Approval Required"</strong> are gated on explicit broker sign-off before any action proceeds.</p>
            <p>• All templates include a rollback strategy — no irreversible operations without a clear undo path.</p>
          </div>
        </div>

        {/* Templates by category */}
        {CATEGORY_ORDER.map((cat) => {
          const templates = AUTOMATION_TEMPLATES.filter((t) => t.category === cat);
          if (templates.length === 0) return null;

          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2
                id={`cat-${cat}`}
                className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-4"
              >
                {CATEGORY_LABELS[cat]} — {templates.length} template{templates.length > 1 ? "s" : ""}
              </h2>

              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/[0.05]">
                      <WorkflowCard definition={template} compact={false} />
                    </div>

                    {/* Step detail */}
                    <div className="px-5 py-4">
                      <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-3">
                        Steps ({template.steps.length})
                      </p>
                      {template.steps.map((step, i) => (
                        <WorkflowStepRow
                          key={step.id}
                          step={step}
                          index={i}
                          total={template.steps.length}
                        />
                      ))}

                      <div className="mt-3 pt-2.5 border-t border-white/[0.05]">
                        <p className="text-[9px] text-emerald-400/50 leading-relaxed">
                          ↩ Rollback: {template.rollbackStrategy}
                        </p>
                        {template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.map((tag) => (
                              <span key={tag} className="text-[9px] text-slate-700 border border-white/[0.04] rounded-full px-1.5 py-0.5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
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
