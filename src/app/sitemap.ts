import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const SITE_URL = siteConfig.canonicalSiteUrl;

/**
 * Only content surfaces belong here. /ask, /embed/ask, /widget-preview, and
 * /admin are conversion/preview/internal surfaces and are deliberately
 * excluded (they are also noindexed via robots metadata).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/value`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
