/**
 * Campaign Assets — Ask Magic Mike
 *
 * Static campaign catalog, brand-safe copy blocks, and asset builder.
 * Pure/deterministic. No API calls. No writes. No outbound.
 *
 * Five campaigns, each with UTM links, brand copy, flyer specs,
 * and platform post templates sourced from the viral-post-builder.
 */

import type { QuestionCategory } from "./question-intelligence";
import { buildUtmUrl, sanitizeUtmValue } from "./utm-link-builder";
import type { UtmLink, PostingPlatform, UtmMedium } from "./utm-link-builder";
import { buildViralPostSet } from "./viral-post-builder";
import type { ViralPostSet } from "./viral-post-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignSlug =
  | "amm_launch"
  | "home_value"
  | "we_buy_houses"
  | "ask_mike"
  | "wilson_authority"
  | "comment_lead";

export type CampaignStatus = "active" | "draft" | "paused";
export type LandingPath = "/ask" | "/value" | "/";

export interface BrandCopyBlock {
  id: string;
  topic: string;
  category: QuestionCategory;
  headline: string;
  subhead: string;
  /** ≤140 chars — X, SMS, pull quote */
  socialShort: string;
  /** ≤500 chars — Threads, IG caption */
  socialMedium: string;
  /** Full body — Facebook / LinkedIn */
  socialFull: string;
  emailSubject: string;
  emailBody: string;
  cta: string;
  flyerHeadline: string;
  flyerBody: string;
  hashtags: string[];
  /** Facebook / IG comment-capture prompt (only for comment_lead campaign) */
  commentCapture?: string;
}

export interface CampaignFlyerSpec {
  headline: string;
  subhead: string;
  body: string;
  cta: string;
  qrUrl: string;
  displayUrl: string;
  printNote: string;
}

export interface Campaign {
  slug: CampaignSlug;
  name: string;
  tagline: string;
  status: CampaignStatus;
  targetAudience: string;
  primaryCta: string;
  landingPath: LandingPath;
  category: QuestionCategory;
  copyBlock: BrandCopyBlock;
  flyer: CampaignFlyerSpec;
}

export interface CampaignAssets {
  campaign: Campaign;
  utmLinks: UtmLink[];
  socialPosts: ViralPostSet;
}

// ---------------------------------------------------------------------------
// Approved base URL map
// ---------------------------------------------------------------------------

const BASE_URL: Record<LandingPath, string> = {
  "/ask":   "https://www.askmagicmike.com/ask",
  "/value": "https://www.askmagicmike.com/value",
  "/":      "https://www.askmagicmike.com/",
};

// ---------------------------------------------------------------------------
// Platform definitions (UTM content identifiers per platform)
// ---------------------------------------------------------------------------

interface PlatformEntry {
  platform: PostingPlatform;
  platformLabel: string;
  utmSource: string;
  utmMedium: UtmMedium;
  utmContent: string;
  safeToPostOnFacebook: boolean;
  placementNote: string;
}

