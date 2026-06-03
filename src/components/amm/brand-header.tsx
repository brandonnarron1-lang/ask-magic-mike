import Image from "next/image";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const AGENT_PHONE = process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337";
const PHONE_DISPLAY = AGENT_PHONE.replace(/^\+1/, "").replace(
  /(\d{3})(\d{3})(\d{4})/,
  "($1) $2-$3"
);

interface BrandHeaderProps {
  className?: string;
  /** Compact variant for /ask intake shell. */
  compact?: boolean;
}

/**
 * BrandHeader — Our Town wordmark + "Ask Magic Mike by Our Town Properties"
 * + tap-to-call phone. Replaces the lamp-forward lockup. Authoritative on
 * desktop; collapses cleanly on mobile.
 */
export function BrandHeader({ className, compact = false }: BrandHeaderProps) {
  return (
    <nav
      className={cn(
        "relative z-10 flex items-center justify-between gap-4",
        compact ? "px-5 sm:px-6 py-3" : "px-6 py-5 max-w-6xl mx-auto w-full",
        className
      )}
      aria-label="Ask Magic Mike header"
    >
      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 group"
        aria-label="Our Town Properties"
      >
        <Image
          src="/images/ask-magic-mike/our-town-properties-logo.png"
          alt="Our Town Properties, Inc."
          width={compact ? 96 : 124}
          height={compact ? 50 : 65}
          priority={!compact}
          className="h-auto w-auto rounded-sm"
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
          <span
            className={cn(
              "block text-[10px] uppercase tracking-[0.18em] text-gold-300/80 mt-0.5"
            )}
          >
            by Our Town Properties
          </span>
        </span>
      </a>

      <a
        href={`tel:${AGENT_PHONE}`}
        className={cn(
          "inline-flex items-center gap-2 transition-colors",
          compact
            ? "text-[12px] text-slate-400 hover:text-gold-400"
            : "rounded-full border border-white/12 bg-white/[0.03] px-3.5 py-1.5 text-[12.5px] text-[#F7F1E8] hover:border-gold-400/45 hover:text-gold-300"
        )}
      >
        <Phone className="h-3.5 w-3.5" />
        <span className="hidden xs:inline">{PHONE_DISPLAY}</span>
        <span className="xs:hidden">Call Mike</span>
      </a>
    </nav>
  );
}
