"use client";

import type { Attribution } from "./leadPayload";

const STORAGE_KEY = "amm_attribution";

export const initialAttribution: Attribution = {
  created_at: new Date().toISOString(),
};

export function getDeviceCategory() {
  if (typeof window === "undefined") return "unknown";
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1023px)").matches) return "tablet";
  return "desktop";
}

export function readAttribution(overrides: Partial<Attribution> = {}): Attribution {
  if (typeof window === "undefined") return { ...initialAttribution, ...overrides };

  const params = new URLSearchParams(window.location.search);
  const currentPath = window.location.pathname + window.location.search;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Attribution;
      const attribution = {
        ...parsed,
        current_path: currentPath,
        device_category: getDeviceCategory(),
        parent_url: params.get("parent_url") || parsed.parent_url,
        embed_host: params.get("embed_host") || parsed.embed_host,
        placement: params.get("placement") || parsed.placement,
        ...overrides,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
      return attribution;
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  const attribution: Attribution = {
    source: params.get("utm_source") || params.get("source") || undefined,
    medium: params.get("utm_medium") || params.get("medium") || undefined,
    campaign: params.get("utm_campaign") || params.get("campaign") || undefined,
    content: params.get("utm_content") || undefined,
    term: params.get("utm_term") || undefined,
    gclid: params.get("gclid") || undefined,
    fbclid: params.get("fbclid") || undefined,
    referrer: document.referrer || undefined,
    landing_page: window.location.href,
    initial_path: currentPath,
    current_path: currentPath,
    parent_url: params.get("parent_url") || undefined,
    embed_host: params.get("embed_host") || undefined,
    placement: params.get("placement") || undefined,
    device_category: getDeviceCategory(),
    created_at: new Date().toISOString(),
    ...overrides,
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}
