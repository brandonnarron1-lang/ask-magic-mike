import { cn } from "@/lib/utils/cn";

interface ComplianceFooterProps {
  variant?: "inline" | "footer";
  className?: string;
  /** Set test id for assertions. Defaults to "amm-compliance". */
  testId?: string;
}

/**
 * Single source of compliance microcopy used on /value, /ask, and confirmation.
 *
 * Intentionally short and readable. Do NOT expand into a legal wall — the goal
 * is visible-but-not-dominant.
 */
export function ComplianceFooter({
  variant = "inline",
  className,
  testId = "amm-compliance",
}: ComplianceFooterProps) {
  return (
    <p
      data-testid={testId}
      className={cn(
        variant === "footer"
          ? "max-w-2xl mx-auto text-center text-[10px] leading-relaxed text-slate-600"
          : "max-w-lg text-[11px] leading-relaxed text-slate-500",
        className
      )}
    >
      Ask Magic Mike by Our Town Properties, Inc. provides local guidance and a
      preliminary home value range. This is not an appraisal and does not
      create an agency relationship unless a written brokerage agreement is
      signed. Mike Eatmon or a member of the Our Town Properties team may
      follow up.
    </p>
  );
}
