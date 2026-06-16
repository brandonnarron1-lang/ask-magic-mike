/**
 * Ask Magic Mike — platform-ready Mike crops (v2).
 *
 * Single source of truth for the six production crops shipped in
 * `mike_platform_ready_crops_v2.zip` and unpacked to
 * `public/images/mike/platform-crops/`.
 *
 * Pages, components, and route metadata import from here instead of
 * hard-coding `/images/mike/platform-crops/*` strings, so a future crop
 * swap touches one file rather than the whole tree.
 *
 * Provenance (from the kit's manifest.json): direct master-image crop /
 * resize with format-specific canvas extension only — **no face
 * regeneration, no baked text/logo, and not sourced from any third-party
 * listing-feed photography.** Safe for primary UI and link/social previews.
 */

const PLATFORM_CROPS_BASE = "/images/mike/platform-crops";

/**
 * Absolute production origin for crawler-fetchable OG/Twitter card URLs.
 * Driven by siteConfig so this file stays in sync with layout.tsx.
 */
import { siteConfig } from "@/lib/site-config";
const SITE_URL = siteConfig.canonicalSiteUrl;

export interface MikePlatformAsset {
  /** Public, root-relative URL (Next.js serves `public/` from `/`). */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Compliance-safe alt text (names Mike, no guarantees/cash-offer claims). */
  readonly alt: string;
  /** Where this crop is intended to be used. */
  readonly use: string;
}

export const mikePlatformAssets = {
  /** Desktop website hero plate — no text/logo/UI baked in. */
  websiteHeroPlate: {
    src: `${PLATFORM_CROPS_BASE}/01_website_hero_plate_2400x1350.jpg`,
    width: 2400,
    height: 1350,
    alt: "Mike Eatmon, broker at Our Town Properties — Wilson, NC real estate",
    use: "Desktop website hero plate",
  },
  /** Open Graph / link-preview card with a left clean safe zone. */
  openGraphCard: {
    src: "/ask-magic-mike-og.png",
    width: 1200,
    height: 630,
    alt: "Ask Magic Mike — Wilson, NC property review assistant by Our Town Properties",
    use: "Open Graph / Twitter summary_large_image card",
  },
  /**
   * Facebook / Instagram feed ad (4:5).
   *
   * `feedAd` and `storyAd` are **campaign export assets** — paid-social
   * creative kept centralized here for one-import reuse. They are
   * intentionally NOT rendered by the application at runtime: there is no
   * in-app social-ad preview / media-kit / asset-library surface that
   * legitimately consumes them. If/when a campaign or ad-preview component
   * is added, wire it to these keys rather than hard-coding the paths.
   */
  feedAd: {
    src: `${PLATFORM_CROPS_BASE}/03_facebook_instagram_feed_ad_1080x1350.jpg`,
    width: 1080,
    height: 1350,
    alt: "Ask Magic Mike — Our Town Properties feed creative",
    use: "Facebook / Instagram feed ad (campaign export — not app-rendered)",
  },
  /** Instagram / Facebook story ad (9:16) — campaign export (see feedAd note). */
  storyAd: {
    src: `${PLATFORM_CROPS_BASE}/04_instagram_story_ad_1080x1920.jpg`,
    width: 1080,
    height: 1920,
    alt: "Ask Magic Mike — Our Town Properties story creative",
    use: "Instagram / Facebook story ad (campaign export — not app-rendered)",
  },
  /** Mobile hero crop (9:16) — no clipped head/shoulders. */
  mobileHero: {
    src: `${PLATFORM_CROPS_BASE}/05_mobile_hero_crop_1080x1920.jpg`,
    width: 1080,
    height: 1920,
    alt: "Mike Eatmon, broker at Our Town Properties — Wilson, NC real estate",
    use: "Mobile website hero crop",
  },
  /** Circular-safe avatar / profile crop — the canonical Mike circular avatar. */
  circularAvatar: {
    src: `${PLATFORM_CROPS_BASE}/06_circular_avatar_crop_1024x1024.jpg`,
    width: 1024,
    height: 1024,
    alt: "Mike Eatmon, broker at Our Town Properties, Inc.",
    use: "Avatar / profile crop (circular-safe)",
  },
} as const satisfies Record<string, MikePlatformAsset>;

export type MikePlatformAssetKey = keyof typeof mikePlatformAssets;
export type MikePlatformAssets = typeof mikePlatformAssets;

/** Root-relative public URL for a crop. */
export function mikePlatformAsset(key: MikePlatformAssetKey): MikePlatformAsset {
  return mikePlatformAssets[key];
}

/**
 * Absolute, crawler-fetchable URL for a crop — use for Open Graph / Twitter
 * image URLs that must resolve outside the site (mirrors `metadataBase`).
 */
export function mikePlatformAssetAbsoluteUrl(key: MikePlatformAssetKey): string {
  return new URL(mikePlatformAssets[key].src, SITE_URL).toString();
}
