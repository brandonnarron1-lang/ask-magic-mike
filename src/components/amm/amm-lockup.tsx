import { cn } from "@/lib/utils/cn";

interface AmmLockupProps {
  size?: "sm" | "md";
  className?: string;
  showTagline?: boolean;
}

/**
 * Ask Magic Mike header lockup — small lamp glyph + brand text.
 * Used in the page header strip and the intake shell so the funnel feels
 * like one connected branded experience.
 */
export function AmmLockup({
  size = "md",
  className,
  showTagline = true,
}: AmmLockupProps) {
  const lampSize = size === "sm" ? 22 : 28;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LampGlyph size={lampSize} />
      <div className="leading-none">
        <div
          className={cn(
            "font-display font-semibold text-cream",
            size === "sm" ? "text-[13px]" : "text-[15px]"
          )}
        >
          Ask Magic Mike
        </div>
        {showTagline && (
          <div
            className={cn(
              "tracking-[0.16em] uppercase text-gold-400/80 mt-0.5",
              size === "sm" ? "text-[8px]" : "text-[9px]"
            )}
          >
            by Our Town Properties
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tiny SVG genie-lamp glyph. Pure CSS/SVG; no external asset.
 * Cyan flame is the only spot of cyan we allow in the visual system.
 */
export function LampGlyph({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Flame */}
      <path
        d="M16 3.5c.6 1.6 1.8 2.5 1.8 4.1 0 1.1-.8 1.9-1.8 1.9s-1.8-.8-1.8-1.9c0-1.6 1.2-2.5 1.8-4.1Z"
        fill="#67E8F9"
        opacity="0.85"
      />
      {/* Lamp spout */}
      <path
        d="M20 17.5h4l1.6-1.5-1.6-1.5h-4"
        stroke="#D4A017"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lamp body */}
      <path
        d="M5.5 16.5c0-3 4.6-5.5 10.5-5.5s10.5 2.5 10.5 5.5-4.6 5.5-10.5 5.5S5.5 19.5 5.5 16.5Z"
        fill="#0A0A0A"
        stroke="#D4A017"
        strokeWidth="1.6"
      />
      {/* Lamp handle */}
      <path
        d="M5.5 16.5c-1.6.4-2.8 1.4-2.8 2.4s1.2 2 2.8 2.4"
        stroke="#D4A017"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Base highlight */}
      <ellipse cx="16" cy="22.5" rx="7" ry="0.7" fill="#D4A017" opacity="0.18" />
    </svg>
  );
}
