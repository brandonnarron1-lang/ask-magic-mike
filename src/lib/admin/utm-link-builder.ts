/**
 * UTM Link Builder — Ask Magic Mike
 *
 * Generates canonical campaign links for every posting platform.
 * Pure/deterministic. No API calls. No writes. No outbound.
 *
 * All output URLs use only approved AMM base domains.
 * ourtownproperties.com and vercel.app URLs are explicitly rejected
 * for Facebook posting because facebookexternalhit receives HTTP 403
 * on ourtownproperties.com (pending Regency/host WAF fix).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UtmMedium = "social_organic" | "owned_media";

export type PostingPlatform =
  | "facebook"
  | "instagram_bio"
  | "instagram_story"
  | "linkedin"
  | "x"
  | "threads"
  | "email_signature"
  | "qr_flyer";

export interface UtmParams {
  utm_source: string;
  utm_medium: UtmMedium;
  utm_campaign: string;
  utm_content: string;
}

export interface UtmLink {
  platform: PostingPlatform;
  platformLabel: string;
  baseUrl: string;
  fullUrl: string;
  utmParams: UtmParams;
  safeToPostOnFacebook: boolean;
  placementNote: string;
}

export interface UtmCopyBank {
  links: UtmLink[];
  generatedForCampaign: string;
  safePostingDomain: string;
  blockedDomain: string;
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Approved base URLs — the ONLY domains that may appear in UTM output
// ---------------------------------------------------------------------------

const APPROVED_BASE_URLS = [
  "https://www.askmagicmike.com/",
  "https://www.askmagicmike.com/ask",
  "https://www.askmagicmike.com/value",
] as const;

type ApprovedBaseUrl = (typeof APPROVED_BASE_URLS)[number];

// Patterns that must never appear in output URLs
const REJECTED_URL_PATTERNS = [
  "vercel.app",
  "ask-magic-mike.vercel.app",
  "ourtownproperties.com",
] as const;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isApprovedBaseUrl(url: string): url is ApprovedBaseUrl {
  return (APPROVED_BASE_URLS as readonly string[]).includes(url);
}

export function isRejectedUrl(url: string): boolean {
  return REJECTED_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

export function sanitizeUtmValue(raw: string): string {
  // Allow alphanumeric, underscores, hyphens. Strip everything else.
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/__+/g, "_");
}

// ---------------------------------------------------------------------------
// UTM URL assembly
// ---------------------------------------------------------------------------

export function buildUtmUrl(base: string, params: UtmParams): string {
  if (isRejectedUrl(base)) {
    throw new Error(
      `Rejected base URL: "${base}". Only askmagicmike.com URLs are permitted.`
    );
  }
  if (!isApprovedBaseUrl(base)) {
    throw new Error(
      `Unapproved base URL: "${base}". Allowed: ${APPROVED_BASE_URLS.join(", ")}`
    );
  }
  if (!params.utm_source || !params.utm_campaign || !params.utm_content) {
    throw new Error("utm_source, utm_campaign, and utm_content are required.");
  }

  const qs = new URLSearchParams({
    utm_source:   sanitizeUtmValue(params.utm_source),
    utm_medium:   params.utm_medium,
    utm_campaign: sanitizeUtmValue(params.utm_campaign),
    utm_content:  sanitizeUtmValue(params.utm_content),
  }).toString();

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${qs}`;
}

// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

interface PlatformDef {
  platform: PostingPlatform;
  platformLabel: string;
  baseUrl: ApprovedBaseUrl;
  utmSource: string;
  utmMedium: UtmMedium;
  utmContent: string;
  safeToPostOnFacebook: boolean;
  placementNote: string;
}

const PLATFORM_DEFS: PlatformDef[] = [
  {
    platform:           "facebook",
    platformLabel:      "Facebook Organic",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "facebook",
    utmMedium:          "social_organic",
    utmContent:         "facebook_post",
    safeToPostOnFacebook: true,
    placementNote:
      "Paste into a Facebook post as a clickable link. AMM (askmagicmike.com) previews correctly. Do NOT use ourtownproperties.com URLs on Facebook — preview will fail.",
  },
  {
    platform:           "instagram_bio",
    platformLabel:      "Instagram Bio",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "instagram",
    utmMedium:          "social_organic",
    utmContent:         "instagram_bio",
    safeToPostOnFacebook: false,
    placementNote:
      "Place in the Instagram bio link field. Update when campaign changes.",
  },
  {
    platform:           "instagram_story",
    platformLabel:      "Instagram Story",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "instagram",
    utmMedium:          "social_organic",
    utmContent:         "instagram_story",
    safeToPostOnFacebook: false,
    placementNote:
      "Use in an Instagram Story with a link sticker. Direct link, not a bio URL.",
  },
  {
    platform:           "linkedin",
    platformLabel:      "LinkedIn Post",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "linkedin",
    utmMedium:          "social_organic",
    utmContent:         "linkedin_post",
    safeToPostOnFacebook: false,
    placementNote:
      "Paste into a LinkedIn post. LinkedIn scrapes OG tags from askmagicmike.com cleanly.",
  },
  {
    platform:           "x",
    platformLabel:      "X / Twitter",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "x",
    utmMedium:          "social_organic",
    utmContent:         "x_post",
    safeToPostOnFacebook: false,
    placementNote:
      "Paste into an X post. X auto-shortens URLs but preserves UTM parameters.",
  },
  {
    platform:           "threads",
    platformLabel:      "Threads",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "threads",
    utmMedium:          "social_organic",
    utmContent:         "threads_post",
    safeToPostOnFacebook: false,
    placementNote:
      "Paste into a Threads post. Threads is owned by Meta but scrapes independently from Facebook.",
  },
  {
    platform:           "email_signature",
    platformLabel:      "Email Signature",
    baseUrl:            "https://www.askmagicmike.com/",
    utmSource:          "email",
    utmMedium:          "owned_media",
    utmContent:         "email_signature",
    safeToPostOnFacebook: false,
    placementNote:
      'Add as a hyperlink in Mike\'s email signature: "Ask Mike a Question" → this URL.',
  },
  {
    platform:           "qr_flyer",
    platformLabel:      "QR Flyer / Print",
    baseUrl:            "https://www.askmagicmike.com/ask",
    utmSource:          "qr",
    utmMedium:          "owned_media",
    utmContent:         "qr_flyer",
    safeToPostOnFacebook: false,
    placementNote:
      "Encode this URL into a QR code for printed flyers and yard signs.",
  },
];

// ---------------------------------------------------------------------------
// Copy Bank builder
// ---------------------------------------------------------------------------

const CAMPAIGN = "amm_launch";

export function buildUtmCopyBank(): UtmCopyBank {
  const links: UtmLink[] = PLATFORM_DEFS.map((def) => {
    const utmParams: UtmParams = {
      utm_source:   def.utmSource,
      utm_medium:   def.utmMedium,
      utm_campaign: CAMPAIGN,
      utm_content:  def.utmContent,
    };
    const fullUrl = buildUtmUrl(def.baseUrl, utmParams);
    return {
      platform:             def.platform,
      platformLabel:        def.platformLabel,
      baseUrl:              def.baseUrl,
      fullUrl,
      utmParams,
      safeToPostOnFacebook: def.safeToPostOnFacebook,
      placementNote:        def.placementNote,
    };
  });

  return {
    links,
    generatedForCampaign: CAMPAIGN,
    safePostingDomain:    "askmagicmike.com",
    blockedDomain:        "ourtownproperties.com",
    disclaimer:
      "Copy manually into the native platform. This page never posts for you. " +
      "ourtownproperties.com links must not be posted on Facebook until the host WAF is fixed.",
  };
}
