import { BuyerIntentSection } from "../components/black-diamond/BuyerIntentSection";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";

export default function BuyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="buyer" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div></section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Buyer guidance</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">Find the next move with a local plan.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">Request a personalized Wilson or Eastern North Carolina property-match and buying-plan review. A human will verify the details before presenting options.</p>
          </div>
          <BuyerIntentSection />
        </div>
      </section>
      <Footer />
    </main>
  );
}
