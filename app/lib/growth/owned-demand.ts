import type { GrowthIntelligence } from "./intelligence";
import { buildUtmUrl, type UtmMedium } from "../../../src/lib/admin/utm-link-builder";

export type OwnedDemandStatus = "signal_detected" | "ready_unmeasured";

export interface OwnedDemandAttributionSignal {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  leads: number;
}

export type OwnedDemandOfferKey = "seller_review" | "buyer_match" | "renter_plan";
export type WordPressOwnedPlacementKey =
  | "wordpress_homepage_ask_mike"
  | "wordpress_home_value"
  | "wordpress_we_buy_homes"
  | "wordpress_mike_agent"
  | "wordpress_listing_buyer"
  | "wordpress_rental_to_homeownership"
  | "wordpress_ask_magic_mike_embed";
export type OwnedDemandPlacementKey = "general_question" | OwnedDemandOfferKey | WordPressOwnedPlacementKey;

export interface OwnedDemandPlacementDefinition {
  channelKey: string;
  channelLabel: string;
  placementKey: OwnedDemandPlacementKey;
  placementLabel: string;
  source: string;
  medium: UtmMedium;
  campaign: string;
  content: string;
  destination: string;
  trackedUrl: string;
}

export interface OwnedDemandCreativeDefinition extends OwnedDemandPlacementDefinition {
  creativeHeadline: string;
  creativeBody: string;
  creativePath: string;
  creativeExportPath: string;
  creativeAlt: string;
  reviewNote: string;
}

export interface OwnedDemandOfferBrief {
  key: OwnedDemandOfferKey;
  label: string;
  shortLabel: string;
  destination: string;
  draftTitle: string;
  draftBody: string;
  creativePath: string;
  creativeAlt: string;
  reviewNote: string;
}

export interface OwnedDemandOfferPlacement extends OwnedDemandOfferBrief {
  content: string;
  trackedUrl: string;
  attributedLeads: number;
  status: OwnedDemandStatus;
}

export interface OwnedDemandNamedPlacement extends OwnedDemandPlacementDefinition {
  attributedLeads: number;
  status: OwnedDemandStatus;
}

export interface OwnedDemandChannel {
  key: string;
  label: string;
  source: string;
  medium: UtmMedium;
  campaign: string;
  content: string;
  destination: string;
  trackedUrl: string;
  attributedLeads: number;
  status: OwnedDemandStatus;
  format: string;
  draftTitle: string;
  draftBody: string;
  operatorStep: string;
  reviewNote: string;
  offers: OwnedDemandOfferPlacement[];
  namedPlacements: OwnedDemandNamedPlacement[];
}

export interface OwnedDemandPlanItem {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  channelKey: string;
  objective: string;
  proofRequired: string;
}

export interface OwnedDemandCommand {
  generatedAt: string;
  attributedLiveLeads: number;
  attributedLeadRate: number;
  measurementState: "no_live_signal" | "partial_signal" | "measured";
  bottleneck: string;
  offers: OwnedDemandOfferBrief[];
  channels: OwnedDemandChannel[];
  weeklyPlan: OwnedDemandPlanItem[];
  operatorBoundary: string;
}

export function buildOwnedDemandChannelPacket(channel: OwnedDemandChannel) {
  const sections = channel.offers.map((offer) => [
    offer.shortLabel.toUpperCase(),
    offer.draftTitle,
    offer.draftBody,
    offer.trackedUrl,
    `Review boundary: ${offer.reviewNote}`,
  ].join("\n"));
  const namedPlacements = channel.namedPlacements.length
    ? [
        "NAMED BROKERAGE PLACEMENTS",
        ...channel.namedPlacements.map((placement) => `${placement.placementLabel.toUpperCase()} — ${placement.trackedUrl}`),
        "",
      ]
    : [];

  return [
    `ASK MAGIC MIKE — ${channel.label.toUpperCase()} OWNED-DEMAND FLIGHT`,
    `Format: ${channel.format}`,
    `Campaign: ${channel.campaign}`,
    "",
    "GENERAL QUESTION PLACEMENT",
    channel.draftTitle,
    channel.draftBody,
    channel.trackedUrl,
    "",
    ...sections.flatMap((section) => [section, ""]),
    ...namedPlacements,
    `Next human step: ${channel.operatorStep}`,
    `Channel review: ${channel.reviewNote}`,
    "External publication remains a separate human-reviewed approval.",
  ].join("\n").trim();
}

