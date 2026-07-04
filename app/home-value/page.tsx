import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { HomeValueFunnel } from "../components/black-diamond/HomeValueFunnel";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { TrustProofStrip } from "../components/black-diamond/TrustProofStrip";

export default function HomeValuePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="home_value" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Home Value</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">
              Start with the address. Get a practical local follow-up.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">
              This is a real intake, not an instant automated promise. Mike can review the property context and point you toward useful next steps.
            </p>
          </div>
          <HomeValueFunnel surface="home_value_page" />
        </div>
      </section>
      <TrustProofStrip />
      <Footer />
    </main>
  );
}
