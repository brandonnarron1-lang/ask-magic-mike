"use client";

import Image from "next/image";
import { Phone, Clock, ExternalLink, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import type { Temperature } from "@/types/domain.types";

interface ScoreData {
  sellerCertaintyScore: number;
  buyerCertaintyScore: number;
  compositeScore: number;
  temperature: string;
}

interface StepConfirmationProps {
  firstName?: string;
  score?: ScoreData | null;
  agentName?: string;
}

const TEMPERATURE_MESSAGES: Record<
  Temperature,
  { sub: string; eta: string }
> = {
  urgent: {
    sub: "You're a high-priority connection. Expect a call or text within minutes.",
    eta: "Typically responds in < 5 minutes",
  },
  hot: {
    sub: "Your request has been flagged as a priority. Mike will be in touch shortly.",
    eta: "Typically responds within 15 minutes",
  },
  warm: {
    sub: "Your info has been sent to Mike at Our Town Properties.",
    eta: "Typically responds within a few hours",
  },
  nurture: {
    sub: "Mike will follow up when the timing is right for you.",
    eta: "Typically responds within 1 business day",
  },
  low: {
    sub: "Mike will reach out when there's something relevant for you.",
    eta: "Typically responds within 1–2 business days",
  },
};

const AGENT_PHONE = process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337";

export function StepConfirmation({
  firstName,
  score,
  agentName = "Mike Eatmon",
}: StepConfirmationProps) {
  const temperature = (score?.temperature as Temperature) ?? "warm";
  const message = TEMPERATURE_MESSAGES[temperature];

  return (
    <div
      data-testid="confirmation-panel"
      className="pt-2 pb-1 flex flex-col items-center text-center"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/[0.08] px-3 py-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-gold-400" />
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300">
          Your request is in
        </p>
      </div>

      <h2 className="font-display text-3xl sm:text-[34px] font-semibold text-[#F7F1E8] leading-tight mb-3">
        {firstName ? `Thanks, ${firstName}.` : "Thanks for reaching out."}
      </h2>
      <p className="text-slate-300 text-base mb-1.5 max-w-md">
        Mike Eatmon or the Our Town Properties team will follow up with local
        guidance based on what you shared.
      </p>
      <p className="text-slate-500 text-[13px] max-w-sm mb-7 leading-relaxed">
        {message.sub}
      </p>

      {/* Assigned-to card */}
      <div
        data-testid="confirmation-assignment-card"
        className={cn(
          "w-full max-w-sm rounded-2xl border border-white/10 bg-[#0F131A]/95",
          "p-4 mb-6 text-left",
          "shadow-[0_20px_50px_-28px_rgba(0,0,0,0.8)]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-gold-400/25 bg-[#0B0E14]">
            <Image
              src="/images/ask-magic-mike/mike-eatmon-headshot.webp"
              alt={`${agentName} headshot`}
              fill
              sizes="56px"
              className="object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/80 mb-0.5">
              Your local contact
            </p>
            <p className="text-[15px] font-semibold text-[#F7F1E8] leading-tight">
              {agentName}
            </p>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Our Town Properties · Wilson, NC
            </p>
          </div>
        </div>

        <div className="h-px bg-white/[0.06] my-3.5" />

        <div className="flex items-center gap-2.5">
          <Clock className="h-3.5 w-3.5 text-gold-400/80 shrink-0" />
          <p className="text-[12.5px] text-slate-200">{message.eta}</p>
        </div>

        {score && (
          <>
            <div className="h-px bg-white/[0.06] my-3.5" />
            <div className="flex items-center gap-2">
              <p className="text-[12px] text-slate-500">Priority:</p>
              <Badge variant={temperature}>
                {temperature.charAt(0).toUpperCase() + temperature.slice(1)}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Primary CTA — direct phone is the only real "schedule" available */}
      <a
        href={`tel:${AGENT_PHONE}`}
        data-testid="confirmation-call-cta"
        className={cn(
          "inline-flex items-center justify-center gap-2 w-full max-w-sm",
          "rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-bold text-[#0A0A0A]",
          "shadow-[0_18px_40px_-12px_rgba(212,160,23,0.50)]",
          "hover:bg-gold-300 active:scale-[0.99] transition-all duration-200"
        )}
      >
        <Phone className="h-4 w-4" />
        Call Mike
      </a>

      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-gold-300 transition-colors"
      >
        Visit Our Town Properties
        <ExternalLink className="h-3 w-3" />
      </a>

      <p className="mt-4 text-[11px] text-slate-600 max-w-xs">
        You can close this window. Mike has your info.
      </p>

      <div className="mt-7 w-full max-w-md">
        <ComplianceFooter
          variant="footer"
          testId="confirmation-disclosure"
        />
      </div>
    </div>
  );
}
