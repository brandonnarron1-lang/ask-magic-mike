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
    page_title: value.page_title,
    gclid: value.gclid,
    gbraid: value.gbraid,
    wbraid: value.wbraid,
    fbclid: value.fbclid,
    msclkid: value.msclkid,
  };
}

function firstParam(params: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

function storedAttribution() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistAttribution(attribution: Attribution) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution improves operations but must never break the public funnel.
  }
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
  const currentReferrer = document.referrer || undefined;
  const currentPageTitle = document.title || undefined;
  const stored = storedAttribution();

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Attribution;
      const attribution = {
        ...parsed,
        source: firstParam(params, "utm_source", "source") || parsed.source,
        medium: firstParam(params, "utm_medium", "medium") || parsed.medium,
        campaign: firstParam(params, "utm_campaign", "campaign") || parsed.campaign,
        content: firstParam(params, "utm_content") || parsed.content,
        term: firstParam(params, "utm_term") || parsed.term,
        referrer: currentReferrer || parsed.referrer,
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
        page_title: currentPageTitle || parsed.page_title,
        ...overrides,
      };
      attribution.first_touch = parsed.first_touch || touchSnapshot(parsed);
      attribution.last_touch = touchSnapshot({
        ...attribution,
        landing_page: window.location.href,
        current_path: currentPath,
      });
      persistAttribution(attribution);
      return attribution;
    } catch {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Continue with an in-memory attribution record below.
      }
    }
  }

  const attribution: Attribution = {
    source: firstParam(params, "utm_source", "source"),
    medium: firstParam(params, "utm_medium", "medium"),
    campaign: firstParam(params, "utm_campaign", "campaign"),
    content: firstParam(params, "utm_content"),
    term: firstParam(params, "utm_term"),
    gclid: params.get("gclid") || undefined,
    gbraid: params.get("gbraid") || undefined,
    wbraid: params.get("wbraid") || undefined,
    fbclid: params.get("fbclid") || undefined,
    msclkid: params.get("msclkid") || undefined,
    referrer: currentReferrer,
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
    page_title: currentPageTitle,
    device_category: getDeviceCategory(),
    created_at: new Date().toISOString(),
    ...overrides,
  };

  attribution.first_touch = touchSnapshot(attribution);
  attribution.last_touch = touchSnapshot(attribution);

  persistAttribution(attribution);
  return attribution;
}
