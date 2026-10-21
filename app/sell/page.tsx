import type { Metadata } from "next";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { SellerIntentSection } from "../components/black-diamond/SellerIntentSection";
import { publicPageMetadata } from "../lib/publicMetadata";
import { sellerOption } from "../lib/sellerOptions";

export const metadata: Metadata = publicPageMetadata({
  title: "Seller Options in Wilson, NC",
  description: "Discuss timing, preparation, repairs, listing strategy, and possible as-is paths with Mike Eatmon and Our Town Properties before deciding how to sell.",
  path: "/sell",
  socialImage: { src: "https://www.askmagicmike.com/launch-20261013/compare-selling-options-og-20261021.jpg", alt: "Compare selling options with Mike Eatmon and Our Town Properties. A property review comes before any offer or decision." },
});

export default async function SellPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const option = sellerOption((await searchParams)?.seller_option);
  return (
    <main data-acquisition-form className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="seller" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section id="page-content" tabIndex={-1} className="px-5 py-6 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Seller options</p>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4] sm:text-4xl lg:text-6xl">
              Compare your selling options.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-6 text-[#d9ceb8] lg:mt-5 lg:text-lg lg:leading-8">
              Request a review of listing, preparation and possible as-is paths with Mike Eatmon and Our Town Properties. Property review comes before any offer or decision.
            </p>
          </div>
          <SellerIntentSection surface="seller_page" variant={option ? "options" : undefined} initialOption={option || undefined} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