export const OWNED_DEMAND_CAMPAIGN_KEY = "amm_owned_demand_2026";

const OFFER_DEFINITIONS = [
  {
    key: "seller_review",
    label: "Seller value + readiness review",
    shortLabel: "Seller review",
    contentSuffix: "seller_review",
    destination: "https://www.askmagicmike.com/home-value",
    draftTitle: "Request a broker-reviewed home-value and sale-readiness review",
    draftBody: "Thinking about selling in Wilson or Eastern North Carolina? Share the property and timing privately. Mike Eatmon or the Our Town Properties team will review the request and follow up. This is not an appraisal, automated valuation, guaranteed value, or guaranteed offer.",
    creativePath: "/brand/black-diamond/hero-social-4x5.jpg",
    creativeExportPath: "/brand/black-diamond/hero-social-4x5.jpg",
    creativeAlt: "Mike Eatmon in front of a home at dusk",
    creativeHeadline: "Know your options before you sell.",
    creativeBody: "Share the property and timing for a broker-reviewed home-value and sale-readiness conversation.",
    reviewNote: "Keep the offer human-reviewed and conditional. Do not add an automated valuation, guaranteed value, guaranteed offer, or unverified response-time claim.",
  },
  {
    key: "buyer_match",
    label: "Buyer property-match review",
    shortLabel: "Buyer match",
    contentSuffix: "buyer_match",
    destination: "https://www.askmagicmike.com/buy",
    draftTitle: "Request a local property-match and buying-plan review",
    draftBody: "Tell Our Town Properties what you are looking for, your target area, and your timing. The team will review the request and follow up about possible next steps. Property availability, financing, and appointments must be confirmed.",
    creativePath: "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.webp",
    creativeExportPath: "/images/ask-magic-mike/brand-pack-v2/mike-headshot-source.jpg",
    creativeAlt: "Mike Eatmon welcoming a real estate conversation",
    creativeHeadline: "Build a local buying plan around what matters to you.",
    creativeBody: "Share your target area, needs, and timing for a human-reviewed property-match conversation.",
    reviewNote: "Do not imply that a property is available, financing is approved, or an appointment is booked until a person verifies it.",
  },
  {
    key: "renter_plan",
    label: "Rental-to-homeownership review",
    shortLabel: "Renter plan",
    contentSuffix: "renter_plan",
    destination: "https://www.askmagicmike.com/rent",
    draftTitle: "Explore a rental-to-homeownership readiness review",
    draftBody: "Share your current rental situation, target area, and homeownership goals with Our Town Properties. The team will review the request and discuss possible next steps. This is not a lending decision or a promise of eligibility, affordability, or financing.",
    creativePath: "/images/ask-magic-mike/mike-eatmon-headshot.webp",
    creativeExportPath: "/images/ask-magic-mike/mike-eatmon-headshot-export.jpg",
    creativeAlt: "Mike Eatmon smiling in an Our Town Properties portrait",
    creativeHeadline: "Explore a path from renting toward homeownership.",
    creativeBody: "Share your current situation and goals for a human-reviewed readiness conversation.",
    reviewNote: "Do not promise eligibility, affordability, financing, inventory, or a timeline. Keep protected-class data and proxies out of targeting and copy.",
  },
] as const satisfies readonly (OwnedDemandOfferBrief & {
  contentSuffix: string;
  creativeHeadline: string;
  creativeBody: string;
  creativeExportPath: string;
})[];

