import type { Attribution } from "@/types/domain.types";
import { parseAttribution } from "./utm-parser";

const STORAGE_KEY = "amm_attribution";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export interface StoredAttribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerUrl: string | null;
  referrerType: Attribution["referrerType"];
  landingPath: string;
  landingUrl: string;
  firstSeenAt: string;
}

/**
 * Capture UTMs/referrer from the current window on first visit and persist them
 * to sessionStorage so they survive route changes and step navigation through
 * the funnel. Subsequent calls return the existing record unless a fresh UTM
 * source is present in the URL (in which case the new attribution wins — last
 * paid click attribution model).
 */
export function captureAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const hasFreshUtm = UTM_KEYS.some((k) => url.searchParams.has(k));

  const existing = readAttribution();
  if (existing && !hasFreshUtm) return existing;

  const parsed = parseAttribution(
    url.searchParams,
    document.referrer || "",
    url.pathname + url.search
  );

  const stored: StoredAttribution = {
    utmSource:    parsed.utmSource,
    utmMedium:    parsed.utmMedium,
    utmCampaign:  parsed.utmCampaign,
    utmContent:   parsed.utmContent,
    utmTerm:      parsed.utmTerm,
    referrerUrl:  parsed.referrerUrl,
    referrerType: parsed.referrerType,
    landingPath:  url.pathname,
    landingUrl:   url.href,
    firstSeenAt:  existing?.firstSeenAt ?? new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // sessionStorage may be unavailable (private mode, quota) — fail open
  }

  return stored;
}

export function readAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Build a URLSearchParams that carries the captured UTMs forward. Useful when
 * navigating from /value → /ask so that even if sessionStorage is wiped, the
 * URL itself preserves attribution.
 */
export function appendUtmsToParams(
  params: URLSearchParams,
  attribution: Pick<
    StoredAttribution,
    "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm"
  > | null
): URLSearchParams {
  if (!attribution) return params;
  const map: Record<UtmKey, string | null> = {
    utm_source:   attribution.utmSource,
    utm_medium:   attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    utm_content:  attribution.utmContent,
    utm_term:     attribution.utmTerm,
  };
  for (const key of UTM_KEYS) {
    const value = map[key];
    if (value && !params.has(key)) params.set(key, value);
  }
  return params;
}
