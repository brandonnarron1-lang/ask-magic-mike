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
    toolCall: "Searching Wilson NC market conditions",
    toolQuery: 'search({ market: "Wilson-NC", metrics: ["median_price", "inventory", "dom"] })',
    sources: ["2024 MLS Data", "Rate Trends", "Inventory Analysis"],
    confidence: 88,
    followUps: ["What neighborhoods offer the most value?", "What's realistic for a first-time buyer?"],
  },
  {
    question: "What makes a Wilson home worth more?",
    answer:
      "Three things move the needle: school zone (Fike High vs. Hunt), proximity to the medical district, and lot depth. A Fike-zone home in similar condition will typically command $15–30K over a comparable address outside it.",
    tag: "Home Value",
    toolCall: "Analyzing comparable sales + school zones",
    toolQuery: 'analyze({ type: "comps", zone: "Fike-High", filters: ["school_zone", "lot_depth"] })',
    sources: ["School District Data", "Property Comps", "Wilson MLS"],
    confidence: 91,
    followUps: ["Can you show me Fike zone listings?", "What's the ROI on updating before selling?"],
  },
  {
    question: "How fast are homes selling right now?",
    answer:
      "Well-priced homes in good condition are going under contract in 12–21 days. Overpriced or deferred-maintenance listings are sitting 60+ days and taking price cuts. Presentation and pricing discipline matter more than they did in 2021.",
    tag: "Market Conditions",
    toolCall: "Pulling days-on-market + absorption data",
    toolQuery: 'query({ metrics: ["days_on_market", "absorption_rate"], period: "90d" })',
    sources: ["Days on Market", "Price Reductions", "Absorption Rate"],
    confidence: 85,
    followUps: ["How should I price my Wilson home?", "What improvements reduce days on market?"],
  },
] as const;

const CYCLE_MS        = 8500; // full cycle duration
const REVEAL_MS       = 300;  // delay before typing indicator
const TYPING_MS       = 800;  // typing dots duration
const TOOL_MS         = 950;  // tool-call indicator duration
const STREAM_WORD_MS  = 38;   // ms per word streamed

