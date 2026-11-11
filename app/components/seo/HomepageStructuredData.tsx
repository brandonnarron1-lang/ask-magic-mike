import { siteConfig } from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { mikeIdentity, mikeIdentityNodes } from "../../lib/mikeIdentity";

export function HomepageStructuredData() {
  const siteUrl = siteConfig.canonicalSiteUrl;
  const organizationId = mikeIdentity.organizationId;
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${siteUrl}/#webpage`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...mikeIdentityNodes(),
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: siteConfig.brandName,
        description: "Local real estate guidance and lead intake from Our Town Properties in Wilson, North Carolina.",
        publisher: { "@id": organizationId },
        about: { "@id": mikeIdentity.personId },
        inLanguage: "en-US",
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: siteUrl,
        name: "Ask Magic Mike | Wilson, NC Real Estate Guidance",
        description: "Local home value guidance, seller strategy, and real estate answers from Mike Eatmon and Our Town Properties in Wilson, North Carolina.",
        isPartOf: { "@id": websiteId },
        about: [{ "@id": mikeIdentity.personId }, { "@id": organizationId }],
        inLanguage: "en-US",
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />;
}
