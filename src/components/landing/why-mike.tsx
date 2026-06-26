"use client";

import Image from "next/image";
import { Shield, MapPin, Clock, Award, Scale, TrendingUp } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils/cn";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

const PILLARS = [
  { icon: MapPin,      title: "Wilson County Authority",       body: "Every neighborhood. Every school district. Every pocket of value in Eastern NC. Mike knows the market before it moves.",    accentColor: "text-gold-400",    borderColor: "group-hover:border-gold-400/35" },
  { icon: Clock,       title: "Licensed Since 1993 — 30+ Yrs", body: "Through boom markets, 2008, COVID, rate spikes. Every cycle. Every outcome. Three decades of positioning clients to win.",  accentColor: "text-amber-400",   borderColor: "group-hover:border-amber-400/35"  },
  { icon: TrendingUp,  title: "$750M+ in Career Sales",        body: "2,500+ homes closed. Mike prices to sell — not to sit — and negotiates every dollar back to your side of the table.",       accentColor: "text-emerald-400", borderColor: "group-hover:border-emerald-400/35"},
  { icon: Award,       title: "The 'Magic Mike' Reputation",   body: "When other agents say it can't be done — expired listings, tough inspections, complex financing — Mike finds a way.",        accentColor: "text-gold-400",    borderColor: "group-hover:border-gold-400/35" },
  { icon: Scale,       title: "Full Fiduciary Duty",           body: "Licensed NC Broker with Our Town Properties, Inc. Legally bound to act in your best interest. Your equity matters.",         accentColor: "text-slate-300",   borderColor: "group-hover:border-slate-400/25" },
  { icon: Shield,      title: "No Pressure. Guaranteed.",      body: "Ask your question. Get real answers. If the timing isn't right, Mike will tell you. Trust first, transaction second.",       accentColor: "text-ruby-400",    borderColor: "group-hover:border-ruby-400/25"  },
];

export function WhyMike() {
  const { ref, inView } = useInView(0.08);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-28 px-6 bg-[#0A0A0A] overflow-hidden"
    >
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Mesh background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,160,23,0.035) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto relative">

        {/* Header */}
        <div className={cn(
          "text-center mb-20 opacity-0 relative",
          inView && "animate-fade-up delay-0"
        )}>
          {/* Sparkle accent */}
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 pointer-events-none select-none"
            aria-hidden="true"
          >
            <Image
              src={brandPackAssets.accents.sparkle}
              alt=""
              width={24}
              height={24}
              className="opacity-50"
            />
          </span>
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-400 mb-4">
            Why Ask Mike
          </p>
          <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream leading-tight">
            Calm. Confident.{" "}
            <span className="text-gold-shimmer">Sold.</span>
          </h2>
          <p className="mt-5 text-slate-400 max-w-md mx-auto">
            Real estate magic without the smoke. Expertise, data, and a reputation that speaks for itself.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={cn(
                  "group relative rounded-2xl border border-white/[0.05] bg-white/[0.02] p-7",
                  "transition-all duration-300 cursor-default overflow-hidden",
                  p.borderColor,
                  "opacity-0",
                  inView && "animate-fade-up"
                )}
                style={{ animationDelay: `${150 + i * 80}ms` }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.05) 0%, transparent 70%)" }}
                />

                {/* Icon */}
                <div className={cn(
                  "relative mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl",
                  "border border-white/10 bg-white/[0.04]",
                  "group-hover:bg-white/[0.07] group-hover:border-white/20",
                  "transition-all duration-300"
                )}>
                  <Icon className={cn("h-5 w-5 transition-colors", p.accentColor)} />
                </div>

                <h3 className="text-base font-semibold text-cream mb-2.5 group-hover:text-white transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
