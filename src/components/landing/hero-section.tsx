"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { CTAChips } from "./cta-chips";
import { QuestionInput } from "./question-input";
import { TrustBar } from "./trust-bar";
import type { CTAChip } from "@/types/domain.types";

export function HeroSection() {
  const router = useRouter();
  const [selectedChip, setSelectedChip] = useState<CTAChip | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChipSelect = useCallback((chip: CTAChip, defaultQuestion: string) => {
    setSelectedChip(chip);
    setQuestion(defaultQuestion);
  }, []);

  const handleSubmit = useCallback(
    async (q: string, address: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (address) params.set("address", address);
        if (selectedChip) params.set("chip", selectedChip);

        router.push(`/ask?${params.toString()}`);
      } finally {
        setLoading(false);
      }
    },
    [router, selectedChip]
  );

  return (
    <section className="relative min-h-screen bg-hero-gradient overflow-hidden">
      {/* Gold accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />

      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #D4A017 0%, transparent 50%), radial-gradient(circle at 75% 75%, #C1272D 0%, transparent 50%)",
        }}
      />

      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-gold-400 text-xl">✦</span>
          <span className="text-sm font-medium text-slate-400 tracking-wide">
            Ask Magic Mike
          </span>
        </div>
        <span className="text-xs text-slate-500 tracking-widest uppercase">
          Our Town Properties
        </span>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-16 pt-12 max-w-3xl mx-auto text-center">
        {/* Eyebrow */}
        <p className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase text-gold-400">
          Gainesville&apos;s Local Real Estate AI
        </p>

        {/* H1 */}
        <h1
          className={cn(
            "font-display text-5xl font-bold leading-tight text-cream",
            "sm:text-6xl md:text-7xl lg:text-8xl",
            "mb-5"
          )}
        >
          Ask{" "}
          <span className="text-gold-shimmer">Magic</span>{" "}
          Mike
        </h1>

        {/* Subhead */}
        <p className="mb-10 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
          Local real estate answers, home values, and showing help from{" "}
          <span className="text-cream font-medium">Our Town Properties</span>.
          Real data. Real expertise. No runaround.
        </p>

        {/* Question input */}
        <QuestionInput
          initialQuestion={question}
          onSubmit={handleSubmit}
          loading={loading}
          className="w-full max-w-2xl text-left mb-5"
        />

        {/* CTA chips */}
        <CTAChips
          onSelect={handleChipSelect}
          selected={selectedChip}
          className="justify-center"
        />

        {/* Trust bar */}
        <TrustBar className="mt-14 w-full max-w-2xl" />
      </div>
    </section>
  );
}
