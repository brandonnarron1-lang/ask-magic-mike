import { HeroSection } from "@/components/landing/hero-section";
import { AiDemoSection } from "@/components/landing/ai-demo-section";
import { MarketPulse } from "@/components/landing/market-pulse";
import { SoldSection } from "@/components/landing/sold-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main id="main-content" className="bg-[#0A0A0A]">
      <HeroSection />
      <AiDemoSection />
      <MarketPulse />
      <SoldSection />
      <Footer />
    </main>
  );
}
