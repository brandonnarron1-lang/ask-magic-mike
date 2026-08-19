import type { Metadata } from "next";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { RealEstateReviewPlanner } from "../components/black-diamond/RealEstateReviewPlanner";

export const metadata: Metadata = {
  title: "Real Estate Review Planner",
  description: "Build a private, device-saved seller, buyer, homeowner, or relocation review plan before requesting local guidance.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <main className="amm-page-surface min-h-screen text-[#f4ead4]">
      <PageTracker funnelName="review_planner" />
      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div>
      </section>

      <section className="px-5 pb-12 pt-10 sm:px-8 sm:pb-16 lg:px-10 lg:pt-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <p className="amm-eyebrow">Real Estate Review Planner</p>
            <h1 className="mt-4 max-w-5xl font-serif text-5xl leading-[1.02] text-[#f4ead4] sm:text-6xl lg:text-7xl">
              Make the next move clearer before you make it final.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d9ceb8]">
              Build a focused seller, buyer, homeowner, or relocation plan from practical milestones—then return to it on this device whenever your timing changes.
            </p>
          </div>
          <aside className="rounded-lg border border-[#22c6d24d] bg-[#22c6d208] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c6d2]">Private by design</p>
            <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">
              The planner asks for no contact details, property address, or personal narrative. It creates no lead and starts no alerts, emails, or texts. Non-contact usage events may record controlled selections, progress, campaign attribution, and device context.
            </p>
          </aside>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl"><RealEstateReviewPlanner /></div>
      </section>

      <section className="border-t border-[#cda24a2e] bg-[#080808] px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            ["No automated conclusions", "The planner does not estimate price, availability, affordability, condition, or outcomes."],
            ["Consumer-selected criteria", "Relocation and search prompts use objective criteria you choose—never protected traits or demographic rankings."],
            ["Human verification", "Property, market, agency, legal, lending, and financial facts should be confirmed with the appropriate licensed professional."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-lg border border-[#cda24a33] bg-black/25 p-5">
              <h2 className="font-semibold text-[#f4ead4]">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">{copy}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
