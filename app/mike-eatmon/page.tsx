import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { MikeIdentitySection } from "../components/black-diamond/MikeIdentitySection";
import { mikeIdentity, mikeIdentityNodes } from "../lib/mikeIdentity";

const title = "Mike Eatmon (Magic Mike) | Our Town Properties | Wilson, NC";
const profileUrl = `${siteConfig.canonicalSiteUrl}${mikeIdentity.profilePath}`;

export const metadata: Metadata = {
  title: { absolute: title },
  description: mikeIdentity.description,
  alternates: { canonical: mikeIdentity.profilePath },
  robots: { index: true, follow: true },
  openGraph: {
    type: "profile",
    title,
    description: mikeIdentity.description,
    url: mikeIdentity.profilePath,
    siteName: siteConfig.brandName,
    firstName: "Mike",
    lastName: "Eatmon",
    images: [{ url: mikeIdentity.portraitUrl, width: 1024, height: 1024, alt: mikeIdentity.portraitAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: mikeIdentity.description,
    images: [{ url: mikeIdentity.portraitUrl, alt: mikeIdentity.portraitAlt }],
  },
};

export default function MikeEatmonPage() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...mikeIdentityNodes(),
      {
        "@type": "ProfilePage",
        "@id": `${profileUrl}#webpage`,
        url: profileUrl,
        name: title,
        description: mikeIdentity.description,
        mainEntity: { "@id": mikeIdentity.personId },
        about: { "@id": mikeIdentity.personId },
        primaryImageOfPage: { "@id": mikeIdentity.portraitId },
        publisher: { "@id": mikeIdentity.organizationId },
        inLanguage: "en-US",
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />
      <main className="min-h-screen min-w-0 bg-[#050505] text-[#f4ead4] [overflow-wrap:anywhere]">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10"><BlackDiamondHeader /></div>
        <div id="page-content" tabIndex={-1}><MikeIdentitySection profile /></div>
      </main>
      <Footer />
    </>
  );
}
