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
      className="relative w-[270px] sm:w-[300px] rounded-2xl overflow-hidden"
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
          <p className="text-[11px] font-semibold text-cream/90 leading-none">Magic Mike</p>
          <p className="text-[9px] uppercase tracking-label text-gold-400/60 mt-0.5">AI · Wilson, NC</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          <span className="text-[9px] text-emerald-400/80 uppercase tracking-label">Live</span>
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
            <p className="text-[11px] text-cream/90 leading-relaxed">
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
            <p className="text-[11px] text-slate-300 leading-relaxed">
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

      {/* Floating conversation card — top-right */}
      <div
        className="absolute -top-4 -right-6 z-20 pointer-events-none hidden sm:block"
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
   TRUST STRIP — powered-by / social proof indicators
───────────────────────────────────────────────────────────────────────── */
function TrustStrip() {
  const items = [
    "30+ Years Active",
    "NC Licensed Broker",
    "Broker-Reviewed Guidance",
    "2,500+ Homes Closed",
    "Wilson & Eastern NC",
    "$750M+ Career Sales",
    "Free · No Account",
  ];
  return (
    <div className="relative overflow-hidden py-1" aria-label="Trust indicators">
      {/* Fade masks */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10"
        style={{ background: "linear-gradient(to right, #0A0A0A, transparent)" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10"
        style={{ background: "linear-gradient(to left, #0A0A0A, transparent)" }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-none whitespace-nowrap pb-0.5">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2.5 flex-shrink-0">
            <span
              className="block h-1 w-1 rounded-full flex-shrink-0"
              style={{ background: "rgba(212,160,23,0.5)" }}
              aria-hidden="true"
            />
            <span className="text-[10px] uppercase tracking-label text-slate-500 font-medium">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 pb-8 pt-5 md:pb-14 lg:min-h-[calc(100svh-88px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,520px)] lg:gap-16">

        {/* ── Left: copy + CTA ── */}
        <div
          className="min-w-0 text-left"
          data-hero-text="true"
          data-mike-layout="split"
        >
          {/* Trust badge */}
          <div
            className={cn(
              "mb-6 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-100"
            )}
          >
            <MikeVisualTrustBadge />
          </div>

          {/* Kicker */}
          <div
            className={cn(
              "mb-5 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-150"
            )}
          >
            <p className="text-xs font-semibold tracking-kicker uppercase text-gold-400/90">
              An Our Town Properties guidance tool
            </p>
          </div>

          {/* Headline */}
          <div
            className={cn(
              "mb-6 opacity-0 motion-reduce:opacity-100 relative",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-200"
            )}
          >
            {/* Decorative accent line before heading */}
            <div
              className="mb-4 flex items-center gap-3"
              aria-hidden="true"
            >
              <div
                className="h-px flex-1 max-w-[48px]"
                style={{
                  background:
                    "linear-gradient(to right, rgba(212,160,23,0.6), rgba(212,160,23,0.15))",
                }}
              />
              <span
                className="block h-1 w-1 rounded-full"
                style={{ background: "rgba(212,160,23,0.5)" }}
              />
            </div>

            {/* Sparkle accent */}
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

            <h1 className="font-display text-hero font-black leading-[0.9] text-cream">
              <span className="block">Ask</span>
              <span className="block">
                <span className="text-gold-shimmer italic">Magic</span>
              </span>
              <span className="block">Mike</span>
            </h1>
          </div>

          {/* Body copy */}
          <p
            className={cn(
              "mb-3 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl font-light opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-300"
            )}
          >
            Real answers from the broker who&apos;s closed 2,500+ homes in
            Eastern NC. Ask anything — Mike Eatmon reviews every request personally.
          </p>

          <p
            className={cn(
              "mb-7 text-sm text-slate-500 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-350"
            )}
          >
            Wilson, NC · Eastern NC · Free · No account · Not an appraisal
          </p>

          {/* Question input */}
          <div
            className={cn(
              "w-full max-w-2xl opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-scale-in motion-safe:delay-400"
            )}
            data-primary-cta="true"
          >
            <QuestionInput
              initialQuestion={question}
              onSubmit={handleSubmit}
              loading={loading}
              className="w-full text-left"
            />
          </div>

          {/* CTA chips */}
          <div
            className={cn(
              "mt-5 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-500"
            )}
          >
            <CTAChips onSelect={handleChipSelect} selected={selectedChip} className="justify-start" />
            <p className="mt-3 text-xs text-slate-500">
              Seller?{" "}
              <a
                href="/value"
                className="text-gold-400/80 hover:text-gold-400 underline underline-offset-2 transition-colors"
                data-cta-link="value-deep-link"
              >
                Get a structured home value estimate →
              </a>
            </p>
          </div>

          {/* Broker trust strip */}
          <div
            className={cn(
              "mt-5 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-550"
            )}
          >
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"
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

          {/* ── Powered-by trust strip ── */}
          <div
            className={cn(
              "mt-6 opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-600"
            )}
          >
            <div
              className="rounded-xl border border-gold-400/[0.09] overflow-hidden"
              style={{ background: "rgba(13,11,7,0.5)" }}
            >
              <div className="border-b border-gold-400/[0.07] px-4 py-1.5">
                <span className="text-[9px] uppercase tracking-label text-gold-400/40 font-semibold">
                  Powered by 30+ years of real deals
                </span>
              </div>
              <div className="px-4 py-2.5">
                <TrustStrip />
              </div>
            </div>
          </div>

          {/* ── Stats bar ── */}
          <div
            className={cn(
              "mt-6 w-full max-w-2xl opacity-0 motion-reduce:opacity-100",
              loaded && "motion-safe:animate-fade-up motion-safe:delay-700"
            )}
          >
            <div
              className="group relative overflow-hidden rounded-2xl border border-gold-400/[0.13] bg-[#0D0B07]/70 backdrop-blur-sm transition-all duration-500 hover:border-gold-400/25"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(212,160,23,0.08), 0 1px 0 rgba(0,0,0,0.5)",
              }}
            >
              {/* Accent top line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />

              {/* Hover gold glow */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.06) 0%, transparent 70%)",
                  boxShadow: "inset 0 0 40px rgba(212,160,23,0.04)",
                }}
                aria-hidden="true"
              />

              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 100% 200% at 50% -10%, rgba(212,160,23,0.05) 0%, transparent 60%)",
                }}
                aria-hidden="true"
              />

              <div className="relative grid grid-cols-2 sm:grid-cols-4 divide-x divide-gold-400/[0.08]">
                {STATS.map((s, i) => (
                  <div
                    key={s.label}
                    className={cn(
                      "px-5 py-4 text-center",
                      i >= 2 && "border-t border-gold-400/[0.08] sm:border-t-0"
                    )}
                  >
                    <div className="font-bebas text-3xl leading-none tracking-wider text-gold-300 sm:text-4xl">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[10px] leading-tight text-slate-500 uppercase tracking-label">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Mike portrait ── */}
        <div
          className={cn(
            "mx-auto w-full max-w-[500px] opacity-0 motion-reduce:opacity-100",
            loaded && "motion-safe:animate-fade-up motion-safe:delay-300"
          )}
        >
          <MikeHeroPortrait priority />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
    </section>
  );
}