const CHANNEL_DEFINITIONS = [
  {
    key: "ourtown_wordpress",
    label: "Our Town Properties website",
    source: "ourtownproperties",
    aliases: ["ourtownproperties", "ourtown_wp", "ourtownproperties.com"],
    medium: "owned_media" as const,
    content: "wordpress_ask_magic_mike",
    destination: "https://www.askmagicmike.com/ask",
    format: "Named WordPress CTA or isolated embed",
    draftTitle: "Connect an existing brokerage page to the canonical lead path",
    draftBody: "Use one placement-specific AskMagicMike.com link or isolated embed while preserving the current Our Town Properties page, listings, SEO content, and live brokerage contact details.",
    operatorStep: "Use the reviewed WordPress activation matrix, back up the named page, and publish only that CTA or embed after approval. Do not enable Gravity Form 7 sitewide or add another native lead database.",
    reviewNote: "Keep Form 3 as the only proven canonical Gravity Forms forward. Search Console and Regency review are required before redirecting duplicate pages or retiring a plugin.",
  },
  {
    key: "google_business_profile",
    label: "Google Business Profile",
    source: "google_business_profile",
    aliases: ["google_business_profile", "google_business", "gbp"],
    medium: "organic_local" as const,
    content: "gbp_update",
    destination: "https://www.askmagicmike.com/ask",
    format: "Update post · local Q&A",
    draftTitle: "Have a Wilson-area real estate question?",
    draftBody: "Ask Mike about buying, selling, timing, or your next step. Mike Eatmon and the Our Town Properties team review each request and follow up with local guidance.",
    operatorStep: "Review the wording and image, then create an Update post in the verified Business Profile with the tracked Learn more link.",
    reviewNote: "Do not place a phone number in the post body. Google reviews posts against its content policy.",
  },
  {
    key: "facebook",
    label: "Facebook",
    source: "facebook",
    aliases: ["facebook", "fb"],
    medium: "social_organic" as const,
    content: "facebook_local_question",
    destination: "https://www.askmagicmike.com/ask",
    format: "Organic post · local question",
    draftTitle: "What would you ask a local Wilson broker?",
    draftBody: "Buying, selling, or simply planning ahead? Send Mike your real estate question privately through Ask Magic Mike. Our Town Properties will review the details and follow up without promising a value, offer, or appointment that has not been confirmed.",
    operatorStep: "Review in the native Page editor, attach an approved Mike or Our Town visual, and publish manually with the tracked link.",
    reviewNote: "Use the AskMagicMike.com link so the approved social preview is served from the canonical domain.",
  },
  {
    key: "instagram",
    label: "Instagram",
    source: "instagram",
    aliases: ["instagram", "ig"],
    medium: "social_organic" as const,
    content: "instagram_story_question",
    destination: "https://www.askmagicmike.com/ask",
    format: "Story or bio · question prompt",
    draftTitle: "Ask Mike your next real estate question",
    draftBody: "Wilson and Eastern NC buyers, sellers, and renters can share their situation and request a local review from Mike Eatmon and Our Town Properties.",
    operatorStep: "Pair with an approved vertical visual and use the tracked URL in the story link sticker or current bio-link destination.",
    reviewNote: "Do not claim instant answers, guaranteed outcomes, or unverified property facts.",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    source: "linkedin",
    aliases: ["linkedin"],
    medium: "social_organic" as const,
    content: "linkedin_local_guidance",
    destination: "https://www.askmagicmike.com/ask",
    format: "Page or profile post · local guidance",
    draftTitle: "Local context matters in real estate decisions",
    draftBody: "A useful real estate conversation starts with the person’s actual timeline, property, target area, and unanswered questions. Ask Magic Mike gives Wilson-area consumers a direct path to request a broker-reviewed conversation with Our Town Properties.",
    operatorStep: "Edit in Mike’s voice, select the correct Page or profile identity, and publish manually with the tracked link.",
    reviewNote: "Keep the post factual and professional; verify every credential or production claim before publication.",
  },
  {
    key: "email_signature",
    label: "Email signature",
    source: "email",
    aliases: ["email", "newsletter"],
    medium: "owned_media" as const,
    content: "email_signature_ask_mike",
    destination: "https://www.askmagicmike.com/ask",
    format: "One-line signature link",
    draftTitle: "Ask Mike a real estate question",
    draftBody: "Ask Mike a real estate question →",
    operatorStep: "Add the tracked link to an approved brokerage signature only after the mailbox owner reviews the wording and destination.",
    reviewNote: "This is a passive signature link, not authorization for a campaign send or consumer acknowledgment.",
  },
  {
    key: "qr_print",
    label: "QR and print",
    source: "qr",
    aliases: ["qr", "print", "open_house_qr"],
    medium: "owned_media" as const,
    content: "qr_local_question",
    destination: "https://www.askmagicmike.com/ask",
    format: "QR destination · flyer or event",
    draftTitle: "Scan to ask Mike",
    draftBody: "Share your Wilson-area real estate question with Mike Eatmon and Our Town Properties. Broker-reviewed guidance only; no automated appraisal or guaranteed offer.",
    operatorStep: "Generate the QR from the complete tracked URL, test it on two devices, and verify the final printed placement before distribution.",
    reviewNote: "Property-specific versions must verify address, listing, event, and agent facts before printing.",
  },
] as const;

