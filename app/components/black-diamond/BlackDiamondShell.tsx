import Link from "next/link";
import { AnalyticsPreferencesButton } from "../analytics/ExternalAnalyticsConsent";
import { AskMikeChatPanel } from "./AskMikeChatPanel";
import { ConsumerReferralHandoff } from "./ConsumerReferralHandoff";
import { HeroSection } from "./HeroSection";
import { HomeValueFunnel } from "./HomeValueFunnel";
import { PageTracker } from "./PageTracker";
import { SellerIntentSection } from "./SellerIntentSection";
import { TrustProofStrip } from "./TrustProofStrip";
import { HomepageRequestDetails } from "./HomepageRequestDetails";
import { publicNavigation, experienceDestination } from "../../lib/experienceContract";

const paths = [
  {
    title: "Home Value Review",
    copy: "Start with the property address and get practical local next steps.",
    href: experienceDestination("homeValue"),
  },
  {
    title: "Compare Selling Options",
    copy: "Talk through timing, condition, repairs, and options before you commit.",
    href: experienceDestination("compare"),
  },
  {
    title: "Buying Help",
    copy: "Request a local buying-plan and property-match review for Wilson or Eastern North Carolina.",
    href: experienceDestination("buyer"),
  },
  {
    title: "Browse Homes",
    copy: "Explore Our Town Properties’ existing property search. Ask for buying help when you are ready.",
    href: publicNavigation.browseHomes.destination,
  },
];

export function BlackDiamondShell() {
  return (
    <>
      <main className="min-h-screen min-w-0 bg-[#050505] text-[#f4ead4] [overflow-wrap:anywhere]">
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
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {paths.map((path) => (
              <Link key={path.title} href={path.href} className="min-w-0 rounded-lg border border-[#cda24a33] bg-[#111113] p-6 transition hover:border-[#e2c06f]">
                <h3 className="font-serif text-3xl text-[#f4ead4]">{path.title}</h3>
                <p className="mt-4 leading-7 text-[#d9ceb8]">{path.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#cda24a2e] px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-4">
          <h2 className="font-serif text-3xl">Already started here?</h2>
          <p className="max-w-2xl leading-7 text-[#d9ceb8]">Continue an existing form below, or choose the focused review above. A saved request is a request for follow-up—not a valuation, offer or appointment.</p>
          <HomepageRequestDetails id="home-value" title="Continue the homepage Home Value form"><HomeValueFunnel surface="homepage" /></HomepageRequestDetails>
          <HomepageRequestDetails id="seller-strategy" title="Continue the homepage seller form"><SellerIntentSection surface="homepage" /></HomepageRequestDetails>
          <HomepageRequestDetails id="ask-mike" title="Ask a general real estate question"><AskMikeChatPanel surface="homepage" /></HomepageRequestDetails>
          <nav aria-label="Planning and account options" className="flex flex-wrap gap-4 text-sm">
            <Link href="/ask" className="inline-flex min-h-11 items-center text-[#e2c06f] underline">Ask Mike</Link>
            <Link href="/plan" className="inline-flex min-h-11 items-center text-[#e2c06f] underline">My Plan</Link>
            <Link href="/my" className="inline-flex min-h-11 items-center text-[#e2c06f] underline">My Workspace</Link>
            <Link href="/my/account" className="inline-flex min-h-11 items-center text-[#e2c06f] underline">Optional account</Link>
          </nav>
        </div>
      </section>

      <ConsumerReferralHandoff surface="homepage" />
      </main>
      <Footer />
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#cda24a2e] bg-[#050505] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 text-sm text-[#d9ceb8] [overflow-wrap:anywhere] md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-[#f4ead4]">Our Town Properties</p>
          <p className="mt-2">askmagicmike.com | ourtownproperties.com | Wilson, NC</p>
          <p className="mt-4 max-w-3xl leading-6">
            Ask Magic Mike provides general real estate guidance and lead intake for Our Town Properties. Property-specific pricing, listing strategy, agency relationships, and legal or financial decisions should be confirmed directly with a licensed professional.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-3 md:justify-end">
          <Link href="/home-value" className="text-[#e2c06f] hover:text-[#f4ead4]">Home Value</Link>
          <Link href="/sell" className="text-[#e2c06f] hover:text-[#f4ead4]">Sell</Link>
          <Link href="/buy" className="text-[#e2c06f] hover:text-[#f4ead4]">Buy</Link>
          <Link href="/ask" className="text-[#e2c06f] hover:text-[#f4ead4]">Ask Mike</Link>
          <Link href="/plan" className="text-[#e2c06f] hover:text-[#f4ead4]">Review Planner</Link>
          <Link href="/contact" className="text-[#e2c06f] hover:text-[#f4ead4]">Contact</Link>
          <Link href="/privacy" className="text-[#e2c06f] hover:text-[#f4ead4]">Privacy</Link>
          <AnalyticsPreferencesButton />
          <Link href="/terms" className="text-[#e2c06f] hover:text-[#f4ead4]">Terms</Link>
          <Link href="/accessibility" className="text-[#e2c06f] hover:text-[#f4ead4]">Accessibility</Link>
          <Link href={publicNavigation.staff.destination} className="inline-flex min-h-11 items-center text-[#d9ceb8] underline">Agent &amp; Broker Sign In</Link>
        </nav>
      </div>
    </footer>
  );
}
