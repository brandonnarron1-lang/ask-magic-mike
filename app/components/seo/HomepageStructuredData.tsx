import { siteConfig } from "@/lib/site-config";

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function HomepageStructuredData() {
  const siteUrl = siteConfig.canonicalSiteUrl;
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${siteUrl}/#webpage`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.parentBrandName,
        url: siteConfig.parentBrandUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/brand/black-diamond/our-town-logo.png`,
          width: 343,
          height: 145,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: siteConfig.brandName,
        description: "Local real estate guidance and lead intake from Our Town Properties in Wilson, North Carolina.",
        publisher: { "@id": organizationId },
        inLanguage: "en-US",
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: siteUrl,
        name: "Ask Magic Mike | Wilson, NC Real Estate Guidance",
        description: "Local home value guidance, seller strategy, and real estate answers from Mike Eatmon and Our Town Properties in Wilson, North Carolina.",
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        inLanguage: "en-US",
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(graph) }} />;
}
