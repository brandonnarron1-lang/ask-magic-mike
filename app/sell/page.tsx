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
});

export default async function SellPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const option = sellerOption((await searchParams)?.seller_option);
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="seller" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section id="page-content" tabIndex={-1} className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Seller options</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">
              Get clear before listing, repairing, or selling as-is.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">
              A direct conversation can help you decide what is worth fixing, when to move, and which path fits the property.
            </p>
          </div>
          <SellerIntentSection surface="seller_page" variant={option ? "options" : undefined} initialOption={option || undefined} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
