"use client";

import {
  Home,
  Banknote,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BrandShell } from "@/components/amm/brand-shell";
import { BrandHeader } from "@/components/amm/brand-header";
import { MikeTrustCard } from "@/components/amm/mike-trust-card";
import { ProofStrip } from "@/components/amm/proof-strip";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { ConversionPanel } from "@/components/amm/conversion-panel";
import { OptionCard, type OptionCardProps } from "@/components/amm/option-card";
import { HowItWorks } from "@/components/amm/how-it-works";
import { AiAssistBadge } from "@/components/amm/ai-assist-badge";
import { MagicMikeWidgetFloating } from "@/components/amm/magic-mike-widget-floating";
import { ammTokens } from "@/components/amm/tokens";
import { motion } from "@/components/amm/motion";
import { siteConfig } from "@/lib/site-config";

const SECONDARY_OPTIONS: OptionCardProps[] = [
  {
    Icon: Home,
    title: "Compare selling options",
    description:
      "See list-with-Mike vs. direct-purchase review side by side, with timelines and what to expect.",
    question:
      "I'd like to compare my options for selling my home in Wilson, NC.",
    chip: "should_sell_now",
  },
  {
    Icon: Banknote,
    title: "Request direct-purchase review",
    description:
      "Share your address and timing for a preliminary direct-purchase review — subject to review. Not an instant offer.",
    question:
      "Please review my home for a direct-purchase preliminary estimate, subject to inspection.",
    chip: "what_can_afford",
    ribbon: "Priority review",
    ribbonTone: "ruby",
  },
  {
    Icon: MessageCircle,
    title: "Ask Mike a question",
    description:
      "Have a market question first? Send it in and Mike's team will reply with local guidance.",
    question:
      "I'd like to ask Mike Eatmon a question about my home or the Wilson market.",
    chip: "talk_to_mike",
  },
];

