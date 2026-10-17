import { buildUtmUrl } from "../../../src/lib/admin/utm-link-builder";
import { experienceContract, experienceDestination } from "../experienceContract";

/** A choice is evidence of a URL, not another attribution/counting dimension. */
export const WORDPRESS_ACQUISITION_GROUPS = [
  { key: "wordpress_homepage_ask_mike", page: 149, label: "Homepage choices", pageUrl: "https://www.ourtownproperties.com/", destinations: [experienceDestination("homeValue"), experienceDestination("buyer"), experienceDestination("compare")], historicalDestinations: ["/ask"] },
  { key: "wordpress_we_buy_homes", page: 3631, label: "We Buy Homes", pageUrl: "https://www.ourtownproperties.com/we-buy-homes/", destinations: [experienceDestination("compare")], historicalDestinations: ["/sell"] },
  { key: "wordpress_listing_buyer", page: 2994, label: "Property Search", pageUrl: "https://www.ourtownproperties.com/property-search/", destinations: [experienceDestination("buyer")], historicalDestinations: [] },
] as const;

export function wordpressAcquisitionGroup(key: string) {
  return WORDPRESS_ACQUISITION_GROUPS.find(group => group.key === key);
}

export function wordpressTrackedChoices(key: string) {
  const group = wordpressAcquisitionGroup(key);
  return group?.destinations.map(path => {
    const destination = new URL(path, experienceContract.canonicalOrigin);
    const tracked = new URL(buildUtmUrl(destination.origin + destination.pathname, {
      utm_source: experienceContract.tracking.source, utm_medium: experienceContract.tracking.medium as "owned_media",
      utm_campaign: experienceContract.tracking.campaign, utm_content: group.key,
    }));
    destination.searchParams.forEach((value, name) => tracked.searchParams.set(name, value));
    return { destination: destination.toString(), trackedUrl: tracked.toString() };
  }) ?? [];
}

/** Normalize ordering only. Even identical duplicate parameters are rejected. */
export function exactTrackedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== "https://www.askmagicmike.com" || url.username || url.password || url.hash) return null;
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length) return null;
    url.searchParams.sort();
    return url.toString();
  } catch { return null; }
}

export function currentWordPressChoice(key: string, observedUrl: string) {
  const normalized = exactTrackedUrl(observedUrl);
  return normalized ? wordpressTrackedChoices(key).find(choice => exactTrackedUrl(choice.trackedUrl) === normalized) : undefined;
}

export function matchesWordPressEvidencePage(key: string, evidenceUrl: string | null) {
  const group = wordpressAcquisitionGroup(key);
  // Evidence URLs are public page identities, not campaign redirects.
  return Boolean(group && evidenceUrl === group.pageUrl);
}
