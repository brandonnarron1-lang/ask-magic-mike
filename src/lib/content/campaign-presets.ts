/**
 * Public campaign preset definitions for Ask Magic Mike.
 *
 * Static, deterministic, compliance-reviewed. No API calls. No writes.
 * Safe to render on public routes. Never imply guaranteed offers,
 * instant AI, or unauthorized MLS data.
 */

export type CampaignCategory = "awareness" | "capture" | "conversion" | "print" | "video" | "email";

export interface CampaignPreset {
  id: string;
  label: string;
  category: CampaignCategory;
  badge: string;
  badgeColor: string;
  description: string;
  headline: string;
  /** ≤140 chars — X, SMS, pull quote */
  shortCaption: string;
  /** ≤500 chars — Threads, IG, longer social */
  longCaption: string;
  emailSubject?: string;
  emailBody?: string;
  videoScript?: string;
  ctaLabel: string;
  ctaUrl: string;
  placement: string;
  complianceNote: string;
  hashtags?: string;
}

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    id: "home_value",
    label: "Home Value",
    category: "conversion",
    badge: "Seller",
    badgeColor: "border-gold-400/30 bg-gold-400/[0.07] text-gold-300",
    description: "Drive sellers and homeowners to the home value intake flow.",
    headline: "Request a local home-value and sale-readiness review.",
    shortCaption:
      "Wilson-area homeowner? Share your property and timing for a broker-reviewed home-value conversation from Our Town Properties. Not an appraisal.",
    longCaption:
      "A useful selling decision starts with the property, condition, timing, and your questions—not a generic promise.\n\nShare those details with Ask Magic Mike for a broker-reviewed home-value and sale-readiness conversation from Mike Eatmon or the Our Town Properties team.\n\nThe review is not an appraisal, automated valuation, guaranteed value, or guaranteed offer.\n\nRequest the review through the tracked link.",
    emailSubject: "Request a local home-value review",
    emailBody:
      "Hi [First Name],\n\nIf you are reviewing a possible move, Ask Magic Mike provides a direct way to share your Wilson-area property, timeline, and questions with Mike Eatmon or the Our Town Properties team.\n\nThe resulting conversation is broker-reviewed guidance, not an appraisal or guaranteed value.\n\nRequest a review: [LINK]\n\nMike Eatmon\nOur Town Properties · Wilson, NC\n\n[Brokerage mailing address]\n[Unsubscribe link]",
    ctaLabel: "Request a Home-Value Review",
    ctaUrl: "https://www.askmagicmike.com/home-value?utm_source=campaign_preset&utm_medium=owned_media&utm_campaign=home_value&utm_content=home_value_preset",
    placement: "Facebook, Instagram bio, email newsletter, sidebar widget",
    complianceNote:
      "Do not guarantee a specific value or sale price. This is a preliminary broker review, not a certified appraisal.",
    hashtags: "#WilsonNC #EasternNC #HomeValue #OurTownProperties #AskMagicMike #RealEstate",
  },

  {
    id: "ask_mike",
    label: "Ask Mike Anything",
    category: "awareness",
    badge: "General",
    badgeColor: "border-slate-400/25 bg-slate-400/[0.05] text-slate-300",
    description: "General awareness — any real estate question, any situation.",
    headline: "Bring your real estate question to a local review.",
    shortCaption:
      "Buying, selling, renting, or planning in Wilson or Eastern NC? Share the situation with Ask Magic Mike for review by Mike or the Our Town Properties team.",
    longCaption:
      "Real estate decisions rarely fit a generic answer. Share your actual timeline, property or target area, and unanswered questions through Ask Magic Mike.\n\nMike Eatmon or the Our Town Properties team will review the request and follow up using the contact preference you provide. Property, market, lending, and legal facts should be independently verified before a decision.",
    emailSubject: "Got a real estate question? Ask Mike.",
    emailBody:
      "Hi [First Name],\n\nWhether you are thinking about selling, buying, renting, or simply planning, Ask Magic Mike provides a direct path to share the details with Mike Eatmon or the Our Town Properties team.\n\nSubmit your question: [LINK]\n\nMike Eatmon\nOur Town Properties · Wilson, NC\n\n[Brokerage mailing address]\n[Unsubscribe link]",
    ctaLabel: "Ask Mike Anything",
    ctaUrl: "https://www.askmagicmike.com/ask?utm_source=campaign_preset&utm_medium=owned_media&utm_campaign=ask_mike&utm_content=ask_mike_preset",
    placement: "Email signature, Instagram bio, Facebook post, business card QR",
    complianceNote:
      "Mike or the Our Town Properties team reviews the request. Do not imply an instant response, guaranteed answer, or exclusive availability.",
    hashtags: "#AskMagicMike #WilsonNC #OurTownProperties #RealEstate #EasternNC",
  },

  {
    id: "we_buy_houses",
    label: "We Buy Houses",
    category: "capture",
    badge: "Direct Sale",
    badgeColor: "border-ruby-400/25 bg-ruby-400/[0.05] text-ruby-300",
    description: "Reach homeowners considering a direct-purchase option.",
    headline: "Thinking about skipping the listing? Ask Mike what a direct-purchase review looks like.",
    shortCaption:
      "Considering a direct sale? Request a human review of your property, timing, and possible paths. No purchase or terms are promised.",
    longCaption:
      "A traditional listing and a direct-purchase path involve different tradeoffs. Property condition, timing, costs, and the terms actually available all matter.\n\nRequest a human review from Mike Eatmon or the Our Town Properties team before deciding which path to investigate. This intake does not create a purchase commitment, guaranteed offer, or promised closing timeline.",
    emailSubject: "Considering a direct sale? Ask Mike first.",
    emailBody:
      "Hi [First Name],\n\nIf you are comparing a traditional listing with a possible direct-purchase path, you can share the property, timing, and questions with Mike Eatmon or the Our Town Properties team.\n\nRequest a review: [LINK]\n\nNo purchase, offer, price, or timing is promised by this request.\n\n[Brokerage mailing address]\n[Unsubscribe link]",
    ctaLabel: "Ask About a Direct-Purchase Review",
    ctaUrl: "https://www.askmagicmike.com/sell?utm_source=campaign_preset&utm_medium=owned_media&utm_campaign=direct_purchase_review&utm_content=direct_purchase_preset",
    placement: "Facebook targeted ad, direct mail follow-up, Google display",
    complianceNote:
      "Do not imply a firm purchase commitment or no-obligation cash transaction — this is an exploration of options, not a binding arrangement. Actual terms depend on property condition, market, and mutual agreement.",
  },

  {
    id: "agent_profile",
    label: "Agent Profile CTA",
    category: "awareness",
    badge: "Authority",
    badgeColor: "border-amber-400/25 bg-amber-400/[0.05] text-amber-300",
    description: "Provide a factual, broker-reviewed handoff for Wilson and Eastern NC questions.",
    headline: "Ask Mike about your Wilson or Eastern NC real estate decision.",
    shortCaption:
      "Share a buying, selling, renting, or planning question with Mike Eatmon or the Our Town Properties team through Ask Magic Mike.",
    longCaption:
      "Local real estate questions deserve property-specific context and human verification. Ask Magic Mike gives Wilson and Eastern North Carolina consumers a direct path to share their timeline, target area, property, and questions with Mike Eatmon or the Our Town Properties team.\n\nUse the tracked link to request a review.",
    ctaLabel: "Ask Mike a Question",
    ctaUrl: "https://www.askmagicmike.com/ask?utm_source=campaign_preset&utm_medium=owned_media&utm_campaign=agent_profile&utm_content=agent_profile_preset",
    placement: "Agent bio pages, LinkedIn, business card, email signature",
    complianceNote:
      "All credential claims must be accurate and current. Do not imply exclusivity, guaranteed results, or certifications not held.",
    hashtags: "#WilsonNC #EasternNC #RealEstate #MikeEatmon #OurTownProperties",
  },

  {
    id: "listing_promotion",
    label: "Listing Promotion",
    category: "conversion",
    badge: "Listing",
    badgeColor: "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300",
    description: "Promote a specific listing and direct inquiries to Mike.",
    headline: "Just listed in [NEIGHBORHOOD], Wilson NC — ask Mike about it.",
    shortCaption:
      "[ADDRESS] is now listed. [BEDS]bd / [BATHS]ba · $[PRICE]. Questions? Ask Mike directly. askmagicmike.com",
    longCaption:
      "Just listed: [ADDRESS], Wilson, NC.\n\n[BEDS] bed / [BATHS] bath · [SQFT] sq ft · Listed at $[PRICE]\n\n[ONE VERIFIED PUBLIC PROPERTY FEATURE]\n\nAsk Mike Eatmon or the Our Town Properties team about this listing. Price, status, availability, showing access, and property facts must be verified at the time of inquiry. Equal Housing Opportunity.\n\n→ Request listing information: [CTA LINK]",
    ctaLabel: "Ask About This Listing",
    ctaUrl: "https://www.askmagicmike.com/ask?listing_id=[MLSID]&utm_source=campaign_preset&utm_medium=owned_media&utm_campaign=listing_[MLSID]&utm_content=listing_preset",
    placement: "Facebook post, Instagram, email to buyer list, property sign rider",
    complianceNote:
      "Replace all [PLACEHOLDER] values before publishing. Verify MLS ID, pricing, and property details are current. Do not publish inaccurate listing data. Equal Housing Opportunity.",
  },

  {
    id: "open_house",
    label: "Open House Capture",
    category: "capture",
    badge: "Event",
    badgeColor: "border-blue-400/25 bg-blue-400/[0.05] text-blue-300",
    description: "Drive attendance and capture questions before and after an open house.",
    headline: "Open house [DAY] — verify the details and bring your questions.",
    shortCaption:
      "Open house: [ADDRESS], Wilson NC · [DATE] · [TIME]. Verify availability before traveling. Questions? Use the tracked Ask Magic Mike link.",
    longCaption:
      "Open-house information for [ADDRESS], Wilson, NC.\n\n[DATE] · [START TIME] – [END TIME]\n\nVerify the event, property status, and hosting agent before traveling. If you cannot attend, use the tracked link to request property information from Mike Eatmon or the Our Town Properties team.\n\n[ADDRESS] · $[PRICE] · [BEDS]bd / [BATHS]ba\n\nEqual Housing Opportunity.",
    ctaLabel: "Ask Mike About This Property",
    ctaUrl: "https://www.askmagicmike.com/open-house/[PROPERTY_ID]?utm_source=campaign_preset&utm_medium=owned_media&utm_campaign=open_house_[PROPERTY_ID]&utm_content=open_house_preset",
    placement: "Facebook event, neighborhood social, email invite, flyer QR code",
    complianceNote:
      "Replace all [PLACEHOLDER] values. Do not publish inaccurate open house times. Equal Housing Opportunity.",
  },

  {
    id: "qr_flyer",
    label: "QR Flyer",
    category: "print",
    badge: "Print",
    badgeColor: "border-purple-400/25 bg-purple-400/[0.05] text-purple-300",
    description: "Optimized copy for print flyers with QR code to Ask Mike.",
    headline: "ASK MAGIC MIKE",
    shortCaption:
      "Mike Eatmon · Our Town Properties · Wilson, NC\n\nScan to ask a real estate question or request a local review.\n[QR CODE]\n\nBroker-reviewed guidance. Not an appraisal.",
    longCaption:
      "ASK MAGIC MIKE\n\nShare a buying, selling, renting, or planning question with Mike Eatmon or the Our Town Properties team.\n\nScan the QR code to use the tracked request path.\n\nBroker-reviewed guidance only. No automated appraisal, guaranteed value, guaranteed offer, or property availability promise. Equal Housing Opportunity.",
    ctaLabel: "Encode This URL for QR Code",
    ctaUrl: "https://www.askmagicmike.com/ask?utm_source=qr&utm_medium=owned_media&utm_campaign=ask_magic_mike_qr&utm_content=print_flyer",
    placement: "Door hangers, sign riders, EDDM mailers, open house sign-in sheets",
    complianceNote:
      "Export QR as SVG for print. Use error correction level H. Test scan before full print run. Do not shorten the URL — UTM params must be preserved. Not an appraisal — include disclaimer on final print.",
  },

  {
    id: "email_blast",
    label: "Email Blast",
    category: "email",
    badge: "Email",
    badgeColor: "border-amber-400/25 bg-amber-400/[0.05] text-amber-300",
    description: "Full email blast for newsletter or database re-engagement.",
    headline: "Have a Wilson-area real estate question? Request a local review.",
    shortCaption:
      "Buying, selling, renting, or planning in Wilson or Eastern NC? Request a broker-reviewed conversation through Ask Magic Mike.",
    longCaption:
      "Hi [First Name],\n\nIf you have a Wilson or Eastern North Carolina real estate question, Ask Magic Mike provides a direct request path to Mike Eatmon or the Our Town Properties team.\n\nShare your timeline, property or target area, and what you need to understand: [LINK]\n\nProperty, market, lending, legal, and financial facts should be independently verified before a decision.\n\nMike Eatmon\nOur Town Properties · Wilson, NC\n\n[Brokerage mailing address]\n[Unsubscribe link]",
    emailSubject: "Request a local real estate review",
    emailBody:
      "Hi [First Name],\n\nAsk Magic Mike provides Wilson and Eastern North Carolina consumers a direct way to request broker-reviewed guidance from Mike Eatmon or the Our Town Properties team.\n\nSubmit your question: [LINK]\n\nMike Eatmon\nOur Town Properties · Wilson, NC\n\n[Brokerage mailing address]\n[Unsubscribe link]",
    ctaLabel: "Ask Mike About the Wilson Market",
    ctaUrl: "https://www.askmagicmike.com/ask?utm_source=email&utm_medium=owned_media&utm_campaign=local_review&utm_content=newsletter",
    placement: "Monthly newsletter, database re-engagement, post-close follow-up",
    complianceNote:
      "CAN-SPAM compliant: include physical address and unsubscribe link in all email blasts. Replace [First Name] with actual merge tag. Do not claim specific market statistics without a citation.",
  },

  {
    id: "facebook_post",
    label: "Facebook Post",
    category: "awareness",
    badge: "Facebook",
    badgeColor: "border-blue-500/25 bg-blue-500/[0.05] text-blue-300",
    description: "Optimized Facebook post with hook, story, and call to action.",
    headline: "Planning a move? Start with your property and timeline.",
    shortCaption:
      "Wilson-area homeowners can request a broker-reviewed home-value and sale-readiness conversation from Our Town Properties. Not an appraisal.",
    longCaption:
      "A useful home-value conversation starts with the property, condition, timeline, and your goals.\n\nWilson-area homeowners can share those details through Ask Magic Mike for review by Mike Eatmon or the Our Town Properties team.\n\nThis is broker-reviewed guidance, not an appraisal, automated valuation, guaranteed value, or guaranteed offer.\n\nUse the tracked link to request the review.\n\n#WilsonNC #EasternNC #HomeValue #OurTownProperties #AskMagicMike",
    ctaLabel: "Copy Facebook Post",
    ctaUrl: "https://www.askmagicmike.com/home-value?utm_source=facebook&utm_medium=social_organic&utm_campaign=home_value&utm_content=facebook_post",
    placement: "Facebook personal or business page. No paid boost needed — organic reach is strong on local real estate content.",
    complianceNote:
      "Do not guarantee a specific home value. Do not claim MLS data access without authorization. Link must use askmagicmike.com domain for Facebook link preview to load correctly.",
    hashtags: "#WilsonNC #EasternNC #HomeValue #OurTownProperties #AskMagicMike #RealEstate",
  },

  {
    id: "instagram_caption",
    label: "Instagram Caption",
    category: "awareness",
    badge: "Instagram",
    badgeColor: "border-pink-400/25 bg-pink-400/[0.05] text-pink-300",
    description: "Instagram caption with strong hook, punchy body, and bio link CTA.",
    headline: "Your property. Your timing. A local review.",
    shortCaption:
      "Thinking about a future move? Share your Wilson-area property and timing for a broker-reviewed home-value conversation. Not an appraisal. Link in bio.",
    longCaption:
      "A future selling decision starts with more than a generic number. Share your property, condition, timeline, and questions through Ask Magic Mike for review by Mike Eatmon or the Our Town Properties team.\n\nBroker-reviewed guidance only; not an appraisal or guaranteed value.\n\nLink in bio.\n\n#WilsonNC #EasternNC #HomeValue #RealEstate #AskMagicMike #OurTownProperties",
    ctaLabel: "Copy Instagram Caption",
    ctaUrl: "https://www.askmagicmike.com/home-value?utm_source=instagram&utm_medium=social_organic&utm_campaign=home_value&utm_content=instagram_bio",
    placement: "Instagram feed post caption. Add property photo or Mike headshot as the image. Link in bio must point to askmagicmike.com.",
    complianceNote:
      "Do not imply same-day valuations or certified appraisal services. Hashtag mix: 3–5 local + 3–5 category. Instagram bio link: update to this UTM URL for tracking.",
    hashtags: "#WilsonNC #EasternNC #HomeValue #RealEstate #AskMagicMike #OurTownProperties #WilsonNCrealEstate #NCRealEstate",
  },

  {
    id: "video_script",
    label: "Short Video Script",
    category: "video",
    badge: "Video",
    badgeColor: "border-cyan-400/25 bg-cyan-400/[0.05] text-cyan-300",
    description: "30–60 second script for Reels, TikTok, YouTube Shorts, or Facebook Video.",
    headline: "If you own a home in Wilson — this is for you.",
    shortCaption:
      "Script: 30–60 sec · Reels, TikTok, Shorts, Facebook Video · Real estate awareness",
    longCaption:
      "Use this script as a starting point. Deliver in your own voice. Do not read verbatim on camera.",
    videoScript:
      "[HOOK — 0:00–0:05]\n\"If you are planning a move, start with your property, timing, and questions.\"\n\n[CONTEXT — 0:05–0:15]\n\"A useful home-value conversation considers the details you provide and the facts a local professional can verify.\"\n\n[REQUEST PATH — 0:15–0:35]\n\"Ask Magic Mike lets Wilson-area homeowners request a review from Mike Eatmon or the Our Town Properties team.\"\n\n[CTA — 0:35–0:45]\n\"Use the tracked link to request a home-value and sale-readiness conversation.\"\n\n[DISCLOSURE]\n\"Broker-reviewed guidance only. Not an appraisal, automated valuation, guaranteed value, or guaranteed offer. Equal Housing Opportunity.\"",
    ctaLabel: "Copy Video Script",
    ctaUrl: "https://www.askmagicmike.com/home-value?utm_source=video&utm_medium=social_organic&utm_campaign=home_value&utm_content=vertical_video",
    placement: "Instagram Reels, Facebook Video, TikTok, YouTube Shorts. Film vertical (9:16). Add captions — 85% of social video is watched muted.",
    complianceNote:
      "Do not make specific price claims on camera. Do not claim instant AI responses. Suggested disclaimer card at end: 'Not an appraisal. Broker-reviewed guidance only. Our Town Properties, Inc. Equal Housing Opportunity.'",
  },
];

/** Look up a preset by ID. Returns undefined if not found. */
export function getPresetById(id: string): CampaignPreset | undefined {
  return CAMPAIGN_PRESETS.find((p) => p.id === id);
}

/** All preset IDs, in display order. */
export const PRESET_IDS = CAMPAIGN_PRESETS.map((p) => p.id);
