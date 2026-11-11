import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const SITE_URL = siteConfig.canonicalSiteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const existingPages = [
    ["/", 1],
    ["/home-value", 0.85],
    ["/sell", 0.8],
    ["/buy", 0.8],
    ["/ask", 0.75],
    ["/rent", 0.7],
    ["/plan", 0.75],
    ["/contact", 0.55],
    ["/privacy", 0.3],
    ["/terms", 0.3],
    ["/accessibility", 0.3],
  ].map(([path, priority]) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: priority as number,
  }));
  return [
    ...existingPages,
    {
      url: `${SITE_URL}/mike-eatmon`,
      lastModified: "2026-11-11",
      changeFrequency: "monthly",
      priority: 0.65,
    },
  ];
}
