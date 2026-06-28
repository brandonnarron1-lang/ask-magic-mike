import { AdminShell } from "@/components/admin/admin-shell";
import {
  loadBrokerageMemorySummary,
  consolidateMemory,
} from "@/lib/intelligence/memory-engine";
import { MemoryTimeline, HistoryPanel } from "@/components/admin/intelligence/memory-timeline";

export default async function MemoryPage() {
  const summary       = await loadBrokerageMemorySummary(100);
  const consolidation = consolidateMemory("brokerage", "agent", summary.recentMilestones);

  return (
    <AdminShell
      title="Memory Layer"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Total Records",    value: summary.totalRecords        },
          { label: "Critical Events",  value: summary.criticalCount       },
          { label: "High Events",      value: summary.highCount           },
          { label: "Memory Strength",  value: `${consolidation.memoryStrength}/100` },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-2xl text-cream leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* History panel */}
        <div className="lg:col-span-2">
          <MemoryTimeline
            records={summary.recentMilestones}
            title="Brokerage Memory Timeline"
            maxItems={25}
          />
        </div>

        {/* Consolidation summary + top entities */}
        <div className="space-y-4">
          <HistoryPanel consolidation={consolidation} />

          {summary.topEntities.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
              <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
                Top Entities by Memory Strength
              </p>
              <div className="space-y-2">
                {summary.topEntities.map((entity) => (
                  <div key={entity.entityId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 truncate">{entity.entityId}</p>
                      <p className="text-[9px] text-slate-700">{entity.eventCount} event{entity.eventCount !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="shrink-0">
                      <span className="font-bebas text-sm text-cream">{entity.strength}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Immutability notice */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.005] p-4">
        <div className="flex items-start gap-3">
          <div className="h-4 w-4 rounded-full border border-white/[0.1] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[7px] text-slate-600">i</span>
          </div>
          <div>
            <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-0.5">
              Read-Only Memory System
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              The memory layer reads from <code className="text-slate-500">analytics_events</code> and never writes.
              All records are immutable audit entries. The intelligence engine builds its understanding from this
              history without ever modifying it.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
