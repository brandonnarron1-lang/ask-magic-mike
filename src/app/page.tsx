import { HeroSection } from "@/components/landing/hero-section";
import { AiDemoSection } from "@/components/landing/ai-demo-section";
import { MarketPulse } from "@/components/landing/market-pulse";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SoldSection } from "@/components/landing/sold-section";
import { WhyMike } from "@/components/landing/why-mike";
import { MikeCard } from "@/components/landing/mike-card";
import { FaqStrip } from "@/components/landing/faq-strip";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main id="main-content" className="bg-[#0A0A0A]">
      <HeroSection />
      <AiDemoSection />
      <MarketPulse />
      <HowItWorks />
      <SoldSection />
      <WhyMike />
      <MikeCard />
      <FaqStrip />
      <Footer />
    </main>
  );
}
