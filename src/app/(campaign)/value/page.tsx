import type { Metadata } from "next";
import { ValueHero } from "@/components/campaign/value-hero";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { siteConfig } from "@/lib/site-config";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${siteConfig.canonicalSiteUrl}/#agent`,
  name: "Mike Eatmon — Our Town Properties",
  description:
    "Wilson and Eastern North Carolina real estate broker with Our Town Properties. " +
    "Ask Magic Mike provides a source-aware intake path for local broker review.",
  url: siteConfig.canonicalSiteUrl,
  telephone: siteConfig.agentPhone,
  image: `${siteConfig.canonicalSiteUrl}/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp`,
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
    latitude: 35.7309,
    longitude: -77.918,
  },
  areaServed: [
    { "@type": "State", name: "North Carolina" },
    { "@type": "County", name: "Wilson County" },
    { "@type": "City", name: "Wilson" },
  ],
  knowsAbout: [
    "Residential Real Estate",
    "Wilson County NC Real Estate",
    "Eastern North Carolina Real Estate",
    "Home Valuation",
    "Direct-Purchase Home Review",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Real Estate Services — Our Town Properties",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Broker-Reviewed Home-Value Conversation" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Seller Representation" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Buyer Representation" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Direct-Purchase Review" },
      },
    ],
  },
  sameAs: [
    siteConfig.parentBrandUrl,
    siteConfig.agentProfileUrl,
  ],
};

export const metadata: Metadata = {
  title:
    "Start with your address. Get a local read on your home. | Ask Magic Mike",
  description:
    "Ask Magic Mike by Our Town Properties helps Wilson-area homeowners request a broker-reviewed home-value and sale-readiness conversation. Not an appraisal or automated valuation; no specific value is promised.",
  robots: { index: true, follow: true },
  openGraph: {
    title:
      "Ask Magic Mike by Our Town Properties | Wilson, NC home-value review",
    description:
      "Start with your property and timing. The Our Town Properties team reviews the request. Not an appraisal or automated valuation; no specific value is promised.",
    siteName: "Ask Magic Mike",
    type: "website",
    images: [
      {
        url: "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp",
        width: 1024,
        height: 1024,
        alt: "Mike Eatmon, broker at Our Town Properties, Inc.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Start with your address. Get a local read on your home.",
    description:
      "Mike Eatmon and the Our Town Properties team follow up with local guidance.",
    images: [
      "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp",
    ],
  },
};

export default function ValuePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ValueHero />
    </>
  );
}
