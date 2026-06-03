"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight, Shield, Phone, Sparkles as SparkleIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  captureAttribution,
  appendUtmsToParams,
  type StoredAttribution,
} from "@/lib/attribution/client-storage";
import { AmmLockup, LampGlyph } from "@/components/amm/amm-lockup";
import { MagicBackdrop, Sparkles } from "@/components/amm/magic-backdrop";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { ammTokens } from "@/components/amm/tokens";

const LICENSE = process.env.NEXT_PUBLIC_AGENT_LICENSE;
const AGENT_PHONE = process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337";
const PHONE_DISPLAY = AGENT_PHONE.replace(/^\+1/, "").replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");

interface SecondaryChip {
  label: string;
  q: string;
  chip: string;
  ruby?: boolean;
}

const SECONDARY_CHIPS: SecondaryChip[] = [
  { label: "Thinking of selling", q: "I'm thinking about selling my home in Wilson, NC.",      chip: "should_sell_now" },
  { label: "Just curious",        q: "Just curious about my home value in Eastern NC.",         chip: "what_can_afford" },
  { label: "Need local guidance", q: "I'd like local guidance from Mike Eatmon at Our Town.",   chip: "talk_to_mike", ruby: true },
];

const TRUST_BULLETS = [
  "Local guidance",
  "Preliminary home value range",
  "Mike follows up",
] as const;

