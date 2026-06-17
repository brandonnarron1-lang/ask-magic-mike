import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const SITE_URL = siteConfig.canonicalSiteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/ask", "/widget-preview", "/embed/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
