import { cn } from "@/lib/utils/cn";

interface MagicBackdropProps {
  variant?: "hero" | "card";
  className?: string;
}

/**
 * Atmospheric background layer used behind /value and /ask.
 *
 * Layered radial gradients (gold + a touch of cyan) approximate the
 * lamp-glow look without a heavy image dependency. Sits absolutely
 * positioned inside a relative parent, pointer-events: none so it never
 * blocks form input.
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
      {/* Top gold accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      {/* Gold ambient glow — primary atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "hero"
              ? "radial-gradient(ellipse 70% 55% at 18% 18%, rgba(212,160,23,0.10) 0%, transparent 70%)"
              : "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 72%)",
        }}
      />

      {/* Cyan magical accent — subtle, reserved for the lamp */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            variant === "hero"
              ? "radial-gradient(ellipse 35% 32% at 78% 28%, rgba(103,232,249,0.06) 0%, transparent 70%)"
              : "radial-gradient(ellipse 40% 40% at 70% 100%, rgba(103,232,249,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-midnight to-transparent" />
    </div>
  );
}

/**
 * Small twinkle/sparkle field positioned absolutely. Use sparingly behind the
 * lamp glyph on the /value hero. Respects prefers-reduced-motion: the
 * animation only runs when the user has not opted out.
 */
export function Sparkles({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none", className)}
    >
      <span className="absolute top-[18%] left-[42%] h-1 w-1 rounded-full bg-gold-200/80 motion-safe:animate-pulse" />
      <span className="absolute top-[28%] left-[58%] h-[3px] w-[3px] rounded-full bg-cyan-200/70 motion-safe:animate-pulse" />
      <span className="absolute top-[52%] left-[36%] h-[2px] w-[2px] rounded-full bg-gold-300/70 motion-safe:animate-pulse" />
      <span className="absolute top-[64%] left-[64%] h-1 w-1 rounded-full bg-gold-100/70 motion-safe:animate-pulse" />
      <span className="absolute top-[44%] left-[72%] h-[2px] w-[2px] rounded-full bg-cyan-300/60 motion-safe:animate-pulse" />
    </div>
  );
}
