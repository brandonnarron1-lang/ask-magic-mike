import type { Metadata } from "next";
import { BuyerIntentSection } from "../components/black-diamond/BuyerIntentSection";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Rental-to-Homeownership Plan in Wilson, NC",
  description: "Request a practical rental-to-homeownership readiness review for Wilson or Eastern North Carolina without an affordability or eligibility promise.",
  path: "/rent",
});

export default function RentPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="renter" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div></section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Renter-to-owner guidance</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">Make the next housing decision with a local plan.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">Request a practical rental-to-homeownership readiness review for Wilson or Eastern North Carolina. A human will review the details before sharing next steps.</p>
          </div>
          <BuyerIntentSection surface="buyer_page" preset="renter" />
        </div>
      </section>
      <Footer />
    </main>
  );
}
