/**
 * Ask Magic Mike — platform-ready Mike crops (v2).
 *
 * Single source of truth for the six production crop slots. Currently
 * resolved to brand-pack-v2 equivalents under
 * `public/images/ask-magic-mike/brand-pack-v2/` — the canonical assets from
 * Our Town Properties / Mike Eatmon photography.
 *
 * Pages, components, and route metadata import from here instead of
 * hard-coding image paths, so a future crop swap touches one file rather
 * than the whole tree.
 *
 * Provenance: direct master-image crop / resize only — no face regeneration,
 * no baked text/logo, not sourced from MLS or any third-party listing-feed
 * photography. Safe for primary UI and link/social previews.
 */

const PLATFORM_CROPS_BASE = "/images/ask-magic-mike/brand-pack-v2";

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
    src: `${PLATFORM_CROPS_BASE}/mike-headshot-source.webp`,
    width: 1024,
    height: 1024,
    alt: "Mike Eatmon, broker at Our Town Properties — Wilson, NC real estate",
    use: "Desktop website hero plate",
  },
  /** Open Graph / link-preview card (square 1:1 — accepted by all major platforms). */
  openGraphCard: {
    src: `${PLATFORM_CROPS_BASE}/mike-headshot-source.webp`,
    width: 1024,
    height: 1024,
    alt: "Ask Magic Mike — Wilson, NC property review assistant by Our Town Properties",
    use: "Open Graph / Twitter summary_large_image card",
  },
  /**
   * Facebook / Instagram feed ad equivalent (4:5).
   *
   * `feedAd` and `storyAd` are **campaign export assets** — paid-social
   * creative kept centralized here for one-import reuse. They are
   * intentionally NOT rendered by the application at runtime: there is no
   * in-app social-ad preview / media-kit / asset-library surface that
   * legitimately consumes them. If/when a campaign or ad-preview component
   * is added, wire it to these keys rather than hard-coding the paths.
   *
   * `feedAd` is also the backing asset for the in-app `MikeHeroPortrait`
   * component which uses `fill` layout — container aspect ratio governs.
   */
  feedAd: {
    src: `${PLATFORM_CROPS_BASE}/mike-hero-closeup.webp`,
    width: 360,
    height: 440,
    alt: "Mike Eatmon, broker at Our Town Properties — Ask Magic Mike",
    use: "Hero portrait / feed ad equivalent (4:5) — campaign export (not app-rendered standalone)",
  },
  /** Story ad equivalent (portrait) — campaign export (see feedAd note). */
  storyAd: {
    src: `${PLATFORM_CROPS_BASE}/mike-hero-closeup.webp`,
    width: 360,
    height: 440,
    alt: "Ask Magic Mike — Our Town Properties story creative",
    use: "Instagram / Facebook story ad equivalent (campaign export — not app-rendered)",
  },
  /** Mobile hero crop — portrait orientation. */
  mobileHero: {
    src: `${PLATFORM_CROPS_BASE}/mike-headshot-source.webp`,
    width: 1024,
    height: 1024,
    alt: "Mike Eatmon, broker at Our Town Properties — Wilson, NC real estate",
    use: "Mobile website hero crop",
  },
  /** Circular-safe avatar / profile crop — the canonical Mike circular avatar. */
  circularAvatar: {
    src: `${PLATFORM_CROPS_BASE}/mike-avatar-circle-128.webp`,
    width: 128,
    height: 128,
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
