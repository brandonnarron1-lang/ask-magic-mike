import type { Metadata } from "next";
import { AskMikeChatPanel } from "../components/black-diamond/AskMikeChatPanel";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../components/black-diamond/PageTracker";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Ask a Wilson, NC Real Estate Question",
  description: "Ask Mike Eatmon about home-value strategy, selling preparation, property facts, timing, or other Wilson-area real estate questions requiring local context.",
  path: "/ask",
});

export default function AskPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="ask_mike_chat" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section id="page-content" tabIndex={-1} className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Ask Mike</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">
              Ask Mike. Get a practical local next step.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">
              Ask about timing, sale-readiness, property facts, and what to do before listing. You will get a careful starting point, with property-specific guidance routed to real local follow-up.
            </p>
          </div>
          <AskMikeChatPanel surface="ask_page" />
        </div>
      </section>
      <Footer />
    </main>
  );
}
