"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";

const PROOF = [
  { label: "Career Sales Volume",   value: "$750M+",    detail: "Eastern NC market — verified track record"      },
  { label: "Homes Sold",            value: "2,500+",    detail: "Wilson County and surrounding communities"      },
  { label: "Licensed & Active",     value: "Since 1993",detail: "30+ years serving buyers and sellers"           },
  { label: "Service Area",          value: "Eastern NC",detail: "Wilson · Rocky Mount · Greenville · Smithfield" },
];

export function SoldSection() {
  return (
    <section className="relative py-28 px-6 bg-[#080806] overflow-hidden">
      <div className="gold-rule absolute top-0 inset-x-0" />

      {/* Diagonal slash accent */}
      <div
        className="absolute top-0 right-0 w-1/3 h-full pointer-events-none opacity-30"
        style={{
          background: "linear-gradient(225deg, rgba(212,160,23,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left — visual */}
        <Reveal variant="slide-left" className="relative">
          {/* Main sign image */}
          <div className="relative rounded-2xl overflow-hidden border border-gold-400/15 shadow-2xl shadow-black/60 group">
            <Image
              src="/images/mike-sold-sign.png"
              alt="Our Town Properties SOLD — Mike Did It Again, Wilson NC"
              width={560}
              height={700}
              className="w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
              priority
            />
            {/* Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080806] via-transparent to-transparent" />

            {/* Glass hover overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(212,160,23,0.08) 0%, rgba(0,0,0,0.35) 100%)",
                backdropFilter: "blur(1px)",
              }}
            />

            {/* "Calm. Confident. Sold." overlay at top */}
            <div className="absolute top-5 left-5 right-5">
              <div className="bg-glass-gold rounded-xl px-4 py-2.5 border border-gold-400/25 inline-block">
                <span className="font-bebas text-xl tracking-label text-cream">
                  CALM.&nbsp; CONFIDENT.&nbsp; SOLD.
                </span>
              </div>
            </div>
          </div>

          {/* SOLD rider — floating, bottom-right */}
          <div className="absolute -bottom-5 -right-3 sm:-right-8 motion-safe:animate-float">
            <div className="relative">
              <Image
                src="/images/sold-rider.png"
                alt="SOLD — Mike Did It Again"
                width={300}
                height={120}
                className="w-52 sm:w-64 drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Stats badge — top left */}
          <div className="absolute -top-4 -left-4 sm:-left-8 card-gradient-border">
            <div className="rounded-[15px] bg-[#0D0B07] px-5 py-4 text-center">
              <div className="font-bebas text-4xl text-gold-400 tracking-wider leading-none">2,500+</div>
              <div className="text-xs text-slate-400 mt-1 leading-snug">Homes sold<br/>Eastern NC</div>
            </div>
          </div>
        </Reveal>

        {/* Right — copy */}
        <Reveal variant="slide-right">
          <div>
            {/* Premium pill eyebrow */}
            <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mb-5"
              style={{
                background: "linear-gradient(135deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)",
                border: "1px solid rgba(212,160,23,0.35)",
                boxShadow: "0 0 20px rgba(212,160,23,0.08)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              <span className="text-[11px] font-black tracking-kicker uppercase text-gold-400">Track Record</span>
            </div>

            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-cream mb-6 leading-tight">
              Mike Did It{" "}
              <span className="text-gold-shimmer italic">Again.</span>
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed text-base">
              Three decades of closed deals in Eastern NC. Not leads. Not open houses.
              <strong className="text-cream"> Sold signs.</strong> Mike prices your home
              to win — not to sit — and negotiates every dollar back to your side of the table.
            </p>

            {/* Proof cards */}
            <div className="space-y-3 mb-8">
              {PROOF.map((item, i) => (
                <Reveal key={item.label} variant="fade-up" delay={300 + i * 80}>
                  <div
                    className={cn(
                      "group flex items-center justify-between rounded-xl border border-white/[0.06]",
                      "bg-white/[0.02] px-5 py-4 relative overflow-hidden",
                      "hover:border-gold-400/[0.30] hover:bg-white/[0.04]",
                      "transition-all duration-300 motion-reduce:transition-none",
                    )}
                  >
                    {/* Glass sheen on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
                      style={{
                        background: "linear-gradient(105deg, rgba(212,160,23,0.06) 0%, transparent 60%)",
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium text-cream group-hover:text-white transition-colors">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                    </div>
                    <div className="text-right shrink-0 ml-5">
                      <div className="font-bebas text-xl tracking-wider text-gold-400 leading-none">{item.value}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* View All Sold Homes CTA */}
            <Reveal variant="fade-up" delay={650}>
              <a
                href="https://ourtownproperties.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all duration-200 group mb-6"
                style={{
                  border: "1px solid rgba(212,160,23,0.30)",
                  color: "#D4A017",
                  background: "rgba(212,160,23,0.05)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(212,160,23,0.12)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(212,160,23,0.50)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(212,160,23,0.05)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(212,160,23,0.30)";
                }}
              >
                View All Sold Homes
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </Reveal>

            <p className="text-xs text-slate-600 italic">
              Performance statements based on Mike Eatmon&apos;s Our Town Properties career biography.
              Individual results vary. Market conditions change.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
