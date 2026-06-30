import { HeroSection } from "@/components/landing/hero-section";
import { AiDemoSection } from "@/components/landing/ai-demo-section";
import { MarketPulse } from "@/components/landing/market-pulse";
import { SoldSection } from "@/components/landing/sold-section";
import { Footer } from "@/components/landing/footer";
import { siteConfig } from "@/lib/site-config";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": `${siteConfig.canonicalSiteUrl}/#agent`,
      name: "Mike Eatmon — Our Town Properties",
      url: siteConfig.canonicalSiteUrl,
      telephone: siteConfig.agentPhoneDisplay,
      image: `${siteConfig.canonicalSiteUrl}/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp`,
      description:
        "Mike Eatmon is a licensed NC real estate broker with 30+ years of experience and $750M+ in career sales serving Wilson County and Eastern NC.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "3301 Nash St. N Suite E",
        addressLocality: "Wilson",
        addressRegion: "NC",
        postalCode: "27896",
        addressCountry: "US",
      },
      areaServed: [
        { "@type": "City", name: "Wilson", containedInPlace: { "@type": "State", name: "North Carolina" } },
        { "@type": "City", name: "Rocky Mount" },
        { "@type": "City", name: "Greenville" },
        { "@type": "City", name: "Smithfield" },
      ],
      knowsAbout: ["Residential Real Estate", "Home Valuation", "Eastern NC Market"],
    },
    {
      "@type": "LocalBusiness",
      "@id": `${siteConfig.canonicalSiteUrl}/#business`,
      name: "Our Town Properties, Inc.",
      url: siteConfig.parentBrandUrl,
      telephone: siteConfig.officePhoneDisplay,
      address: {
        "@type": "PostalAddress",
        streetAddress: "3301 Nash St. N Suite E",
        addressLocality: "Wilson",
        addressRegion: "NC",
        postalCode: "27896",
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 35.7321,
        longitude: -77.9155,
      },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "08:00", closes: "18:00" },
      ],
      priceRange: "Free consultation",
      employee: { "@id": `${siteConfig.canonicalSiteUrl}/#agent` },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.canonicalSiteUrl}/#website`,
      url: siteConfig.canonicalSiteUrl,
      name: "Ask Magic Mike",
      description: "AI-assisted real estate guidance reviewed by Mike Eatmon, Wilson NC broker.",
      publisher: { "@id": `${siteConfig.canonicalSiteUrl}/#business` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteConfig.canonicalSiteUrl}/ask?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