const WORDPRESS_NAMED_PLACEMENT_INPUTS = [
  {
    placementKey: "wordpress_homepage_ask_mike",
    placementLabel: "Homepage Ask Magic Mike",
    destination: "https://www.askmagicmike.com/ask",
    content: "wordpress_homepage_ask_mike",
  },
  {
    placementKey: "wordpress_home_value",
    placementLabel: "Established home-value page",
    destination: "https://www.askmagicmike.com/home-value",
    content: "wordpress_home_value_page",
  },
  {
    placementKey: "wordpress_we_buy_homes",
    placementLabel: "We Buy Homes",
    destination: "https://www.askmagicmike.com/sell",
    content: "wordpress_we_buy_homes",
  },
  {
    placementKey: "wordpress_mike_agent",
    placementLabel: "Mike agent page",
    destination: "https://www.askmagicmike.com/ask",
    content: "wordpress_mike_agent_page",
  },
  {
    placementKey: "wordpress_listing_buyer",
    placementLabel: "Featured and listing buyer CTA",
    destination: "https://www.askmagicmike.com/buy",
    content: "wordpress_listing_buyer",
  },
  {
    placementKey: "wordpress_rental_to_homeownership",
    placementLabel: "Rental-to-homeownership CTA",
    destination: "https://www.askmagicmike.com/rent",
    content: "wordpress_rental_to_homeownership",
  },
  {
    placementKey: "wordpress_ask_magic_mike_embed",
    placementLabel: "Ask Magic Mike iframe page",
    destination: "https://www.askmagicmike.com/ask",
    content: "wordpress_ask_magic_mike_embed",
  },
] as const satisfies readonly {
  placementKey: WordPressOwnedPlacementKey;
  placementLabel: string;
  destination: string;
  content: string;
}[];

function wordpressNamedPlacements(): OwnedDemandPlacementDefinition[] {
  const channel = CHANNEL_DEFINITIONS.find((candidate) => candidate.key === "ourtown_wordpress");
  if (!channel) return [];
  return WORDPRESS_NAMED_PLACEMENT_INPUTS.map((placement) => ({
    channelKey: channel.key,
    channelLabel: channel.label,
    placementKey: placement.placementKey,
    placementLabel: placement.placementLabel,
    source: channel.source,
    medium: channel.medium,
    campaign: OWNED_DEMAND_CAMPAIGN_KEY,
    content: placement.content,
    destination: placement.destination,
    trackedUrl: buildUtmUrl(placement.destination, {
      utm_source: channel.source,
      utm_medium: channel.medium,
      utm_campaign: OWNED_DEMAND_CAMPAIGN_KEY,
      utm_content: placement.content,
    }),
  }));
}

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function resolveOwnedDemandPlacement(
  channelKey: string,
  placementKey: string,
): OwnedDemandPlacementDefinition | null {
  const channel = CHANNEL_DEFINITIONS.find((candidate) => candidate.key === channelKey);
  if (!channel) return null;

  const namedPlacement = wordpressNamedPlacements().find((candidate) => (
    candidate.channelKey === channelKey && candidate.placementKey === placementKey
  ));
  if (namedPlacement) return namedPlacement;

  if (placementKey === "general_question") {
    return {
      channelKey: channel.key,
      channelLabel: channel.label,
      placementKey,
      placementLabel: "General question",
      source: channel.source,
      medium: channel.medium,
      campaign: OWNED_DEMAND_CAMPAIGN_KEY,
      content: channel.content,
      destination: channel.destination,
      trackedUrl: buildUtmUrl(channel.destination, {
        utm_source: channel.source,
        utm_medium: channel.medium,
        utm_campaign: OWNED_DEMAND_CAMPAIGN_KEY,
        utm_content: channel.content,
      }),
    };
  }

  const offer = OFFER_DEFINITIONS.find((candidate) => candidate.key === placementKey);
  if (!offer) return null;
  const content = `${channel.content}_${offer.contentSuffix}`;
  return {
    channelKey: channel.key,
    channelLabel: channel.label,
    placementKey: offer.key,
    placementLabel: offer.shortLabel,
    source: channel.source,
    medium: channel.medium,
    campaign: OWNED_DEMAND_CAMPAIGN_KEY,
    content,
    destination: offer.destination,
    trackedUrl: buildUtmUrl(offer.destination, {
      utm_source: channel.source,
      utm_medium: channel.medium,
      utm_campaign: OWNED_DEMAND_CAMPAIGN_KEY,
      utm_content: content,
    }),
  };
}

