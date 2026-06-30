"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { mikePlatformAssets } from "@/lib/mikePlatformAssets";

/* ─── Demo script ───────────────────────────────────────────────────────── */
const DEMO_EXCHANGES = [
  {
    question: "Is now a good time to buy in Wilson, NC?",
    answer:
      "Wilson's median is around $195K — still one of the most accessible markets in Eastern NC. Inventory has loosened since last year, and rates have moderated. If you're planning to stay 3+ years, the math works solidly in your favor right now.",
    tag: "Market Timing",
  },
  {
    question: "What makes a Wilson home worth more?",
    answer:
      "Three things move the needle: school zone (Fike High vs. Hunt), proximity to the medical district, and lot depth. A Fike-zone home in similar condition will typically command $15-30K over a comparable address outside it.",
    tag: "Home Value",
  },
  {
    question: "How fast are homes selling right now?",
    answer:
      "Well-priced homes in good condition are going under contract in 12–21 days. Overpriced or deferred-maintenance listings are sitting 60+ days and taking price cuts. Presentation and pricing discipline matter more than they did in 2021.",
    tag: "Market Conditions",
  },
] as const;

const CYCLE_MS   = 5800;   // time before advancing to next exchange
const REVEAL_MS  = 340;    // stagger between Q and A bubble appearance

/* ─── Component ────────────────────────────────────────────────────────── */
export function AiDemoSection() {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [visible, setVisible]       = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Intersection-based mount animation */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  /* Auto-cycle through exchanges */
  useEffect(() => {
    setShowAnswer(false);
    const answerTimer = setTimeout(() => setShowAnswer(true), REVEAL_MS);
    timerRef.current  = setTimeout(() => {
      setActiveIdx((i) => (i + 1) % DEMO_EXCHANGES.length);
    }, CYCLE_MS);
    return () => {
      clearTimeout(answerTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIdx]);

  const ex = DEMO_EXCHANGES[activeIdx];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#0A0A0A] px-5 py-20 sm:px-6 sm:py-28"
      id="ai-demo"
      data-amm-surface="ai-demo"
    >
      {/* Background grain + glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,160,23,0.07) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* Top divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />

      <div className="relative mx-auto max-w-5xl">
        {/* Heading block */}
        <div
          className={cn(
            "mb-14 text-center transition-all duration-700",
            !visible && "motion-safe:opacity-0 motion-safe:translate-y-4",
            visible && "opacity-100 translate-y-0"
          )}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-label text-gold-400/80">
            <Sparkles className="h-3 w-3" />
            Live preview
          </div>
          <h2 className="font-display text-display font-black leading-[0.93] text-cream" style={{ letterSpacing: "-0.02em" }}>
            Ask anything about<br />
            <span className="text-gold-shimmer italic">Wilson real estate.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-400">
            Mike Eatmon has closed over 2,500 homes in Eastern NC. This is the kind of answer you get — specific, direct, no fluff.
          </p>
        </div>

        {/* Demo panel */}
        <div
          className={cn(
            "transition-all duration-700 delay-200",
            !visible && "motion-safe:opacity-0 motion-safe:translate-y-4",
            visible && "opacity-100 translate-y-0"
          )}
        >
          <div
            className="relative mx-auto max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: "rgba(13,11,7,0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(212,160,23,0.22)",
              boxShadow:
                "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,160,23,0.07), inset 0 1px 0 rgba(212,160,23,0.12)",
            }}
          >
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

            {/* Header bar */}
            <div
              className="flex items-center justify-between border-b border-gold-400/[0.10] px-5 py-3.5"
              style={{ background: "rgba(212,160,23,0.05)" }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src={mikePlatformAssets.circularAvatar.src}
                    alt="Mike Eatmon"
                    width={32}
                    height={32}
                    className="rounded-full object-cover ring-1 ring-gold-400/40"
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D0B07]"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cream leading-none">Magic Mike</p>
                  <p className="text-[10px] uppercase tracking-label text-gold-400/60 mt-0.5">
                    Wilson NC · Real Estate Intelligence
                  </p>
                </div>
              </div>

              {/* Topic tag */}
              <div
                key={ex.tag}
                className="rounded-full border border-gold-400/20 bg-gold-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-label text-gold-300 transition-all duration-300"
              >
                {ex.tag}
              </div>
            </div>

            {/* Conversation area */}
            <div className="px-5 py-6 space-y-5 min-h-[220px]">
              {/* User question bubble */}
              <div
                key={`q-${activeIdx}`}
                className="flex justify-end motion-safe:animate-fade-up"
              >
                <div
                  className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3"
                  style={{
                    background: "rgba(212,160,23,0.13)",
                    border: "1px solid rgba(212,160,23,0.22)",
                  }}
                >
                  <p className="text-sm leading-relaxed text-cream/90">{ex.question}</p>
                </div>
              </div>

              {/* Mike answer bubble */}
              {showAnswer && (
                <div
                  key={`a-${activeIdx}`}
                  className="flex items-start gap-3 motion-safe:animate-fade-up"
                >
                  <Image
                    src={mikePlatformAssets.circularAvatar.src}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full object-cover ring-1 ring-gold-400/30 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div
                    className="max-w-[88%] rounded-2xl rounded-bl-sm px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p className="text-sm leading-relaxed text-slate-300">{ex.answer}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="block h-1 w-1 rounded-full bg-emerald-400/70" aria-hidden="true" />
                      <span className="text-[10px] text-emerald-400/70 uppercase tracking-label">
                        Mike Eatmon · Broker-reviewed
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress dots + CTA footer */}
            <div
              className="flex items-center justify-between border-t border-gold-400/[0.08] px-5 py-4"
              style={{ background: "rgba(0,0,0,0.3)" }}
            >
              {/* Dots */}
              <div className="flex items-center gap-2" role="tablist" aria-label="Demo exchange">
                {DEMO_EXCHANGES.map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === activeIdx}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === activeIdx
                        ? "w-6 bg-gold-400"
                        : "w-1.5 bg-gold-400/25 hover:bg-gold-400/50"
                    )}
                    aria-label={`Exchange ${i + 1}`}
                  />
                ))}
              </div>

              {/* Try it CTA */}
              <a
                href="/ask"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-midnight transition-all duration-200 hover:bg-gold-300 hover:shadow-lg hover:shadow-gold-400/25 active:scale-95"
              >
                Ask your question
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Microcopy */}
        <p className="mt-6 text-center text-xs text-slate-600">
          Free · No account required · Broker-reviewed guidance from Our Town Properties, Inc. · Not an appraisal.
        </p>
      </div>
    </section>
  );
}
