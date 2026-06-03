import type { Metadata } from "next";
import { ValueHero } from "@/components/campaign/value-hero";

export const metadata: Metadata = {
  title:
    "Start with your address. Get a local read on your home. | Ask Magic Mike",
  description:
    "Ask Magic Mike by Our Town Properties helps Wilson-area homeowners see a preliminary home value range and get follow-up from Mike Eatmon's team. AI-assisted intake, local human follow-up.",
  robots: { index: true, follow: true },
  openGraph: {
    title:
      "Ask Magic Mike by Our Town Properties | Wilson, NC home value range",
    description:
      "Start with your address. Mike Eatmon's Our Town Properties team follows up with local guidance. Preliminary home value range, not an appraisal.",
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
  return <ValueHero />;
}
