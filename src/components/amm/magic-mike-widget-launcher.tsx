"use client";

import { cn } from "@/lib/utils/cn";
import { MagicMikeAvatar, type AvatarState } from "./magic-mike-avatar";
import { motion } from "./motion";

interface MagicMikeWidgetLauncherProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  state?: AvatarState;
  /** Optional cyan AI ping when an active session is being routed. */
  active?: boolean;
  /** Visible label next to the avatar on `sm+` viewports. */
  label?: string;
  /** Side to dock against. Defaults to bottom-right. */
  side?: "right" | "left";
  /** Z-index. Defaults to 50. */
  zIndex?: number;
}

/**
 * MagicMikeWidgetLauncher — floating, accessible launcher button.
 *
 * Visual-only foundation: clicking either opens the supplied URL or invokes
 * the provided handler. No chat backend, no state machine.
 *
 * - Bottom-right docked by default.
 * - Gold rim ring around the avatar.
 * - Cyan AI pulse only when `active` (matches the brand pack rule).
 * - Respects `prefers-reduced-motion`.
 * - Carries an accessible "Ask Magic Mike" label.
 * - Mobile: collapses to avatar-only so it can never cover sticky CTAs.
 */
export function MagicMikeWidgetLauncher({
  href,
  onClick,
  className,
  state = "idle",
  active = false,
  label = "Ask Magic Mike",
  side = "right",
  zIndex = 50,
}: MagicMikeWidgetLauncherProps) {
  const commonClasses = cn(
    "fixed bottom-4 sm:bottom-6",
    side === "right" ? "right-4 sm:right-6" : "left-4 sm:left-6",
    "group inline-flex items-center gap-2.5 rounded-full border border-gold-400/45 bg-[#0B0B0B]/95 backdrop-blur-md",
    "pl-1.5 pr-2 sm:pr-4 py-1.5",
    "shadow-[0_18px_45px_-12px_rgba(212,175,55,0.45)]",
    motion.focusGold,
    motion.hoverLift,
    "transition-all duration-200",
    className
  );

  const inner = (
    <>
      <MagicMikeAvatar
        size="sm"
        state={active ? "listening" : state}
        motion="subtle"
        className="ring-2 ring-gold-400/40"
        label="Mike Eatmon, Our Town Properties"
      />
      <span className="hidden sm:inline text-[12.5px] font-semibold tracking-tight text-[#F4F4F4] pr-1">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={label}
        data-testid="amm-widget-launcher"
        className={commonClasses}
        style={{ zIndex }}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid="amm-widget-launcher"
      className={commonClasses}
      style={{ zIndex }}
    >
      {inner}
    </button>
  );
}
