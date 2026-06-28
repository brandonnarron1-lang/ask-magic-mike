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
    headline: "Real Answers. Real Broker. Wilson NC.",
    subhead: "Mike Eatmon, licensed NC broker, answers your biggest real estate questions — free.",
    socialShort: "Got a real estate question? Ask Mike — a licensed Wilson NC broker answers free. askmagicmike.com/ask #WilsonNC",
    socialMedium: `The most common real estate questions I hear in Wilson aren't being answered by Zillow or the news.

Licensed broker. Real answers. No algorithm.

Ask Mike anything about buying, selling, or the Wilson market: askmagicmike.com/ask

#WilsonNC #RealEstate #AskMike`,
    socialFull: `Something I've noticed after years of selling real estate in Wilson:

People have great questions. They just don't know who to trust for a real answer.

Zillow gives you an algorithm. The news gives you national headlines. Neither knows what your specific neighborhood is actually doing right now.

That's why I built Ask Magic Mike.

You ask. I answer. No spam, no pitch, no pressure.

I'm Mike Eatmon, a licensed NC broker with Our Town Properties. I work in Wilson every day. Ask me anything.

👇 askmagicmike.com/ask`,
    emailSubject: "Got a real estate question? Ask Mike — free",
    emailBody: `Hi [First Name],

If you've been wondering about the Wilson NC real estate market — whether to buy, sell, or wait — I want to make it easier to get a straight answer.

Ask Magic Mike is a free Q&A tool I built to give Wilson homeowners and buyers honest, broker-level answers. No sales pitch. No email list. Just answers.

Try it: askmagicmike.com/ask

— Mike Eatmon
Licensed NC Broker, Our Town Properties
Wilson, NC`,
    cta: "Ask Mike Anything →",
    flyerHeadline: "Got a Real Estate Question?",
    flyerBody: "Get a straight answer from a licensed Wilson broker — free.",
    hashtags: ["#WilsonNC", "#AskMike", "#RealEstate", "#NCRealEstate", "#OurTownProperties"],
  },

  home_value: {
    id: "home_value",
    topic: "Home Value",
    category: "home_value",
    headline: "What Is Your Wilson Home Worth Right Now?",
    subhead: "Get an honest estimate from a licensed Wilson broker — not an algorithm.",
    socialShort: "What's your Wilson NC home worth? Get a real answer from a licensed broker: askmagicmike.com/value #WilsonNC #HomeValue",
    socialMedium: `What's your Wilson home actually worth right now?

Not what Zillow says. Not what your neighbor sold for two years ago.

What a buyer in today's market — with today's rates and today's inventory — would actually pay.

Licensed Wilson broker. Real answer. Free.

askmagicmike.com/value

#WilsonNC #HomeValue #NCRealEstate`,
    socialFull: `I get this question every week in Wilson:

"Mike, what do you think my home is worth?"

Here's what I've learned: homeowners who use online estimates are usually off by $20,000 to $40,000 — in either direction.

The algorithm doesn't know that your kitchen was updated. It doesn't know what your neighbor's house actually sold for after the inspection credits. It doesn't know that three buyers are actively looking in your subdivision right now.

I do.

If you're curious what your Wilson home is worth — even if you're not planning to sell — ask me. I'll give you a real number with real reasoning.

👇 askmagicmike.com/value`,
    emailSubject: "What's your Wilson home worth? Here's the honest answer",
    emailBody: `Hi [First Name],

I've been tracking home values in your area of Wilson closely this month, and I thought you might want an update.

Whether you're thinking about selling or just staying informed, I can give you a real broker's estimate — not an automated tool's guess.

Get your free home value estimate: askmagicmike.com/value

— Mike Eatmon
Licensed NC Broker, Our Town Properties
Wilson, NC`,
    cta: "Get My Free Home Value Estimate →",
    flyerHeadline: "What's Your Wilson Home Worth?",
    flyerBody: "Ask a licensed Wilson broker. Real estimate. No obligation.",
    hashtags: ["#WilsonNC", "#HomeValue", "#RealEstate", "#NCRealEstate", "#AskMike"],
  },

  we_buy_houses: {
    id: "we_buy_houses",
    topic: "We Buy Houses / Cash Offers",
    category: "cash_offer",
    headline: "Got a Cash Offer? Get a Second Opinion First.",
    subhead: "Before you sign, ask a licensed Wilson broker if the number is fair.",
    socialShort: "Got a 'We Buy Houses' offer on your Wilson home? Ask a licensed broker if it's fair before you sign. askmagicmike.com/ask #WilsonNC",
    socialMedium: `Those "We Buy Houses" signs make selling easy.

But easy isn't always fair.

Cash buyers move fast because they know what they're offering is below market. Here's what a licensed broker would say before you sign: askmagicmike.com/ask

#WilsonNC #CashOffer #SellYourHome`,
    socialFull: `Something I see regularly in Wilson:

A homeowner receives a cash offer from a "We Buy Houses" investor. It sounds good. It's fast. No repairs, no showings, no hassle.

And then they sign — and leave $30,000 to $70,000 on the table.

I'm not saying cash offers are bad. Sometimes they're the right call — especially for inherited properties, probate situations, or sellers who genuinely need speed over equity.

But you should know what your home is worth before you decide.

If you've received a cash offer on your Wilson property, let me look at it with you. I'll tell you honestly whether it's fair, low, or actually a good deal.

No pitch. No listing agreement. Just an honest number.

👇 askmagicmike.com/ask`,
    emailSubject: "Received a cash offer on your Wilson home?",
    emailBody: `Hi [First Name],

If you've been contacted by a cash buyer or investment company about your Wilson property, I'd encourage you to take a moment before signing anything.

Cash offers are often fair — but not always. As a licensed Wilson broker, I can tell you exactly where your home stands relative to what traditional buyers would pay.

Ask me to review your offer: askmagicmike.com/ask

— Mike Eatmon
Licensed NC Broker, Our Town Properties
Wilson, NC`,
    cta: "Ask Mike to Review My Cash Offer →",
    flyerHeadline: "Got a Cash Offer?",
    flyerBody: "Find out if it's fair. Licensed Wilson broker. Free honest review.",
    hashtags: ["#WilsonNC", "#CashOffer", "#SellFast", "#NCRealEstate", "#AskMike"],
  },

  ask_mike: {
    id: "ask_mike",
    topic: "Ask Mike Anything",
    category: "general",
    headline: "Ask Wilson's Local Real Estate Authority Anything.",
    subhead: "Buying, selling, pricing, timing — Mike Eatmon answers real questions from Wilson residents.",
    socialShort: "Ask a licensed Wilson NC broker anything about real estate — free. No pitch. Real answers. askmagicmike.com/ask #WilsonNC",
    socialMedium: `Real question from a Wilson resident this week:

"Should I wait until spring to list, or list now?"

My answer: it depends on three things — and I'm going to tell you all three.

You can ask me anything about Wilson real estate. I'm a licensed broker, and I answer straight.

askmagicmike.com/ask

#WilsonNC #RealEstate #AskMike`,
    socialFull: `The most common question I get isn't about price.

It's "Who do I trust for a straight answer?"

I understand the hesitation. Real estate agents have a reputation for telling people what they want to hear. And online tools tell you what an algorithm calculated — which isn't the same as what the market will actually do.

I'm Mike Eatmon. Licensed NC broker. I've been selling real estate in Wilson for years, and I've seen every kind of market.

Ask Magic Mike is where you can ask me anything — buying timeline, seller pricing strategy, neighborhood comparisons, what your home is worth — and get an honest broker-level answer.

Free. No email list. No follow-up sales call unless you want one.

👇 askmagicmike.com/ask`,
    emailSubject: "Ask me anything about Wilson NC real estate",
    emailBody: `Hi [First Name],

I've been getting more questions lately from Wilson residents who want a broker's honest opinion on the market.

I built Ask Magic Mike specifically for this. You ask, I answer — whether it's about pricing, timing, neighborhoods, or just whether now is a good time to make a move.

Ask your question here: askmagicmike.com/ask

— Mike Eatmon
Licensed NC Broker, Our Town Properties
Wilson, NC`,
    cta: "Ask Mike a Question →",
    flyerHeadline: "Ask Mike Anything.",
    flyerBody: "Wilson's local real estate authority. Free answers. No obligation.",
    hashtags: ["#WilsonNC", "#AskMike", "#RealEstate", "#NCRealEstate", "#LocalExpert"],
  },

  wilson_authority: {
    id: "wilson_authority",
    topic: "Wilson NC Local Authority",
    category: "general",
    headline: "Wilson NC Real Estate — Straight from the Source.",
    subhead: "Mike Eatmon has sold real estate in Wilson for years. If it matters in this market, he knows it.",
    socialShort: "Wilson NC real estate questions? Ask the broker who works here every day. Real answers, local expertise. askmagicmike.com/ask #WilsonNC",
    socialMedium: `National real estate news is not Wilson real estate news.

What's happening in your specific neighborhood, on your specific street, in this specific market — that requires someone who actually works here.

I'm that person.

Ask me anything about Wilson NC real estate: askmagicmike.com/ask

#WilsonNC #LocalExpert #OurTownProperties`,
    socialFull: `People ask me all the time: "What's happening in the Wilson market?"

The honest answer is that it depends on which part of Wilson you're asking about.

The northwest quadrant is performing differently than southwest. The Forest Hills corridor has different absorption rates than Nash County Road. A home on a cul-de-sac in a school-desirable zone sells in a completely different window than one on a collector street.

National headlines don't know this. Zillow doesn't know this.

I know this because I've sold homes in every part of Wilson for years.

If you want to know what's actually happening in your neighborhood — not what the algorithm says, and not what national news is reporting — ask me.

👇 askmagicmike.com/ask`,
    emailSubject: "What the Wilson NC market is actually doing right now",
    emailBody: `Hi [First Name],

You may have seen national real estate headlines lately. Most of them don't apply to Wilson.

Our market is local. What matters is what's happening on your specific street — and I track that every week.

If you'd like to know what the Wilson market is actually doing right now, I'm happy to share what I'm seeing on the ground.

Ask me directly: askmagicmike.com/ask

— Mike Eatmon
Licensed NC Broker, Our Town Properties
Wilson, NC`,
    cta: "Get Wilson's Real Market Picture →",
    flyerHeadline: "Wilson NC Real Estate, Straight from the Source.",
    flyerBody: "Local broker. Real data. No algorithms.",
    hashtags: ["#WilsonNC", "#LocalExpert", "#NCRealEstate", "#OurTownProperties", "#AskMike"],
  },

  comment_lead: {
    id: "comment_lead",
    topic: "Facebook / Instagram Comment-to-Lead",
    category: "general",
    headline: "Comment Below to Get Your Free Market Update.",
    subhead: "Wilson NC residents comment WILSON and Mike will answer your real estate question.",
    socialShort: `Comment WILSON below and I'll answer your #WilsonNC real estate question — free, from a licensed broker. #AskMike`,
    socialMedium: `I want to answer your real estate question this week.

Comment WILSON below and I'll personally respond with what's happening in your part of Wilson NC right now.

No pitch. No obligation. Just a licensed broker's honest take.

#WilsonNC #AskMike #RealEstate`,
    socialFull: `Real estate questions I've heard this week in Wilson:

"Should I sell now or wait?"
"What would my home list for today?"
"Is this a buyer's market or seller's market in Wilson right now?"

Every one of these deserves a real answer — not an algorithm.

Comment WILSON below and I'll respond directly with what I'm seeing in your neighborhood right now.

I do this because I believe an informed seller or buyer makes better decisions — and better decisions lead to better outcomes for Wilson families.

Comment below. 👇`,
    emailSubject: "Your comment got a response from Mike",
    emailBody: `Hi [First Name],

Thanks for commenting on our post! You asked about Wilson NC real estate and I want to give you a real answer.

The best way to get a personalized response is to ask your specific question here: askmagicmike.com/ask

I'll follow up personally within 24 hours.

— Mike Eatmon
Licensed NC Broker, Our Town Properties
Wilson, NC`,
    cta: "Comment WILSON Below →",
    flyerHeadline: "Ask Mike a Question.",
    flyerBody: "Comment on our posts or visit askmagicmike.com/ask — licensed Wilson broker answers free.",
    hashtags: ["#WilsonNC", "#AskMike", "#RealEstate", "#NCRealEstate"],
    commentCapture: "Comment WILSON below and I'll personally respond to your real estate question — from a licensed Wilson broker.",
  },
};

