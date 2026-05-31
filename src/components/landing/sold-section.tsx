"use client";

import Image from "next/image";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils/cn";

const PROOF = [
  { label: "Career Sales Volume",   value: "$750M+",    detail: "Eastern NC market — verified track record"      },
  { label: "Homes Sold",            value: "2,500+",    detail: "Wilson County and surrounding communities"      },
  { label: "Licensed & Active",     value: "Since 1993",detail: "30+ years serving buyers and sellers"           },
  { label: "Service Area",          value: "Eastern NC",detail: "Wilson · Rocky Mount · Greenville · Smithfield" },
];

export function SoldSection() {
  const { ref: leftRef,  inView: leftIn  } = useInView(0.15);
  const { ref: rightRef, inView: rightIn } = useInView(0.15);

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
        <div
          ref={leftRef as React.RefObject<HTMLDivElement>}
          className={cn(
            "relative opacity-0",
            leftIn && "animate-slide-left"
          )}
        >
          {/* Main sign image */}
          <div className="relative rounded-2xl overflow-hidden border border-gold-400/15 shadow-2xl shadow-black/60">
            <Image
              src="/images/mike-sold-sign.png"
              alt="Our Town Properties SOLD — Mike Did It Again, Wilson NC"
              width={560}
              height={700}
              className="w-full object-cover object-top"
              priority
            />
            {/* Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080806] via-transparent to-transparent" />

            {/* "Calm. Confident. Sold." overlay at top */}
            <div className="absolute top-5 left-5 right-5">
              <div className="bg-glass-gold rounded-xl px-4 py-2.5 border border-gold-400/25 inline-block">
                <span className="font-bebas text-xl tracking-[0.15em] text-cream">
                  CALM.&nbsp; CONFIDENT.&nbsp; SOLD.
                </span>
              </div>
            </div>
          </div>

          {/* SOLD rider — floating, bottom-right */}
          <div className="absolute -bottom-5 -right-3 sm:-right-8 animate-float">
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
              <div className="text-[11px] text-slate-400 mt-1 leading-snug">Homes sold<br/>Eastern NC</div>
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div
          ref={rightRef as React.RefObject<HTMLDivElement>}
          className={cn(
            "opacity-0",
            rightIn && "animate-slide-right"
          )}
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-400 mb-4">
            Track Record
          </p>
          <h2 className="font-display text-5xl sm:text-6xl font-bold text-cream mb-6 leading-tight">
            Mike Did It{" "}
            <span className="text-gold-shimmer italic">Again.</span>
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-base">
            Three decades of closed deals in Eastern NC. Not leads. Not open houses.
            <strong className="text-cream"> Sold signs.</strong> Mike prices your home
            to win — not to sit — and negotiates every dollar back to your side of the table.
          </p>

          {/* Proof cards */}
          <div className="space-y-3 mb-6">
            {PROOF.map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  "group flex items-center justify-between rounded-xl border border-white/[0.05]",
                  "bg-white/[0.02] px-5 py-4",
                  "hover:border-gold-400/20 hover:bg-white/[0.04]",
                  "transition-all duration-300 opacity-0",
                  rightIn && "animate-fade-up"
                )}
                style={{ animationDelay: `${300 + i * 80}ms` }}
              >
                <div>
                  <div className="text-sm font-medium text-cream group-hover:text-white transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                </div>
                <div className="text-right shrink-0 ml-5">
                  <div className="text-sm font-bold text-gold-400">{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 italic">
            Performance statements based on Mike Eatmon&apos;s Our Town Properties career biography.
            Individual results vary. Market conditions change.
          </p>
        </div>
      </div>
    </section>
  );
}