const PLATFORM_ENTRIES: PlatformEntry[] = [
  {
    platform:           "facebook",
    platformLabel:      "Facebook Organic",
    utmSource:          "facebook",
    utmMedium:          "social_organic",
    utmContent:         "facebook_post",
    safeToPostOnFacebook: true,
    placementNote:      "Paste into a Facebook post. AMM (askmagicmike.com) previews correctly. Do NOT use ourtownproperties.com URLs on Facebook.",
  },
  {
    platform:           "instagram_bio",
    platformLabel:      "Instagram Bio",
    utmSource:          "instagram",
    utmMedium:          "social_organic",
    utmContent:         "instagram_bio",
    safeToPostOnFacebook: false,
    placementNote:      "Place in the Instagram bio link field. Update when campaign changes.",
  },
  {
    platform:           "instagram_story",
    platformLabel:      "Instagram Story",
    utmSource:          "instagram",
    utmMedium:          "social_organic",
    utmContent:         "instagram_story",
    safeToPostOnFacebook: false,
    placementNote:      "Use in an Instagram Story link sticker. Direct link, not a bio URL.",
  },
  {
    platform:           "linkedin",
    platformLabel:      "LinkedIn Post",
    utmSource:          "linkedin",
    utmMedium:          "social_organic",
    utmContent:         "linkedin_post",
    safeToPostOnFacebook: false,
    placementNote:      "Paste into a LinkedIn post. LinkedIn scrapes OG tags cleanly.",
  },
  {
    platform:           "x",
    platformLabel:      "X / Twitter",
    utmSource:          "x",
    utmMedium:          "social_organic",
    utmContent:         "x_post",
    safeToPostOnFacebook: false,
    placementNote:      "Paste into an X post. Auto-shortens but preserves UTM parameters.",
  },
  {
    platform:           "threads",
    platformLabel:      "Threads",
    utmSource:          "threads",
    utmMedium:          "social_organic",
    utmContent:         "threads_post",
    safeToPostOnFacebook: false,
    placementNote:      "Paste into a Threads post. Meta-owned but scrapes independently from Facebook.",
  },
  {
    platform:           "email_signature",
    platformLabel:      "Email Signature",
    utmSource:          "email",
    utmMedium:          "owned_media",
    utmContent:         "email_signature",
    safeToPostOnFacebook: false,
    placementNote:      'Add as a hyperlink in Mike\'s email signature: "Ask Mike a Question" → this URL.',
  },
  {
    platform:           "qr_flyer",
    platformLabel:      "QR Flyer / Print",
    utmSource:          "qr",
    utmMedium:          "owned_media",
    utmContent:         "qr_flyer",
    safeToPostOnFacebook: false,
    placementNote:      "Encode this URL into a QR code for printed flyers and yard signs.",
  },
];

// ---------------------------------------------------------------------------
// UTM link builder (parameterized by campaign slug + landing path)
// ---------------------------------------------------------------------------

export function buildCampaignUtmLinks(
  slug: CampaignSlug,
  landingPath: LandingPath
): UtmLink[] {
  const baseUrl = BASE_URL[landingPath];
  const campaign = sanitizeUtmValue(slug);

  return PLATFORM_ENTRIES.map((entry) => {
    const utmParams = {
      utm_source:   entry.utmSource,
      utm_medium:   entry.utmMedium,
      utm_campaign: campaign,
      utm_content:  entry.utmContent,
    };
    const fullUrl = buildUtmUrl(baseUrl, utmParams);
    return {
      platform:             entry.platform,
      platformLabel:        entry.platformLabel,
      baseUrl,
      fullUrl,
      utmParams,
      safeToPostOnFacebook: entry.safeToPostOnFacebook,
      placementNote:        entry.placementNote,
    };
  });
}

// ---------------------------------------------------------------------------
// Brand copy blocks — one per campaign
// ---------------------------------------------------------------------------

