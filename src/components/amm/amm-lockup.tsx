import { cn } from "@/lib/utils/cn";

interface AmmLockupProps {
  size?: "sm" | "md";
  className?: string;
  showTagline?: boolean;
}

/**
 * AmmLockup — small text-first brand mark used inside intake surfaces where
 * the full `BrandHeader` (with the Our Town logo) would be too much. No lamp
 * glyph anymore: the campaign identity is Mike + Our Town, not the lamp.
 */
export function AmmLockup({
  size = "md",
  className,
  showTagline = true,
}: AmmLockupProps) {
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block rounded-full bg-gold-400 shadow-[0_0_12px_rgba(212,160,23,0.55)]",
          dotSize
        )}
      />
      <div className="leading-none">
        <div
          className={cn(
            "font-display font-semibold tracking-tight text-[#F7F1E8]",
            size === "sm" ? "text-[13px]" : "text-[15px]"
          )}
        >
          Ask Magic Mike
        </div>
        {showTagline && (
          <div
            className={cn(
              "tracking-[0.18em] uppercase text-gold-300/80 mt-0.5",
              size === "sm" ? "text-[8.5px]" : "text-[9.5px]"
            )}
          >
            by Our Town Properties
          </div>
        )}
      </div>
    </div>
  );
}
