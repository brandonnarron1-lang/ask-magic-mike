import type { Metadata } from "next";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { HomeValueExperimentExperience } from "../components/black-diamond/HomeValueExperimentExperience";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { TrustProofStrip } from "../components/black-diamond/TrustProofStrip";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Home Value Review in Wilson, NC",
  description: "Request a broker-reviewed home value and sale-readiness conversation from Mike Eatmon and Our Town Properties. No instant automated estimate or guaranteed value.",
  path: "/home-value",
});

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
        <HomeValueExperimentExperience />
      </section>
      <TrustProofStrip />
      <Footer />
    </main>
  );
}