/* ─── Component ────────────────────────────────────────────────────────── */
export function AiDemoSection() {
  const [activeIdx, setActiveIdx]         = useState(0);
  const [showTyping, setShowTyping]       = useState(false);
  const [showToolCall, setShowToolCall]   = useState(false);
  const [showAnswer, setShowAnswer]       = useState(false);
  const [streamedWords, setStreamedWords] = useState(0);
  const [visible, setVisible]             = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Intersection-based reveal — fires heading animation on scroll */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.10 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  /* Auto-cycle: typing → tool-call → stream → pause → next */
  useEffect(() => {
    setShowTyping(false);
    setShowToolCall(false);
    setShowAnswer(false);
    setStreamedWords(0);
    if (streamRef.current) clearInterval(streamRef.current);

    const t1 = setTimeout(() => {
      setShowTyping(true);

      const t2 = setTimeout(() => {
        setShowTyping(false);
        setShowToolCall(true);

        const t3 = setTimeout(() => {
          setShowToolCall(false);
          setShowAnswer(true);
          const words = DEMO_EXCHANGES[activeIdx].answer.split(" ");
          let w = 0;
          streamRef.current = setInterval(() => {
            w++;
            setStreamedWords(w);
            if (w >= words.length && streamRef.current) {
              clearInterval(streamRef.current);
              streamRef.current = null;
            }
          }, STREAM_WORD_MS);
        }, TOOL_MS);

        return () => clearTimeout(t3);
      }, TYPING_MS);

      return () => clearTimeout(t2);
    }, REVEAL_MS);

    timerRef.current = setTimeout(() => {
      setActiveIdx((i) => (i + 1) % DEMO_EXCHANGES.length);
    }, CYCLE_MS);

    return () => {
      clearTimeout(t1);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (streamRef.current) clearInterval(streamRef.current);
    };
  }, [activeIdx]);

  const ex          = DEMO_EXCHANGES[activeIdx];
  const answerWords = ex.answer.split(" ");
  const displayAnswer = answerWords.slice(0, streamedWords).join(" ");
  const isStreaming   = showAnswer && streamedWords < answerWords.length;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#0A0A0A] px-5 py-20 sm:px-6 sm:py-28"
      id="ai-demo"
      data-amm-surface="ai-demo"
    >
      {/* Background glow */}
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

      <div className="relative mx-auto max-w-4xl">
        {/* Heading — always visible; content drives the page, not the entrance */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-label text-gold-400/80">
            <Sparkles className="h-3 w-3" />
            Live preview
          </div>
          <h2
            className="font-display text-display font-black leading-[0.93] text-cream"
            style={{ letterSpacing: "-0.02em" }}
          >
            Watch Mike answer<br />
            <span className="text-gold-shimmer italic">in real time.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-400">
            30 years. 2,500+ homes. Every answer is specific to Wilson, NC — not generic real estate advice.
          </p>
        </div>

        {/* Demo panel — chrome always visible; only response area animates */}
        <div className="relative mx-auto max-w-3xl rounded-2xl overflow-hidden"
          style={{
            background: "rgba(13,11,7,0.90)",
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
          <div className="px-6 pt-7 pb-3 space-y-4">
            {/* User question bubble — ALWAYS visible, no animation gate */}
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

            {/* Response area — gated by intersection observer */}
            <div
              aria-live="polite"
              aria-atomic="false"
              aria-label="Mike's response"
              className={cn(
                "space-y-4 min-h-[200px] transition-all duration-500",
                !visible && "motion-safe:opacity-0",
                visible && "opacity-100"
              )}
            >

              {/* Step 1: Typing indicator */}
              {showTyping && (
                <div
                  key={`typing-${activeIdx}`}
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
                    className="rounded-2xl rounded-bl-sm px-4 py-3.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center gap-1.5" aria-label="Mike is typing">
                      <span className="typing-dot-1 block h-1.5 w-1.5 rounded-full bg-gold-400/60" />
                      <span className="typing-dot-2 block h-1.5 w-1.5 rounded-full bg-gold-400/60" />
                      <span className="typing-dot-3 block h-1.5 w-1.5 rounded-full bg-gold-400/60" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Tool-call indicator — terminal-style AI execution */}
              {showToolCall && (
                <div
                  key={`tool-${activeIdx}`}
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
                    className="flex-1 overflow-hidden rounded-xl"
                    style={{
                      background: "rgba(8,7,4,0.96)",
                      border: "1px solid rgba(212,160,23,0.20)",
                    }}
                    aria-label="AI tool execution in progress"
                  >
                    {/* Terminal header */}
                    <div
                      className="flex items-center gap-2 border-b border-gold-400/[0.10] px-3 py-2"
                      style={{ background: "rgba(212,160,23,0.04)" }}
                    >
                      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                        <span
                          className="absolute h-full w-full rounded-full bg-gold-400/60 motion-safe:animate-ping"
                          style={{ animationDuration: "1.8s" }}
                        />
                        <span className="relative h-2 w-2 rounded-full bg-gold-400/80" />
                      </span>
                      <span className="font-mono text-[9px] tracking-widest text-gold-400/45 uppercase select-none">
                        tool_call
                      </span>
                      <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
                        <span className="font-mono text-[9px] text-slate-700">running</span>
                        <span className="flex items-center gap-0.5">
                          {[0, 200, 400].map((d) => (
                            <span
                              key={d}
                              className="block h-1 w-1 rounded-full bg-slate-700 motion-safe:animate-pulse"
                              style={{ animationDelay: `${d}ms` }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                    {/* Terminal body */}
                    <div className="space-y-1.5 px-3 py-3">
                      <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                        <span className="text-gold-400/50 select-none mr-1.5">→</span>
                        {ex.toolCall}
                        <span
                          className="ml-1 inline-block h-[12px] w-[5px] bg-gold-400/60 -mb-[2px] motion-safe:animate-pulse"
                          aria-hidden="true"
                        />
                      </p>
                      <p className="font-mono text-[10px] text-slate-700 pl-4">
                        <span className="text-slate-800 mr-1.5 select-none">›</span>
                        {ex.toolQuery}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Answer streams word-by-word */}
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
                    <p className="text-sm leading-relaxed text-slate-300">
                      {displayAnswer}
                      {isStreaming && (
                        <span
                          className="inline-block w-0.5 h-3.5 bg-gold-400/80 ml-0.5 -mb-0.5 motion-safe:animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                    </p>

                    {/* Broker badge + sources + confidence + follow-ups — appear after streaming */}
                    {!isStreaming && (
                      <div className="mt-3 space-y-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="block h-1 w-1 rounded-full bg-emerald-400/70" aria-hidden="true" />
                            <span className="text-[10px] text-emerald-400/70 uppercase tracking-label">
                              Mike Eatmon · Broker-reviewed
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sources.map((source) => (
                              <span
                                key={source}
                                className="inline-flex items-center rounded border border-gold-400/[0.12] bg-gold-400/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gold-400/40"
                              >
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Confidence bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-label text-slate-700 w-16 flex-shrink-0">Confidence</span>
                          <div className="flex-1 h-0.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ex.confidence}%`,
                                background: "linear-gradient(90deg, rgba(212,160,23,0.4) 0%, rgba(212,160,23,0.75) 100%)",
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-600 tabular-nums w-7 text-right">{ex.confidence}%</span>
                        </div>

                        {/* Follow-up suggestions */}
                        <div>
                          <p className="text-[9px] uppercase tracking-label text-slate-700 mb-1.5">Ask next</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.followUps.map((q) => (
                              <a
                                key={q}
                                href="/ask"
                                className="inline-block rounded-full border border-gold-400/[0.12] px-2.5 py-1 text-[10px] text-slate-500 hover:text-gold-300 hover:border-gold-400/25 transition-colors"
                              >
                                {q}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>{/* end conversation area */}

          {/* Progress dots + CTA footer */}
          <div
            className="flex items-center justify-between border-t border-gold-400/[0.08] px-5 py-4"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
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

            <a
              href="/ask"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-midnight transition-all duration-200 hover:bg-gold-300 hover:shadow-lg hover:shadow-gold-400/25 active:scale-95"
            >
              Ask your question
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>{/* end demo panel */}

        {/* Microcopy */}
        <p className="mt-6 text-center text-xs text-slate-600">
          Free · No account required · Broker-reviewed guidance from Our Town Properties, Inc. · Not an appraisal.
        </p>
      </div>
    </section>
  );
}
