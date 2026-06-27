"use client";

import Image from "next/image";
import { Phone, Clock, ExternalLink, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";
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
      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/[0.09] px-3.5 py-1.5"
        style={{ boxShadow: "0 0 20px rgba(212,160,23,0.12), inset 0 1px 0 rgba(212,160,23,0.10)" }}
      >
        <CheckCircle className="h-3.5 w-3.5 text-gold-400" />
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300">
          Your request is in
        </p>
      </div>

      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-cream leading-snug mb-3">
        {firstName ? `Thanks, ${firstName}.` : "Thanks for reaching out."}
      </h2>
      <p className="text-slate-300 text-base mb-1.5 max-w-md leading-relaxed">
        Mike Eatmon or the Our Town Properties team will follow up with local
        guidance based on what you shared.
      </p>
      <p className="text-slate-300 text-sm max-w-sm mb-7 leading-relaxed">
        {message.sub}
      </p>

      {/* What happens now */}
      <div
        data-testid="confirmation-next-steps"
        className="w-full max-w-sm mb-6 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 text-left"
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-label text-slate-500 mb-3">
          What happens now
        </p>
        <ol className="space-y-2.5">
          {[
            "Mike receives your full request and contact info",
            "He reviews it personally — not an auto-responder",
            "Watch your phone or email for follow-up from Our Town Properties",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-400 leading-snug">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-[9px] font-bold text-gold-400/80 mt-px">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Assigned-to card */}
      <div
        data-testid="confirmation-assignment-card"
        className={cn(
          "w-full max-w-sm rounded-2xl border border-gold-400/[0.14] bg-[#0D0B07]/90",
          "p-4 mb-6 text-left",
          "shadow-[0_20px_50px_-28px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(212,160,23,0.07)]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-gold-400/25 bg-[#0B0E14]">
            <Image
              src={brandPackAssets.mike.avatar256}
              alt={`${agentName} headshot`}
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-label uppercase text-gold-300 mb-0.5 font-semibold">
              Your local contact
            </p>
            <p className="text-base font-semibold text-cream leading-tight">
              {agentName}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              Our Town Properties · Wilson, NC
            </p>
          </div>
        </div>

        <div className="h-px bg-white/[0.06] my-3.5" />

        <div className="flex items-center gap-2.5">
          <Clock className="h-3.5 w-3.5 text-gold-300 shrink-0" />
          <p className="text-sm text-cream/90">{message.eta}</p>
        </div>

        {score && (
          <>
            <div className="h-px bg-white/[0.06] my-3.5" />
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-300">Priority:</p>
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
          "hover:bg-gold-300 active:scale-[0.99] transition-all duration-200 motion-reduce:transition-none"
        )}
      >
        <Phone className="h-4 w-4" />
        Call Mike
      </a>

      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-gold-300 transition-colors"
      >
        Visit Our Town Properties
        <ExternalLink className="h-3 w-3" />
      </a>

      <p className="mt-4 text-xs text-slate-400 max-w-xs">
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
