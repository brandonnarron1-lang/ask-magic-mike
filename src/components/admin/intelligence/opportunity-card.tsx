"use client";

import { ConfidenceBadge, ImpactBadge } from "./confidence-badge";
import type { Opportunity, Risk } from "@/lib/intelligence/types";
import { OPPORTUNITY_CATEGORY_LABELS } from "@/lib/intelligence/opportunity-engine";

// ---------------------------------------------------------------------------
// OpportunityCard
// ---------------------------------------------------------------------------

interface OpportunityCardProps {
  opportunity: Opportunity;
  className?:  string;
}

export function OpportunityCard({ opportunity: o, className = "" }: OpportunityCardProps) {
  const isUrgent = o.urgency === "critical" || o.urgency === "high";

  return (
    <article
      className={[
        "relative rounded-xl border bg-white/[0.015] overflow-hidden p-4",
        isUrgent
          ? "border-gold-400/15"
          : "border-white/[0.06]",
        className,
      ].join(" ")}
      aria-label={`Opportunity: ${o.title}`}
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bebas text-2xl text-slate-700 tabular-nums leading-none">#{o.rank}</span>
          <span className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500">
            {OPPORTUNITY_CATEGORY_LABELS[o.category]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ImpactBadge urgency={o.urgency} />
          <EaseBadge ease={o.ease} />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-cream mb-1.5 leading-snug">{o.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{o.description}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <OpportunityMetric
          label="Value"
          value={`$${Math.round(o.businessValue / 1000)}K`}
          accent
        />
        <OpportunityMetric
          label="ROI"
          value={`${o.roi}×`}
        />
        <OpportunityMetric
          label="Effort"
          value={`${o.estimatedEffortHours}h`}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <ConfidenceBadge confidence={o.confidence} size="sm" />
        <span className="text-[9px] text-slate-700">
          ~${Math.round(o.expectedCommission).toLocaleString()} commission
        </span>
      </div>

      {/* Actions */}
      {o.recommendedActions.length > 0 && (
        <div className="pt-2.5 border-t border-white/[0.05]">
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-1.5">Actions</p>
          <ul className="space-y-0.5">
            {o.recommendedActions.slice(0, 2).map((action) => (
              <li key={action} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                <span className="text-gold-400/60 mt-px">→</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// DecisionSupportCard — full opportunity with all actions
// ---------------------------------------------------------------------------

interface DecisionSupportCardProps {
  opportunity: Opportunity;
}

export function DecisionSupportCard({ opportunity: o }: DecisionSupportCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5 space-y-4">
      <div>
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/60 mb-1">
          {OPPORTUNITY_CATEGORY_LABELS[o.category]}
        </p>
        <h3 className="font-display text-lg font-semibold text-cream leading-snug">{o.title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">{o.description}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
        {[
          { label: "Business Value",   value: `$${Math.round(o.businessValue).toLocaleString()}` },
          { label: "Commission Est.",  value: `$${Math.round(o.expectedCommission).toLocaleString()}` },
          { label: "Expected ROI",     value: `${o.roi}×` },
          { label: "Effort Required",  value: `${o.estimatedEffortHours}h` },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-2.5">
            <p className="text-[9px] tracking-[0.18em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-xl text-cream">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <ConfidenceBadge confidence={o.confidence} />
        <ImpactBadge urgency={o.urgency} />
        <EaseBadge ease={o.ease} />
      </div>

      <div>
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-2">Recommended Actions</p>
        <ol className="space-y-1.5">
          {o.recommendedActions.map((action, i) => (
            <li key={action} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="text-[9px] font-bebas text-slate-600 w-3.5 shrink-0 tabular-nums">{i + 1}.</span>
              {action}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RiskCard
// ---------------------------------------------------------------------------

interface RiskCardProps {
  risk:       Risk;
  rank:       number;
  className?: string;
}

export function RiskCard({ risk: r, rank, className = "" }: RiskCardProps) {
  const borderColor =
    r.severity === "critical" ? "border-ruby-400/20"  :
    r.severity === "high"     ? "border-amber-400/15" : "border-white/[0.06]";

  return (
    <div className={["rounded-xl border bg-white/[0.01] p-3.5", borderColor, className].join(" ")}>
      <div className="flex items-start gap-2.5">
        <span className="font-bebas text-xl text-slate-700 tabular-nums leading-none shrink-0">#{rank}</span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <ImpactBadge urgency={r.severity} label={r.severity} />
            <span className="text-[9px] text-slate-600">{r.category}</span>
          </div>
          <h4 className="text-xs font-semibold text-cream mb-0.5">{r.title}</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed mb-1.5">{r.description}</p>
          <p className="text-[9px] text-emerald-400/60">→ {r.mitigation}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function EaseBadge({ ease }: { ease: "easy" | "moderate" | "complex" }) {
  const styles = {
    easy:     "text-emerald-400/70 border-emerald-400/15",
    moderate: "text-amber-400/70   border-amber-400/15",
    complex:  "text-slate-500      border-white/[0.07]",
  };
  return (
    <span className={["text-[9px] font-semibold uppercase border rounded-full px-1.5 py-0.5", styles[ease]].join(" ")}>
      {ease}
    </span>
  );
}

function OpportunityMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.01] p-2 text-center">
      <p className="text-[8px] tracking-[0.18em] uppercase text-slate-600 mb-0.5">{label}</p>
      <p className={["font-bebas text-base leading-none", accent ? "text-gold-300" : "text-cream"].join(" ")}>
        {value}
      </p>
    </div>
  );
}
