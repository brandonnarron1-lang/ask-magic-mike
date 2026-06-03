import { cn } from "@/lib/utils/cn";

interface VisualFrameProps {
  /** Aspect ratio expressed as a Tailwind class, e.g. `aspect-[4/5]`. */
  aspect?: string;
  className?: string;
  /** Removes the gold inner ring; useful for small avatar thumbnails. */
  bare?: boolean;
  children: React.ReactNode;
}

/**
 * VisualFrame — fixed-aspect, gold-rimmed surface for media (headshot, logo,
 * future hero artwork). Guarantees no CLS: the parent owns the height via
 * the aspect ratio token and the child fills it.
 */
export function VisualFrame({
  aspect = "aspect-[4/5]",
  className,
  bare = false,
  children,
}: VisualFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-[#0B0E14]",
        aspect,
        !bare && "border border-gold-400/22 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.75)]",
        className
      )}
    >
      {children}
    </div>
  );
}
