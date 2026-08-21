"use client";

import Image from "next/image";
import { Shield, MapPin, Clock, Award, Scale, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Reveal } from "@/components/ui/reveal";
import { brandPackAssets } from "@/components/amm/brand-pack-assets";

const PILLARS = [
  { icon: MapPin,     title: "Wilson-Area Context",            body: "Start with the actual property or target area, timeline, and questions while avoiding location rankings or generic market claims.", accentColor: "text-gold-400",  borderColor: "group-hover:border-gold-400/35",  glowColor: "rgba(212,160,23,0.18)", watermarkColor: "rgba(212,160,23,0.03)", gradientColor: "rgba(212,160,23,0.08)" },
  { icon: Clock,      title: "Timing-Aware Review",            body: "The team reviews the timing and practical constraints you provide before discussing possible next steps.",                 accentColor: "text-amber-400", borderColor: "group-hover:border-amber-400/35", glowColor: "rgba(245,158,11,0.18)", watermarkColor: "rgba(212,160,23,0.03)", gradientColor: "rgba(212,160,23,0.08)" },
  { icon: TrendingUp, title: "Decision Context",               body: "Property, financing, market, and offer details are verified before they support a recommendation.",                       accentColor: "text-gold-400",  borderColor: "group-hover:border-gold-400/35",  glowColor: "rgba(212,160,23,0.18)", watermarkColor: "rgba(212,160,23,0.03)", gradientColor: "rgba(212,160,23,0.08)" },
  { icon: Award,      title: "Complex-Situation Review",       body: "Expired listings, inspection questions, and financing constraints are reviewed on their documented facts, with no outcome promised.", accentColor: "text-gold-400", borderColor: "group-hover:border-gold-400/35", glowColor: "rgba(212,160,23,0.18)", watermarkColor: "rgba(212,160,23,0.03)", gradientColor: "rgba(212,160,23,0.08)" },
  { icon: Scale,      title: "Brokerage Duties + Disclosures", body: "Our Town Properties reviews requests under applicable brokerage duties, disclosures, and fair-housing requirements.",       accentColor: "text-slate-300", borderColor: "group-hover:border-slate-400/25", glowColor: "rgba(148,163,184,0.15)", watermarkColor: "rgba(212,160,23,0.03)", gradientColor: "rgba(148,163,184,0.06)" },
  { icon: Shield,     title: "No Outcome Promise",             body: "A request starts a review. It is not an appraisal and does not create an offer, appointment, financing decision, or guaranteed result.", accentColor: "text-ruby-400",  borderColor: "group-hover:border-ruby-400/25",  glowColor: "rgba(193,39,45,0.18)",  watermarkColor: "rgba(193,39,45,0.03)",  gradientColor: "rgba(193,39,45,0.08)" },
];

export function WhyMike() {
  return (
    <section className="relative py-28 px-6 bg-[#0A0A0A] overflow-hidden">
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,160,23,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto relative">

        {/* Header */}
        <Reveal variant="fade-up">
          <div className="text-center mb-20 relative">
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

            {/* Premium eyebrow pill */}
            <div className="inline-flex items-center rounded-full border border-gold-400/40 bg-gold-400/[0.07] px-4 py-1.5 mb-5">
              <p className="text-xs font-semibold tracking-kicker uppercase text-gold-400">
                Why Ask Mike
              </p>
            </div>

            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-cream leading-tight">
              Calm. Confident.{" "}
              <span className="text-gold-shimmer">Sold.</span>
            </h2>
            <p className="text-lede mt-5 max-w-md mx-auto">
              Real estate magic without the smoke. Expertise, data, and a reputation that speaks for itself.
            </p>
          </div>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            const stepLabel = String(i + 1).padStart(2, "0");
            return (
              <Reveal key={p.title} variant="fade-up" delay={150 + i * 80}>
                <div
                  className={cn(
                    "group relative rounded-2xl border border-white/[0.07] p-8",
                    "transition-all duration-300 cursor-default overflow-hidden",
                    p.borderColor,
                  )}
                  style={{
                    background: "rgba(16, 13, 7, 0.65)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {/* Directional hover glow — radiates from top */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(ellipse 80% 55% at 50% 0%, ${p.gradientColor} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Large watermark step number */}
                  <span
                    className="absolute bottom-5 right-6 font-bebas text-[5rem] leading-none pointer-events-none select-none"
                    aria-hidden="true"
                    style={{ color: p.watermarkColor }}
                  >
                    {stepLabel}
                  </span>

                  {/* Icon */}
                  <div
                    className={cn(
                      "relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl",
                      "border border-white/10 bg-white/[0.04]",
                      "group-hover:bg-white/[0.07] group-hover:border-white/20",
                      "transition-all duration-300"
                    )}
                  >
                    {/* Icon glow layer — visible on hover */}
                    <span
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ boxShadow: `0 0 16px 4px ${p.glowColor}` }}
                      aria-hidden="true"
                    />
                    <Icon className={cn("h-5 w-5 transition-colors relative z-10", p.accentColor)} />
                  </div>

                  <h3 className="text-base font-semibold text-cream mb-2.5 group-hover:text-white transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Social proof strip */}
        <Reveal variant="fade-up" delay={700}>
          <div className="mt-14 flex justify-center">
            <div className="glass-gold-card rounded-full px-6 py-2.5 inline-flex items-center gap-3">
              <span className="text-xs font-medium text-gold-400/80 tracking-wide">Our Town Properties</span>
              <span className="text-gold-400/40 text-xs">·</span>
              <span className="text-xs font-medium text-gold-400/80 tracking-wide">Wilson, NC</span>
              <span className="text-gold-400/40 text-xs">·</span>
              <span className="text-xs font-medium text-gold-400/80 tracking-wide">Broker-reviewed guidance</span>
              <span className="text-gold-400/40 text-xs">·</span>
              <span className="text-xs font-medium text-gold-400/80 tracking-wide">NC Licensed Broker</span>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
