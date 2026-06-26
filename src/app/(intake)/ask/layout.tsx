import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Ask Mike a Question | Ask Magic Mike by Our Town Properties",
  description:
    "Share your home buying or selling question with Mike Eatmon at Our Town Properties. " +
    "Broker-reviewed guidance for Wilson and Eastern NC — free, no commitment.",
  alternates: { canonical: "/ask" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Ask Magic Mike — Wilson, NC Real Estate Guidance",
    description:
      "Ask your question and get broker-reviewed follow-up from Mike Eatmon at Our Town Properties. Free, no account required.",
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
    title: "Ask Magic Mike by Our Town Properties",
    description:
      "Broker-reviewed real estate guidance for Wilson and Eastern NC. Free follow-up from Mike Eatmon.",
    images: [
      "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp",
    ],
  },
};

export default function AskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Ask Mike a Question",
            url: `${siteConfig.canonicalSiteUrl}/ask`,
            description:
              "Submit a real estate question to Mike Eatmon at Our Town Properties for broker-reviewed local guidance.",
            mainEntity: {
              "@type": "RealEstateAgent",
              name: "Mike Eatmon — Our Town Properties",
              url: siteConfig.canonicalSiteUrl,
              telephone: siteConfig.agentPhone,
              address: {
                "@type": "PostalAddress",
                streetAddress: "3301 Nash St. N Suite E",
                addressLocality: "Wilson",
                addressRegion: "NC",
                postalCode: "27896",
                addressCountry: "US",
              },
            },
          }),
        }}
      />
      {children}
    </>
  );
}
