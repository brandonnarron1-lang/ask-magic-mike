import { cn } from "@/lib/utils/cn";

interface MagicMikeAnswerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Hide the smoke wash, e.g. for compliance disclosure follow-up text. */
  bare?: boolean;
}

/**
 * MagicMikeAnswerReveal — CSS-only gold smoke glow that frames a piece of
 * answer text inside a card. No image asset, no baked text — the smoke
 * comes from a radial gradient, the answer copy stays live HTML so it
 * remains crawlable, accessible, and translatable.
 *
 * `motion-safe:` gates the entrance fade-up so reduced-motion users see a
 * still card.
 */
export function MagicMikeAnswerReveal({
  children,
  className,
  bare = false,
}: MagicMikeAnswerRevealProps) {
  return (
    <div
      data-testid="amm-answer-reveal"
      className={cn(
        "relative rounded-2xl border border-gold-400/35 bg-[#0B0B0B]/95 p-4 sm:p-5",
        "shadow-[0_24px_60px_-30px_rgba(212,175,55,0.45)]",
        "motion-safe:animate-fade-up",
        className
      )}
    >
      {!bare && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,215,110,0.18) 0%, rgba(212,175,55,0.10) 35%, transparent 70%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
