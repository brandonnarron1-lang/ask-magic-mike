import { cn } from "@/lib/utils/cn";

interface MagicBackdropProps {
  variant?: "hero" | "card";
  className?: string;
}

/**
 * Atmospheric background layer behind /value and /ask.
 *
 * Hero variant: rich multi-stop gold ambient with a warm-to-dark sweep.
 * Card variant: soft centered glow — subtle enough for elevated surfaces.
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

      {variant === "hero" ? (
        <>
          {/* Primary gold bloom — upper-left, high intensity anchor */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 52% at 14% 10%, rgba(212,160,23,0.14) 0%, rgba(212,160,23,0.05) 50%, transparent 72%)",
            }}
          />
          {/* Secondary gold wash — right-centre, gives horizon depth */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 38% at 78% 30%, rgba(212,160,23,0.07) 0%, rgba(212,160,23,0.02) 45%, transparent 68%)",
            }}
          />
          {/* Warm amber centre fill — prevents the void from going cold */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 85% 45% at 50% 42%, rgba(212,160,23,0.042) 0%, transparent 65%)",
            }}
          />
        </>
      ) : (
        /* Card variant — single centred glow, kept restrained */
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.065) 0%, transparent 75%)",
          }}
        />
      )}

      {/* Deep navy fade on the bottom edge — both variants */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#05070A] to-transparent" />
    </div>
  );
}
