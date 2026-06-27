"use client";

import { ConfidenceBadge, ImpactBadge } from "./confidence-badge";
import type { ExecutiveInsight as ExecutiveInsightType, BriefingPacket } from "@/lib/intelligence/types";
import { INSIGHT_TYPE_LABELS, INSIGHT_TYPE_COLORS } from "@/lib/intelligence/executive-intelligence";

// ---------------------------------------------------------------------------
// ExecutiveInsight — headline insight card
// ---------------------------------------------------------------------------

interface ExecutiveInsightProps {
  insight:   ExecutiveInsightType;
  featured?: boolean;
  className?: string;
}

export function ExecutiveInsight({ insight: i, featured = false, className = "" }: ExecutiveInsightProps) {
  const typeColor = INSIGHT_TYPE_COLORS[i.type];

  return (
    <article
      className={[
        "rounded-xl border overflow-hidden transition-colors",
        featured
          ? "border-gold-400/15 bg-white/[0.02]"
          : "border-white/[0.06] bg-white/[0.01] hover:border-white/[0.1]",
        className,
      ].join(" ")}
      aria-label={`Insight: ${i.headline}`}
    >
      {featured && (
        <div className="h-px bg-gradient-to-r from-gold-400/40 via-gold-300/20 to-transparent" aria-hidden="true" />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={["text-[9px] tracking-[0.18em] font-semibold uppercase", typeColor].join(" ")}>
            {INSIGHT_TYPE_LABELS[i.type]}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <ImpactBadge urgency={i.urgency} />
            <ConfidenceBadge confidence={i.confidence} size="sm" />
          </div>
        </div>

        <h3 className={["font-display leading-snug mb-2", featured ? "text-base font-semibold text-cream" : "text-sm font-semibold text-cream"].join(" ")}>
          {i.headline}
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">{i.narrative}</p>

        {/* Supporting metrics */}
        {Object.keys(i.supportingMetrics).length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {Object.entries(i.supportingMetrics).slice(0, 4).map(([key, val]) => (
              <div key={key} className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-2.5 py-1.5">
                <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{key.replace(/_/g, " ")}</p>
                <p className="font-bebas text-sm text-cream leading-none">{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reason */}
        <div className="mb-3">
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-0.5">Why</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">{i.reason}</p>
        </div>

        {/* Action + ROI */}
        <div className="pt-2.5 border-t border-white/[0.05] flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-[9px] tracking-[0.18em] uppercase text-slate-600 mb-0.5">Recommended Action</p>
            <p className="text-[10px] text-gold-300/80 leading-relaxed">{i.recommendedAction}</p>
          </div>
          {i.estimatedROI !== null && (
            <div className="shrink-0 text-right">
              <p className="text-[8px] text-slate-700 uppercase mb-0.5">Est. Value</p>
              <p className="text-xs font-bebas text-emerald-400">${Math.round(i.estimatedROI).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// RecommendationEvidence — full evidence breakdown
// ---------------------------------------------------------------------------

interface RecommendationEvidenceProps {
  insight:    ExecutiveInsightType;
  className?: string;
}

export function RecommendationEvidence({ insight: i, className = "" }: RecommendationEvidenceProps) {
  return (
    <div className={["rounded-xl border border-white/[0.07] bg-white/[0.015] p-5 space-y-4", className].join(" ")}>
      <div>
        <p className={["text-[9px] tracking-[0.18em] font-semibold uppercase mb-1", INSIGHT_TYPE_COLORS[i.type]].join(" ")}>
          {INSIGHT_TYPE_LABELS[i.type]}
        </p>
        <h3 className="font-display text-lg font-semibold text-cream leading-snug">{i.headline}</h3>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">{i.narrative}</p>

      {/* Full metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(i.supportingMetrics).map(([key, val]) => (
          <div key={key} className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">
              {key.replace(/_/g, " ")}
            </p>
            <p className="font-bebas text-lg text-cream leading-none">{val}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-1">Reason</p>
        <p className="text-xs text-slate-400 leading-relaxed">{i.reason}</p>
      </div>

      <div className="p-3.5 rounded-xl border border-gold-400/10 bg-gold-400/[0.02]">
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/60 mb-1">Impact</p>
        <p className="text-xs text-slate-300 leading-relaxed">{i.expectedImpact}</p>
        {i.estimatedROI !== null && (
          <p className="text-xs font-bebas text-emerald-400 mt-1.5">
            Estimated value: ${Math.round(i.estimatedROI).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <ConfidenceBadge confidence={i.confidence} />
        <ImpactBadge urgency={i.urgency} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BriefingSummary — health overview
// ---------------------------------------------------------------------------

interface BriefingSummaryProps {
  packet:    BriefingPacket;
  className?: string;
}

export function BriefingSummary({ packet: p, className = "" }: BriefingSummaryProps) {
  const healthColor =
    p.overallHealth === "excellent" ? "text-emerald-400" :
    p.overallHealth === "good"      ? "text-gold-300"    :
    p.overallHealth === "fair"      ? "text-amber-400"   : "text-ruby-400";

  return (
    <div className={["rounded-xl border border-white/[0.06] bg-white/[0.015] p-5", className].join(" ")}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500 mb-0.5">
            Intelligence Health
          </p>
          <p className={["font-bebas text-4xl leading-none", healthColor].join(" ")}>
            {p.overallHealth.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-600">{p.insights.length} active insight{p.insights.length !== 1 ? "s" : ""}</p>
          {p.criticalCount > 0 && (
            <p className="text-[9px] text-ruby-400">{p.criticalCount} critical</p>
          )}
          {p.highCount > 0 && (
            <p className="text-[9px] text-gold-300">{p.highCount} high</p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{p.executiveSummary}</p>
    </div>
  );
}