const COPY_BLOCKS: Record<CampaignSlug, BrandCopyBlock> = {
  amm_launch: {
    id: "amm_launch",
    topic: "Ask Magic Mike Launch",
    category: "general",
    headline: "Bring your Wilson real estate question to a local review.",
    subhead: "Share the situation with Mike Eatmon or the Our Town Properties team.",
    socialShort: "Buying, selling, renting, or planning in Wilson? Request a local review through Ask Magic Mike. [TRACKED LINK] #WilsonNC",
    socialMedium: `Buying, selling, renting, or planning in Wilson or Eastern North Carolina?

Share your timeline, property or target area, and unanswered questions through Ask Magic Mike. Mike Eatmon or the Our Town Properties team will review the request and follow up using the preference you provide.

[TRACKED LINK]

#WilsonNC #AskMagicMike`,
    socialFull: `Real estate decisions rarely fit a generic answer.

Ask Magic Mike gives Wilson and Eastern North Carolina consumers a direct path to share the actual property or target area, timeline, and questions with Mike Eatmon or the Our Town Properties team.

Property, market, lending, legal, and financial facts should be independently verified before a decision.

Request a local review: [TRACKED LINK]`,
    emailSubject: "Request a local real estate review",
    emailBody: `Hi [First Name],

Ask Magic Mike provides a direct path to share a Wilson or Eastern North Carolina buying, selling, renting, or planning question with Mike Eatmon or the Our Town Properties team.

Request a local review: [TRACKED LINK]

Mike Eatmon
Our Town Properties · Wilson, NC

[Brokerage mailing address]
[Unsubscribe link]`,
    cta: "Request a Local Review →",
    flyerHeadline: "Got a Real Estate Question?",
    flyerBody: "Scan to request broker-reviewed guidance from Our Town Properties.",
    hashtags: ["#WilsonNC", "#AskMike", "#RealEstate", "#NCRealEstate", "#OurTownProperties"],
  },

  home_value: {
    id: "home_value",
    topic: "Home Value",
    category: "home_value",
    headline: "Request a Wilson-area home-value and sale-readiness review.",
    subhead: "Start with the property, condition, timeline, and questions you provide.",
    socialShort: "Wilson-area homeowner? Request a broker-reviewed home-value conversation. Not an appraisal or guaranteed value. [TRACKED LINK]",
    socialMedium: `A useful selling decision starts with the property, condition, timing, and your goals.

Share those details through Ask Magic Mike for a broker-reviewed home-value and sale-readiness conversation from Mike Eatmon or the Our Town Properties team.

Not an appraisal, automated valuation, guaranteed value, or guaranteed offer.

[TRACKED LINK]`,
    socialFull: `Thinking about a future move in Wilson or Eastern North Carolina?

Share your property, condition, timeline, and questions through Ask Magic Mike. Mike Eatmon or the Our Town Properties team will review the request and can discuss practical next steps.

This is broker-reviewed guidance—not an appraisal, automated valuation, guaranteed value, guaranteed offer, or promised response time.

Request a review: [TRACKED LINK]`,
    emailSubject: "Request a Wilson-area home-value review",
    emailBody: `Hi [First Name],

If you are reviewing a possible move, you can share your Wilson-area property, timing, and questions with Mike Eatmon or the Our Town Properties team through Ask Magic Mike.

Request the broker-reviewed conversation: [TRACKED LINK]

This is not an appraisal or guaranteed value.

[Brokerage mailing address]
[Unsubscribe link]`,
    cta: "Request a Home-Value Review →",
    flyerHeadline: "What's Your Wilson Home Worth?",
    flyerBody: "Request a broker-reviewed conversation. Not an appraisal or guaranteed value.",
    hashtags: ["#WilsonNC", "#HomeValue", "#RealEstate", "#NCRealEstate", "#AskMike"],
  },

  we_buy_houses: {
    id: "we_buy_houses",
    topic: "We Buy Houses / Cash Offers",
    category: "cash_offer",
    headline: "Compare selling paths before making a commitment.",
    subhead: "Request a human review of the property, timing, and terms actually available.",
    socialShort: "Comparing a direct sale with a traditional listing in Wilson? Request a human review. No offer or terms are promised. [TRACKED LINK]",
    socialMedium: `A direct-purchase path and a traditional listing involve different tradeoffs.

Property condition, timing, costs, and the terms actually available all matter. Request a review from Mike Eatmon or the Our Town Properties team before deciding which path to investigate.

No purchase, offer, price, or closing timeline is promised.

[TRACKED LINK]`,
    socialFull: `Considering a direct sale for a Wilson-area property?

Ask Magic Mike provides a human-reviewed intake for comparing the property, timing, condition, and questions around a direct-purchase path or traditional listing.

Submitting the request does not create a purchase commitment, guaranteed offer, guaranteed value, or promised closing timeline. Any actual terms depend on property review and mutual agreement.

Request the comparison: [TRACKED LINK]`,
    emailSubject: "Received a cash offer on your Wilson home?",
    emailBody: `Hi [First Name],

If you are comparing a direct-purchase path with a traditional listing, you can share the property, timing, and questions with Mike Eatmon or the Our Town Properties team.

Request a review: [TRACKED LINK]

No purchase, offer, price, or timing is promised by this request.

[Brokerage mailing address]
[Unsubscribe link]`,
    cta: "Request a Selling-Path Review →",
    flyerHeadline: "Got a Cash Offer?",
    flyerBody: "Compare the documented terms and available paths before deciding.",
    hashtags: ["#WilsonNC", "#CashOffer", "#SellFast", "#NCRealEstate", "#AskMike"],
  },

  ask_mike: {
    id: "ask_mike",
    topic: "Ask Mike Anything",
    category: "general",
    headline: "Ask a local real estate question with the details that matter.",
    subhead: "Mike Eatmon or the Our Town Properties team reviews the request.",
    socialShort: "Have a Wilson real estate question? Share the property or target area, timeline, and context for a local review. [TRACKED LINK]",
    socialMedium: `Buying, selling, renting, or planning in Wilson?

Share the property or target area, timeline, and what you need to understand through Ask Magic Mike. Mike Eatmon or the Our Town Properties team will review the request and follow up using the preference you provide.

[TRACKED LINK]`,
    socialFull: `A useful real estate conversation starts with your actual situation.

Ask Magic Mike gives Wilson and Eastern North Carolina consumers a direct path to share a property or target area, timeline, communication preference, and unanswered questions with Mike Eatmon or the Our Town Properties team.

Property, market, lending, legal, and financial facts should be independently verified before a decision.

Request a review: [TRACKED LINK]`,
    emailSubject: "Ask me anything about Wilson NC real estate",
    emailBody: `Hi [First Name],

Ask Magic Mike provides a direct way to share a Wilson or Eastern North Carolina real estate question with Mike Eatmon or the Our Town Properties team.

Submit the request: [TRACKED LINK]

Mike Eatmon
Our Town Properties · Wilson, NC

[Brokerage mailing address]
[Unsubscribe link]`,
    cta: "Ask Mike a Question →",
    flyerHeadline: "Ask Mike Anything.",
    flyerBody: "Share the property or target area, timeline, and question for local review.",
    hashtags: ["#WilsonNC", "#AskMike", "#RealEstate", "#NCRealEstate", "#LocalExpert"],
  },

  wilson_authority: {
    id: "wilson_authority",
    topic: "Wilson NC Local Authority",
    category: "general",
    headline: "Wilson real estate context starts with the specific property and question.",
    subhead: "Request a local review from Mike Eatmon or the Our Town Properties team.",
    socialShort: "Have a Wilson real estate question? Share the property or target area and timeline for a local review. [TRACKED LINK] #WilsonNC",
    socialMedium: `National headlines cannot answer a property-specific Wilson real estate question.

Share the property or target area, timeline, and what you need to verify through Ask Magic Mike. Mike Eatmon or the Our Town Properties team will review the request using available and appropriately authorized information.

[TRACKED LINK]`,
    socialFull: `Useful Wilson real estate context depends on the specific property or target area, the consumer's stated criteria, current information, and the decision being considered.

Ask Magic Mike provides a direct request path to Mike Eatmon or the Our Town Properties team. No protected-trait inference, property availability, value, or outcome is promised.

Request a local review: [TRACKED LINK]`,
    emailSubject: "What the Wilson NC market is actually doing right now",
    emailBody: `Hi [First Name],

National headlines may not answer a property-specific Wilson real estate question.

Share the property or target area, timeline, and what you need to verify through Ask Magic Mike: [TRACKED LINK]

Mike Eatmon
Our Town Properties · Wilson, NC

[Brokerage mailing address]
[Unsubscribe link]`,
    cta: "Request Wilson-Area Context →",
    flyerHeadline: "Wilson NC Real Estate, Straight from the Source.",
    flyerBody: "Property-specific questions reviewed with appropriately authorized information.",
    hashtags: ["#WilsonNC", "#LocalExpert", "#NCRealEstate", "#OurTownProperties", "#AskMike"],
  },

  comment_lead: {
    id: "comment_lead",
    topic: "Facebook / Instagram Comment-to-Lead",
    category: "general",
    headline: "Comment for the private Ask Magic Mike request link.",
    subhead: "Keep personal, property, and financial details out of public comments.",
    socialShort: "Comment WILSON for the private Ask Magic Mike request link. Do not post personal or property details publicly. #WilsonNC",
    socialMedium: `Have a Wilson real estate question?

Comment WILSON to request the private Ask Magic Mike link. Do not place your address, phone number, email, financial details, or personal circumstances in a public comment.

The private form records your communication preference and consent evidence before follow-up.`,
    socialFull: `Buying, selling, renting, or planning in Wilson?

Comment WILSON to request the private Ask Magic Mike link. Keep addresses, phone numbers, email addresses, financial details, and personal circumstances out of public comments.

The private request form captures your stated contact preference and consent evidence. Mike Eatmon or the Our Town Properties team can then review the submitted context without turning a public comment into an implied contact permission.`,
    emailSubject: "Your comment got a response from Mike",
    emailBody: `Hi [First Name],

Thanks for requesting the private Ask Magic Mike link. Please use the form to share your Wilson real estate question and select your communication preference: [TRACKED LINK]

Do not send personal, property, or financial details in a public comment.

Mike Eatmon
Our Town Properties · Wilson, NC`,
    cta: "Request the Private Link →",
    flyerHeadline: "Ask Mike a Question.",
    flyerBody: "Use the private request form; do not place personal details in a public comment.",
    hashtags: ["#WilsonNC", "#AskMike", "#RealEstate", "#NCRealEstate"],
    commentCapture: "Comment WILSON to request the private form link. Do not post personal or property details publicly.",
  },
};

