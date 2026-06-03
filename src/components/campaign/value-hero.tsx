"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, ArrowRight, Shield, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  captureAttribution,
  appendUtmsToParams,
  type StoredAttribution,
} from "@/lib/attribution/client-storage";

const LICENSE = process.env.NEXT_PUBLIC_AGENT_LICENSE;
const AGENT_PHONE = process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337";
const PHONE_DISPLAY = AGENT_PHONE.replace(/^\+1/, "").replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");

export function ValueHero() {
  const router   = useRouter();
  const [address, setAddress] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const attributionRef = useRef<StoredAttribution | null>(null);
  const viewLoggedRef = useRef(false);

  // Capture UTMs/referrer on mount so they persist through /ask steps even if
  // the user refreshes or navigates back. Fire a lightweight page-view signal.
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
        utmSource:   attributionRef.current?.utmSource ?? undefined,
        utmMedium:   attributionRef.current?.utmMedium ?? undefined,
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
    <div className="relative min-h-screen flex flex-col">
      {/* Top gold line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      {/* Subtle sign image — right-side accent only on lg+ */}
      <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none hidden lg:block overflow-hidden">
        <Image
          src="/images/our-town-sign.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.08] scale-105"
          priority
        />
        {/* Vignette over image */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-3/4 h-2/3"
          style={{ background: "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(212,160,23,0.07) 0%, transparent 70%)" }} />
      </div>

      {/* Nav strip */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <a href="https://www.ourtownproperties.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 group">
          <OurTownIcon size={30} />
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-gold-400 leading-none">Our Town</div>
            <div className="text-[9px] tracking-[0.1em] uppercase text-slate-500 leading-none mt-0.5">Properties, Inc.</div>
          </div>
        </a>
        <a href={`tel:${AGENT_PHONE}`}
          className="hidden sm:flex items-center gap-2 text-[12px] text-slate-400 hover:text-gold-400 transition-colors">
          <Phone className="h-3.5 w-3.5" />
          {PHONE_DISPLAY}
        </a>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="max-w-xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full
            border border-gold-400/20 bg-gold-400/[0.06]">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300">
              Wilson, NC · Eastern NC
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-black text-cream leading-[0.92] mb-5"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
            What&apos;s your<br />
            <span className="text-gold-shimmer italic">home worth</span><br />
            right now?
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed mb-2 font-light">
            Start with your address. Mike Eatmon will give you a real, local take —
            not an algorithm.
          </p>
          <p className="text-slate-500 text-sm mb-10">
            Free · No account · Mike follows up directly
          </p>

          {/* Address form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className={cn(
              "relative rounded-xl border transition-all duration-300",
              focused
                ? "border-gold-400/50 shadow-[0_0_30px_rgba(212,160,23,0.10)]"
                : "border-gold-400/15",
              "bg-[#0D0B08]/90 backdrop-blur-sm"
            )}>
              <div className={cn(
                "absolute inset-x-0 top-0 h-px rounded-t-xl transition-opacity duration-300",
                "bg-gradient-to-r from-transparent via-gold-400/60 to-transparent",
                focused ? "opacity-100" : "opacity-0"
              )} />

              <div className="flex items-center gap-3 p-3 pl-4">
                <MapPin className="h-4 w-4 text-gold-400/50 shrink-0" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter your property address in Wilson, NC"
                  className="flex-1 bg-transparent text-cream placeholder:text-slate-600
                    text-[15px] focus:outline-none min-w-0 py-1.5"
                  autoComplete="street-address"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
                    "text-sm font-bold text-midnight transition-all duration-200",
                    "bg-gold-400 hover:bg-gold-300 active:scale-95",
                    "shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30",
                    loading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-midnight/40 border-t-midnight animate-spin" />
                  ) : (
                    <>
                      Start
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-600 pl-1">
              Or type a question below ↓ &nbsp;·&nbsp; No commitment required
            </p>
          </form>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-2 mb-12">
            {[
              { label: "Should I sell now?",  q: "Is now a good time to sell in Wilson, NC?",          chip: "should_sell_now" },
              { label: "What can I afford?",  q: "What price range can I afford in Eastern NC?",        chip: "what_can_afford" },
              { label: "Talk to Mike",         q: "I'd like to speak directly with Mike Eatmon.",       chip: "talk_to_mike", ruby: true },
            ].map(({ label, q, chip, ruby }) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  const overrides: Record<string, string> = { q, chip };
                  if (address.trim()) overrides.address = address.trim();
                  router.push(`/ask?${buildAskParams(overrides).toString()}`);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  "border",
                  ruby
                    ? "border-ruby-400/30 text-ruby-300 bg-ruby-400/5 hover:bg-ruby-400/10 hover:border-ruby-400/55"
                    : "border-gold-400/20 text-gold-300 bg-gold-400/5 hover:bg-gold-400/10 hover:border-gold-400/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sign image — mobile only, below the form */}
          <div className="relative rounded-xl overflow-hidden mb-10 lg:hidden aspect-[16/7]">
            <Image
              src="/images/our-town-sign.jpg"
              alt="Our Town Properties sign"
              fill
              className="object-cover object-center opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-[#0A0A0A]/20" />
          </div>

          {/* Trust line */}
          <TrustLine />

          {/* Compliance disclosure */}
          <p
            data-testid="value-disclosure"
            className="mt-5 max-w-lg text-[11px] leading-relaxed text-slate-500"
          >
            Ask Magic Mike by Our Town Properties, Inc. provides local guidance
            and a preliminary home value range. This is not an appraisal and
            does not create an agency relationship unless a written brokerage
            agreement is signed. Mike Eatmon or a member of the Our Town
            Properties team may follow up.
          </p>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
    </div>
  );
}

function TrustLine() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <Shield className="h-3 w-3 text-gold-400/50" />
        {LICENSE ? `Lic. #${LICENSE}` : "Licensed NC Broker"}
      </span>
      <span className="text-slate-700">·</span>
      <span>Our Town Properties, Inc.</span>
      <span className="text-slate-700">·</span>
      <span>Wilson, NC</span>
      <span className="text-slate-700">·</span>
      <a href="https://www.ourtownproperties.com" target="_blank" rel="noopener noreferrer"
        className="hover:text-slate-300 transition-colors underline underline-offset-2">
        ourtownproperties.com
      </a>
    </div>
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
