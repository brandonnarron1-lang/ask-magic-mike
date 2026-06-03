/**
 * Ask Magic Mike — brand pack v2 asset registry.
 *
 * Single source of truth for every public-facing image path used by the
 * funnel. Components import from here rather than hard-coding `/images/...`
 * strings so that:
 *
 * 1. A future asset swap touches one file, not the whole tree.
 * 2. Tests can statically verify nothing references MLS/flexmls sources.
 * 3. WebP vs PNG fallbacks swap by changing the registry entry, not by
 *    touching every component.
 *
 * Strict rules from the brand kit (10_quality_control/do_not_use.md +
 * likeness_and_brand_qc_checklist.md), also enforced by
 * `tests/compliance/value-copy.test.ts`:
 *
 *  - No "lamp" or "genie" identity.
 *  - No baked text inside imagery used as primary UI.
 *  - No MLS / flexmls listing photos.
 *  - Gold + ruby accents stay premium and restrained.
 *  - Cyan only for AI status / pulse.
 *
 * Several "expression" assets shipped in the kit's `clean` variant still
 * carry baked footer labels (e.g. "RUBBING HANDS", "ANSWER APPEARS"). The
 * kit's own QC checklist forbids baked text in primary UI, so those assets
 * are tagged with `concept: true` here and may only be rendered inside the
 * dev-only `/widget-preview` BrandKitShowcase surface.
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
    /** Hero close-up — concept reference, may be used as an alt headshot. */
    heroCloseup:
      "/images/ask-magic-mike/brand-pack-v2/mike-hero-closeup.webp",
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
  /**
   * Concept-only avatar expression/action crops. Some of these still have
   * baked footer labels in the source pack, so they are NOT used as primary
   * widget UI. Rendered only inside the BrandKitShowcase reference surface.
   */
  expressions: {
    welcome:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-welcome-clean.webp",
    thinkingChin:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-thinking-chin-clean.webp",
    explaining:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-explaining-clean.webp",
    confident:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-confident-clean.webp",
    friendly:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-friendly-clean.webp",
    lookingSide:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-looking-side-clean.webp",
    /** Has baked "RUBBING HANDS" footer — concept reference only. */
    thinkingHandsConcept:
      "/images/ask-magic-mike/brand-pack-v2/mike-expression-rubbing-hands-thinking-clean.webp",
  },
  actions: {
    explaining:
      "/images/ask-magic-mike/brand-pack-v2/mike-action-explaining-clean.webp",
    /** Has baked "ANSWER APPEARS" footer — concept reference only. */
    answerAppearsConcept:
      "/images/ask-magic-mike/brand-pack-v2/mike-action-answer-smoke-clean.webp",
  },
  hero: {
    wordmarkConcept:
      "/images/ask-magic-mike/brand-pack-v2/wordmark-lockup-concept.webp",
  },
  motion: {
    /** Reference-only GIFs used inside the BrandKitShowcase surface. */
    widgetStateSequence:
      "/images/ask-magic-mike/brand-pack-v2/widget-state-sequence-preview.gif",
    walkCycleSprite:
      "/images/ask-magic-mike/brand-pack-v2/mike-walk-cycle-sprite.png",
  },
  brandBoard: {
    selectedV2Web:
      "/images/ask-magic-mike/brand-pack-v2/brand-board-v2-web.jpg",
    elementsStrip:
      "/images/ask-magic-mike/brand-pack-v2/brand-elements-strip.webp",
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
    /** Reference asset only — not embedded in public funnel UI. Used inside
     *  BrandKitShowcase. */
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
   *  future paid creative. Copy must be rewritten before paid use. */
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
