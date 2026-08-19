import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const SITE_URL = siteConfig.canonicalSiteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ["/", 1],
    ["/home-value", 0.85],
    ["/value", 0.8],
    ["/sell", 0.8],
    ["/buy", 0.8],
    ["/rent", 0.7],
    ["/plan", 0.75],
    ["/we-buy-houses", 0.75],
    ["/contact", 0.55],
    ["/privacy", 0.3],
    ["/terms", 0.3],
    ["/accessibility", 0.3],
  ].map(([path, priority]) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: priority as number,
  }));
}
