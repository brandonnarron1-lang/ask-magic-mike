"use client";

import Image from "next/image";
import { Phone, Mail, MapPin, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

const CREDENTIALS = [
  "Licensed NC Real Estate Broker",
  "Licensed & Active Since 1993 — 30+ Years",
  "Our Town Properties, Inc.",
  "Fiduciary Duty to Every Client",
  "Equal Housing Opportunity",
];

const STATS = [
  { value: "$750M+", label: "Career Volume" },
  { value: "2,500+", label: "Homes Sold" },
  { value: "30+",    label: "Years Active" },
  { value: "45mi",   label: "Service Radius" },
];

export function MikeCard() {
  const router = useRouter();

  return (
    <section className="relative py-32 px-6 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(15,12,4,1) 0%, #080806 60%)",
      }}
    >
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Dramatic ambient glow — larger and deeper */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 60% 55% at 20% 50%, rgba(212,160,23,0.08) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 40% at 80% 20%, rgba(212,160,23,0.04) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      {/* Top-right decorative light ray */}
      <div className="absolute top-0 right-0 w-1/2 h-2/3 pointer-events-none opacity-20"
        style={{
          background: "linear-gradient(225deg, rgba(212,160,23,0.12) 0%, transparent 55%)",
        }}
      />

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <Reveal variant="fade-up">
          <div className="text-center mb-16">
            {/* Gold pill eyebrow */}
            <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mb-5"
              style={{
                background: "linear-gradient(135deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)",
                border: "1px solid rgba(212,160,23,0.35)",
                boxShadow: "0 0 20px rgba(212,160,23,0.10)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <span className="text-[11px] font-black tracking-kicker uppercase text-gold-400">Your Agent</span>
            </div>
            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-cream">
              Meet{" "}
              <span className="text-gold-shimmer">Magic Mike</span>
            </h2>
          </div>
        </Reveal>

        {/* Main card */}
        <Reveal variant="scale-in" delay={100}>
          <div className="relative rounded-3xl overflow-hidden card-gradient-border"
            style={{
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,160,23,0.12), inset 0 1px 0 rgba(212,160,23,0.08)",
            }}
          >
            {/* Card inner ambient */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 70% 90% at 100% 50%, rgba(212,160,23,0.06) 0%, transparent 55%)",
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-0 rounded-3xl overflow-hidden bg-[#0D0B07]/90 backdrop-blur-sm">

              {/* Photo side — more prominent */}
              <div className="md:col-span-2 relative min-h-96 md:min-h-full">
                <Image
                  src="/images/our-town-sign.jpg"
                  alt="Our Town Properties — Mike Eatmon, Wilson NC"
                  fill
                  className="object-cover object-center scale-105"
                  style={{ filter: "brightness(0.60) saturate(0.75)" }}
                />

                {/* Depth gradient — right fade into card */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0D0B07]/95 md:block hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B07]/90 via-transparent to-transparent md:hidden" />

                {/* Gold shimmer overlay on photo */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(160deg, rgba(212,160,23,0.07) 0%, transparent 50%)",
                  }}
                />

                {/* Our Town badge */}
                <div className="absolute bottom-5 left-5">
                  <div
                    className="rounded-xl px-4 py-3 border inline-flex items-center gap-2.5"
                    style={{
                      background: "rgba(13,11,7,0.85)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(212,160,23,0.30)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,160,23,0.10)",
                    }}
                  >
                    <Image
                      src={brandPackAssets.logo.primary}
                      alt="Our Town Properties, Inc."
                      width={44}
                      height={23}
                      className="h-auto w-auto"
                    />
                    <div>
                      <div className="text-xs font-bold tracking-label uppercase text-gold-400 leading-none">Our Town</div>
                      <div className="text-[10px] text-slate-400 leading-none mt-0.5">Properties, Inc.</div>
                    </div>
                  </div>
                </div>

                {/* Sold rider */}
                <div className="absolute top-5 left-5">
                  <Image
                    src="/images/sold-rider.png"
                    alt="SOLD — Mike Did It Again"
                    width={180}
                    height={72}
                    className="w-40 opacity-90 drop-shadow-xl"
                  />
                </div>
              </div>

              {/* Info side */}
              <div className="md:col-span-3 p-8 md:p-10 xl:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display text-4xl sm:text-5xl font-bold text-cream">
                    Mike Eatmon
                  </h3>
                </div>
                <p className="text-slate-400 text-sm mb-5">Broker · Our Town Properties, Inc. · Wilson, NC</p>

                {/* Stars */}
                <div className="flex items-center gap-1.5 mb-7">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-gold-400 fill-gold-400" />
                  ))}
                  <span className="text-xs text-slate-500 ml-2">Trusted by thousands of Eastern NC families</span>
                </div>

                {/* Bio */}
                <p className="text-slate-300 leading-relaxed text-sm mb-7">
                  Over three decades representing buyers and sellers across Eastern North Carolina. Mike&apos;s
                  track record for creative problem-solving — and getting deals across the finish line
                  when others can&apos;t — earned him the name{" "}
                  <em className="text-gold-400 not-italic font-semibold">&quot;Magic Mike.&quot;</em>{" "}
                  He operates under full fiduciary duty to his clients and NC real estate law.
                </p>

                {/* Credentials */}
                <div className="space-y-2 mb-7">
                  {CREDENTIALS.map((c) => (
                    <div key={c} className="flex items-center gap-2.5 text-xs text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gold-400/70 shrink-0" />
                      {c}
                    </div>
                  ))}
                </div>

                {/* Contact */}
                <div className="flex flex-wrap gap-3 mb-7">
                  <a href="tel:2522454337"
                    className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-gold-400 transition-colors group"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 bg-gold-400/[0.06] group-hover:bg-gold-400/[0.15] transition-all">
                      <Phone className="h-3.5 w-3.5 text-gold-400" />
                    </span>
                    252-245-4337
                  </a>
                  <a href="https://ourtownproperties.com"
                    className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-gold-400 transition-colors group"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 bg-gold-400/[0.06] group-hover:bg-gold-400/[0.15] transition-all">
                      <Mail className="h-3.5 w-3.5 text-gold-400" />
                    </span>
                    ourtownproperties.com
                  </a>
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    </span>
                    Wilson, NC
                  </div>
                </div>

                {/* CTA — btn-gold-premium treatment */}
                <div className="flex items-center gap-4 mb-7">
                  <button
                    onClick={() => router.push("/ask")}
                    className={cn(
                      "btn-gold-premium inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-black text-midnight",
                      "active:scale-[0.97] motion-reduce:active:scale-100 transition-all duration-200 group"
                    )}
                    style={{
                      background: "linear-gradient(135deg, #D4A017 0%, #F0C040 50%, #B8860B 100%)",
                      boxShadow: "0 6px 32px rgba(212,160,23,0.40), 0 2px 8px rgba(212,160,23,0.20), inset 0 1px 0 rgba(255,255,255,0.25)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Ask Mike Now
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none" />
                  </button>

                  <a href="tel:2522454337"
                    className="inline-flex items-center gap-2 rounded-xl border border-gold-400/25 px-6 py-4 text-sm font-medium text-gold-300 hover:bg-gold-400/[0.08] hover:border-gold-400/45 transition-all"
                  >
                    <Phone className="h-4 w-4" />
                    Call Direct
                  </a>
                </div>

                <p className="text-xs text-slate-600">
                  Ask Magic Mike is a digital assistant for Our Town Properties. A licensed real estate
                  professional may review your information and follow up. This is not an appraisal, legal
                  advice, lending advice, or a guarantee of market value.
                </p>
              </div>
            </div>

            {/* Glass stats strip — below main content */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 divide-x"
              style={{
                background: "linear-gradient(90deg, rgba(20,15,5,0.95) 0%, rgba(15,12,4,0.98) 100%)",
                borderTop: "1px solid rgba(212,160,23,0.15)",
                backdropFilter: "blur(12px)",
              }}
            >
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-5 px-4 text-center"
                  style={{ borderRight: i < STATS.length - 1 ? "1px solid rgba(212,160,23,0.12)" : "none" }}
                >
                  <div
                    className="font-bebas text-2xl sm:text-3xl tracking-wider leading-none mb-1"
                    style={{ color: "#D4A017" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
