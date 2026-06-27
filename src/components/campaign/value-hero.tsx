"use client";

import {
  Home,
  Banknote,
  MessageCircle,
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
    <BrandShell>
      <BrandHeader />

      <main id="main-content" className="relative z-10 flex-1 px-4 sm:px-6 pb-14 max-w-6xl mx-auto w-full">
        {/* HERO */}
        <section
          aria-labelledby="value-hero-heading"
          className={cn("pt-3 sm:pt-4 pb-10 sm:pb-12", motion.fadeUp)}
        >
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-8 sm:gap-10 lg:gap-14 items-start">
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

              <p className={cn(ammTokens.subhead, "mb-2 max-w-lg")}>
                Ask Magic Mike helps Wilson-area homeowners see a preliminary
                home value range, compare selling options, and get follow-up
                from Mike Eatmon&apos;s Our Town Properties team.
              </p>
              <p className="text-slate-300 text-sm mb-2">
                Real answers. Local insight. AI-assisted.
              </p>
              <p className="text-slate-400 text-xs mb-7">
                No account. No pressure. Local human follow-up.
              </p>

              <ConversionPanel className="mb-6" />

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
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2
              id="value-paths-heading"
              className="font-display text-2xl sm:text-3xl font-semibold text-cream leading-tight"
            >
              Choose your path
            </h2>
            <p className="text-xs text-slate-300 hidden sm:block">
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
            "relative rounded-2xl border border-white/[0.08] bg-[#0F131A]/85 p-5 sm:p-6 mb-8 overflow-hidden",
            motion.fadeUpDelay500
          )}
        >
          {/* Ambient gold gradient top accent */}
          <div
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.35), transparent)" }}
            aria-hidden="true"
          />
          <div className="grid md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-center">
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
              <p className="mt-3 text-xs text-slate-300">
                Licensed in North Carolina · 3301 Nash St. N Suite E, Wilson, NC 27896
              </p>
            </div>
            <a
              href={`tel:${process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337"}`}
              className={cn(
                ammTokens.buttonSecondary,
                "self-start",
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
