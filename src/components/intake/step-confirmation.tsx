"use client";

import { CheckCircle, Phone, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { LampGlyph } from "@/components/amm/amm-lockup";
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
      className="pt-4 pb-2 flex flex-col items-center text-center"
    >
      {/* Lamp + checkmark */}
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
        {/* Gold halo */}
        <div
          className="absolute inset-0 rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(212,160,23,0.28) 0%, transparent 70%)",
          }}
        />
        {/* Cyan magic halo */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full opacity-70 blur-xl"
          style={{
            background:
              "radial-gradient(circle, rgba(103,232,249,0.45) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-gold-400/40 bg-midnight">
          <CheckCircle className="h-8 w-8 text-gold-400" />
        </div>
      </div>

      {/* Headline */}
      <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300/80 mb-1.5">
        Your request is in
      </p>
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-cream mb-2">
        {firstName ? `Thanks, ${firstName}.` : "You're all set."}
      </h2>
      <p className="text-slate-300 text-base mb-1.5 max-w-md">
        Mike Eatmon or the Our Town Properties team will follow up with local
        guidance based on what you shared.
      </p>
      <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
        {message.sub}
      </p>

      {/* Assignment card */}
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border border-gold-400/22 bg-white/[0.025]",
          "p-4 space-y-3.5 mb-6 text-left",
          "shadow-[0_10px_40px_-20px_rgba(212,160,23,0.35)]"
        )}
        data-testid="confirmation-assignment-card"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10">
            <LampGlyph size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              Assigned to
            </p>
            <p className="text-sm font-semibold text-cream">{agentName}</p>
            <p className="text-xs text-slate-500">
              Our Town Properties · Wilson, NC
            </p>
          </div>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10">
            <Clock className="h-4 w-4 text-gold-400/80" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              Response time
            </p>
            <p className="text-sm text-cream">{message.eta}</p>
          </div>
        </div>

        {score && (
          <>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center gap-2 pl-1">
              <p className="text-xs text-slate-500">Priority:</p>
              <Badge variant={temperature}>
                {temperature.charAt(0).toUpperCase() + temperature.slice(1)}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Primary CTA — direct phone is the only real "schedule" backed by the
          existing repo. No new scheduling integration is invented here. */}
      <a
        href={`tel:${process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337"}`}
        data-testid="confirmation-call-cta"
        className={cn(
          "inline-flex items-center justify-center gap-2 w-full max-w-sm",
          "rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-bold text-midnight",
          "shadow-[0_18px_45px_-12px_rgba(212,160,23,0.55)]",
          "hover:bg-gold-300 active:scale-[0.99] transition-all duration-200"
        )}
      >
        <Phone className="h-4 w-4" />
        Call Mike now
      </a>

      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 mb-1 text-xs text-gold-400/60 hover:text-gold-400 transition-colors underline underline-offset-2"
      >
        Visit ourtownproperties.com
      </a>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-700 max-w-xs">
        <Sparkles className="h-3 w-3 text-gold-400/55" />
        You can close this window. Mike has your info.
      </p>

      <div className="mt-6 w-full max-w-md">
        <ComplianceFooter
          variant="footer"
          testId="confirmation-disclosure"
          className="text-slate-600"
        />
      </div>
    </div>
  );
}
