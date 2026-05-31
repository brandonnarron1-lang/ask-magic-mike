import type { ReferrerType } from "@/types/domain.types";

const ORGANIC_SEARCH_HOSTS = [
  "google.",
  "bing.com",
  "yahoo.com",
  "duckduckgo.com",
  "baidu.com",
  "yandex.",
  "ask.com",
];

const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",
  "pinterest.com",
  "youtube.com",
  "snapchat.com",
  "reddit.com",
];

const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paidsearch",
  "paidsocial",
  "display",
  "banner",
  "cpv",
  "cpm",
  "affiliate",
]);

export function classifyReferrer(
  referrerUrl: string,
  utmMedium: string | null
): ReferrerType {
  const medium = utmMedium?.toLowerCase().trim() ?? "";

  if (PAID_MEDIUMS.has(medium)) return "paid";
  if (medium === "email") return "email";

  if (!referrerUrl) return "direct";

  let hostname: string;
  try {
    hostname = new URL(referrerUrl).hostname.toLowerCase();
  } catch {
    return "direct";
  }

  for (const social of SOCIAL_HOSTS) {
    if (hostname.includes(social)) return "social";
  }

  for (const search of ORGANIC_SEARCH_HOSTS) {
    if (hostname.includes(search)) {
      // Only organic if no paid medium
      if (!medium || !PAID_MEDIUMS.has(medium)) return "organic";
    }
  }

  if (hostname) return "referral";

  return "direct";
}
