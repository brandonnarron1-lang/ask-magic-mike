"use client";

// ConfidenceBadge — visual confidence level chip
// ReasonCard — insight reason / supporting context card

// ---------------------------------------------------------------------------
// ConfidenceBadge
// ---------------------------------------------------------------------------

interface ConfidenceBadgeProps {
  confidence: number;   // 0–100
  size?: "sm" | "md";
  className?: string;
}

export function ConfidenceBadge({ confidence, size = "md", className = "" }: ConfidenceBadgeProps) {
  const color =
    confidence >= 85 ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/[0.05]" :
    confidence >= 70 ? "text-gold-300   border-gold-300/20   bg-gold-300/[0.05]"   :
    confidence >= 50 ? "text-amber-400  border-amber-400/20  bg-amber-400/[0.05]"  :
                       "text-ruby-400   border-ruby-400/20   bg-ruby-400/[0.05]";

  const label =
    confidence >= 85 ? "High"   :
    confidence >= 70 ? "Good"   :
    confidence >= 50 ? "Fair"   : "Low";

  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-bold uppercase",
        textSize,
        color,
        className,
      ].join(" ")}
      aria-label={`Confidence: ${confidence}% (${label})`}
    >
      {confidence}%
      <span className="opacity-60">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// ReasonCard — "Why?" contextual explanation block
// ---------------------------------------------------------------------------

interface ReasonCardProps {
  reason:    string;
  className?: string;
}

export function ReasonCard({ reason, className = "" }: ReasonCardProps) {
  return (
    <div
      className={[
        "rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3",
        className,
      ].join(" ")}
    >
      <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-1">
        Why
      </p>
      <p className="text-xs text-slate-400 leading-relaxed">{reason}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImpactBadge — expected impact chip
// ---------------------------------------------------------------------------

interface ImpactBadgeProps {
  urgency: "critical" | "high" | "medium" | "low";
  label?:  string;
}

export function ImpactBadge({ urgency, label }: ImpactBadgeProps) {
  const styles = {
    critical: "text-ruby-400   border-ruby-400/20   bg-ruby-400/[0.04]",
    high:     "text-gold-300   border-gold-300/20   bg-gold-300/[0.04]",
    medium:   "text-amber-400  border-amber-400/20  bg-amber-400/[0.04]",
    low:      "text-slate-500  border-white/[0.07]  bg-white/[0.01]",
  };

  const defaultLabels = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase",
        styles[urgency],
      ].join(" ")}
    >
      {urgency === "critical" && (
        <span className="h-1 w-1 rounded-full bg-ruby-400 motion-safe:animate-pulse" aria-hidden="true" />
      )}
      {label ?? defaultLabels[urgency]}
    </span>
  );
}