export function resolveOwnedDemandCreative(
  channelKey: string,
  placementKey: string,
): OwnedDemandCreativeDefinition | null {
  const placement = resolveOwnedDemandPlacement(channelKey, placementKey);
  const channel = CHANNEL_DEFINITIONS.find((candidate) => candidate.key === channelKey);
  if (!placement || !channel) return null;

  if (placement.placementKey === "general_question") {
    return {
      ...placement,
      creativeHeadline: "Ask a local real estate question.",
      creativeBody: "Share your situation privately with Mike Eatmon and the Our Town Properties team.",
      creativePath: "/brand/black-diamond/hero-social-4x5.jpg",
      creativeExportPath: "/brand/black-diamond/hero-social-4x5.jpg",
      creativeAlt: "Mike Eatmon in front of a home at dusk",
      reviewNote: channel.reviewNote,
    };
  }

  const offer = OFFER_DEFINITIONS.find((candidate) => candidate.key === placement.placementKey);
  if (!offer) return null;
  return {
    ...placement,
    creativeHeadline: offer.creativeHeadline,
    creativeBody: offer.creativeBody,
    creativePath: offer.creativePath,
    creativeExportPath: offer.creativeExportPath,
    creativeAlt: offer.creativeAlt,
    reviewNote: offer.reviewNote,
  };
}

function leadsForPlacement(
  signals: OwnedDemandAttributionSignal[],
  definition: (typeof CHANNEL_DEFINITIONS)[number],
  placementContent: string = definition.content,
) {
  const accepted = new Set(definition.aliases.map(normalized));
  const campaign = normalized(OWNED_DEMAND_CAMPAIGN_KEY);
  const medium = normalized(definition.medium);
  const content = normalized(placementContent);
  return signals.reduce((total, signal) => (
    accepted.has(normalized(signal.source)) &&
    normalized(signal.medium) === medium &&
    normalized(signal.campaign) === campaign &&
    normalized(signal.content) === content
      ? total + signal.leads
      : total
  ), 0);
}

