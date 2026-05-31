import { cn } from "@/lib/utils/cn";

interface DisclaimerBannerProps {
  className?: string;
  compact?: boolean;
}

export function DisclaimerBanner({
  className,
  compact = false,
}: DisclaimerBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gold-400/10 bg-white/[0.02] p-4 text-slate-400",
        compact ? "text-xs" : "text-xs",
        className
      )}
    >
      <p className="font-semibold text-slate-300 mb-1">Estimate Disclaimer</p>
      <p className="leading-relaxed">
        This Automated Valuation Model (AVM) estimate is for informational
        purposes only. It is not an appraisal, a Comparative Market Analysis
        (CMA), or a guarantee of value. Final market value depends on condition,
        upgrades, current competition, buyer demand, and a licensed real estate
        professional&apos;s review.{" "}
        <span className="text-gold-400/70">
          Contact Mike Eatmon at Our Town Properties for a professional,
          no-obligation evaluation.
        </span>
      </p>
    </div>
  );
}