export function ValueHero() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const attributionRef = useRef<StoredAttribution | null>(null);
  const viewLoggedRef = useRef(false);

  // Capture UTMs/referrer on mount and fire a single page-view signal.
  useEffect(() => {
    attributionRef.current = captureAttribution();
    if (viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "landing_page_viewed",
        properties: {
          path: "/value",
          utmSource:    attributionRef.current?.utmSource ?? null,
          utmMedium:    attributionRef.current?.utmMedium ?? null,
          utmCampaign:  attributionRef.current?.utmCampaign ?? null,
          referrerType: attributionRef.current?.referrerType ?? "direct",
        },
        utmSource:   attributionRef.current?.utmSource   ?? undefined,
        utmMedium:   attributionRef.current?.utmMedium   ?? undefined,
        utmCampaign: attributionRef.current?.utmCampaign ?? undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const buildAskParams = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(overrides)) params.set(k, v);
      return appendUtmsToParams(params, attributionRef.current);
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      setLoading(true);
      const overrides: Record<string, string> = {
        q: "What is my home worth in Wilson, NC?",
        chip: "home_worth",
      };
      if (address.trim()) overrides.address = address.trim();
      router.push(`/ask?${buildAskParams(overrides).toString()}`);
    },
    [router, address, loading, buildAskParams]
  );

  return (
    <div className={cn(ammTokens.pageShellPadded)}>
      <MagicBackdrop variant="hero" />

      {/* Nav strip */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <a
          href="https://www.ourtownproperties.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
          aria-label="Our Town Properties"
        >
          <AmmLockup size="md" />
        </a>
        <a
          href={`tel:${AGENT_PHONE}`}
          className="hidden sm:flex items-center gap-2 text-[12px] text-slate-400 hover:text-gold-400 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          {PHONE_DISPLAY}
        </a>
      </nav>

      {/* Main */}
      <section className="relative z-10 flex-1 flex items-center px-6 pt-6 pb-16 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center w-full">
          {/* Copy + form */}
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className={cn(ammTokens.eyebrow, "mb-6")}>
              <span className={ammTokens.eyebrowDot} />
              <span>Wilson, NC · Eastern NC</span>
            </div>

            {/* Headline */}
            <h1
              className={cn(ammTokens.headlineDisplay, "mb-5")}
              style={{ fontSize: "clamp(2.6rem, 6.5vw, 4.8rem)" }}
            >
              Rub the lamp.<br />
              <span className="text-gold-shimmer italic">See what your</span><br />
              Wilson-area home<br />
              may be worth.
            </h1>

            <p className={cn(ammTokens.subhead, "mb-2")}>
              Start with your address and Mike Eatmon&apos;s team will follow up
              with local guidance — not a generic internet guess.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Free · No account · Mike follows up directly
            </p>

            {/* Address form */}
            <form
              onSubmit={handleSubmit}
              className="mb-6"
              data-testid="value-address-form"
            >
              <div
                className={cn(
                  ammTokens.inputShell,
                  focused && ammTokens.inputShellFocused
                )}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-px rounded-t-xl transition-opacity duration-300",
                    "bg-gradient-to-r from-transparent via-gold-400/60 to-transparent",
                    focused ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:pl-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 text-gold-400/55 shrink-0" />
                    <input
                      type="text"
                      data-testid="value-address-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="Enter your property address in Wilson, NC"
                      className="flex-1 bg-transparent text-cream placeholder:text-slate-600 text-[15px] focus:outline-none min-w-0 py-2"
                      autoComplete="street-address"
                      inputMode="text"
                    />
                  </div>
                  <button
                    type="submit"
                    data-testid="value-submit-button"
                    disabled={loading}
                    className={cn(
                      ammTokens.buttonGold,
                      "w-full sm:w-auto shrink-0 px-5 py-3 sm:py-2.5"
                    )}
                  >
                    {loading ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-midnight/40 border-t-midnight animate-spin" />
                    ) : (
                      <>
                        Start With Your Address
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-600 pl-1">
                Or tap a quick option below ↓ &nbsp;·&nbsp; No commitment required
              </p>
            </form>

            {/* Secondary chips */}
            <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Quick options">
              {SECONDARY_CHIPS.map(({ label, q, chip, ruby }) => (
                <button
                  key={chip}
                  type="button"
                  data-testid={`value-chip-${chip}`}
                  onClick={() => {
                    const overrides: Record<string, string> = { q, chip };
                    if (address.trim()) overrides.address = address.trim();
                    router.push(`/ask?${buildAskParams(overrides).toString()}`);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    ruby
                      ? "border-ruby-400/30 text-ruby-300 bg-ruby-400/5 hover:bg-ruby-400/10 hover:border-ruby-400/55"
                      : "border-gold-400/22 text-gold-300 bg-gold-400/5 hover:bg-gold-400/10 hover:border-gold-400/45"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Trust row */}
            <ul
              data-testid="value-trust-row"
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6"
            >
              {TRUST_BULLETS.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-center gap-2 text-[12px] text-slate-300"
                >
                  <SparkleIcon className="h-3 w-3 text-gold-400/80 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <TrustLine />

            {/* Compliance microcopy */}
            <div className="mt-5">
              <ComplianceFooter variant="inline" testId="value-disclosure" />
            </div>
          </div>

          {/* Lamp visual (right column on lg+) */}
          <LampVisual />
        </div>
      </section>
    </div>
  );
}

function LampVisual() {
  return (
    <div
      aria-hidden="true"
      className="hidden lg:flex relative items-center justify-center min-h-[420px]"
    >
      {/* Soft outer glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 55%, rgba(212,160,23,0.18) 0%, transparent 70%)",
        }}
      />
      <Sparkles className="absolute inset-0" />

      {/* Lamp on a plinth */}
      <div className="relative motion-safe:animate-float">
        {/* Cyan flame halo */}
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full opacity-70 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(103,232,249,0.45) 0%, transparent 70%)" }}
        />
        <LampGlyph size={220} className="drop-shadow-[0_24px_40px_rgba(212,160,23,0.35)]" />
      </div>

      {/* Gold ring under lamp */}
      <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-56 h-2 rounded-full bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
    </div>
  );
}

function TrustLine() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <Shield className="h-3 w-3 text-gold-400/55" />
        {LICENSE ? `Lic. #${LICENSE}` : "Licensed NC Broker"}
      </span>
      <span className="text-slate-700">·</span>
      <span>Our Town Properties, Inc.</span>
      <span className="text-slate-700">·</span>
      <span>Wilson, NC</span>
      <span className="text-slate-700">·</span>
      <a
        href="https://www.ourtownproperties.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-slate-300 transition-colors underline underline-offset-2"
      >
        ourtownproperties.com
      </a>
    </div>
  );
}
