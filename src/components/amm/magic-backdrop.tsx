import { cn } from "@/lib/utils/cn";

interface MagicBackdropProps {
  variant?: "hero" | "card";
  className?: string;
}

/**
 * Atmospheric background layer behind /value and /ask.
 *
 * Restrained: a single warm gold radial glow off the top-left and a deep
 * navy fade off the bottom. The earlier cyan accent and sparkle field have
 * been removed from the hero — they were over-indexing on "magic" and
 * underweighting the brokerage trust hierarchy.
 */
export function MagicBackdrop({
  variant = "hero",
  className,
}: MagicBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none", className)}
    >
      {/* Hairline gold rule across the top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/55 to-transparent" />

      {/* Warm gold ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "hero"
              ? "radial-gradient(ellipse 65% 45% at 15% 12%, rgba(212,160,23,0.085) 0%, transparent 70%)"
              : "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.065) 0%, transparent 75%)",
        }}
      />

      {/* Deep navy fade on the bottom edge */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#05070A] to-transparent" />
    </div>
  );
}
