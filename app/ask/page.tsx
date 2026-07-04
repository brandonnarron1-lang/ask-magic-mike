import { AskMikeChatPanel } from "../components/black-diamond/AskMikeChatPanel";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";

export default function AskPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="ask_mike_chat" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Ask Mike</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">
              A focused local real estate advisor interface.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">
              Ask about timing, valuation strategy, neighborhoods, buyer demand, and what to do before listing. The interface stays careful with facts and routes address-specific advice to real follow-up.
            </p>
          </div>
          <AskMikeChatPanel surface="ask_page" />
        </div>
      </section>
      <Footer />
    </main>
  );
}
