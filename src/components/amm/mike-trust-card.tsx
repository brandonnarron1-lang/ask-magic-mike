import Image from "next/image";
import { Phone, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ammTokens } from "./tokens";
import { AiAssistBadge } from "./ai-assist-badge";
import { VisualFrame } from "./visual-frame";

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
  /** Compact one-line variant used at the top of /ask. */
  variant?: "default" | "compact";
}

export function MikeTrustCard({
  className,
  showAiBadge = true,
  variant = "default",
}: MikeTrustCardProps) {
  if (variant === "compact") {
    return (
      <div
        data-testid="mike-trust-card-compact"
        className={cn(
          "flex items-center gap-3 rounded-xl border border-white/10 bg-[#0F131A]/90 px-3 py-2.5",
          className
        )}
      >
        <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-gold-400/25 bg-[#0B0E14]">
          <Image
            src="/images/ask-magic-mike/mike-eatmon-headshot.webp"
            alt="Mike Eatmon"
            fill
            sizes="40px"
            className="object-cover object-top"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#F7F1E8] leading-tight truncate">
            Mike Eatmon &middot; Our Town Properties
          </p>
          <p className="text-[10.5px] text-slate-400 truncate">
            Licensed in NC &middot; Selling real estate since 1993
          </p>
        </div>
      </div>
    );
  }

  return (
    <aside
      data-testid="mike-trust-card"
      className={cn(ammTokens.trustCard, "p-5 sm:p-6", className)}
      aria-label="About Mike Eatmon, Our Town Properties"
    >
      <div className="flex flex-col gap-4">
        <VisualFrame aspect="aspect-[4/5]" className="max-w-[200px]">
          <Image
            src="/images/ask-magic-mike/mike-eatmon-headshot.webp"
            alt="Mike Eatmon, broker at Our Town Properties"
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover object-top"
            priority
          />
        </VisualFrame>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85">
              Your local expert
            </p>
            <span
              data-testid="mike-verified-badge"
              className="inline-flex items-center gap-1 rounded-full border border-gold-400/25 bg-gold-400/[0.06] px-1.5 py-0.5 text-[8.5px] tracking-[0.18em] uppercase text-gold-300"
            >
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              Verified
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-[#F7F1E8] leading-tight">
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
