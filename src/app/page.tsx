import { HeroSection } from "@/components/landing/hero-section";
import { AiDemoSection } from "@/components/landing/ai-demo-section";
import { MarketPulse } from "@/components/landing/market-pulse";
import { SoldSection } from "@/components/landing/sold-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <>
      {/* Skip-to-content must sit before <main> so it actually skips navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-midnight"
      >
        Skip to main content
      </a>
      <main id="main-content" className="bg-[#0A0A0A]">
      <HeroSection />
      <AiDemoSection />
      <MarketPulse />
      <SoldSection />
      <Footer />
    </main>
    </>
  );
}
