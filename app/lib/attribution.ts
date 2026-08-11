"use client";

import type { Attribution } from "./leadPayload";

const STORAGE_KEY = "amm_attribution";

function touchSnapshot(value: Attribution) {
  return {
    source: value.source,
    medium: value.medium,
    campaign: value.campaign,
    content: value.content,
    term: value.term,
    referrer: value.referrer,
    landing_page: value.landing_page,
    current_path: value.current_path,
    parent_url: value.parent_url,
    embed_host: value.embed_host,
    placement: value.placement,
    placement_id: value.placement_id,
    listing_id: value.listing_id,
    property_id: value.property_id,
    agent_id: value.agent_id,
    gclid: value.gclid,
    gbraid: value.gbraid,
    wbraid: value.wbraid,
    fbclid: value.fbclid,
    msclkid: value.msclkid,
  };
}

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
        placement_id: params.get("placement_id") || parsed.placement_id || parsed.placement,
        listing_id: params.get("listing_id") || parsed.listing_id,
        property_id: params.get("property_id") || parsed.property_id,
        agent_id: params.get("agent_id") || parsed.agent_id,
        gclid: params.get("gclid") || parsed.gclid,
        gbraid: params.get("gbraid") || parsed.gbraid,
        wbraid: params.get("wbraid") || parsed.wbraid,
        fbclid: params.get("fbclid") || parsed.fbclid,
        msclkid: params.get("msclkid") || parsed.msclkid,
        ...overrides,
      };
      attribution.first_touch = parsed.first_touch || touchSnapshot(parsed);
      attribution.last_touch = touchSnapshot(attribution);
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
    gbraid: params.get("gbraid") || undefined,
    wbraid: params.get("wbraid") || undefined,
    fbclid: params.get("fbclid") || undefined,
    msclkid: params.get("msclkid") || undefined,
    referrer: document.referrer || undefined,
    landing_page: window.location.href,
    initial_path: currentPath,
    current_path: currentPath,
    parent_url: params.get("parent_url") || undefined,
    embed_host: params.get("embed_host") || undefined,
    placement: params.get("placement") || undefined,
    placement_id: params.get("placement_id") || params.get("placement") || undefined,
    listing_id: params.get("listing_id") || undefined,
    property_id: params.get("property_id") || undefined,
    agent_id: params.get("agent_id") || undefined,
    device_category: getDeviceCategory(),
    created_at: new Date().toISOString(),
    ...overrides,
  };

  attribution.first_touch = touchSnapshot(attribution);
  attribution.last_touch = touchSnapshot(attribution);

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}
