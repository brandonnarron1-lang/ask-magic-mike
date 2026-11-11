import { siteConfig } from "@/lib/site-config";

/** Public identity shared with the existing brokerage biography, not the AI assistant. */
export const mikeIdentity = {
  personId: `${siteConfig.agentProfileUrl}#person`,
  organizationId: `${siteConfig.parentBrandUrl}/#organization`,
  portraitId: `${siteConfig.agentProfileUrl}#primaryimage`,
  portraitUrl: `${siteConfig.parentBrandUrl}/wp-content/uploads/Mike-Eatmon.jpeg`,
  portraitSrc: "/images/identity/mike-eatmon-our-town-properties-wilson-nc-headshot.jpg",
  logoSrc: "/images/identity/our-town-properties-logo-black-gold.png",
  profilePath: "/mike-eatmon",
  description: "Meet Mike Eatmon, known as Magic Mike, a real estate broker with Our Town Properties, Inc. in Wilson, North Carolina.",
  portraitAlt: "Mike Eatmon, broker with Our Town Properties in Wilson, North Carolina.",
} as const;

export function mikeIdentityNodes() {
  return [
    {
      "@type": "Organization",
      "@id": mikeIdentity.organizationId,
      name: siteConfig.parentBrandName,
      url: siteConfig.parentBrandUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.canonicalSiteUrl}${mikeIdentity.logoSrc}`,
        width: 343,
        height: 180,
      },
    },
    {
      "@type": "ImageObject",
      "@id": mikeIdentity.portraitId,
      url: mikeIdentity.portraitUrl,
      contentUrl: mikeIdentity.portraitUrl,
      width: 1024,
      height: 1024,
      caption: "Mike Eatmon · Our Town Properties, Inc. · Wilson, North Carolina",
      inLanguage: "en-US",
    },
    {
      "@type": "Person",
      "@id": mikeIdentity.personId,
      name: siteConfig.agentName,
      alternateName: "Magic Mike",
      url: siteConfig.agentProfileUrl,
      description: mikeIdentity.description,
      jobTitle: "Real estate broker",
      image: { "@id": mikeIdentity.portraitId },
      worksFor: { "@id": mikeIdentity.organizationId },
      workLocation: {
        "@type": "Place",
        name: "Wilson, North Carolina",
      },
    },
  ];
}