// ---------------------------------------------------------------------------
// Flyer specs per campaign
// ---------------------------------------------------------------------------

const FLYER_SPECS: Record<CampaignSlug, CampaignFlyerSpec> = {
  amm_launch: {
    headline: "Got a Real Estate Question?",
    subhead: "Request a Local Review",
    body: "Mike Eatmon · Our Town Properties\nWilson, NC\nBroker-reviewed guidance. Property and market facts require verification.",
    cta: "Scan to Ask Mike Anything",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=amm_launch&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\" or 5×7\". Use a high-contrast QR code generator. Minimum QR size: 1\" × 1\".",
  },
  home_value: {
    headline: "What's Your Wilson Home Worth?",
    subhead: "Request a Broker-Reviewed Conversation",
    body: "Mike Eatmon · Our Town Properties\nWilson, NC\nNot an appraisal, automated valuation, or guaranteed value.",
    cta: "Scan to Request a Home Review",
    qrUrl: "https://www.askmagicmike.com/value?utm_source=qr&utm_medium=owned_media&utm_campaign=home_value&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/value",
    printNote: "Print at 4×6\" or 5×7\". Ideal for door hangers, postcards, and yard sign riders.",
  },
  we_buy_houses: {
    headline: "Got a Cash Offer?",
    subhead: "Compare the Documented Selling Paths",
    body: "Mike Eatmon · Our Town Properties\nWilson, NC\nNo purchase, offer, price, or closing timeline is promised.",
    cta: "Scan to Request a Selling-Path Review",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=we_buy_houses&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\". Place near investor yard signs or bulletin boards in Wilson.",
  },
  ask_mike: {
    headline: "Ask Mike Anything.",
    subhead: "Share the Context for Local Review",
    body: "Mike Eatmon · Our Town Properties\nWilson, NC\nBuying, selling, renting, and planning questions.",
    cta: "Scan to Ask Your Question",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=ask_mike&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\" or business card size. Works at open houses, networking events, and closings.",
  },
  wilson_authority: {
    headline: "Wilson NC Real Estate Context.",
    subhead: "Start with the Specific Property or Target Area",
    body: "Mike Eatmon · Our Town Properties\nWilson, NC\nHuman review using appropriately authorized information.",
    cta: "Scan to Request Local Context",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=wilson_authority&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 5×7\". Strong for community boards, local businesses, and events.",
  },
  comment_lead: {
    headline: "Ask Privately.",
    subhead: "Keep Personal Details Out of Public Comments",
    body: "Mike Eatmon · Our Town Properties\nWilson, NC\nUse the private form to record communication preference and consent.",
    cta: "Scan to Open the Private Form",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=comment_lead&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\". Include your Facebook page URL or QR code alongside this flyer.",
  },
};

