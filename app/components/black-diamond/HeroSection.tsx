"use client";

import Link from "next/link";
import { trackEvent } from "@/app/lib/analytics";
import { readAttribution } from "@/app/lib/attribution";
import { BlackDiamondHeader } from "./BlackDiamondHeader";

export function HeroSection() {
  function trackHero(destination: string) {
    trackEvent("hero_cta_click", readAttribution(), {
      funnel_name: destination,
      step_name: "hero",
    });
  }

  return (
    <section className="relative min-h-[96svh] overflow-hidden">
      <picture className="absolute inset-0">
        <source media="(max-width: 767px)" srcSet="/brand/black-diamond/hero-home-mobile.webp" />
        <source srcSet="/brand/black-diamond/hero-home-desktop.webp" />
        <img
          src="/brand/black-diamond/hero-home-desktop.jpg"
          alt=""
          className="h-full w-full object-cover object-[64%_center] md:object-center"
        />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.16),rgba(5,5,5,.82)_78%,#050505),linear-gradient(90deg,rgba(5,5,5,.88),rgba(5,5,5,.50)_42%,rgba(5,5,5,.10)_72%)]" />

      <div className="relative z-10 mx-auto flex min-h-[96svh] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <BlackDiamondHeader onAsk={() => trackHero("ask_mike_chat")} />

        <div className="flex flex-1 items-end pb-12 pt-20 md:items-center md:pb-0 md:pt-0">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e2c06f]">
              Our Town Properties | Wilson, NC
            </p>
            <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[0.95] text-[#f4ead4] sm:text-6xl lg:text-7xl">
              Real estate answers, local strategy, and smarter moves in Wilson, NC.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#d9ceb8] sm:text-lg">
              Ask Magic Mike connects homeowners and buyers with practical guidance from Our Town Properties and a real follow-up path when the details matter.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/home-value"
                onClick={() => trackHero("home_value")}
                className="rounded-full border border-[#e2c06f] bg-[#cda24a] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-[#080807] shadow-[0_24px_70px_rgba(0,0,0,.48)] transition hover:bg-[#e2c06f]"
              >
                Get My Home Value
              </Link>
              <Link
                href="/ask"
                onClick={() => trackHero("ask_mike_chat")}
                className="rounded-full border border-[#cda24a66] bg-black/40 px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-[#f4ead4] backdrop-blur transition hover:border-[#e2c06f]"
              >
                Ask Mike
              </Link>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
              Local guidance from Our Town Properties. Licensed in North Carolina. Serving Wilson and surrounding communities.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
