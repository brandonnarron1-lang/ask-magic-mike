import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  discoverOpportunities,
  rankByROI,
  getTopOpportunities,
  getFastestWin,
  getLargestPipelineOpportunity,
  getTopRisks,
  getHighestConfidenceOpportunity,
} from "@/lib/intelligence/opportunity-engine";
import { OpportunityCard, DecisionSupportCard, RiskCard } from "@/components/admin/intelligence/opportunity-card";

export default async function OpportunitiesPage() {
  const signals  = await loadIntelligenceSignals();
  const oppSigs  = { signals };

  const allOpps  = discoverOpportunities(oppSigs);
  const byROI    = rankByROI(allOpps);
  const topOpps  = getTopOpportunities(allOpps, 5);
  const fastest  = getFastestWin(allOpps);
  const largest  = getLargestPipelineOpportunity(allOpps);
  const highest  = getHighestConfidenceOpportunity(allOpps);
  const risks    = getTopRisks(oppSigs);

  const totalValue      = allOpps.reduce((s, o) => s + o.businessValue, 0);
  const totalCommission = allOpps.reduce((s, o) => s + o.expectedCommission, 0);
  const avgROI          = allOpps.length > 0
    ? Math.round(allOpps.reduce((s, o) => s + o.roi, 0) / allOpps.length)
    : 0;

  return (
    <AdminShell
      title="Opportunity Engine"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Opportunities",   value: allOpps.length },
          { label: "Total Value",     value: `$${Math.round(totalValue / 1000)}K` },
          { label: "Commission Est.", value: `$${Math.round(totalCommission / 1000)}K` },
          { label: "Avg ROI",         value: `${avgROI}×` },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-2xl text-cream leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Decision support for #1 opportunity */}
      {topOpps[0] && (
        <section className="mb-8">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            Top Opportunity
          </h2>
          <DecisionSupportCard opportunity={topOpps[0]} />
        </section>
      )}

      {/* Spotlight row */}
      {(fastest || largest || highest) && (
        <section className="mb-8">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            Spotlight
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fastest && (
              <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.01] p-3">
                <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-emerald-400/60 mb-2">Fastest Win</p>
                <OpportunityCard opportunity={fastest} />
              </div>
            )}
            {largest && (
              <div className="rounded-xl border border-gold-400/10 bg-gold-400/[0.01] p-3">
                <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/60 mb-2">Largest Pipeline</p>
                <OpportunityCard opportunity={largest} />
              </div>
            )}
            {highest && highest.id !== topOpps[0]?.id && (
              <div className="rounded-xl border border-blue-400/10 bg-blue-400/[0.01] p-3">
                <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-blue-400/60 mb-2">Highest Confidence</p>
                <OpportunityCard opportunity={highest} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full ranked list (top 5 by ROI) */}
      {byROI.length > 1 && (
        <section className="mb-8">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            Ranked by ROI
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {byROI.slice(0, 6).map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Risk register */}
      {risks.length > 0 && (
        <section>
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            Risk Register
          </h2>
          <div className="space-y-2">
            {risks.slice(0, 8).map((risk, i) => (
              <RiskCard key={risk.id} risk={risk} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {allOpps.length === 0 && (
        <div className="rounded-xl border border-white/[0.05] p-8 text-center">
          <p className="text-[10px] text-slate-700">No opportunities detected. Connect Supabase to populate signal data.</p>
        </div>
      )}
    </AdminShell>
  );
}
