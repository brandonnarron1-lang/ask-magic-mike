import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  scorePropertyIntelligence,
  derivePropertySignalsFromBrokerage,
  rankPropertiesByOpportunity,
  identifyHotProperties,
} from "@/lib/intelligence/property-intelligence";
import { PropertyInterestCard, NeighborhoodHeat } from "@/components/admin/intelligence/property-score";

export default async function PropertyIntelligencePage() {
  const signals     = await loadIntelligenceSignals();
  const propSigs    = derivePropertySignalsFromBrokerage(signals).map(scorePropertyIntelligence);
  const ranked      = rankPropertiesByOpportunity(propSigs);
  const hot         = identifyHotProperties(propSigs, 60);

  return (
    <AdminShell
      title="Property Intelligence"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Key property metrics */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Properties Tracked",   value: signals.totalProperties       },
          { label: "Valuation Requests",   value: signals.valuationRequestsInWindow },
          { label: "Property Views",        value: signals.propertyViewsInWindow  },
          { label: "Hot Properties",        value: hot.length                     },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-2xl text-cream leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Neighborhood heat */}
      <section className="mb-8">
        <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
          Geographic Distribution
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
          <NeighborhoodHeat
            counts={signals.neighborhoodLeadCounts}
            topArea={signals.topNeighborhood}
          />
          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <p className="text-[9px] text-slate-600">
              Top neighborhood: <span className="text-gold-300">{signals.topNeighborhood || "—"}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Hot properties */}
      {hot.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-gold-400 motion-safe:animate-pulse" aria-hidden="true" />
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/70">
              Hot Properties (score ≥ 60)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hot.slice(0, 6).map((p) => (
              <PropertyInterestCard key={p.address} intelligence={p} />
            ))}
          </div>
        </section>
      )}

      {/* Full ranked list */}
      {ranked.length > 0 && (
        <section>
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            All Properties — Ranked by Opportunity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ranked.slice(0, 12).map((p) => (
              <PropertyInterestCard key={p.address} intelligence={p} />
            ))}
          </div>
        </section>
      )}

      {ranked.length === 0 && (
        <div className="rounded-xl border border-white/[0.05] p-8 text-center">
          <p className="text-[10px] text-slate-700">
            No property signals available. Connect Supabase and add properties to generate intelligence.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
