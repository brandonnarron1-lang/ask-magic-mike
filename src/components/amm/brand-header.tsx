import Image from "next/image";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { motion } from "./motion";

const AGENT_PHONE = process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337";
const PHONE_DISPLAY = AGENT_PHONE.replace(/^\+1/, "").replace(
  /(\d{3})(\d{3})(\d{4})/,
  "($1) $2-$3"
);

interface BrandHeaderProps {
  className?: string;
  /** Compact variant for /ask intake shell and /embed/ask. */
  compact?: boolean;
}

/**
 * BrandHeader — Our Town wordmark + "Ask Magic Mike by Our Town Properties"
 * + tap-to-call phone. Authoritative on desktop, collapses cleanly on
 * mobile. Now prefers the WebP logo with a small fallback chip.
 */
export function BrandHeader({ className, compact = false }: BrandHeaderProps) {
  return (
    <nav
      className={cn(
        "relative z-10 flex items-center justify-between gap-3 sm:gap-4",
        compact ? "px-4 sm:px-6 py-3" : "px-5 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto w-full",
        className
      )}
      aria-label="Ask Magic Mike header"
    >
      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn("flex items-center gap-3 group", motion.focusGold, "rounded-md")}
        aria-label="Our Town Properties"
      >
        <Image
          src="/images/ask-magic-mike/our-town-properties-logo.webp"
          alt="Our Town Properties, Inc."
          width={compact ? 92 : 124}
          height={compact ? 48 : 65}
          priority={!compact}
          sizes={compact ? "92px" : "(max-width: 640px) 96px, 124px"}
          className="h-auto w-auto rounded-sm shrink-0"
        />
        <span className="hidden sm:block">
          <span
            className={cn(
              "block font-display font-semibold tracking-tight text-[#F7F1E8]",
              compact ? "text-[13px]" : "text-[14px]"
            )}
          >
            Ask Magic Mike
          </span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-gold-300/80 mt-0.5">
            by Our Town Properties
          </span>
        </span>
      </a>

      <a
        href={`tel:${AGENT_PHONE}`}
        aria-label={`Call Mike at ${PHONE_DISPLAY}`}
        className={cn(
          "shrink-0 inline-flex items-center gap-2 transition-colors",
          motion.focusGold,
          compact
            ? "rounded-md px-1 py-1 text-[12.5px] text-[#F7F1E8] hover:text-gold-300"
            : "rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-[#F7F1E8] hover:border-gold-400/45 hover:text-gold-300"
        )}
      >
        <Phone className="h-3.5 w-3.5" />
        <span className="hidden xs:inline">{PHONE_DISPLAY}</span>
        <span className="xs:hidden">Call Mike</span>
      </a>
    </nav>
  );
}
