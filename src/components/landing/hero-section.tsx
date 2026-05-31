"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { CTAChips } from "./cta-chips";
import { QuestionInput } from "./question-input";
import type { CTAChip } from "@/types/domain.types";

// Floating spark positions (deterministic to avoid hydration mismatch)
const SPARKS = [
  { x: 8,  y: 18, size: 1.5, delay: 0    },
  { x: 92, y: 12, size: 1,   delay: 1.2  },
  { x: 23, y: 72, size: 2,   delay: 0.6  },
  { x: 78, y: 65, size: 1.5, delay: 2.1  },
  { x: 55, y: 88, size: 1,   delay: 0.9  },
  { x: 15, y: 45, size: 1,   delay: 1.8  },
  { x: 88, y: 40, size: 2,   delay: 0.3  },
  { x: 42, y: 8,  size: 1.5, delay: 1.5  },
  { x: 65, y: 30, size: 1,   delay: 2.4  },
  { x: 35, y: 55, size: 2,   delay: 0.7  },
];

const STATS = [
  { value: "Since 1993", label: "Licensed & active"  },
  { value: "$750M+",     label: "Career sales"        },
  { value: "2,500+",     label: "Homes sold"          },
  { value: "Wilson, NC", label: "Home base"           },
];

export function HeroSection() {
  const router = useRouter();
  const [selectedChip, setSelectedChip] = useState<CTAChip | null>(null);
  const [question, setQuestion]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [loaded, setLoaded]             = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleChipSelect = useCallback((chip: CTAChip, defaultQuestion: string) => {
    setSelectedChip(chip);
    setQuestion(defaultQuestion);
  }, []);

  const handleSubmit = useCallback(
    async (q: string, address: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q)            params.set("q",       q);
        if (address)      params.set("address", address);
        if (selectedChip) params.set("chip",    selectedChip);
        router.push(`/ask?${params.toString()}`);
      } finally {
        setLoading(false);
      }
    },
    [router, selectedChip]
  );

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0A0A0A]">

      {/* ── Animated mesh gradient ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-100"
          style={{
            background: `
              radial-gradient(ellipse 70% 60% at 15% 10%, rgba(212,160,23,0.10) 0%, transparent 65%),
              radial-gradient(ellipse 50% 70% at 85% 80%, rgba(193,39,45,0.06) 0%, transparent 65%),
              radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,160,23,0.04) 0%, transparent 70%)
            `,
          }}
        />
      </div>

      {/* ── Video (dimmed) ── */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-20 scale-105"
        src="/video/mike-loop.mp4"
        autoPlay muted loop playsInline preload="auto"
        style={{ filter: "saturate(0.4) brightness(0.7)" }}
      />
      <div className="video-overlay absolute inset-0" />

      {/* ── Floating sparks ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-gold-400 animate-float"
            style={{
              left: `${s.x}%`,
              top:  `${s.y}%`,
              width:  `${s.size}px`,
              height: `${s.size}px`,
              opacity: 0.35,
              animationDelay: `${s.delay}s`,
              animationDuration: `${3.5 + s.delay * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* ── Top accent ── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-70" />

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className={cn(
          "flex items-center gap-3 opacity-0",
          loaded && "animate-fade-in delay-100"
        )}>
          <OurTownIcon size={34} />
          <div>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-gold-400 leading-none">Our Town</div>
            <div className="text-[10px] tracking-[0.1em] uppercase text-slate-500 leading-none mt-0.5">Properties, Inc.</div>
          </div>
        </div>

        <div className={cn(
          "hidden md:flex items-center gap-6 text-[11px] text-slate-400 tracking-wide opacity-0",
          loaded && "animate-fade-in delay-200"
        )}>
          <span>Wilson, NC</span>
          <span className="text-gold-400/30">·</span>
          <a href="tel:2522454337" className="hover:text-gold-400 transition-colors font-medium">
            252-245-4337
          </a>
          <span className="text-gold-400/30">·</span>
          <span className="text-slate-500">Licensed NC Broker</span>
        </div>

        <div className={cn(
          "sold-badge px-3.5 py-1.5 rounded-sm cursor-default opacity-0",
          loaded && "animate-scale-in delay-300"
        )}>
          <span className="font-bebas text-sm tracking-[0.2em] text-cream/90">
            CALL MAGIC MIKE
          </span>
        </div>
      </nav>

      {/* ── Main hero content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-24 pt-6 max-w-4xl mx-auto text-center">

        {/* Eyebrow */}
        <div className={cn(
          "mb-7 inline-flex items-center gap-2.5 rounded-full px-5 py-2 opacity-0",
          "border border-gold-400/20 bg-gold-400/[0.07] backdrop-blur-sm",
          loaded && "animate-fade-up delay-100"
        )}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-400" />
          </span>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-300">
            Eastern NC&apos;s Real Estate AI
          </span>
        </div>

        {/* H1 — massive display with clip reveal */}
        <div className={cn(
          "mb-6 opacity-0",
          loaded && "animate-fade-up delay-200"
        )}>
          <h1 className="font-display leading-[0.88] font-black text-cream"
            style={{ fontSize: "clamp(4rem, 13vw, 9rem)" }}
          >
            <span className="block">Ask</span>
            <span className="block relative">
              <span className="text-gold-shimmer italic">Magic</span>
            </span>
            <span className="block">Mike</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className={cn(
          "mb-3 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl font-light opacity-0",
          loaded && "animate-fade-up delay-300"
        )}>
          Real home values. Real market timing. Real answers —
          from Eastern NC&apos;s most trusted closer.
        </p>

        <p className={cn(
          "mb-10 text-sm text-slate-500 opacity-0",
          loaded && "animate-fade-up delay-350"
        )}>
          Free · No account · No pressure · Response in minutes
        </p>

        {/* Input card */}
        <div className={cn(
          "w-full max-w-2xl opacity-0",
          loaded && "animate-scale-in delay-400"
        )}>
          <QuestionInput
            initialQuestion={question}
            onSubmit={handleSubmit}
            loading={loading}
            className="w-full text-left"
          />
        </div>

        {/* CTA chips */}
        <div className={cn(
          "mt-5 opacity-0",
          loaded && "animate-fade-up delay-500"
        )}>
          <CTAChips onSelect={handleChipSelect} selected={selectedChip} className="justify-center" />
        </div>

        {/* Stats bar */}
        <div className={cn(
          "mt-14 w-full max-w-2xl opacity-0",
          loaded && "animate-fade-up delay-600"
        )}>
          <div className="card-gradient-border p-px">
            <div className="rounded-2xl bg-[#0D0B07]/90 backdrop-blur-sm px-6 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-gold-400/10">
                {STATS.map((s, i) => (
                  <div key={s.label} className={cn(
                    "text-center",
                    i > 0 && "pl-4"
                  )}>
                    <div className="font-bebas text-3xl tracking-wider text-gold-400 leading-none">
                      {s.value}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className={cn(
          "mt-16 flex flex-col items-center gap-2 opacity-0",
          loaded && "animate-fade-in delay-800"
        )}>
          <span className="text-[10px] tracking-[0.2em] uppercase text-slate-600">Scroll to explore</span>
          <div className="w-px h-10 bg-gradient-to-b from-gold-400/30 to-transparent" />
        </div>
      </div>

      {/* Bottom section fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
    </section>
  );
}

function OurTownIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="57" height="57" rx="5" fill="#0A0A0A" stroke="#D4A017" strokeWidth="2"/>
      <path d="M30 9 C17.5 9 9 19.5 9 29 L9 51 L19 51 L19 37 L41 37 L41 51 L51 51 L51 29 C51 19.5 42.5 9 30 9Z"
        fill="none" stroke="#D4A017" strokeWidth="2.2" strokeLinejoin="round"/>
      <rect x="23" y="37" width="14" height="14" rx="1.5" fill="none" stroke="#D4A017" strokeWidth="1.8"/>
      <rect x="13" y="23" width="9" height="11" rx="1.5" fill="none" stroke="#D4A017" strokeWidth="1.5"/>
      <rect x="38" y="23" width="9" height="11" rx="1.5" fill="none" stroke="#D4A017" strokeWidth="1.5"/>
    </svg>
  );
}
