"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  captureAttribution,
  appendUtmsToParams,
  type StoredAttribution,
} from "@/lib/attribution/client-storage";
import { BrandHeader } from "@/components/amm/brand-header";
import { MikeTrustCard } from "@/components/amm/mike-trust-card";
import { ProofStrip } from "@/components/amm/proof-strip";
import { MagicBackdrop } from "@/components/amm/magic-backdrop";
import { ComplianceFooter } from "@/components/amm/compliance-footer";
import { ammTokens } from "@/components/amm/tokens";

interface SecondaryChip {
  label: string;
  q: string;
  chip: string;
}

// Labels are the new professional public-facing copy. Chip values stay on the
// existing CTAChip enum so scoring, routing, and analytics keep working.
const SECONDARY_CHIPS: SecondaryChip[] = [
  {
    label: "Compare selling options",
    q: "I'd like to compare my options for selling my home in Wilson, NC.",
    chip: "should_sell_now",
  },
  {
    label: "Request direct-purchase review",
    q: "Please review my home for a direct-purchase preliminary estimate, subject to inspection.",
    chip: "what_can_afford",
  },
  {
    label: "Ask Mike a question",
    q: "I'd like to ask Mike Eatmon a question about my home or the Wilson market.",
    chip: "talk_to_mike",
  },
];

export function ValueHero() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const attributionRef = useRef<StoredAttribution | null>(null);
  const viewLoggedRef = useRef(false);

  // Capture UTMs/referrer on mount; fire a single page-view signal with UTMs.
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

      <BrandHeader />

      <section className="relative z-10 flex-1 px-5 sm:px-6 pt-4 pb-14 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-10 lg:gap-14 items-start">
          {/* Copy + form */}
          <div className="max-w-xl">
            <div className={cn(ammTokens.eyebrow, "mb-5")}>
              <span className={ammTokens.eyebrowDot} />
              <span>Ask Magic Mike by Our Town Properties</span>
            </div>

            <h1
              className={cn(ammTokens.headlineDisplay, "mb-4")}
              style={{ fontSize: "clamp(2.2rem, 5.4vw, 3.7rem)" }}
            >
              Start with your address.<br />
              <span className="text-gold-shimmer">Get a local read on your home.</span>
            </h1>

            <p className={cn(ammTokens.subhead, "mb-2 max-w-lg")}>
              Ask Magic Mike helps Wilson-area homeowners see a preliminary
              home value range, compare selling options, and get follow-up
              from Mike Eatmon&apos;s Our Town Properties team.
            </p>
            <p className="text-slate-500 text-[13px] mb-7">
              Free · No account · Local human follow-up
            </p>

            {/* Address form */}
            <form
              onSubmit={handleSubmit}
              className="mb-5"
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
                    <MapPin className="h-4 w-4 text-gold-400/65 shrink-0" />
                    <input
                      type="text"
                      data-testid="value-address-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="Enter your property address in Wilson, NC"
                      className="flex-1 bg-transparent text-[#F7F1E8] placeholder:text-slate-500 text-[15px] focus:outline-none min-w-0 py-2"
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
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0A]/40 border-t-[#0A0A0A] animate-spin" />
                    ) : (
                      <>
                        Start With Your Address
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500 pl-1">
                AI-assisted intake. Local human follow-up.
              </p>
            </form>

            {/* Secondary chips */}
            <div
              className="flex flex-wrap gap-2 mb-8"
              role="group"
              aria-label="Other ways to start"
              data-testid="value-secondary-chips"
            >
              {SECONDARY_CHIPS.map(({ label, q, chip }) => (
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
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
                    "border border-white/12 text-slate-200 bg-white/[0.03]",
                    "hover:border-gold-400/40 hover:text-[#F7F1E8] hover:bg-gold-400/[0.05]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <ProofStrip data-testid="value-trust-row" className="mb-6" />

            <ComplianceFooter variant="inline" testId="value-disclosure" />
          </div>

          {/* Trust column — beside the copy on desktop, below on mobile */}
          <div className="w-full max-w-md lg:max-w-none lg:sticky lg:top-6">
            <MikeTrustCard />
          </div>
        </div>
      </section>
    </div>
  );
}
