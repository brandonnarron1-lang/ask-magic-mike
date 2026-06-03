"use client";

import { CheckCircle, Phone, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
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

const TEMPERATURE_MESSAGES: Record<Temperature, { headline: string; sub: string; eta: string }> = {
  urgent: {
    headline: "Mike is being notified right now.",
    sub: "You're a high-priority connection. Expect a call or text within minutes.",
    eta: "Typically responds in < 5 minutes",
  },
  hot: {
    headline: "Mike will reach out very soon.",
    sub: "Your request has been flagged as a priority. Mike will be in touch shortly.",
    eta: "Typically responds within 15 minutes",
  },
  warm: {
    headline: "Mike will be in touch today.",
    sub: "Your info has been sent to Mike at Our Town Properties.",
    eta: "Typically responds within a few hours",
  },
  nurture: {
    headline: "You're on Mike's radar.",
    sub: "Mike will follow up when the timing is right for you.",
    eta: "Typically responds within 1 business day",
  },
  low: {
    headline: "Got it — we'll keep you posted.",
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
    <div data-testid="confirmation-panel" className="pt-6 pb-4 flex flex-col items-center text-center">
      {/* Animated check */}
      <div className="mb-5 relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gold-400/10 border border-gold-400/30 animate-pulse" />
        <CheckCircle className="relative h-8 w-8 text-gold-400" />
      </div>

      {/* Headline */}
      <h2 className="font-display text-3xl font-semibold text-cream mb-2">
        {firstName ? `Thanks, ${firstName}!` : "You're all set!"}
      </h2>

      <p className="text-slate-300 text-base mb-1.5">{message.headline}</p>
      <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">{message.sub}</p>

      {/* ETA card */}
      <div className={cn(
        "w-full max-w-sm rounded-xl border border-gold-400/20 bg-white/[0.03]",
        "p-4 space-y-3.5 mb-6 text-left"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400/10">
            <Phone className="h-3.5 w-3.5 text-gold-400/70" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Assigned to</p>
            <p className="text-sm font-semibold text-cream">{agentName}</p>
            <p className="text-xs text-slate-500">Our Town Properties · Wilson, NC</p>
          </div>
        </div>

        <div className="h-px bg-white/[0.05]" />

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400/10">
            <Clock className="h-3.5 w-3.5 text-gold-400/70" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Response time</p>
            <p className="text-sm text-cream">{message.eta}</p>
          </div>
        </div>

        {score && (
          <>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center gap-2 pl-1">
              <p className="text-xs text-slate-600">Priority:</p>
              <Badge variant={temperature}>{temperature.charAt(0).toUpperCase() + temperature.slice(1)}</Badge>
            </div>
          </>
        )}
      </div>

      {/* Return link */}
      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 text-xs text-gold-400/60 hover:text-gold-400 transition-colors underline underline-offset-2"
      >
        Visit ourtownproperties.com
      </a>

      <p className="text-[11px] text-slate-700 max-w-xs">
        You can close this window. Mike has your info and will reach out directly.
      </p>

      <p
        data-testid="confirmation-disclosure"
        className="mt-6 max-w-sm text-[10px] leading-relaxed text-slate-700"
      >
        Mike Eatmon or a member of the Our Town Properties team will follow up
        with local guidance based on the information provided. Any home value
        range shared is preliminary and is not an appraisal. No agency
        relationship is created unless a written brokerage agreement is signed.
      </p>
    </div>
  );
}
