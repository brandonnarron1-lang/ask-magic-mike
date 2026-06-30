import { cn } from "@/lib/utils/cn";
import { MagicBackdrop } from "./magic-backdrop";

interface BrandShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: "hero" | "card";
  /** Set false on embed/iframe surfaces to avoid the bottom navy fade. */
  withBackdrop?: boolean;
}

/**
 * BrandShell — single root for every funnel surface (`/value`, `/ask`,
 * `/embed/ask`, confirmation). Owns the base palette, the restrained
 * ambient gradient, and the global text color so child surfaces stay
 * consistent without each one re-declaring the page background.
 */
export function BrandShell({
  children,
  className,
  variant = "hero",
  withBackdrop = true,
}: BrandShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-[#080806] text-[#F7F1E8] antialiased flex flex-col",
        // Grain texture layer — fine animated film grain over the whole shell
        "grain-overlay",
        className
      )}
    >
      {withBackdrop && <MagicBackdrop variant={variant} />}

      {/* 3-layer ambient radial system */}
      {withBackdrop && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          {/* Layer 1 — Gold bloom, top-left origin (brand warmth) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 12% 8%, rgba(212,160,23,0.13) 0%, rgba(212,160,23,0.04) 45%, transparent 70%)",
            }}
          />
          {/* Layer 2 — Ruby ember, bottom-right (depth / contrast) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 40% at 92% 88%, rgba(180,28,28,0.07) 0%, rgba(180,28,28,0.02) 40%, transparent 65%)",
            }}
          />
          {/* Layer 3 — Warm amber centre-mass (keeps the body readable, not cold) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 50% at 50% 38%, rgba(212,160,23,0.045) 0%, transparent 70%)",
            }}
          />
        </div>
      )}

      {/* Content sits above backdrop layers */}
      <div className="relative flex flex-col flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
