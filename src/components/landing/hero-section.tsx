"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { CTAChips } from "./cta-chips";
import { QuestionInput } from "./question-input";
import {
  captureAttribution,
  type StoredAttribution,
} from "@/lib/attribution/client-storage";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";
import { mikePlatformAssets } from "@/lib/mikePlatformAssets";
import { siteConfig } from "@/lib/site-config";

function MikeVisualTrustBadge() {
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border border-gold-400/25 bg-gold-400/[0.07] px-3.5 py-1.5"
      style={{ boxShadow: "0 2px 12px rgba(212,160,23,0.10), inset 0 1px 0 rgba(212,160,23,0.08)" }}
    >
      <Image
        src={mikePlatformAssets.circularAvatar.src}
        alt={mikePlatformAssets.circularAvatar.alt}
        width={22}
        height={22}
        className="rounded-full object-cover ring-1 ring-gold-400/30"
      />
      <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gold-400/90">
        Mike Eatmon · Our Town Properties
      </span>
    </div>
  );
}

function MikeHeroPortrait({ priority }: { priority?: boolean }) {
  return (
    <div className="relative">
      {/* Smoke glow SVG ambient layer */}
      <div
        className="absolute -inset-8 pointer-events-none select-none"
        aria-hidden="true"
        style={{ transform: "scale(1.2)" }}
      >
        <Image
          src={brandPackAssets.accents.smokeGlow}
          alt=""
          fill
          sizes="600px"
          className="object-contain opacity-40"
        />
      </div>
      {/* Ambient glow behind portrait */}
      <div
        className="absolute -inset-6 rounded-3xl pointer-events-none"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse 75% 55% at 50% 90%, rgba(212,160,23,0.12) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-gold-400/12 bg-[#0D0B07]"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,160,23,0.06)" }}
      >
        <Image
          src={mikePlatformAssets.feedAd.src}
          alt={mikePlatformAssets.feedAd.alt}
          fill
          priority={priority}
          className="object-cover object-top"
          sizes="(max-width: 1024px) 100vw, 520px"
        />
      </div>
    </div>
  );
}
import type { CTAChip } from "@/types/domain.types";

/** Fire-and-forget funnel event; failures must never affect the hero. */
function logHeroEvent(
  eventName: "landing_page_viewed" | "cta_chip_clicked" | "cta_click",
  properties: Record<string, unknown>,
  attribution: StoredAttribution | null
) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      properties,
      utmSource: attribution?.utmSource ?? undefined,
      utmMedium: attribution?.utmMedium ?? undefined,
      utmCampaign: attribution?.utmCampaign ?? undefined,
    }),
    keepalive: true,
  }).catch(() => {});
}

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
  const attributionRef = useRef<StoredAttribution | null>(null);
  const viewLoggedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    attributionRef.current = captureAttribution();
    if (!viewLoggedRef.current) {
      viewLoggedRef.current = true;
      logHeroEvent(
        "landing_page_viewed",
        { path: typeof window !== "undefined" ? window.location.pathname : null },
        attributionRef.current
      );
    }
    return () => clearTimeout(t);
  }, []);

  const handleChipSelect = useCallback((chip: CTAChip, defaultQuestion: string) => {
    setSelectedChip(chip);
    setQuestion(defaultQuestion);
    logHeroEvent("cta_chip_clicked", { chip, surface: "landing_hero" }, attributionRef.current);
  }, []);

  const handleSubmit = useCallback(
    async (q: string, address: string) => {
      setLoading(true);
      try {
        logHeroEvent(
          "cta_click",
          { surface: "landing_hero", chip: selectedChip, hasAddress: Boolean(address) },
          attributionRef.current
        );
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
    <section
      className="relative overflow-hidden bg-[#0A0A0A] px-5 pb-16 sm:px-6 grain-overlay"
      data-amm-surface="landing-hero"
    >
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 8% 0%, rgba(212,160,23,0.10) 0%, transparent 65%),
              radial-gradient(ellipse 45% 45% at 92% 85%, rgba(212,160,23,0.05) 0%, transparent 65%),
              radial-gradient(ellipse 30% 40% at 50% 110%, rgba(193,39,45,0.03) 0%, transparent 60%)
            `,
          }}
        />
      </div>

      {/* ── Top accent ── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

      {/* ── Nav ── */}
      <header>
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between py-5">
        {/* Our Town Properties logo — real asset, not SVG placeholder */}
        <a
          href={siteConfig.parentBrandUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Our Town Properties, Inc."
          className={cn(
            "flex items-center gap-3 rounded-md opacity-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
            loaded && "animate-fade-in delay-100"
          )}
        >
          <Image
            src={brandPackAssets.logo.primary}
            alt="Our Town Properties, Inc."
            width={108}
            height={56}
            priority
            sizes="108px"
            className="h-auto w-auto"
          />
          <span className="hidden sm:block">
            <span className="block text-[13px] font-semibold tracking-tight text-[#F7F1E8]">
              Ask Magic Mike
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-gold-400/70 mt-0.5">
              by Our Town Properties
            </span>
          </span>
        </a>

        <div className={cn(
          "hidden md:flex items-center gap-6 text-[11px] text-slate-400 tracking-wide opacity-0",
          loaded && "animate-fade-in delay-200"
        )}>
          <span>Wilson, NC</span>
          <span className="text-gold-400/25">·</span>
          <a href={`tel:${siteConfig.agentPhone}`} className="hover:text-gold-400 transition-colors font-medium">
            {siteConfig.agentPhoneDisplay}
          </a>
          <span className="text-gold-400/25">·</span>
          <span className="text-slate-500">Licensed NC Broker</span>
        </div>

        <a
          href={`tel:${siteConfig.agentPhone}`}
          data-testid="nav-call-link"
          aria-label={`Call Mike at ${siteConfig.agentPhoneDisplay}`}
          onClick={() =>
            logHeroEvent(
              "cta_click",
              { surface: "landing_nav", cta: "call_mike" },
              attributionRef.current
            )
          }
          className={cn(
            "rounded-lg border border-gold-400/30 px-4 py-2 text-sm font-medium text-cream/90 opacity-0",
            "transition-colors hover:border-gold-400/60 hover:bg-gold-400/8",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
            loaded && "animate-scale-in delay-300"
          )}
        >
          Call Mike
        </a>
      </nav>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 pb-8 pt-5 md:pb-14 lg:min-h-[calc(100svh-88px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,520px)] lg:gap-16">
        <div
          className="min-w-0 text-left"
          data-hero-text="true"
          data-mike-layout="split"
        >
          <div className={cn("mb-6 opacity-0", loaded && "animate-fade-up delay-100")}>
            <MikeVisualTrustBadge />
          </div>

          <div className={cn("mb-5 opacity-0", loaded && "animate-fade-up delay-150")}>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-gold-400/90">
              An Our Town Properties guidance tool
            </p>
          </div>

          <div className={cn("mb-6 opacity-0 relative", loaded && "animate-fade-up delay-200")}>
            {/* Sparkle accent — purely decorative, positioned near the headline */}
            <span
              className="absolute -top-3 -right-2 sm:right-8 opacity-60 pointer-events-none select-none"
              aria-hidden="true"
            >
              <Image
                src={brandPackAssets.accents.sparkle}
                alt=""
                width={28}
                height={28}
                className="opacity-70"
              />
            </span>
            <h1 className="font-display text-6xl font-black leading-[0.9] text-cream sm:text-7xl lg:text-8xl xl:text-9xl">
              <span className="block">Ask</span>
              <span className="block">
                <span className="text-gold-shimmer italic">Magic</span>
              </span>
              <span className="block">Mike</span>
            </h1>
          </div>

          <p className={cn(
            "mb-3 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl font-light opacity-0",
            loaded && "animate-fade-up delay-300"
          )}>
            Local Wilson-area real estate guidance from Mike Eatmon and
            Our Town Properties — broker review first, not a blind estimate.
          </p>

          <p className={cn(
            "mb-7 text-sm text-slate-500 opacity-0",
            loaded && "animate-fade-up delay-350"
          )}>
            Wilson, NC · Eastern NC · Free starting point · Not an appraisal · Follow-up timing may vary
          </p>

          <div
            className={cn("w-full max-w-2xl opacity-0", loaded && "animate-scale-in delay-400")}
            data-primary-cta="true"
          >
            <QuestionInput
              initialQuestion={question}
              onSubmit={handleSubmit}
              loading={loading}
              className="w-full text-left"
            />
          </div>

          <div className={cn("mt-5 opacity-0", loaded && "animate-fade-up delay-500")}>
            <CTAChips onSelect={handleChipSelect} selected={selectedChip} className="justify-start" />
          </div>

          {/* Broker trust strip — visible directly below CTA chips */}
          <div className={cn("mt-5 opacity-0", loaded && "animate-fade-up delay-550")}>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500"
              data-trust-strip="broker-reviewed"
            >
              <span className="font-medium text-slate-400">Our Town Properties, Inc.</span>
              <span className="text-gold-400/30">·</span>
              <span>Wilson, NC</span>
              <span className="text-gold-400/30">·</span>
              <span>Mike Eatmon</span>
              <span className="text-gold-400/30">·</span>
              <span className="text-gold-400/80 font-medium">Broker-reviewed guidance</span>
              <span className="text-gold-400/30">·</span>
              <span className="italic">Not an appraisal.</span>
            </div>
          </div>

          <div className={cn("mt-8 w-full max-w-2xl opacity-0", loaded && "animate-fade-up delay-600")}>
            <div className="relative overflow-hidden rounded-2xl border border-gold-400/[0.13] bg-[#0D0B07]/70 backdrop-blur-sm"
              style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.08), 0 1px 0 rgba(0,0,0,0.5)" }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 100% 200% at 50% -10%, rgba(212,160,23,0.05) 0%, transparent 60%)" }} />
              <div className="relative grid grid-cols-2 sm:grid-cols-4 divide-x divide-gold-400/[0.08]">
                {STATS.map((s, i) => (
                  <div key={s.label} className={cn("px-5 py-4 text-center", i >= 2 && "border-t border-gold-400/[0.08] sm:border-t-0")}>
                    <div className="font-bebas text-2xl leading-none tracking-wider text-gold-300 sm:text-3xl">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[10px] leading-tight text-slate-500 uppercase tracking-[0.09em]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={cn("mx-auto w-full max-w-[500px] opacity-0", loaded && "animate-fade-up delay-300")}>
          <MikeHeroPortrait priority />
        </div>
      </div>

      {/* Bottom section fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
    </section>
  );
}

