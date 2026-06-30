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
import type { CTAChip } from "@/types/domain.types";

/* ─────────────────────────────────────────────────────────────────────────
   TRUST BADGE
───────────────────────────────────────────────────────────────────────── */
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
      <span className="text-xs font-semibold tracking-label uppercase text-gold-400/90">
        Mike Eatmon · Our Town Properties
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO CONVERSATION PREVIEW (floating AI card)
───────────────────────────────────────────────────────────────────────── */
function HeroConversationPreview() {
  return (
    <div
      className="relative w-[300px] sm:w-[360px] rounded-2xl overflow-hidden"
      style={{
        background: "rgba(13,11,7,0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(212,160,23,0.28)",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,160,23,0.10), inset 0 1px 0 rgba(212,160,23,0.14)",
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b border-gold-400/[0.12]"
        style={{ background: "rgba(212,160,23,0.06)" }}
      >
        <div className="relative flex-shrink-0">
          <Image
            src={mikePlatformAssets.circularAvatar.src}
            alt="Mike Eatmon"
            width={28}
            height={28}
            className="rounded-full object-cover ring-1 ring-gold-400/40"
          />
          {/* Live dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D0B07]"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-cream/90 leading-none">Magic Mike</p>
          <p className="text-[10px] uppercase tracking-label text-gold-400/60 mt-0.5">AI · Wilson, NC</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          <span className="text-[10px] text-emerald-400/80 uppercase tracking-label">Live</span>
        </div>
      </div>

      {/* Conversation */}
      <div className="px-4 py-3 space-y-3">
        {/* User bubble */}
        <div className="flex justify-end">
          <div
            className="max-w-[85%] rounded-xl rounded-br-sm px-3 py-2"
            style={{ background: "rgba(212,160,23,0.14)", border: "1px solid rgba(212,160,23,0.22)" }}
          >
            <p className="text-xs text-cream/90 leading-relaxed">
              What&apos;s my home worth in Wilson?
            </p>
          </div>
        </div>

        {/* Mike bubble */}
        <div className="flex justify-start gap-2">
          <Image
            src={mikePlatformAssets.circularAvatar.src}
            alt=""
            width={20}
            height={20}
            className="rounded-full object-cover ring-1 ring-gold-400/30 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div
            className="max-w-[88%] rounded-xl rounded-bl-sm px-3 py-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on recent comparable sales, homes in central Wilson with similar specs are trading between{" "}
              <span className="text-gold-300 font-semibold">$185K–$235K</span> right now. Want me to run the full analysis?
            </p>
          </div>
        </div>

        {/* Lead score bar */}
        <div
          className="rounded-lg px-3 py-2 mt-1"
          style={{ background: "rgba(212,160,23,0.06)", border: "1px solid rgba(212,160,23,0.12)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-label text-gold-400/70">Seller Match Score</span>
            <span className="text-[11px] font-bebas text-gold-300 leading-none">87</span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: "87%",
                background: "linear-gradient(90deg, rgba(212,160,23,0.6) 0%, rgba(212,160,23,1) 100%)",
                boxShadow: "0 0 6px rgba(212,160,23,0.5)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MIKE HERO PORTRAIT (with floating card overlay)
───────────────────────────────────────────────────────────────────────── */
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
          background:
            "radial-gradient(ellipse 75% 55% at 50% 90%, rgba(212,160,23,0.15) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Portrait card */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-gold-400/12 bg-[#0D0B07]"
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

        {/* Subtle inner vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to top, rgba(10,8,4,0.55) 0%, transparent 40%), linear-gradient(to bottom, rgba(10,8,4,0.2) 0%, transparent 25%)",
          }}
        />
      </div>

      {/* Floating conversation card — top-right, lg+ only (portrait wide enough to contain it) */}
      <div
        className="absolute -top-6 -right-8 z-20 pointer-events-none hidden lg:block xl:-right-12"
        style={{ transform: "rotate(-2deg)" }}
        aria-hidden="true"
      >
        <HeroConversationPreview />
      </div>

      {/* Floating metric badge — bottom-left */}
      <div
        className="absolute -bottom-3 -left-4 z-20"
        style={{
          background: "rgba(13,11,7,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(212,160,23,0.35)",
          borderRadius: "12px",
          padding: "10px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,160,23,0.08), inset 0 1px 0 rgba(212,160,23,0.12)",
        }}
      >
        <p className="font-bebas text-2xl leading-none tracking-wide text-gold-300">2,500+</p>
        <p className="text-[9px] uppercase tracking-label text-gold-400/70 mt-0.5">Homes Sold</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ANALYTICS — fire-and-forget; failures must never affect the hero.
───────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
   STATS — unchanged
───────────────────────────────────────────────────────────────────────── */
const STATS = [
  { value: "Since 1993", label: "Licensed & active" },
  { value: "$750M+",     label: "Career sales"       },
  { value: "2,500+",     label: "Homes sold"         },
  { value: "Wilson, NC", label: "Home base"          },
];

/* ─────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────── */
export function HeroSection() {
  const router = useRouter();
  const [selectedChip, setSelectedChip] = useState<CTAChip | null>(null);
  const [question, setQuestion]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [loaded, setLoaded]             = useState(false);
  const [navScrolled, setNavScrolled]   = useState(false);
  const attributionRef = useRef<StoredAttribution | null>(null);
  const viewLoggedRef  = useRef(false);

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

    // Frosted-glass nav on scroll
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
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
      {/* ── Deep atmospheric background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(212,160,23,0.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Layered ambient gradients */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 60% at 5% -5%,  rgba(212,160,23,0.13) 0%, transparent 60%),
              radial-gradient(ellipse 50% 50% at 95% 90%, rgba(212,160,23,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 35% 45% at 50% 115%, rgba(193,39,45,0.05) 0%, transparent 55%),
              radial-gradient(ellipse 80% 40% at 50% 50%,  rgba(212,160,23,0.025) 0%, transparent 70%)
            `,
          }}
        />
      </div>

      {/* ── Top accent line ── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

      {/* ── Nav ── */}
      <header>
        <nav
          className={cn(
            "sticky top-0 z-40 mx-auto flex max-w-7xl items-center justify-between py-5 transition-all duration-300",
            navScrolled && [
              "rounded-b-xl px-4",
              "border-b border-gold-400/[0.10]",
            ]
          )}
          style={
            navScrolled
              ? {
                  background: "rgba(10,10,10,0.80)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }
              : undefined
          }
        >
          {/* Logo + wordmark */}
          <a
            href={siteConfig.parentBrandUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Our Town Properties, Inc."
            className={cn(
              "flex items-center gap-3 rounded-md opacity-0 motion-reduce:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
              loaded && "motion-safe:animate-fade-in motion-safe:delay-100"
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
              <span className="block text-sm font-semibold tracking-tight text-cream">
                Ask Magic Mike
              </span>
              <span className="block text-[10px] uppercase tracking-label text-gold-400/70 mt-0.5">
                by Our Town Properties
              </span>
            </span>
          </a>

          {/* Center links */}
          <div
            className={cn(
              "hidden md:flex items-center gap-6 text-xs text-slate-400 tracking-wide opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-in motion-safe:delay-200"
            )}
          >
            <span>Wilson, NC</span>
            <span className="text-gold-400/25">·</span>
            <a
              href={`tel:${siteConfig.agentPhone}`}
              className="hover:text-gold-400 transition-colors font-medium"
            >
              {siteConfig.agentPhoneDisplay}
            </a>
            <span className="text-gold-400/25">·</span>
            <a
              href="/value"
              className="hover:text-gold-400 transition-colors font-medium"
              data-nav-link="home-value"
            >
              Home Value
            </a>
            <span className="text-gold-400/25">·</span>
            <span className="text-slate-500">Licensed NC Broker</span>
          </div>

          {/* Call CTA */}
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
              "rounded-lg border border-gold-400/30 px-4 py-2 text-sm font-medium text-cream/90 opacity-0 motion-reduce:opacity-100",
              "transition-colors hover:border-gold-400/60 hover:bg-gold-400/8",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
              loaded && "motion-safe:animate-scale-in motion-safe:delay-300"
            )}
          >
            Call Mike
          </a>
        </nav>
      </header>

      {/* ── Main grid ── */}
      <div className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-10 pb-8 pt-4 md:pb-14 md:min-h-[calc(100svh-76px)] md:grid-cols-[1fr_340px] md:gap-10 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px] lg:gap-20">

        {/* ── Left: headline + CTA ── */}
        <div
          className="min-w-0 text-left"
          data-hero-text="true"
          data-mike-layout="split"
        >
          {/* Trust badge — shown from sm; Mike card handles below-md */}
          <div
            className={cn(
              "mb-5 hidden sm:block opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-100"
            )}
          >
            <MikeVisualTrustBadge />
          </div>

          {/* Mobile/tablet Mike portrait — hidden when portrait column shows at md+ */}
          <div
            className={cn(
              "mb-5 flex items-center gap-3 md:hidden opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-100"
            )}
          >
            <div
              className="relative flex-shrink-0"
              style={{
                boxShadow: "0 0 0 1px rgba(212,160,23,0.30), 0 8px 24px rgba(0,0,0,0.5)",
                borderRadius: "9999px",
              }}
            >
              <Image
                src={mikePlatformAssets.circularAvatar.src}
                alt="Mike Eatmon"
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
              <span
                className="absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0A0A0A]"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-cream leading-snug">Mike Eatmon</p>
              <p className="text-xs text-slate-400">Broker · Our Town Properties · Wilson NC</p>
              <p className="mt-1 text-[10px] text-gold-400/70 uppercase tracking-label">Since 1993 · 2,500+ homes</p>
            </div>
          </div>

          {/* Headline — THE focal point */}
          <div
            className={cn(
              "mb-5 sm:mb-6 opacity-0 motion-reduce:opacity-100 relative",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-150"
            )}
          >
            {/* Ambient glow behind the headline */}
            <div
              className="absolute -inset-8 pointer-events-none"
              aria-hidden="true"
              style={{
                background: "radial-gradient(ellipse 70% 60% at 10% 50%, rgba(212,160,23,0.08) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            <h1 className="relative font-display text-hero font-black text-cream" style={{ lineHeight: 0.88, letterSpacing: "-0.02em" }}>
              <span className="block">Ask</span>
              <span className="block">
                <span className="text-gold-shimmer italic">Magic</span>
              </span>
              <span className="block">Mike.</span>
            </h1>
          </div>

          {/* CTA chips — entry points ABOVE the input */}
          <div
            className={cn(
              "mb-4 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-250"
            )}
          >
            <CTAChips onSelect={handleChipSelect} selected={selectedChip} className="justify-start" />
          </div>

          {/* Question input — primary conversion action */}
          <div
            className={cn(
              "w-full max-w-[640px] opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-scale-in motion-safe:delay-350"
            )}
            data-primary-cta="true"
          >
            {/* Cinematic input wrapper */}
            <div
              className="relative rounded-2xl p-[1px] overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(212,160,23,0.4) 0%, rgba(212,160,23,0.08) 50%, rgba(212,160,23,0.2) 100%)",
                boxShadow: "0 0 60px rgba(212,160,23,0.12), 0 24px 80px rgba(0,0,0,0.6)",
              }}
            >
              <div className="rounded-[15px] bg-[#0A0806]">
                <QuestionInput
                  initialQuestion={question}
                  onSubmit={handleSubmit}
                  loading={loading}
                  compact
                  className="w-full text-left !border-transparent !shadow-none bg-transparent backdrop-blur-none"
                />
              </div>
            </div>
          </div>

          {/* Trust footer + seller link */}
          <div
            className={cn(
              "mt-4 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-450"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-600">
                <span>Free · No account</span>
                <span className="text-gold-400/25">·</span>
                <span>Our Town Properties, Inc.</span>
                <span className="text-gold-400/25">·</span>
                <span className="text-gold-400/70">Broker-reviewed guidance. Not an appraisal.</span>
              </div>
              <a
                href="/value"
                data-cta-link="value-deep-link"
                className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/20 bg-gold-400/[0.07] px-3.5 py-1 text-[11.5px] font-medium text-gold-300 hover:border-gold-400/40 hover:text-gold-200 transition-colors"
              >
                Seller? Get a home value estimate →
              </a>
            </div>
          </div>
        </div>

        {/* ── Right: Mike portrait ── */}
        <div
          className={cn(
            "mx-auto w-full max-w-[500px] lg:max-w-none opacity-0 motion-reduce:opacity-100",
            loaded && "motion-safe:animate-fade-up motion-safe:delay-250"
          )}
        >
          <MikeHeroPortrait priority />
        </div>
      </div>

      {/* ── Below-fold stats bar ── */}
      <div
        className={cn(
          "relative z-10 mx-auto max-w-[1400px] pb-14 opacity-0 motion-reduce:opacity-100",
          loaded && "motion-safe:animate-fade-up motion-safe:delay-600"
        )}
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-gold-400/[0.12] bg-[#0D0B07]/70 backdrop-blur-sm"
          style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.08)" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/35 to-transparent" />
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gold-400/[0.07]">
            {STATS.map((s, i) => (
              <div key={s.label} className={cn("px-6 py-5 text-center", i >= 2 && "border-t border-gold-400/[0.07] sm:border-t-0")}>
                <div className="font-bebas text-4xl leading-none tracking-wider text-gold-300 sm:text-5xl">{s.value}</div>
                <div className="mt-2 text-[10px] leading-tight text-slate-500 uppercase tracking-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
    </section>
  );
}