// ---------------------------------------------------------------------------
// Flyer specs per campaign
// ---------------------------------------------------------------------------

const FLYER_SPECS: Record<CampaignSlug, CampaignFlyerSpec> = {
  amm_launch: {
    headline: "Got a Real Estate Question?",
    subhead: "Ask Wilson's Licensed Broker — Free",
    body: "Mike Eatmon, Our Town Properties\nLicensed NC Broker · Wilson, NC\nStraight answers. No algorithms. No pressure.",
    cta: "Scan to Ask Mike Anything",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=amm_launch&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\" or 5×7\". Use a high-contrast QR code generator. Minimum QR size: 1\" × 1\".",
  },
  home_value: {
    headline: "What's Your Wilson Home Worth?",
    subhead: "Free Estimate from a Licensed Wilson Broker",
    body: "Mike Eatmon, Our Town Properties\nLicensed NC Broker · Wilson, NC\nReal comparable sales. Real numbers. No obligation.",
    cta: "Scan for Your Free Home Value",
    qrUrl: "https://www.askmagicmike.com/value?utm_source=qr&utm_medium=owned_media&utm_campaign=home_value&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/value",
    printNote: "Print at 4×6\" or 5×7\". Ideal for door hangers, postcards, and yard sign riders.",
  },
  we_buy_houses: {
    headline: "Got a Cash Offer?",
    subhead: "Find Out If It's Fair — Free Broker Review",
    body: "Mike Eatmon, Our Town Properties\nLicensed NC Broker · Wilson, NC\nKnow your home's real value before you sign anything.",
    cta: "Scan to Get a Second Opinion",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=we_buy_houses&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\". Place near investor yard signs or bulletin boards in Wilson.",
  },
  ask_mike: {
    headline: "Ask Mike Anything.",
    subhead: "Wilson's Local Real Estate Authority",
    body: "Mike Eatmon, Our Town Properties\nLicensed NC Broker · Wilson, NC\nBuying, selling, pricing, timing — real answers.",
    cta: "Scan to Ask Your Question",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=ask_mike&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 4×6\" or business card size. Works at open houses, networking events, and closings.",
  },
  wilson_authority: {
    headline: "Wilson NC Real Estate News You Can Trust.",
    subhead: "Not National Headlines — Local Data from a Local Broker",
    body: "Mike Eatmon, Our Town Properties\nLicensed NC Broker · Wilson, NC\nWhat's actually happening in your neighborhood.",
    cta: "Scan for Wilson's Real Market Picture",
    qrUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=wilson_authority&utm_content=qr_flyer",
    displayUrl: "askmagicmike.com/ask",
    printNote: "Print at 5×7\". Strong for community boards, local businesses, and events.",
  },
  comment_lead: {
    headline: "Follow Mike on Facebook.",
    subhead: "Comment on Posts to Get Free Real Estate Answers",
    body: "Mike Eatmon, Our Town Properties\nLicensed NC Broker · Wilson, NC\nComment WILSON on any post — Mike responds personally.",
    cta: "Scan to Ask Online",
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
    tagline:        "What's your Wilson home worth right now?",
    status:         "active",
    targetAudience: "Wilson homeowners who are curious about selling or refinancing",
    primaryCta:     "Get My Free Home Value Estimate",
    landingPath:    "/value",
    category:       "home_value",
    copyBlock:      COPY_BLOCKS.home_value,
    flyer:          FLYER_SPECS.home_value,
  },
  {
    slug:           "we_buy_houses",
    name:           "We Buy Houses",
    tagline:        "Got a cash offer? Get a second opinion first.",
    status:         "active",
    targetAudience: "Wilson homeowners who have received cash offers from investors",
    primaryCta:     "Ask Mike to Review My Cash Offer",
    landingPath:    "/ask",
    category:       "cash_offer",
    copyBlock:      COPY_BLOCKS.we_buy_houses,
    flyer:          FLYER_SPECS.we_buy_houses,
  },
  {
    slug:           "ask_mike",
    name:           "Ask Mike Anything",
    tagline:        "Direct Q&A with Wilson's local broker",
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
    name:           "Wilson Authority",
    tagline:        "Wilson NC real estate straight from the source",
    status:         "active",
    targetAudience: "People searching for Wilson NC real estate information online",
    primaryCta:     "Get Wilson's Real Market Picture",
    landingPath:    "/ask",
    category:       "general",
    copyBlock:      COPY_BLOCKS.wilson_authority,
    flyer:          FLYER_SPECS.wilson_authority,
  },
];

export const COMMENT_LEAD_CAMPAIGN: Campaign = {
  slug:           "comment_lead",
  name:           "Comment-to-Lead",
  tagline:        "Facebook / Instagram comment-capture flow",
  status:         "active",
  targetAudience: "Facebook and Instagram followers",
  primaryCta:     "Comment WILSON Below",
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
