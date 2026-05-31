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
    <div data-testid="confirmation-panel" className="pt-8 flex flex-col items-center text-center">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/10 border border-gold-400/30">
        <CheckCircle className="h-8 w-8 text-gold-400" />
      </div>

      {/* Headline */}
      <h2 className="font-display text-3xl font-semibold text-cream mb-3">
        {firstName ? `Thanks, ${firstName}!` : "You're all set!"}
      </h2>

      <p className="text-slate-300 text-lg mb-2">{message.headline}</p>
      <p className="text-slate-400 text-sm max-w-sm mb-8">{message.sub}</p>

      {/* ETA card */}
      <div className={cn(
        "w-full max-w-sm rounded-xl border border-gold-400/20 bg-white/[0.04]",
        "p-5 space-y-4 mb-8 text-left"
      )}>
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-gold-400/70 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Assigned to</p>
            <p className="text-sm font-semibold text-cream">{agentName}</p>
            <p className="text-xs text-slate-400">Our Town Properties · Wilson, NC</p>
          </div>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-gold-400/70 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Response time</p>
            <p className="text-sm text-cream">{message.eta}</p>
          </div>
        </div>

        {score && (
          <>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">Priority:</p>
              <Badge variant={temperature}>{temperature.charAt(0).toUpperCase() + temperature.slice(1)}</Badge>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-600 max-w-xs">
        You can close this window. Mike has your info and will reach out directly.
      </p>
    </div>
  );
}
