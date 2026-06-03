import Image from "next/image";
import { Phone, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ammTokens } from "./tokens";
import { AiAssistBadge } from "./ai-assist-badge";

const AGENT_PHONE = process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337";
const PHONE_DISPLAY = AGENT_PHONE.replace(/^\+1/, "").replace(
  /(\d{3})(\d{3})(\d{4})/,
  "($1) $2-$3"
);
const LICENSE = process.env.NEXT_PUBLIC_AGENT_LICENSE;

interface MikeTrustCardProps {
  className?: string;
  /** Hide the AI badge if the surrounding layout already shows it. */
  showAiBadge?: boolean;
}

/**
 * MikeTrustCard — primary trust anchor on /value. Mike's real headshot, name,
 * credentials, phone CTA, and the AI-assist badge. This is the surface that
 * tells visitors a licensed human is on the other end.
 */
export function MikeTrustCard({
  className,
  showAiBadge = true,
}: MikeTrustCardProps) {
  return (
    <aside
      data-testid="mike-trust-card"
      className={cn(ammTokens.trustCard, "p-5 sm:p-6", className)}
      aria-label="About Mike Eatmon, Our Town Properties"
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border border-gold-400/22 bg-[#0B0E14]">
          <Image
            src="/images/ask-magic-mike/mike-eatmon-headshot.png"
            alt="Mike Eatmon, broker at Our Town Properties"
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover object-top"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85 mb-1">
            Your local expert
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F7F1E8] leading-tight">
            Mike Eatmon
          </h2>
          <p className="text-[13px] text-slate-300 mt-0.5">
            Our Town Properties, Inc.
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            Selling real estate since 1993
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-[12.5px] text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400/85 shrink-0" />
          <span>
            Licensed in North Carolina
            {LICENSE ? <span className="text-slate-500"> · Lic. #{LICENSE}</span> : null}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-gold-400/85 shrink-0" />
          <span>Wilson, NC · Eastern North Carolina</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-gold-400/85 shrink-0" />
          <a
            href={`tel:${AGENT_PHONE}`}
            className="text-[#F7F1E8] hover:text-gold-300 transition-colors"
          >
            {PHONE_DISPLAY}
          </a>
        </div>
      </div>

      {showAiBadge && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <AiAssistBadge />
        </div>
      )}
    </aside>
  );
}