// ---------------------------------------------------------------------------
// Landing paths per campaign
// ---------------------------------------------------------------------------

const LANDING_PATHS: Record<CampaignSlug, LandingPath> = {
  amm_launch:       "/ask",
  home_value:       "/value",
  we_buy_houses:    "/ask",
  ask_mike:         "/ask",
  wilson_authority: "/ask",
  comment_lead:     "/ask",
};

// ---------------------------------------------------------------------------
// Campaign catalog
// ---------------------------------------------------------------------------

export const CAMPAIGN_CATALOG: Campaign[] = [
  {
    slug:           "amm_launch",
    name:           "AMM Launch",
    tagline:        "Introduce Ask Magic Mike to Wilson NC",
    status:         "active",
    targetAudience: "Wilson NC homeowners and buyers — broad awareness",
    primaryCta:     "Ask Mike Anything",
    landingPath:    "/ask",
    category:       "general",
    copyBlock:      COPY_BLOCKS.amm_launch,
    flyer:          FLYER_SPECS.amm_launch,
  },
  {
    slug:           "home_value",
    name:           "Home Value",
    tagline:        "Broker-reviewed home-value and sale-readiness conversation",
    status:         "active",
    targetAudience: "Wilson homeowners who are curious about selling or refinancing",
    primaryCta:     "Request a Home-Value Review",
    landingPath:    "/value",
    category:       "home_value",
    copyBlock:      COPY_BLOCKS.home_value,
    flyer:          FLYER_SPECS.home_value,
  },
  {
    slug:           "we_buy_houses",
    name:           "We Buy Houses",
    tagline:        "Compare documented selling paths before deciding",
    status:         "active",
    targetAudience: "Wilson homeowners who have received cash offers from investors",
    primaryCta:     "Request a Selling-Path Review",
    landingPath:    "/ask",
    category:       "cash_offer",
    copyBlock:      COPY_BLOCKS.we_buy_houses,
    flyer:          FLYER_SPECS.we_buy_houses,
  },
  {
    slug:           "ask_mike",
    name:           "Ask Mike Anything",
    tagline:        "Local review of a specific real estate question",
    status:         "active",
    targetAudience: "Wilson residents with any real estate question",
    primaryCta:     "Ask Mike a Question",
    landingPath:    "/ask",
    category:       "general",
    copyBlock:      COPY_BLOCKS.ask_mike,
    flyer:          FLYER_SPECS.ask_mike,
  },
  {
    slug:           "wilson_authority",
    name:           "Wilson Local Context",
    tagline:        "Property-specific questions with human verification",
    status:         "active",
    targetAudience: "People searching for Wilson NC real estate information online",
    primaryCta:     "Request Wilson-Area Context",
    landingPath:    "/ask",
    category:       "general",
    copyBlock:      COPY_BLOCKS.wilson_authority,
    flyer:          FLYER_SPECS.wilson_authority,
  },
];

