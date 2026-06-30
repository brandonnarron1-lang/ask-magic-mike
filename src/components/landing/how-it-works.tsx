"use client";

import Image from "next/image";
import { MessageSquare, Zap, Phone, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Reveal } from "@/components/ui/reveal";
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
    isRuby: false,
  },
  {
    n: "02",
    icon: Zap,
    title: "Mike Reviews Your Details",
    body: "Your request goes to Mike Eatmon at Our Town Properties — with your full context included. No call centers. No automated responses.",
    note: "Routed to Mike directly",
    color: "from-gold-400/15 to-transparent",
    portrait: brandPackAssets.actions.explaining,
    portraitAlt: "Mike Eatmon reviewing your details",
    isRuby: false,
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
    isRuby: true,
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-28 px-6 bg-[#0A0A0A] bg-dot-grid-subtle overflow-hidden">
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Mesh gradient — vivid ambient layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 15% 10%, rgba(212,160,23,0.11) 0%, transparent 65%)",
            "radial-gradient(ellipse 50% 45% at 85% 80%, rgba(193,39,45,0.07) 0%, transparent 65%)",
            "radial-gradient(ellipse 90% 40% at 50% 100%, rgba(212,160,23,0.06) 0%, transparent 70%)",
          ].join(", "),
        }}
      />

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
        <Reveal variant="fade-up">
          <div className="text-center mb-20 relative">
            {/* Large decorative "THE PROCESS" watermark behind heading */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -z-0"
              aria-hidden="true"
            >
              <span
                className="font-bebas text-[12vw] leading-none font-bold whitespace-nowrap"
                style={{ color: "rgba(212,160,23,0.028)", letterSpacing: "0.04em" }}
              >
                THE PROCESS
              </span>
            </div>

            {/* Eyebrow pill — premium treatment */}
            <div className="relative z-10 flex justify-center mb-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-400/[0.30] bg-gold-400/[0.06] text-xs font-semibold tracking-kicker uppercase text-gold-400">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-gold-400"
                  style={{ boxShadow: "0 0 6px rgba(212,160,23,0.7)" }}
                />
                The Process
              </span>
            </div>

            <h2 className="relative z-10 font-display text-5xl md:text-6xl lg:text-7xl font-bold text-cream leading-tight">
              Ask. Score.{" "}
              <span className="text-gold-shimmer">Connect.</span>
            </h2>
            <p className="relative z-10 mt-5 text-lg text-slate-400 max-w-md mx-auto">
              Three steps. No gatekeeping. Just answers from the man who&apos;s done it 2,500+ times.
            </p>
          </div>
        </Reveal>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Animated shimmer connector — desktop only, sits at the step circle level */}
          <div
            className="absolute hidden md:flex items-center pointer-events-none"
            aria-hidden="true"
            style={{
              top: "24px",           /* vertically center on the 48px circle (24px = half) */
              left: "calc(16.67% + 3.5rem)",
              right: "calc(16.67% + 3.5rem)",
              height: "1px",
            }}
          >
            <div className="step-connector w-full" />
          </div>

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.n} variant="fade-up" delay={200 + i * 150}>
                <div
                  className={cn(
                    "relative group rounded-2xl p-9 overflow-hidden glass-gold-card light-rim-top",
                    "transition-all duration-300 motion-reduce:transition-none cursor-default",
                    "hover:border-gold-400/[0.40] hover:shadow-[0_12px_48px_rgba(212,160,23,0.10)]",
                  )}
                  style={{
                    transform: "translateY(0)",
                    transition: "transform 300ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease, border-color 300ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Top gradient glow — taller */}
                  <div className={cn(
                    "absolute top-0 inset-x-0 h-48 bg-gradient-to-b pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity duration-300",
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

                  {/* Step number — large watermark in corner */}
                  <div
                    className="absolute bottom-4 right-5 font-bebas text-[5.5rem] leading-none select-none pointer-events-none"
                    style={{ color: step.isRuby ? "rgba(193,39,45,0.055)" : "rgba(212,160,23,0.055)" }}
                  >
                    {step.n}
                  </div>

                  {/* Step number circle — prominent top element */}
                  <div className="relative mb-6 flex items-center gap-3">
                    <div
                      className="relative flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center"
                      style={{
                        border: step.isRuby
                          ? "1.5px solid rgba(193,39,45,0.50)"
                          : "1.5px solid rgba(212,160,23,0.55)",
                        background: step.isRuby
                          ? "rgba(193,39,45,0.07)"
                          : "rgba(212,160,23,0.07)",
                        boxShadow: step.isRuby
                          ? "0 0 16px rgba(193,39,45,0.12), inset 0 1px 0 rgba(193,39,45,0.15)"
                          : "0 0 16px rgba(212,160,23,0.14), inset 0 1px 0 rgba(212,160,23,0.15)",
                      }}
                    >
                      <span
                        className="font-bebas text-lg leading-none tracking-wide"
                        style={{ color: step.isRuby ? "rgba(193,39,45,0.90)" : "rgba(212,160,23,0.95)" }}
                      >
                        {step.n}
                      </span>
                      {/* Pulsing dot inside circle */}
                      <span
                        className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
                        style={{
                          background: step.isRuby ? "rgba(193,39,45,0.8)" : "rgba(212,160,23,0.8)",
                          animation: "signalPulse 2.4s ease-out infinite",
                          animationDelay: `${i * 0.4}s`,
                        }}
                      />
                    </div>

                    {/* Icon */}
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-400/[0.07] group-hover:bg-gold-400/[0.12] group-hover:border-gold-400/40 transition-all duration-300"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                    >
                      <Icon className="h-5 w-5 text-gold-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <h3 className="text-lg font-semibold text-cream mb-3 group-hover:text-white transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400 mb-5">{step.body}</p>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs text-gold-400/65 font-medium border border-gold-400/[0.13] rounded-full px-3.5 py-1.5 bg-gold-400/[0.03] transition-all duration-300 group-hover:border-gold-400/[0.30] group-hover:bg-gold-400/[0.06]"
                      style={{
                        boxShadow: "none",
                        transition: "border-color 300ms ease, background 300ms ease, box-shadow 300ms ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(212,160,23,0.18)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      }}
                    >
                      <span className="h-1 w-1 rounded-full bg-gold-400/55" />
                      {step.note}
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Bottom trust note — glass pill */}
        <Reveal variant="fade-up" delay={700}>
          <div className="mt-12 flex justify-center">
            <div
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-xs text-slate-500"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <CheckCircle className="h-3.5 w-3.5 text-gold-400/50 flex-shrink-0" />
              <span className="text-center leading-snug max-w-lg">
                By submitting you agree to be contacted by Mike Eatmon / Our Town Properties via phone,
                text, or email regarding real estate services. Standard message rates may apply.
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
