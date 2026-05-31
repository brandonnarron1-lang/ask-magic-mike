"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const FAQS = [
  {
    q: "Is this service free?",
    a: "Yes — completely free. Ask your question, get real answers. Mike earns his commission when a transaction closes, not from inquiries.",
  },
  {
    q: "Do I have to sign anything to ask a question?",
    a: "No. You can ask anonymously. We only ask for contact info if you want Mike to follow up personally — and you control how he reaches you.",
  },
  {
    q: "What's a Comparative Market Analysis (CMA) and can I get one?",
    a: "A CMA compares your home to recently sold properties nearby to estimate current market value. It's not an appraisal, but it's what agents use to price listings. Mike provides CMAs at no charge — just ask.",
  },
  {
    q: "How fast does Mike actually respond?",
    a: "Typically within minutes during business hours. The AI scores and routes your lead instantly — Mike gets notified immediately with your info and situation.",
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
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-400 mb-3">FAQ</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-cream">
            Real Questions.{" "}
            <span className="text-gold-shimmer">Straight Answers.</span>
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border transition-all duration-200 overflow-hidden",
                  isOpen
                    ? "border-gold-400/25 bg-white/[0.04]"
                    : "border-white/5 bg-white/[0.02] hover:border-gold-400/15"
                )}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    isOpen ? "text-cream" : "text-slate-300"
                  )}>
                    {faq.q}
                  </span>
                  <span className={cn(
                    "flex-shrink-0 ml-4 flex h-6 w-6 items-center justify-center rounded-full transition-all",
                    isOpen ? "bg-gold-400 text-midnight" : "bg-white/5 text-slate-400"
                  )}>
                    {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed text-slate-400">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          The information provided through this platform is for general informational purposes only
          and does not constitute legal, financial, or real estate advice. Consult a licensed
          professional for advice specific to your situation.
        </p>
      </div>
    </section>
  );
}
