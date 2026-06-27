import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  buildBrokerageGraph,
  getNodeTypeCounts,
} from "@/lib/intelligence/knowledge-graph";
import {
  generateExecutiveInsights,
  buildBriefingPacket,
} from "@/lib/intelligence/executive-intelligence";
import {
  generatePredictions,
} from "@/lib/intelligence/prediction-engine";
import {
  discoverOpportunities,
  getTopOpportunities,
} from "@/lib/intelligence/opportunity-engine";
import { ExecutiveInsight, BriefingSummary } from "@/components/admin/intelligence/executive-insight";
import { PredictionCard } from "@/components/admin/intelligence/prediction-card";
import { OpportunityCard } from "@/components/admin/intelligence/opportunity-card";
import { KnowledgeGraphCard } from "@/components/admin/intelligence/knowledge-graph-card";

const NAV = [
  { href: "/admin/intelligence/properties",    label: "Property Intelligence" },
  { href: "/admin/intelligence/sellers",       label: "Seller Intelligence"  },
  { href: "/admin/intelligence/buyers",        label: "Buyer Intelligence"   },
  { href: "/admin/intelligence/predictions",   label: "Prediction Engine"    },
  { href: "/admin/intelligence/opportunities", label: "Opportunity Engine"   },
  { href: "/admin/intelligence/relationships", label: "Relationship Map"     },
  { href: "/admin/intelligence/memory",        label: "Memory Layer"         },
];

export default async function IntelligenceDashboardPage() {
  const signals   = await loadIntelligenceSignals();
  const graph     = buildBrokerageGraph(signals);
  const nodeCounts = getNodeTypeCounts(graph);

  const execSignals  = { signals, timestamp: new Date().toISOString() };
  const rawInsights  = generateExecutiveInsights(execSignals);
  const briefing     = buildBriefingPacket(rawInsights);

  const predSignals  = { signals, timestamp: new Date().toISOString() };
  const predictions  = generatePredictions(predSignals).slice(0, 3);

  const oppSignals   = { signals };
  const allOpps      = discoverOpportunities(oppSignals);
  const topOpps      = getTopOpportunities(allOpps, 3);

  const topInsight   = briefing.topInsight;

  return (
    <AdminShell
      title="Brokerage Intelligence"
      eyebrow="Intelligence Brain"
      headerRight={
        <a
          href="/admin/intelligence/opportunities"
          className="text-[10px] tracking-[0.18em] font-semibold uppercase text-gold-300/70 hover:text-gold-300 transition-colors"
        >
          View all →
        </a>
      }
    >
      {/* Briefing health banner */}
      <BriefingSummary packet={briefing} className="mb-6" />

      {/* Signal snapshot */}
      <section className="mb-8">
        <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
          Signal Snapshot · {signals.windowDays}d window
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
          {[
            { label: "Total Leads",       value: signals.totalLeads          },
            { label: "Hot Leads",         value: signals.hotLeads            },
            { label: "Pipeline Est.",     value: `$${Math.round(signals.estimatedPipelineValue / 1000)}K` },
            { label: "Predicted Closings 30d", value: signals.predictedClosings30d },
            { label: "Active Campaigns",  value: signals.activeCampaigns     },
            { label: "Active Agents",     value: signals.activeAgents        },
            { label: "Appt Acceptance",   value: `${Math.round(signals.appointmentAcceptanceRate * 100)}%` },
            { label: "Avg Days to Close", value: `${signals.avgDaysToClose}d`},
          ].map((m) => (
            <div key={m.label} className="bg-[#0a0a0a] px-3 py-2.5">
              <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
              <p className="font-bebas text-xl text-cream leading-none">{m.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Executive Insights */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600">
            Top Insights
          </h2>
          {topInsight && (
            <ExecutiveInsight insight={topInsight} featured />
          )}
          {briefing.insights.slice(topInsight ? 1 : 0, 3).map((insight) => (
            <ExecutiveInsight key={insight.id} insight={insight} />
          ))}
          {briefing.insights.length === 0 && (
            <div className="rounded-xl border border-white/[0.05] p-6 text-center">
              <p className="text-[10px] text-slate-700">Connect Supabase to generate live intelligence insights.</p>
            </div>
          )}
        </div>

        {/* Graph overview + quick nav */}
        <div className="space-y-4">
          <KnowledgeGraphCard graph={graph} />
          <nav aria-label="Intelligence modules">
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-2">
              Intelligence Modules
            </h2>
            <div className="space-y-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.02] transition-colors group"
                >
                  <span className="text-xs text-slate-400 group-hover:text-cream transition-colors">
                    {item.label}
                  </span>
                  <span className="text-slate-700 group-hover:text-gold-300 transition-colors text-xs">→</span>
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Predictions preview */}
      {predictions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600">
              Active Predictions
            </h2>
            <a
              href="/admin/intelligence/predictions"
              className="text-[9px] text-gold-300/60 hover:text-gold-300 transition-colors"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {predictions.map((p, i) => (
              <PredictionCard key={p.id} prediction={p} rank={i + 1} compact />
            ))}
          </div>
        </section>
      )}

      {/* Opportunities preview */}
      {topOpps.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600">
              Top Opportunities
            </h2>
            <a
              href="/admin/intelligence/opportunities"
              className="text-[9px] text-gold-300/60 hover:text-gold-300 transition-colors"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topOpps.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </section>
      )}
    </AdminShell>
  );
}
