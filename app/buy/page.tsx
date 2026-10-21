import type { Metadata } from "next";
import { BuyerIntentSection } from "../components/black-diamond/BuyerIntentSection";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Home Buying Plan for Wilson and Eastern NC",
  description: "Request a personalized property-match and buying-plan review for Wilson or Eastern North Carolina. A local professional verifies details before presenting options.",
  path: "/buy",
  socialImage: { src: "https://www.askmagicmike.com/launch-20261013/buyer-og.jpg", alt: "Ask Magic Mike: share a property or search area for local buying guidance from Our Town Properties." },
});

export default function BuyPage() {
  return (
    <main data-acquisition-form className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="buyer" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div></section>
      <section id="page-content" tabIndex={-1} className="px-5 py-6 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-6 lg:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)] lg:items-start lg:gap-10">
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Buyer guidance</p>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4] sm:text-4xl lg:text-6xl">A home in mind? A place to start.</h1>
            <p className="mt-3 max-w-xl text-base leading-6 text-[#d9ceb8] lg:mt-5 lg:text-lg lg:leading-8">Share a property or your search area and best contact method. Request local buying guidance from Mike and Our Town Properties.</p>
          </div>
          <BuyerIntentSection />
        </div>
      </section>
      <Footer />
    </main>
  );
}
