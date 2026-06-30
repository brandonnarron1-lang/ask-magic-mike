"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Reveal } from "@/components/ui/reveal";
import { Phone } from "lucide-react";

const FAQS = [
  {
    q: "Is this a formal home valuation?",
    a: "No. Ask Magic Mike is not an appraisal — it is broker-reviewed local guidance from a licensed broker. Formal valuations by licensed appraisers are required for lending or legal purposes. What you get here is local broker context to help you understand your position and your options.",
  },
  {
    q: "What happens after I submit?",
    a: "Your request goes directly to Mike Eatmon at Our Town Properties. Mike or his team reviews your details and follows up with local broker-reviewed guidance. You are not automatically enrolled in any program — this is a direct request for follow-up from a licensed broker.",
  },
  {
    q: "Is this service free?",
    a: "Yes — completely free. Ask your question, get real answers. Mike earns his commission when a transaction closes, not from inquiries.",
  },
  {
    q: "Do I have to sign anything to ask a question?",
    a: "No. You can ask anonymously. We only ask for contact info if you want Mike to follow up — and you control how he reaches you.",
  },
  {
    q: "What's a Comparative Market Analysis (CMA) and can I get one?",
    a: "A CMA compares your home to recently sold properties nearby to estimate current market value. It's not an appraisal, but it's what agents use to price listings. Mike provides CMAs at no charge — just ask.",
  },
  {
    q: "How fast does Mike respond?",
    a: "Response timing varies. Mike and the Our Town Properties team prioritize every request and follow up during business hours. We don't promise specific turnaround times — we promise local broker attention, not an automated response.",
  },
  {
    q: "What areas does Mike serve?",
    a: "Mike serves Wilson and Eastern North Carolina, including Rocky Mount, Bailey, Sims, Elm City, Kenly, Middlesex, Smithfield, Clayton, and Greenville — approximately a 45–60 mile radius of Wilson.",
  },
  {
    q: "What if I'm just exploring and not ready to buy or sell?",
    a: "Perfect. That's exactly who this is for. Ask your questions now, understand your position, and make the decision on your timeline — not an agent's timeline.",
  },
];

export function FaqStrip() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-24 px-6 bg-[#0A0A0A]">
      <div className="gold-rule absolute top-0 inset-x-0" />

      <div className="max-w-3xl mx-auto">
        <Reveal variant="fade-up">
          <div className="text-center mb-14">
            {/* Gold pill eyebrow badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mb-5"
              style={{
                background: "linear-gradient(135deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)",
                border: "1px solid rgba(212,160,23,0.35)",
                boxShadow: "0 0 20px rgba(212,160,23,0.08)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <span className="text-[11px] font-black tracking-kicker uppercase text-gold-400">FAQ</span>
            </div>
            <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream">
              Real Questions.{" "}
              <span className="text-gold-shimmer">Straight Answers.</span>
            </h2>
          </div>
        </Reveal>

        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border transition-all duration-300 overflow-hidden",
                  isOpen
                    ? "border-gold-400/30 bg-white/[0.04]"
                    : "border-white/5 bg-white/[0.02]"
                )}
                style={isOpen ? { boxShadow: "0 0 0 1px rgba(212,160,23,0.08), 0 4px 24px rgba(0,0,0,0.3)" } : {}}
              >
                {/* Left gold border accent — animates in when open */}
                <div
                  className="flex"
                  style={isOpen ? {
                    borderLeft: "3px solid rgba(212,160,23,0.7)",
                    animation: "faqBorderIn 0.25s ease forwards",
                  } : { borderLeft: "3px solid transparent" }}
                >
                  <div className="flex-1">
                    <button
                      className={cn(
                        "w-full flex items-center justify-between px-6 py-4 text-left",
                        "transition-colors duration-200",
                        !isOpen && "hover:bg-white/[0.03]"
                      )}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className={cn(
                        "text-sm font-medium transition-colors",
                        isOpen ? "text-cream" : "text-slate-300"
                      )}>
                        {faq.q}
                      </span>

                      {/* Rotating chevron */}
                      <span className={cn(
                        "flex-shrink-0 ml-4 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                        isOpen ? "bg-gold-400/20 border border-gold-400/40" : "bg-white/5 border border-white/10"
                      )}>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-300",
                            isOpen ? "text-gold-400 rotate-180" : "text-slate-400 rotate-0"
                          )}
                        />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-5">
                        <p className="text-sm leading-relaxed text-slate-400">{faq.a}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* "Still have questions?" CTA row — glass card */}
        <Reveal variant="fade-up" delay={200}>
          <div
            className="mt-10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 px-7 py-6"
            style={{
              background: "linear-gradient(135deg, rgba(212,160,23,0.07) 0%, rgba(255,255,255,0.03) 100%)",
              border: "1px solid rgba(212,160,23,0.2)",
              boxShadow: "inset 0 1px 0 rgba(212,160,23,0.08), 0 8px 32px rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div>
              <p className="text-sm font-semibold text-cream mb-1">Still have questions?</p>
              <p className="text-xs text-slate-400">Mike picks up the phone. Try him.</p>
            </div>
            <a
              href="tel:2522454337"
              className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-bold text-midnight shrink-0 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #D4A017 0%, #B8860B 100%)",
                boxShadow: "0 4px 20px rgba(212,160,23,0.30)",
              }}
            >
              <Phone className="h-4 w-4" />
              Call Mike → 252-245-4337
            </a>
          </div>
        </Reveal>

        <p className="mt-8 text-center text-xs text-slate-600">
          The information provided through this platform is for general informational purposes only
          and does not constitute legal, financial, or real estate advice. Consult a licensed
          professional for advice specific to your situation.
        </p>
      </div>

      <style>{`
        @keyframes faqBorderIn {
          from { border-left-color: transparent; }
          to   { border-left-color: rgba(212,160,23,0.7); }
        }
      `}</style>
    </section>
  );
}
