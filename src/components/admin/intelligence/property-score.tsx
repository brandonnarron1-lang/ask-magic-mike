"use client";

import { ConfidenceBadge, ImpactBadge } from "./confidence-badge";
import type { PropertyIntelligence } from "@/lib/intelligence/types";

// ---------------------------------------------------------------------------
// PropertyScore — interest ring + velocity indicator
// ---------------------------------------------------------------------------

interface PropertyScoreProps {
  intelligence: PropertyIntelligence;
  size?:        "sm" | "md";
}

export function PropertyScore({ intelligence: p, size = "md" }: PropertyScoreProps) {
  const dim    = size === "sm" ? 64 : 80;
  const r      = size === "sm" ? 24 : 30;
  const stroke = size === "sm" ? 4  : 5;
  const circumference = 2 * Math.PI * r;
  const pct    = p.interestScore / 100;
  const offset = circumference * (1 - pct);

  const color =
    p.interestScore >= 75 ? "#4ade80" :   // emerald
    p.interestScore >= 50 ? "#c8a85a" :   // gold
    p.interestScore >= 25 ? "#f59e0b" :   // amber
                            "#e57068";    // ruby

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
        <svg
          width={dim}
          height={dim}
          aria-label={`Property interest score: ${p.interestScore}/100`}
          role="img"
        >
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke}
          />
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bebas text-lg leading-none" style={{ color }}>{p.interestScore}</span>
          <span className="text-[7px] text-slate-600 uppercase tracking-wider">Interest</span>
        </div>
      </div>

      <div>
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500 mb-0.5">
          Market Velocity
        </p>
        <VelocityBadge velocity={p.marketVelocity} />
        <p className="text-[9px] text-slate-600 mt-0.5">
          Trend: <span className={p.activityTrend === "rising" ? "text-emerald-400" : p.activityTrend === "declining" ? "text-ruby-400" : "text-slate-400"}>
            {p.activityTrend}
          </span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PropertyInterestCard — full property intelligence card
// ---------------------------------------------------------------------------

interface PropertyInterestCardProps {
  intelligence: PropertyIntelligence;
  className?:   string;
}

export function PropertyInterestCard({ intelligence: p, className = "" }: PropertyInterestCardProps) {
  const urgency: "critical" | "high" | "medium" | "low" =
    p.interestScore >= 75 ? "high" : p.interestScore >= 50 ? "medium" : "low";

  return (
    <article
      className={[
        "rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-3",
        className,
      ].join(" ")}
      aria-label={`Property: ${p.address}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500 mb-0.5">Property</p>
          <h3 className="text-sm font-semibold text-cream leading-snug">{p.address}</h3>
        </div>
        <ImpactBadge urgency={urgency} />
      </div>

      <PropertyScore intelligence={p} size="sm" />

      {/* Metric row */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Valuation Req.", value: p.valuationRequestCount },
          { label: "Conversations",  value: p.conversationCount    },
          { label: "Appt Requests",  value: p.appointmentRequestCount },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-2 text-center">
            <p className="font-bebas text-lg leading-none text-cream">{m.value}</p>
            <p className="text-[8px] text-slate-600 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Predictions */}
      <div className="space-y-1">
        <PredictionBar label="Listing Prob." value={p.predictedListingProbability} />
        <PredictionBar label="Closing Prob." value={p.predictedClosingProbability} />
        <PredictionBar label="Mktg Opp."    value={p.predictedMarketingOpportunity} />
      </div>

      <ConfidenceBadge confidence={p.confidence} size="sm" />

      {p.signals.length > 0 && (
        <div className="pt-2 border-t border-white/[0.04]">
          <p className="text-[9px] text-slate-600">
            {p.signals.slice(0, 2).join(" · ")}
          </p>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// NeighborhoodHeat — lead concentration visualization
// ---------------------------------------------------------------------------

interface NeighborhoodHeatProps {
  counts:    Record<string, number>;
  topArea:   string;
  className?: string;
}

export function NeighborhoodHeat({ counts, topArea, className = "" }: NeighborhoodHeatProps) {
  const total   = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className={["space-y-2", className].join(" ")}>
      <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500">
        Neighborhood Lead Distribution
      </p>
      {entries.map(([area, count]) => {
        const pct   = Math.round((count / total) * 100);
        const isTop = area === topArea;
        return (
          <div key={area} className="flex items-center gap-3">
            <span className={["text-[10px] w-32 truncate", isTop ? "text-gold-300 font-semibold" : "text-slate-500"].join(" ")}>
              {area}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.04]">
              <div
                className={["h-full rounded-full transition-all", isTop ? "bg-gold-400" : "bg-slate-600"].join(" ")}
                style={{ width: `${pct}%` }}
                aria-label={`${area}: ${pct}%`}
              />
            </div>
            <span className="text-[9px] text-slate-600 tabular-nums w-8 text-right">{count}</span>
          </div>
        );
      })}
      {total === 0 && (
        <p className="text-[10px] text-slate-700">No geographic data yet. Connect Supabase to populate.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function VelocityBadge({ velocity }: { velocity: PropertyIntelligence["marketVelocity"] }) {
  const styles = {
    fast:    "text-emerald-400 border-emerald-400/20",
    normal:  "text-gold-300   border-gold-300/20",
    slow:    "text-amber-400  border-amber-400/20",
    stalled: "text-ruby-400   border-ruby-400/20",
  };
  return (
    <span className={["inline-flex text-[9px] font-bold uppercase border rounded-full px-1.5 py-0.5", styles[velocity]].join(" ")}>
      {velocity}
    </span>
  );
}

function PredictionBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-emerald-500" :
    value >= 45 ? "bg-gold-400"    :
    value >= 25 ? "bg-amber-500"   : "bg-slate-600";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-600 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.04]">
        <div className={["h-full rounded-full", color].join(" ")} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[9px] text-slate-600 tabular-nums w-7 text-right">{value}%</span>
    </div>
  );
}
