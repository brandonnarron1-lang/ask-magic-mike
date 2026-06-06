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
import {
  AskMagicMikeV8Close,
  AskMagicMikeV8Hero,
  AskMagicMikeV8SystemPanels,
  v8ButtonClass,
  v8RootClass,
} from "@/components/campaign/ask-magic-mike-v8-experience";

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

const LEAD_CAPTURE_ANCHOR = "start-with-address";

export function ValueHero() {
  return (
    <BrandShell>
      <BrandHeader />

      <main
        className="relative z-10 flex-1 pb-14 w-full"
        id="amm-value-main"
      >
        {/* V8 LUXURY HERO ─────────────────────────────────────────── */}
        <div className={v8RootClass}>
          <AskMagicMikeV8Hero
            headingId="value-hero-heading"
            eyebrow="Ask Magic Mike by Our Town Properties"
            titleLine1="Start with your address."
            titleLine2="Get a local read on your home."
            lede="Premium. Local. Intelligent."
            body={
              <>
                Ask Magic Mike helps Wilson-area homeowners see a preliminary
                home value range, compare selling options, and get follow-up
                from Mike Eatmon&apos;s Our Town Properties team. AI-assisted
                intake. Local human follow-up.
              </>
            }
            primaryCta={
              <a
                className={v8ButtonClass}
                href={`#${LEAD_CAPTURE_ANCHOR}`}
                data-testid="v8-hero-cta"
              >
                Ask Mike Now
              </a>
            }
            trustLine={
              <>Powered by Our Town Properties · Wilson, NC</>
            }
            chips={[
              { id: "value", label: "What's my home worth?" },
              { id: "timing", label: "Should I sell now?" },
              {
                id: "direct-purchase",
                label: "Can I get a direct-purchase review?",
                answer: (
                  <>
                    Mike&apos;s team replies with local guidance for a
                    preliminary direct-purchase review — subject to inspection.
                    Not an instant offer.
                  </>
                ),
              },
            ]}
            initialAnswer={
              <>
                Mike&apos;s team replies with local guidance. Preliminary home
                value range only, not an appraisal.
              </>
            }
          />
        </div>

        {/* LEAD CAPTURE + TRUST COLUMN ───────────────────────────── */}
        <div
          className="px-4 sm:px-6 max-w-6xl mx-auto w-full"
          id={LEAD_CAPTURE_ANCHOR}
        >
          <section
            aria-labelledby="value-leadcapture-heading"
            className={cn("pt-8 sm:pt-10 pb-10 sm:pb-12", motion.fadeUp)}
          >
            <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-8 sm:gap-10 lg:gap-14 items-start">
              <div className="max-w-xl">
                <h2
                  id="value-leadcapture-heading"
                  className={cn(ammTokens.headlineDisplay, "mb-3")}
                  style={{ fontSize: "clamp(1.5rem, 3.4vw, 2.25rem)" }}
                >
                  Start with your address.{" "}
                  <span className="text-gold-shimmer">
                    Mike&apos;s team takes it from there.
                  </span>
                </h2>
                <p className={cn(ammTokens.subhead, "mb-2 max-w-lg")}>
                  Real answers. Local insight. AI-assisted.
                </p>
                <p className="text-slate-400 text-[12.5px] mb-6">
                  No account. No pressure. Local human follow-up.
                </p>

                <ConversionPanel className="mb-6" />

                <AiAssistBadge variant="inline" />
              </div>

              {/* Trust column — beside form on desktop, below on mobile */}
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
                className="font-display text-[22px] sm:text-[26px] font-semibold text-[#F7F1E8] leading-tight"
              >
                Choose your path
              </h2>
              <p className="text-[12.5px] text-slate-300 hidden sm:block">
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
        </div>

        {/* V8 SYSTEM GRID ─────────────────────────────────────────── */}
        <div className={v8RootClass}>
          <section
            className="mx-auto"
            aria-labelledby="value-v8-system-heading"
          >
            <h2 id="value-v8-system-heading" className="sr-only">
              Ask Magic Mike avatar and chat system
            </h2>
            <AskMagicMikeV8SystemPanels />
          </section>

          {/* V8 CLOSE ───────────────────────────────────────────── */}
          <AskMagicMikeV8Close
            kicker="Wilson, NC Real Estate Answers, Fast"
            headline="Ask Mike before you make the next move."
            body="Use the form above for a sharper local read on your property, timing, or selling options. Preliminary home value range only, not an appraisal."
            cta={
              <a
                className={v8ButtonClass}
                href={`#${LEAD_CAPTURE_ANCHOR}`}
                data-testid="v8-close-cta"
              >
                Ask Mike Now
              </a>
            }
          />
        </div>

        {/* FINAL TRUST + COMPLIANCE ───────────────────────────────── */}
        <div className="px-4 sm:px-6 max-w-6xl mx-auto w-full">
          <section
            aria-labelledby="value-trust-heading"
            className={cn(
              "rounded-2xl border border-white/[0.08] bg-[#0F131A]/85 p-5 sm:p-6 mb-8",
              motion.fadeUpDelay500
            )}
          >
            <div className="grid md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-center">
              <div>
                <h2
                  id="value-trust-heading"
                  className="font-display text-[19px] sm:text-[22px] font-semibold text-[#F7F1E8] leading-tight mb-2"
                >
                  A licensed broker on the other end.
                </h2>
                <p className="text-[14px] text-slate-200 leading-relaxed max-w-xl">
                  Mike Eatmon has been selling Wilson and Eastern North Carolina
                  real estate since 1993 with Our Town Properties, Inc. Your
                  request is reviewed and followed up by a real person, not an
                  auto-responder.
                </p>
                <p className="mt-3 text-[12.5px] text-slate-300">
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
        </div>
      </main>

      <MagicMikeWidgetFloating label="Ask Magic Mike" />
    </BrandShell>
  );
}
