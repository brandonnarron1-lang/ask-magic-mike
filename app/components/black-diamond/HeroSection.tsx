"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { trackEvent } from "../../lib/analytics";
import { readAttribution } from "../../lib/attribution";
import { BlackDiamondHeader } from "./BlackDiamondHeader";
import { publicNavigation, experienceDestination } from "../../lib/experienceContract";

const { props: mobileHeroProps } = getImageProps({
  src: "/brand/black-diamond/hero-home-mobile.webp",
  alt: "",
  width: 1080,
  height: 1920,
  sizes: "100vw",
  quality: 75,
  loading: "eager",
  fetchPriority: "high",
});

const { props: { srcSet: desktopHeroSrcSet } } = getImageProps({
  src: "/brand/black-diamond/hero-home-desktop.webp",
  alt: "",
  width: 2880,
  height: 1620,
  sizes: "100vw",
  quality: 75,
  loading: "eager",
  fetchPriority: "high",
});

export function HeroSection() {
  function trackHero(destination: string) {
    trackEvent("hero_cta_click", readAttribution(), {
      funnel_name: destination,
      step_name: "hero",
    });
  }

  return (
    <section className="relative border-b border-[#cda24a33]">
      <picture className="absolute inset-0">
        <source media="(min-width: 768px)" srcSet={desktopHeroSrcSet} sizes="100vw" />
        <img
          {...mobileHeroProps}
          className="h-full w-full object-cover object-[64%_center] md:object-center"
        />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.16),rgba(5,5,5,.82)_78%,#050505),linear-gradient(90deg,rgba(5,5,5,.88),rgba(5,5,5,.50)_42%,rgba(5,5,5,.10)_72%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <BlackDiamondHeader onAsk={() => trackHero("ask_mike_chat")} />

        <div
          id="page-content"
          tabIndex={-1}
          className="flex items-center pb-8 pt-10 sm:pb-12 lg:min-h-[32rem] lg:py-14"
        >
          <div className="min-w-0 max-w-3xl [overflow-wrap:anywhere]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e2c06f]">
              Our Town Properties | Wilson, NC
            </p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-[1.08] text-[#f4ead4] sm:text-5xl lg:text-6xl">
              Your next move starts with local expertise.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#d9ceb8] sm:text-lg">
              Request a home value review, get help with a property, or compare your selling options with Mike Eatmon and Our Town Properties.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={experienceDestination("homeValue")}
                onClick={() => trackHero("home_value")}
                className="amm-primary-button px-6 py-4 shadow-[0_24px_70px_rgba(0,0,0,.48)]"
              >
                Request My Home Value Review
              </Link>
              <Link
                href={experienceDestination("buyer")}
                onClick={() => trackHero("buyer")}
                className="amm-secondary-button px-6 py-4"
              >
                Get Buying Help
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold">
              <Link href={experienceDestination("compare")} onClick={() => trackHero("seller")} className="inline-flex min-h-11 items-center text-[#f4ead4] underline underline-offset-4">Compare Selling Options</Link>
              <a href={publicNavigation.browseHomes.destination} onClick={() => trackHero("property_search")} className="inline-flex min-h-11 items-center text-[#f4ead4] underline underline-offset-4">Browse Homes</a>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
              Our Town Properties, Inc. · Wilson and surrounding communities. No account or chat required to request help.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
