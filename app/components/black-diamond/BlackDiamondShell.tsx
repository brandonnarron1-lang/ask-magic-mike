import Link from "next/link";
import { AskMikeChatPanel } from "./AskMikeChatPanel";
import { HeroSection } from "./HeroSection";
import { HomeValueFunnel } from "./HomeValueFunnel";
import { PageTracker } from "./PageTracker";
import { SellerIntentSection } from "./SellerIntentSection";
import { SocialAdSupportSection } from "./SocialAdSupportSection";
import { TrustProofStrip } from "./TrustProofStrip";

const paths = [
  {
    title: "Home Value",
    copy: "Start with the property address and get practical local next steps.",
    href: "/home-value",
  },
  {
    title: "Sell Direct / Seller Strategy",
    copy: "Talk through timing, condition, repairs, and options before you commit.",
    href: "/sell",
  },
  {
    title: "Ask Mike",
    copy: "Use a focused local-advisor chat flow for real estate questions.",
    href: "/ask",
  },
];

export function BlackDiamondShell() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="homepage" />
      <HeroSection />
      <TrustProofStrip />

      <section className="bg-[#080808] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">How it works</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-5xl">
              A clear path from question to local follow-up.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Enter the property address",
              "Tell Mike where to send the follow-up",
              "Get practical local next steps",
            ].map((item, index) => (
              <div key={item} className="rounded-lg border border-[#cda24a33] bg-black/30 p-5">
                <p className="font-mono text-sm text-[#e2c06f]">0{index + 1}</p>
                <p className="mt-4 text-lg font-semibold leading-6 text-[#f4ead4]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#050505] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Choose your path</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {paths.map((path) => (
              <Link key={path.title} href={path.href} className="rounded-lg border border-[#cda24a33] bg-[#111113] p-6 transition hover:border-[#e2c06f]">
                <h3 className="font-serif text-3xl text-[#f4ead4]">{path.title}</h3>
                <p className="mt-4 leading-7 text-[#d9ceb8]">{path.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="home-value" className="border-t border-[#cda24a2e] bg-[#080808] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Home-value intake</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-5xl">
              Start with the address. Mike will bring the local context.
            </h2>
            <p className="mt-5 max-w-xl text-[#d9ceb8]">
              No instant fake estimate. This creates a real valuation request with local follow-up from Our Town Properties.
            </p>
          </div>
          <HomeValueFunnel surface="homepage" />
        </div>
      </section>

      <section className="bg-[#0b0b0d] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <SellerIntentSection surface="homepage" />
          <AskMikeChatPanel surface="homepage" />
        </div>
      </section>

      <SocialAdSupportSection />
      <Footer />
    </main>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#cda24a2e] bg-[#050505] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6 text-sm text-[#d9ceb8] md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-[#f4ead4]">Our Town Properties</p>
          <p className="mt-2">askmagicmike.com | ourtownproperties.com | Wilson, NC</p>
          <p className="mt-4 max-w-3xl leading-6">
            Ask Magic Mike provides general real estate guidance and lead intake for Our Town Properties. Property-specific pricing, listing strategy, agency relationships, and legal or financial decisions should be confirmed directly with a licensed professional.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link href="/widget-preview" className="text-[#e2c06f] hover:text-[#f4ead4]">Widget Preview</Link>
          <Link href="/integrations/ourtownproperties" className="text-[#e2c06f] hover:text-[#f4ead4]">OurTown Integration</Link>
          <Link href="/social-preview" className="text-[#e2c06f] hover:text-[#f4ead4]">Social Preview</Link>
        </div>
      </div>
    </footer>
  );
}
