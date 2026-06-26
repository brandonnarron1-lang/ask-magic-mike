"use client";

import Image from "next/image";
import { MessageSquare, Zap, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useInView } from "@/hooks/use-in-view";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

const STEPS = [
  {
    n: "01",
    icon: MessageSquare,
    title: "Share Your Situation",
    body: "Type your question or address — home value, timing, buying, selling. No forms. No gated content. Takes about 30 seconds.",
    note: "~30 seconds",
    color: "from-gold-400/20 to-transparent",
    portrait: brandPackAssets.expressions.thinkingChin,
    portraitAlt: "Mike Eatmon listening intently",
  },
  {
    n: "02",
    icon: Zap,
    title: "Mike Reviews Your Details",
    body: "Your request goes to Mike Eatmon at Our Town Properties — with your full context included. No call centers. No automated responses.",
    note: "Routed to Mike directly",
    color: "from-amber-400/15 to-transparent",
    portrait: brandPackAssets.actions.explaining,
    portraitAlt: "Mike Eatmon reviewing your details",
  },
  {
    n: "03",
    icon: Phone,
    title: "Local Broker Follow-Up",
    body: "Mike or the Our Town Properties team follows up with local broker-reviewed guidance — not a generic estimate or an automated message.",
    note: "Response timing may vary",
    color: "from-ruby-400/15 to-transparent",
    portrait: brandPackAssets.expressions.confident,
    portraitAlt: "Mike Eatmon ready to help",
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-28 px-6 bg-[#0A0A0A] overflow-hidden"
    >
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Background number watermark */}
      <div
        className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
        aria-hidden
      >
        <span
          className="font-bebas text-[30vw] font-bold leading-none text-white/[0.012] whitespace-nowrap"
          style={{ letterSpacing: "-0.05em" }}
        >
          HOW IT WORKS
        </span>
      </div>

      {/* Ambient Mike portrait — section-level background element */}
      <div
        className="absolute bottom-0 right-0 w-72 h-96 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src={brandPackAssets.mike.heroCloseup}
          alt=""
          fill
          sizes="288px"
          className="object-cover object-top opacity-[0.04]"
          style={{ maskImage: "radial-gradient(ellipse 100% 100% at 100% 100%, black 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className={cn(
          "text-center mb-20 opacity-0 transition-all duration-700",
          inView && "opacity-100 translate-y-0 animate-fade-up"
        )}>
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-400 mb-4">
            The Process
          </p>
          <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream leading-tight">
            Ask. Score.{" "}
            <span className="text-gold-shimmer">Connect.</span>
          </h2>
          <p className="mt-5 text-slate-400 max-w-md mx-auto text-lg">
            Three steps. No gatekeeping. Just answers from the man who&apos;s done it 2,500+ times.
          </p>
        </div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connector thread — desktop only */}
          <div
            className="absolute top-[52px] left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px hidden md:block pointer-events-none"
            aria-hidden="true"
            style={{ background: "linear-gradient(90deg, rgba(212,160,23,0.25) 0%, rgba(212,160,23,0.08) 50%, rgba(212,160,23,0.25) 100%)" }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.n}
                className={cn(
                  "relative group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-8 overflow-hidden",
                  "hover:border-gold-400/[0.28] hover:bg-white/[0.04]",
                  "transition-all duration-300 motion-reduce:transition-none cursor-default",
                  "hover:shadow-[0_8px_40px_rgba(212,160,23,0.06)]",
                  "opacity-0",
                  inView && "animate-fade-up"
                )}
                style={{ animationDelay: `${200 + i * 150}ms` }}
              >
                {/* Top gradient glow */}
                <div className={cn(
                  "absolute top-0 inset-x-0 h-36 bg-gradient-to-b pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity duration-300",
                  step.color
                )} />

                {/* Mike portrait — ambient background element */}
                <div
                  className="absolute bottom-0 right-0 w-36 h-44 pointer-events-none select-none overflow-hidden rounded-br-2xl"
                  aria-hidden="true"
                >
                  <Image
                    src={step.portrait}
                    alt=""
                    fill
                    sizes="144px"
                    className="object-cover object-top opacity-[0.10] group-hover:opacity-[0.15] transition-opacity duration-500"
                    style={{ maskImage: "radial-gradient(ellipse 100% 100% at 100% 100%, black 0%, transparent 65%)" }}
                  />
                </div>

                {/* Step number — watermark */}
                <div
                  className="absolute bottom-4 right-5 font-bebas text-[5.5rem] leading-none select-none pointer-events-none"
                  style={{ color: "rgba(212,160,23,0.055)" }}
                >
                  {step.n}
                </div>

                {/* Icon */}
                <div className="relative mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-400/[0.07] group-hover:bg-gold-400/[0.12] group-hover:border-gold-400/40 transition-all duration-300"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                >
                  <Icon className="h-5 w-5 text-gold-400" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-lg font-semibold text-cream mb-3 group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400 mb-5">{step.body}</p>
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gold-400/65 font-medium border border-gold-400/[0.13] rounded-full px-3.5 py-1.5 bg-gold-400/[0.03]">
                    <span className="h-1 w-1 rounded-full bg-gold-400/55" />
                    {step.note}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-slate-600 max-w-lg mx-auto">
          By submitting you agree to be contacted by Mike Eatmon / Our Town Properties via phone,
          text, or email regarding real estate services. Standard message rates may apply.
        </p>
      </div>
    </section>
  );
}
