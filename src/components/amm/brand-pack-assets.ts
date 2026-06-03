/**
 * Ask Magic Mike — brand pack v2 asset registry.
 *
 * Single source of truth for every public-facing image path used by the
 * funnel. Components should import from here rather than hard-coding
 * `/images/...` strings so that:
 *
 * 1. A future asset swap touches one file, not the whole tree.
 * 2. Tests can statically verify nothing references MLS/flexmls sources.
 * 3. We can swap PNG → WebP per device by changing the registry entry, not
 *    by touching every component.
 *
 * Strict rules (also enforced by tests/compliance/value-copy.test.ts):
 *   - No "lamp" or "genie" identity.
 *   - No MLS / flexmls listing photos.
 *   - No cartoon avatar as primary trust imagery.
 */
export const brandPackAssets = {
  mike: {
    /** Primary headshot used on /value MikeTrustCard, confirmation,
     *  and OG/social previews. WebP source, ~33 KB. */
    headshot:
      "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp",
    /** JPG fallback for tools that don't accept WebP. */
    headshotFallback:
      "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.jpg",
    /** Gold-rim circle avatars (used in compact trust strips + widget). */
    avatar64:
      "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-64.png",
    avatar128:
      "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.webp",
    avatar128Png:
      "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.png",
    avatar256:
      "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp",
    avatar256Png:
      "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.png",
  },
  logo: {
    /** Our Town Properties wordmark — clean PNG sourced from the v2 pack,
     *  optimized to WebP. */
    primary:
      "/images/ask-magic-mike/brand-pack-v2/our-town-logo-clean.webp",
    fallback:
      "/images/ask-magic-mike/brand-pack-v2/our-town-logo-clean.png",
    web:
      "/images/ask-magic-mike/brand-pack-v2/our-town-logo-web.jpg",
  },
  widget: {
    /** Reference asset only — not embedded in public UI. Used for design
     *  comp + documentation. */
    concept:
      "/images/ask-magic-mike/brand-pack-v2/chat-widget-concept.webp",
    /** Smoke reveal asset — kept as reference. The runtime smoke effect is
     *  CSS-only via MagicMikeAnswerReveal. */
    smokeReveal:
      "/images/ask-magic-mike/brand-pack-v2/answer-smoke-sequence.webp",
  },
  accents: {
    /** Gold CTA arrow icon (inline SVG accent). */
    goldArrow:
      "/images/ask-magic-mike/brand-pack-v2/accent-gold-arrow.svg",
    /** Ruby diamond — used as direct-purchase / urgency badge. */
    ruby:
      "/images/ask-magic-mike/brand-pack-v2/accent-ruby.svg",
    /** Subtle gold smoke glow — atmosphere only. */
    smokeGlow:
      "/images/ask-magic-mike/brand-pack-v2/accent-smoke-glow.svg",
    /** Sparkle for the AI-assist badge. */
    sparkle:
      "/images/ask-magic-mike/brand-pack-v2/accent-sparkle.svg",
  },
  /** Static social ad templates. Reference-only for the WordPress brief and
   *  future paid creative. Not embedded in /value or /ask. */
  social: {
    homeValueFeed:
      "/images/ask-magic-mike/brand-pack-v2/social-home-value-feed.jpg",
    cashOfferFeed:
      "/images/ask-magic-mike/brand-pack-v2/social-cash-offer-feed.jpg",
    chatStory:
      "/images/ask-magic-mike/brand-pack-v2/social-chat-story.jpg",
    sellerStory:
      "/images/ask-magic-mike/brand-pack-v2/social-seller-story.jpg",
  },
} as const;

export type BrandPackAssets = typeof brandPackAssets;
