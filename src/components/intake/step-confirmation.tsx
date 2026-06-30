"use client";

import Image from "next/image";
import { Phone, Clock, ExternalLink, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";
import type { Temperature } from "@/types/domain.types";
import { siteConfig } from "@/lib/site-config";

/* ── CSS confetti particles (pure CSS, no JS library) ─── */
const CONFETTI_PIECES = [
  { top: "8%",  left: "12%", color: "#D4A017", size: 8,  delay: 0,   shape: "rect",   rotate: 25 },
  { top: "5%",  left: "78%", color: "#F5C842", size: 6,  delay: 120, shape: "circle", rotate: 0  },
  { top: "12%", left: "55%", color: "#C1272D", size: 7,  delay: 60,  shape: "rect",   rotate: -40 },
  { top: "4%",  left: "35%", color: "#FFD566", size: 5,  delay: 200, shape: "circle", rotate: 0  },
  { top: "15%", left: "88%", color: "#D4A017", size: 9,  delay: 80,  shape: "rect",   rotate: 60 },
  { top: "7%",  left: "22%", color: "#F5C842", size: 6,  delay: 160, shape: "rect",   rotate: -20 },
  { top: "10%", left: "66%", color: "#A01A1F", size: 5,  delay: 40,  shape: "circle", rotate: 0  },
  { top: "3%",  left: "48%", color: "#FFD566", size: 8,  delay: 100, shape: "rect",   rotate: 45 },
  { top: "18%", left: "8%",  color: "#F5C842", size: 5,  delay: 220, shape: "circle", rotate: 0  },
  { top: "6%",  left: "92%", color: "#D4A017", size: 7,  delay: 50,  shape: "rect",   rotate: -55 },
] as const;

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

const AGENT_PHONE = siteConfig.agentPhone;

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
      className="relative pt-2 pb-1 flex flex-col items-center text-center overflow-hidden"
    >
      {/* CSS confetti burst — keyframes in globals.css */}
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          aria-hidden="true"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.shape === "circle" ? p.size : p.size * 1.6,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            ["--r" as string]: `${p.rotate}deg`,
          }}
        />
      ))}

      {/* Large success checkmark */}
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30"
        style={{ boxShadow: "0 0 40px rgba(16,185,129,0.18)" }}
      >
        <CheckCircle className="h-10 w-10 text-emerald-400" strokeWidth={1.75} />
      </div>

      {/* "Your request has been submitted" kicker */}
      <div
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/[0.09] px-3.5 py-1.5"
        style={{ boxShadow: "0 0 20px rgba(212,160,23,0.12), inset 0 1px 0 rgba(212,160,23,0.10)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gold-400 motion-safe:animate-pulse" />
        <p className="text-[11px] font-semibold tracking-label uppercase text-gold-300">
          Your request is in — Mike has it
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

      {/* What happens now — premium timeline */}
      <div
        data-testid="confirmation-next-steps"
        className="w-full max-w-sm mb-6 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-4 text-left"
        style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.06)" }}
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-label text-gold-400/60 mb-4">
          What happens now
        </p>
        <ol className="relative space-y-0">
          {[
            { label: "Mike receives your full request and contact info", icon: "1" },
            { label: "He reviews it personally — not an auto-responder", icon: "2" },
            { label: "Watch your phone or email for follow-up from Our Town Properties", icon: "3" },
          ].map((item, i, arr) => (
            <li key={i} className="flex gap-3 pb-4 last:pb-0">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/15 text-[10px] font-bold text-gold-300 ring-1 ring-gold-400/25 z-10">
                  {item.icon}
                </span>
                {i < arr.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-gradient-to-b from-gold-400/25 to-transparent min-h-[1.25rem]" />
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-0.5">{item.label}</p>
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

      {/* Primary CTA — premium gold gradient */}
      <a
        href={`tel:${AGENT_PHONE}`}
        data-testid="confirmation-call-cta"
        className={cn(
          "inline-flex items-center justify-center gap-2 w-full max-w-sm",
          "rounded-xl px-6 py-3.5 text-sm font-bold text-[#0A0A0A]",
          "btn-gold-premium",
          "active:scale-[0.99] transition-transform duration-100 motion-reduce:transition-none"
        )}
      >
        <Phone className="h-4 w-4" />
        Call Mike Now
      </a>

      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-3 inline-flex items-center justify-center gap-1.5 w-full max-w-sm",
          "rounded-xl border border-gold-400/20 bg-gold-400/[0.05] px-6 py-3 text-xs font-semibold text-gold-300",
          "hover:border-gold-400/35 hover:bg-gold-400/[0.09] transition-colors duration-200"
        )}
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