export function ValueHero() {
  return (
    <BrandShell
      cinematicSrc="/assets/black-diamond/value-funnel.svg"
      cinematicOverlay={0.42}
    >
      <BrandHeader />

      <main id="main-content" className="relative z-10 flex-1 px-4 sm:px-6 pb-14 max-w-6xl mx-auto w-full">
        {/* HERO */}
        <section
          aria-labelledby="value-hero-heading"
          className={cn("pt-3 sm:pt-4 pb-10 sm:pb-12 relative", motion.fadeUp)}
        >
          {/* Ambient hero glow — top gold bloom */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 30% -5%, rgba(212,160,23,0.13) 0%, transparent 60%), " +
                "radial-gradient(ellipse 60% 50% at 80% 110%, rgba(193,39,45,0.06) 0%, transparent 60%)",
            }}
          />

          <div className="relative z-10 grid lg:grid-cols-[1.25fr_0.75fr] gap-8 sm:gap-10 lg:gap-14 items-start">
            <div className="max-w-xl">
              <div className={cn(ammTokens.eyebrow, "mb-5")}>
                <span className={ammTokens.eyebrowDot} />
                <span>Ask Magic Mike by Our Town Properties</span>
              </div>

              <h1
                id="value-hero-heading"
                className={cn(ammTokens.headlineDisplay, "mb-4")}
                style={{ fontSize: "clamp(2rem, 5.4vw, 3.7rem)" }}
              >
                Start with your address.<br />
                <span className="text-gold-shimmer">
                  Get a local read on your home.
                </span>
              </h1>

              {/* Micro-trust signals replace body copy — show value, not describe it */}
              <div className="flex flex-wrap items-center gap-2 mb-7 mt-4">
                {[
                  "Real answers in 24 hrs",
                  "Wilson NC specialist",
                  "Broker-reviewed",
                  "No pressure · No account",
                ].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/15 bg-gold-400/[0.05] px-3 py-1 text-xs font-medium text-slate-300"
                  >
                    <CheckCircle2
                      className="h-3 w-3 text-gold-400/70 shrink-0"
                      aria-hidden="true"
                    />
                    {label}
                  </span>
                ))}
              </div>

              {/* Apple-style premium address input wrapper */}
              <div
                className="relative rounded-2xl border border-gold-400/20 bg-[#0C0A05]/90 p-1 mb-6"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(212,160,23,0.06), " +
                    "0 24px 60px -16px rgba(0,0,0,0.70), " +
                    "0 0 60px rgba(212,160,23,0.05), " +
                    "inset 0 1px 0 rgba(212,160,23,0.08)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 inset-x-6 h-px pointer-events-none"
                  aria-hidden="true"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(212,160,23,0.50), transparent)",
                  }}
                />
                <ConversionPanel className="rounded-xl" />
              </div>

              <AiAssistBadge variant="inline" />
            </div>

            {/* Trust column — beside copy on desktop, below on mobile */}
            <div className="w-full max-w-md lg:max-w-none lg:sticky lg:top-6">
              <MikeTrustCard />
            </div>
          </div>
        </section>

        {/* PROOF STRIP */}
        <section className={cn("mb-12", motion.fadeUpDelay100)}>
          <ProofStrip />
        </section>

        {/* PATH CARDS */}
        <section
          aria-labelledby="value-paths-heading"
          className={cn("mb-14", motion.fadeUpDelay200)}
        >
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <div>
              <h2
                id="value-paths-heading"
                className="font-display text-2xl sm:text-3xl font-semibold text-cream leading-tight"
              >
                Choose your path
              </h2>
              <p className="mt-1 text-xs text-slate-400 sm:hidden">
                Pick the one that fits — Mike&apos;s team takes it from there.
              </p>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block shrink-0">
              Pick the one that fits — Mike&apos;s team takes it from there.
            </p>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            data-testid="value-secondary-chips"
          >
            {SECONDARY_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.chip}
                {...opt}
                testId={`value-chip-${opt.chip}`}
              />
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className={cn("mb-14", motion.fadeUpDelay300)}>
          <HowItWorks />
        </section>

        {/* FINAL TRUST BLOCK */}
        <section
          aria-labelledby="value-trust-heading"
          className={cn(
            "relative rounded-2xl border border-gold-400/[0.14] bg-[#0C0A05]/90 p-5 sm:p-7 mb-8 overflow-hidden",
            motion.fadeUpDelay500
          )}
          style={{
            boxShadow:
              "0 0 0 1px rgba(212,160,23,0.05), " +
              "0 32px 80px -24px rgba(0,0,0,0.65), " +
              "inset 0 1px 0 rgba(212,160,23,0.08)",
          }}
        >
          {/* Ambient gold top accent */}
          <div
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.50), transparent)" }}
            aria-hidden="true"
          />
          {/* Subtle corner bloom */}
          <div
            className="absolute top-0 left-0 w-64 h-64 pointer-events-none -z-0"
            aria-hidden="true"
            style={{
              background: "radial-gradient(ellipse 60% 60% at 0% 0%, rgba(212,160,23,0.07) 0%, transparent 70%)",
            }}
          />
          <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-center">
            <div>
              <h2
                id="value-trust-heading"
                className="font-display text-xl sm:text-2xl font-semibold text-cream leading-tight mb-2"
              >
                A licensed broker on the other end.
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed max-w-xl">
                Mike Eatmon has been selling Wilson and Eastern North Carolina
                real estate since 1993 with Our Town Properties, Inc. Your
                request is reviewed and followed up by a real person, not an
                auto-responder.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-xs text-slate-400">Licensed in North Carolina</span>
                <span className="text-gold-400/30">·</span>
                <span className="text-xs text-slate-400">Since 1993</span>
                <span className="text-gold-400/30">·</span>
                <span className="text-xs text-slate-400">3301 Nash St. N Suite E, Wilson, NC 27896</span>
              </div>
            </div>
            <a
              href={`tel:${siteConfig.agentPhone}`}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-[#0A0A0A] btn-gold-premium self-start shrink-0",
                motion.focusGold
              )}
            >
              Call Mike directly
            </a>
          </div>
        </section>

        <ComplianceFooter variant="inline" testId="value-disclosure" />
      </main>

      <MagicMikeWidgetFloating label="Ask Magic Mike" />
    </BrandShell>
  );
}
