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
import { ammTokens } from "./tokens";
import { motion } from "./motion";

interface ConversionPanelProps {
  /** Placeholder for the address input. */
  placeholder?: string;
  /** Primary button copy. */
  ctaLabel?: string;
  /** Default question to forward to /ask if no address is given. */
  defaultQuestion?: string;
  /** CTAChip value to attach to the forwarded URL. */
  chip?: string;
  /** Micro line under the input. */
  microLine?: string;
  className?: string;
  /** Optional source label (e.g. "WordPress · We Buy Homes"). */
  sourceBadge?: string;
  /** Fire a landing_page_viewed event on mount. Set false when the parent
   *  already logs the view (default true). */
  logView?: boolean;
}

/**
 * ConversionPanel — the address-input → /ask handoff used on `/value` and the
 * embed shell. Encapsulates attribution capture, UTM forwarding, focus glow,
 * and CTA primitives so we never duplicate that logic across surfaces.
 */
export function ConversionPanel({
  placeholder = "Enter your property address in Wilson, NC",
  ctaLabel = "Start With Your Address",
  defaultQuestion = "What is my home worth in Wilson, NC?",
  chip = "home_worth",
  microLine = "AI-assisted intake. Local human follow-up.",
  className,
  sourceBadge,
  logView = true,
}: ConversionPanelProps) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const attributionRef = useRef<StoredAttribution | null>(null);
  const viewLoggedRef = useRef(false);

  useEffect(() => {
    attributionRef.current = captureAttribution();
    if (!logView || viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "landing_page_viewed",
        properties: {
          path: typeof window !== "undefined" ? window.location.pathname : null,
          utmSource:    attributionRef.current?.utmSource    ?? null,
          utmMedium:    attributionRef.current?.utmMedium    ?? null,
          utmCampaign:  attributionRef.current?.utmCampaign  ?? null,
          referrerType: attributionRef.current?.referrerType ?? "direct",
        },
        utmSource:   attributionRef.current?.utmSource   ?? undefined,
        utmMedium:   attributionRef.current?.utmMedium   ?? undefined,
        utmCampaign: attributionRef.current?.utmCampaign ?? undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [logView]);

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
        q: defaultQuestion,
        chip,
      };
      if (address.trim()) overrides.address = address.trim();
      router.push(`/ask?${buildAskParams(overrides).toString()}`);
    },
    [router, address, loading, buildAskParams, defaultQuestion, chip]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
      data-testid="value-address-form"
    >
      {sourceBadge && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold-400/22 bg-gold-400/[0.06] px-3 py-1 text-[11px] tracking-[0.16em] uppercase text-gold-300">
          {sourceBadge}
        </div>
      )}
      <div
        className={cn(
          ammTokens.inputShell,
          focused && ammTokens.inputShellFocused
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-px rounded-t-xl transition-opacity duration-300",
            "bg-gradient-to-r from-transparent via-gold-400/65 to-transparent",
            focused ? "opacity-100" : "opacity-0"
          )}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:pl-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-gold-400/70 shrink-0" />
            <input
              type="text"
              data-testid="value-address-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              className={cn(
                "flex-1 bg-transparent text-[#F7F1E8] placeholder:text-slate-500 text-[15px] min-w-0 py-2",
                motion.focusGold,
                "focus:outline-none"
              )}
              autoComplete="street-address"
              inputMode="text"
              aria-label="Property address"
            />
          </div>
          <button
            type="submit"
            data-testid="value-submit-button"
            disabled={loading}
            className={cn(
              ammTokens.buttonGold,
              "w-full sm:w-auto shrink-0 px-5 py-3 sm:py-2.5",
              motion.focusGold
            )}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0A0A0A]/40 border-t-[#0A0A0A] animate-spin" />
            ) : (
              <>
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
      <p className="mt-2.5 text-[12.5px] text-slate-300 pl-1">{microLine}</p>
    </form>
  );
}
