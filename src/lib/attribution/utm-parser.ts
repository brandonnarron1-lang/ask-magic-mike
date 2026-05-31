import type { Attribution, ReferrerType } from "@/types/domain.types";
import { classifyReferrer } from "./referrer-classifier";

const MAX_UTM_LENGTH = 200;

function sanitize(value: string | null): string | null {
  if (!value) return null;
  // Strip HTML tags, trim, enforce max length
  return value
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, MAX_UTM_LENGTH) || null;
}

export function parseAttribution(
  searchParams: URLSearchParams | Record<string, string>,
  referrerUrl: string,
  landingPage: string
): Attribution {
  const get = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return sanitize(searchParams.get(key));
    }
    return sanitize(searchParams[key] ?? null);
  };

  const utmSource = get("utm_source");
  const utmMedium = get("utm_medium");
  const utmCampaign = get("utm_campaign");
  const utmContent = get("utm_content");
  const utmTerm = get("utm_term");

  const referrerType: ReferrerType = classifyReferrer(
    referrerUrl,
    utmMedium
  );

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    referrerUrl: referrerUrl || null,
    referrerType,
    landingPage: landingPage || "/",
  };
}

export function parseAttributionFromUrl(url: string): Attribution {
  try {
    const parsed = new URL(url);
    return parseAttribution(
      parsed.searchParams,
      "",
      parsed.pathname + parsed.search
    );
  } catch {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      referrerUrl: null,
      referrerType: "direct",
      landingPage: "/",
    };
  }
}
