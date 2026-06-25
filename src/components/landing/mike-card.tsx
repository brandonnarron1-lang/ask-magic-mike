"use client";

import Image from "next/image";
import { Phone, Mail, MapPin, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils/cn";

const CREDENTIALS = [
  "Licensed NC Real Estate Broker",
  "Licensed & Active Since 1993 — 30+ Years",
  "Our Town Properties, Inc.",
  "Fiduciary Duty to Every Client",
  "Equal Housing Opportunity",
];

export function MikeCard() {
  const router  = useRouter();
  const { ref, inView } = useInView(0.12);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-28 px-6 bg-[#080806] overflow-hidden"
    >
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 50% at 30% 50%, rgba(212,160,23,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className={cn(
          "text-center mb-16 opacity-0",
          inView && "animate-fade-up delay-0"
        )}>
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-400 mb-4">
            Your Agent
          </p>
          <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream">
            Meet{" "}
            <span className="text-gold-shimmer">Magic Mike</span>
          </h2>
        </div>

        {/* Card */}
        <div className={cn(
          "relative rounded-3xl overflow-hidden opacity-0",
          "card-gradient-border",
          inView && "animate-scale-in delay-100"
        )}>
          <div className="absolute inset-0 rounded-3xl"
            style={{
              background: "radial-gradient(ellipse 60% 80% at 100% 50%, rgba(212,160,23,0.04) 0%, transparent 60%)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-0 rounded-3xl overflow-hidden bg-[#0D0B07]/80 backdrop-blur-sm">

            {/* Photo side */}
            <div className="md:col-span-2 relative min-h-80 md:min-h-full">
              <Image
                src="/images/our-town-sign.jpg"
                alt="Our Town Properties — Mike Eatmon, Wilson NC"
                fill
                className="object-cover object-center"
                style={{ filter: "brightness(0.55) saturate(0.7)" }}
              />
              {/* Right fade */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0D0B07]/90 md:block hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B07]/90 to-transparent md:hidden" />

              {/* Our Town badge */}
              <div className="absolute bottom-5 left-5">
                <div className="bg-glass-gold rounded-xl px-4 py-3 border border-gold-400/25 inline-flex items-center gap-2.5">
                  <OurTownIcon size={22} />
                  <div>
                    <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-gold-400 leading-none">Our Town</div>
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
                  className="w-40 opacity-90"
                />
              </div>
            </div>

            {/* Info side */}
            <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-display text-4xl font-bold text-cream">
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 bg-gold-400/6 group-hover:bg-gold-400/15 transition-all">
                    <Phone className="h-3.5 w-3.5 text-gold-400" />
                  </span>
                  252-245-4337
                </a>
                <a href="https://ourtownproperties.com"
                  className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-gold-400 transition-colors group"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 bg-gold-400/6 group-hover:bg-gold-400/15 transition-all">
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

              {/* CTA */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/ask")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-sm font-bold text-midnight",
                    "hover:bg-gold-300 active:scale-[0.97] transition-all duration-200 motion-reduce:transition-none group",
                    "shadow-[0_4px_24px_rgba(212,160,23,0.25)] hover:shadow-[0_6px_32px_rgba(212,160,23,0.35)]"
                  )}
                >
                  Ask Mike Now
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none" />
                </button>

                <a href="tel:2522454337"
                  className="inline-flex items-center gap-2 rounded-xl border border-gold-400/25 px-6 py-3.5 text-sm font-medium text-gold-300 hover:bg-gold-400/8 hover:border-gold-400/45 transition-all"
                >
                  <Phone className="h-4 w-4" />
                  Call Direct
                </a>
              </div>

              <p className="mt-4 text-xs text-slate-600">
                Ask Magic Mike is a digital assistant for Our Town Properties. A licensed real estate
                professional may review your information and follow up. This is not an appraisal, legal
                advice, lending advice, or a guarantee of market value.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OurTownIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <rect x="1.5" y="1.5" width="57" height="57" rx="5" fill="#0A0A0A" stroke="#D4A017" strokeWidth="2"/>
      <path d="M30 9 C17.5 9 9 19.5 9 29 L9 51 L19 51 L19 37 L41 37 L41 51 L51 51 L51 29 C51 19.5 42.5 9 30 9Z"
        fill="none" stroke="#D4A017" strokeWidth="2.2"/>
      <rect x="23" y="37" width="14" height="14" rx="1.5" fill="none" stroke="#D4A017" strokeWidth="1.8"/>
    </svg>
  );
}