export const COMMENT_LEAD_CAMPAIGN: Campaign = {
  slug:           "comment_lead",
  name:           "Comment-to-Private-Request",
  tagline:        "Public prompt with a private, consent-aware handoff",
  status:         "active",
  targetAudience: "Facebook and Instagram followers",
  primaryCta:     "Request the Private Link",
  landingPath:    "/ask",
  category:       "general",
  copyBlock:      COPY_BLOCKS.comment_lead,
  flyer:          FLYER_SPECS.comment_lead,
};

export const ALL_CAMPAIGNS: Campaign[] = [
  ...CAMPAIGN_CATALOG,
  COMMENT_LEAD_CAMPAIGN,
];

// ---------------------------------------------------------------------------
// Asset builder — generates full asset set for a campaign
// ---------------------------------------------------------------------------

export function buildCampaignAssets(slug: CampaignSlug): CampaignAssets {
  const campaign = ALL_CAMPAIGNS.find((c) => c.slug === slug);
  if (!campaign) throw new Error(`Unknown campaign slug: ${slug}`);

  const utmLinks    = buildCampaignUtmLinks(slug, campaign.landingPath);
  const socialPosts = buildViralPostSet(campaign.copyBlock.socialFull, campaign.category);

  return { campaign, utmLinks, socialPosts };
}

export function getAllCampaignAssets(): CampaignAssets[] {
  return ALL_CAMPAIGNS.map((c) => buildCampaignAssets(c.slug));
}