export function buildOwnedDemandCommand(
  intelligence: Pick<GrowthIntelligence, "summary"> & {
    ownedDemandSignals: OwnedDemandAttributionSignal[];
  },
  now = new Date(),
): OwnedDemandCommand {
  const offers = OFFER_DEFINITIONS.map(({ contentSuffix: _contentSuffix, ...offer }) => offer);
  const channels = CHANNEL_DEFINITIONS.map((definition): OwnedDemandChannel => {
    const genericAttributedLeads = leadsForPlacement(intelligence.ownedDemandSignals, definition);
    const trackedUrl = buildUtmUrl(definition.destination, {
      utm_source: definition.source,
      utm_medium: definition.medium,
      utm_campaign: OWNED_DEMAND_CAMPAIGN_KEY,
      utm_content: definition.content,
    });
    const offerPlacements = OFFER_DEFINITIONS.map(({ contentSuffix, ...offer }): OwnedDemandOfferPlacement => {
      const content = `${definition.content}_${contentSuffix}`;
      const attributedLeads = leadsForPlacement(intelligence.ownedDemandSignals, definition, content);
      return {
        ...offer,
        content,
        trackedUrl: buildUtmUrl(offer.destination, {
          utm_source: definition.source,
          utm_medium: definition.medium,
          utm_campaign: OWNED_DEMAND_CAMPAIGN_KEY,
          utm_content: content,
        }),
        attributedLeads,
        status: attributedLeads > 0 ? "signal_detected" : "ready_unmeasured",
      };
    });
    const namedPlacements = (definition.key === "ourtown_wordpress" ? wordpressNamedPlacements() : [])
      .map((placement): OwnedDemandNamedPlacement => {
        const attributedLeads = leadsForPlacement(intelligence.ownedDemandSignals, definition, placement.content);
        return {
          ...placement,
          attributedLeads,
          status: attributedLeads > 0 ? "signal_detected" : "ready_unmeasured",
        };
      });
    const attributedLeads = genericAttributedLeads
      + offerPlacements.reduce((sum, offer) => sum + offer.attributedLeads, 0)
      + namedPlacements.reduce((sum, placement) => sum + placement.attributedLeads, 0);
    return {
      key: definition.key,
      label: definition.label,
      source: definition.source,
      medium: definition.medium,
      campaign: OWNED_DEMAND_CAMPAIGN_KEY,
      content: definition.content,
      destination: definition.destination,
      trackedUrl,
      attributedLeads,
      status: attributedLeads > 0 ? "signal_detected" : "ready_unmeasured",
      format: definition.format,
      draftTitle: definition.draftTitle,
      draftBody: definition.draftBody,
      operatorStep: definition.operatorStep,
      reviewNote: definition.reviewNote,
      offers: offerPlacements,
      namedPlacements,
    };
  });

  const attributedLiveLeads = channels.reduce((sum, channel) => sum + channel.attributedLeads, 0);
  const measurementState = attributedLiveLeads === 0
    ? "no_live_signal"
    : intelligence.summary.attributedLeadRate < 80
      ? "partial_signal"
      : "measured";

  const bottleneck = measurementState === "no_live_signal"
    ? intelligence.summary.leads === 0
      ? "No eligible live lead has reached the Growth ledger in this window. The immediate constraint is owned-demand activation, not another scoring or dashboard feature."
      : "Eligible live demand exists, but no lead is attributed to an owned-demand placement. Activate one tracked placement or verify its UTM mapping before treating owned distribution as measured."
    : measurementState === "partial_signal"
      ? "Live demand exists, but source attribution is incomplete. Repair tracked placements before comparing channel performance."
      : "Source measurement is usable. Compare qualified appointments and outcomes before increasing publishing effort or spend.";

  return {
    generatedAt: now.toISOString(),
    attributedLiveLeads,
    attributedLeadRate: intelligence.summary.attributedLeadRate,
    measurementState,
    bottleneck,
    offers,
    channels,
    weeklyPlan: [
      { day: "Monday", channelKey: "ourtown_wordpress", objective: "Activate one named brokerage CTA without widening Form 7", proofRequired: "Backup, approved page ID, live link, and matching tracked destination" },
      { day: "Tuesday", channelKey: "google_business_profile", objective: "Publish one useful local Q&A update", proofRequired: "Live post URL and matching tracked destination" },
      { day: "Wednesday", channelKey: "facebook", objective: "Invite one private buyer or seller question", proofRequired: "Live post URL; no unverified market claim" },
      { day: "Thursday", channelKey: "instagram", objective: "Run one question prompt with a link sticker", proofRequired: "Story or bio placement screenshot and tracked URL" },
      { day: "Friday", channelKey: "qr_print", objective: "Prepare one event or open-house QR placement", proofRequired: "Two-device scan test and property facts verified" },
    ],
    operatorBoundary: "This command center observes, drafts, and prepares tracked links. It never publishes, sends email, creates ads, changes spend, or contacts a consumer. Every external placement remains a human-reviewed action.",
  };
}
