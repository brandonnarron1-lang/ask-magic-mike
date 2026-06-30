"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BrandShell } from "@/components/amm/brand-shell";
import { BrandHeader } from "@/components/amm/brand-header";
import { MikeTrustCard } from "@/components/amm/mike-trust-card";
import { AiAssistBadge } from "@/components/amm/ai-assist-badge";
import { ammTokens } from "@/components/amm/tokens";
import { motion } from "@/components/amm/motion";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";
import { siteConfig } from "@/lib/site-config";

interface IntakeShellProps {
  step: number;
  totalSteps: number;
  progress: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
  className?: string;
}

const STEP_LABELS = [
  "Your question",
  "Your timeline",
  "Contact info",
  "Contact consent",
  "Confirmation",
];

const TRUST_STATS = [
  { value: "2,500+", label: "Homes closed" },
  { value: "30+ yrs", label: "Experience" },
  { value: "$750M+", label: "Career sales" },
];

/* ── Left presence panel (desktop only) ──────────────────────────────── */
function MikePresencePanel() {
  return (
    <aside
      className="hidden md:flex flex-col justify-center px-8 lg:px-10 xl:px-14 py-10 lg:py-12 border-r border-gold-400/[0.10]"
      style={{
        background:
          "linear-gradient(160deg, rgba(212,160,23,0.04) 0%, transparent 60%)",
      }}
      aria-label="About Mike Eatmon"
    >
      {/* Avatar */}
      <div className="relative mb-7 w-24 h-24 xl:w-28 xl:h-28 rounded-2xl overflow-hidden flex-shrink-0"
        style={{
          boxShadow: "0 0 0 1px rgba(212,160,23,0.25), 0 16px 40px rgba(0,0,0,0.5)",
        }}
      >
        <Image
          src={brandPackAssets.mike.avatar128}
          alt="Mike Eatmon"
          fill
          sizes="112px"
          className="object-cover"
        />
        {/* Live dot */}
        <span
          className="absolute bottom-2 right-2 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-[#080806]"
          aria-hidden="true"
        >
          <span className="block h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
        </span>
      </div>

      {/* Name + title */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-label text-gold-400/70 mb-1">
          Your broker
        </p>
        <h2 className="text-xl font-semibold text-cream leading-tight">
          Mike Eatmon
        </h2>
        <p className="mt-1 text-sm text-slate-400">Our Town Properties, Inc.</p>
        <p className="mt-0.5 text-xs text-slate-500">Wilson, NC · Licensed since 1993</p>
      </div>

      {/* Stats */}
      <div className="mb-7 grid grid-cols-3 gap-3">
        {TRUST_STATS.map((s) => (
          <div key={s.label} className="text-center rounded-xl border border-gold-400/[0.10] bg-gold-400/[0.04] px-2 py-3">
            <p className="font-bebas text-xl leading-none text-gold-300">{s.value}</p>
            <p className="mt-1 text-[9px] uppercase tracking-label text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mike quote */}
      <blockquote className="mb-7 rounded-xl border-l-2 border-gold-400/40 pl-4">
        <p className="text-sm leading-relaxed text-slate-400 italic">
          &ldquo;I review every question personally. You get a real answer from someone who&apos;s closed deals on this street.&rdquo;
        </p>
        <footer className="mt-2 text-[10px] text-gold-400/60 not-italic font-medium">
          — Mike Eatmon
        </footer>
      </blockquote>

      {/* Trust pills */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400/50 flex-shrink-0" />
          <span>NC Licensed Broker · Broker-reviewed guidance</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Phone className="h-3.5 w-3.5 text-gold-400/50 flex-shrink-0" />
          <a
            href={`tel:${siteConfig.agentPhone}`}
            className="hover:text-gold-400 transition-colors"
          >
            {siteConfig.agentPhoneDisplay}
          </a>
        </div>
      </div>
    </aside>
  );
}

/* ── Main export ──────────────────────────────────────────────────────── */
export function IntakeShell({
  step,
  totalSteps,
  progress,
  onBack,
  showBack = true,
  children,
  className,
}: IntakeShellProps) {
  const stepLabel = STEP_LABELS[step - 1] ?? "";

  return (
    <BrandShell variant="card">
      <BrandHeader compact />

      {/* Two-panel layout at lg+ */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Left: Mike presence (hidden on mobile) */}
        <div className="md:w-[300px] lg:w-[340px] xl:w-[380px] flex-shrink-0">
          <MikePresencePanel />
        </div>

        {/* Right: form area */}
        <main className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-8 lg:px-12 xl:px-16 pb-12 pt-2">
          <div className="max-w-xl mx-auto md:mx-0 w-full">
            {/* Trust cue (mobile only — md+ shows side panel) */}
            <div className={cn("mt-2 mb-4 md:hidden", motion.fadeUp)}>
              <MikeTrustCard variant="compact" />
            </div>

            {/* Progress + step label */}
            <div className="mb-4 mt-2">
              <Progress
                value={progress}
                className="h-1 bg-white/[0.06]"
                indicatorClassName="progress-gold"
                style={{ boxShadow: "0 0 10px rgba(212,160,23,0.35)" } as React.CSSProperties}
              />
              <div className="mt-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold tracking-label uppercase text-gold-300/70">
                  {stepLabel}
                </p>
              </div>
            </div>

            {/* Step card */}
            <div
              className={cn(ammTokens.stepCard, motion.fadeUp, className)}
              data-testid={`intake-step-card-${step}`}
            >
              {showBack && step > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  aria-label="Back"
                  className="-ml-2 mb-2 p-1.5 h-auto text-slate-400 hover:text-[#F7F1E8]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs">Back</span>
                </Button>
              )}
              {children}
            </div>

            {/* AI assist note under the card */}
            <div className="mt-5 flex justify-center">
              <AiAssistBadge variant="inline" />
            </div>
          </div>
        </main>
      </div>
    </BrandShell>
  );
}
