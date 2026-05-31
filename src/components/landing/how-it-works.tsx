"use client";

import { MessageSquare, Zap, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useInView } from "@/hooks/use-in-view";

const STEPS = [
  {
    n: "01",
    icon: MessageSquare,
    title: "Ask Your Question",
    body: "Type anything — home value, timing, mortgage estimate — or tap a chip. No forms. No gated content. Just your question.",
    note: "~30 seconds",
    color: "from-gold-400/20 to-transparent",
  },
  {
    n: "02",
    icon: Zap,
    title: "Get Instant Intel",
    body: "Our scoring engine reads your situation against local Eastern NC market data and routes you directly to Mike — with full context already loaded.",
    note: "Real-time scoring",
    color: "from-amber-400/15 to-transparent",
  },
  {
    n: "03",
    icon: Phone,
    title: "Mike Calls You",
    body: "Not a call center. Not a chatbot. Mike Eatmon personally follows up — armed with your question, your situation, and 30+ years of answers.",
    note: "Typically same business day",
    color: "from-ruby-400/15 to-transparent",
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.n}
                className={cn(
                  "relative group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-8 overflow-hidden",
                  "hover:border-gold-400/30 hover:bg-white/[0.04]",
                  "transition-all duration-400 cursor-default",
                  "opacity-0",
                  inView && "animate-fade-up"
                )}
                style={{ animationDelay: `${200 + i * 150}ms` }}
              >
                {/* Top gradient glow */}
                <div className={cn(
                  "absolute top-0 inset-x-0 h-32 bg-gradient-to-b pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity",
                  step.color
                )} />

                {/* Hover border glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: "inset 0 0 40px rgba(212,160,23,0.04)" }} />

                {/* Step number — huge watermark */}
                <div
                  className="absolute bottom-3 right-5 font-bebas text-[5rem] leading-none select-none pointer-events-none"
                  style={{ color: "rgba(212,160,23,0.06)" }}
                >
                  {step.n}
                </div>

                {/* Icon */}
                <div className="relative mb-6 inline-flex h-13 w-13 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-400/8 group-hover:bg-gold-400/14 group-hover:border-gold-400/40 transition-all duration-300">
                  <Icon className="h-5 w-5 text-gold-400" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-lg font-semibold text-cream mb-3 group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400 mb-5">{step.body}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-gold-400/70 font-medium border border-gold-400/15 rounded-full px-3.5 py-1.5 bg-gold-400/[0.04]">
                    <span className="h-1 w-1 rounded-full bg-gold-400/60" />
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
