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
  // ── 1. Home Value ──────────────────────────────────────────────────────────
  {
    id: "home_value",
    label: "Home Value",
    category: "conversion",
    badge: "Seller",
    badgeColor: "border-gold-400/30 bg-gold-400/[0.07] text-gold-300",
    description: "Drive sellers and homeowners to the home value intake flow.",
    headline: "Find out what your Wilson home is worth — ask Mike directly.",
    shortCaption:
      "Wondering what your Wilson home is worth right now? Ask Mike Eatmon — he's closed 2,500+ deals in Eastern NC and reviews every question personally. askmagicmike.com",
    longCaption:
      "The Wilson market has shifted more in the last 18 months than it did in the previous five years.\n\nMost online estimates are off by 10–20%. They don't know your school zone. They don't know what actually sold on your street last month.\n\nMike Eatmon at Our Town Properties does. He's been closing deals in Wilson since 1993 — over 2,500 of them — and he reviews every question you send him personally.\n\nAsk him what your home is worth right now. Takes 60 seconds. No sales pressure. No obligation.\n\n→ askmagicmike.com",
    emailSubject: "What's your Wilson home worth right now?",
    emailBody:
      "Hi [First Name],\n\nThe Wilson market has shifted significantly — and most online tools haven't kept up.\n\nMike Eatmon at Our Town Properties has closed 2,500+ deals in Wilson, NC. He reviews every question personally. No bots, no call centers.\n\nIf you've wondered what your home could sell for in today's market, ask him directly — no obligation.\n\n→ Ask Mike: [LINK]\n\nMike Eatmon\nOur Town Properties · Wilson, NC",
    ctaLabel: "Ask Mike What My Home Is Worth",
    ctaUrl: "https://askmagicmike.com/ask?chip=home_worth&q=What+is+my+home+worth+in+Wilson%2C+NC%3F&utm_source=campaign&utm_medium=preset&utm_campaign=home-value",
    placement: "Facebook, Instagram bio, email newsletter, sidebar widget",
    complianceNote:
      "Do not guarantee a specific value or sale price. This is a preliminary broker review, not a certified appraisal.",
    hashtags: "#WilsonNC #EasternNC #HomeValue #OurTownProperties #AskMagicMike #RealEstate",
  },

  // ── 2. Ask Mike Anything ───────────────────────────────────────────────────
  {
    id: "ask_mike",
    label: "Ask Mike Anything",
    category: "awareness",
    badge: "General",
    badgeColor: "border-slate-400/25 bg-slate-400/[0.05] text-slate-300",
    description: "General awareness — any real estate question, any situation.",
    headline: "Got a real estate question? Ask Mike — he answers personally.",
    shortCaption:
      "Real estate questions deserve real answers. Ask Mike Eatmon at Our Town Properties — not a bot. Not a call center. The actual broker. askmagicmike.com",
    longCaption:
      "Whether you're thinking about selling, curious about the market, or have a question you're not sure who to ask — Mike Eatmon is a good person to know.\n\nHe's been the go-to broker in Wilson, NC for over 30 years. He reviews every question himself and follows up with a real answer — phone, text, or email, your choice.\n\nYou can ask him anything at askmagicmike.com. Takes about 60 seconds.",
    emailSubject: "Got a real estate question? Ask Mike.",
    emailBody:
      "Hi [First Name],\n\nWhether you're thinking about selling, buying, or just curious about the market — Mike Eatmon at Our Town Properties is the right person to ask.\n\nHe's been closing deals in Wilson since 1993. He reads every question personally and follows up with a real answer.\n\nAsk him anything: [LINK]\n\nTakes 60 seconds. No obligation.",
    ctaLabel: "Ask Mike Anything",
    ctaUrl: "https://askmagicmike.com/ask?utm_source=campaign&utm_medium=preset&utm_campaign=ask-mike",
    placement: "Email signature, Instagram bio, Facebook post, business card QR",
    complianceNote:
      "Mike or the Our Town Properties team follows up personally. Do not imply an instant automated response.",
    hashtags: "#AskMagicMike #WilsonNC #OurTownProperties #RealEstate #EasternNC",
  },

  // ── 3. We Buy Houses ──────────────────────────────────────────────────────
  {
    id: "we_buy_houses",
    label: "We Buy Houses",
    category: "capture",
    badge: "Direct Sale",
    badgeColor: "border-ruby-400/25 bg-ruby-400/[0.05] text-ruby-300",
    description: "Reach homeowners considering a direct-purchase option.",
    headline: "Thinking about skipping the listing? Ask Mike what a direct-purchase review looks like.",
    shortCaption:
      "If you're considering a direct sale — no listing, no showings — Our Town Properties may have options. Ask Mike what that could look like for your home. askmagicmike.com",
    longCaption:
      "Not every homeowner wants to list. Sometimes speed and certainty matter more than top dollar.\n\nOur Town Properties has helped Wilson homeowners explore direct-purchase options when the timing, condition, or situation made a traditional listing the wrong move.\n\nAsk Mike what a direct-purchase review looks like for your property. No pressure. No obligation. He'll tell you straight whether it makes sense.\n\n→ askmagicmike.com",
    emailSubject: "Considering a direct sale? Ask Mike first.",
    emailBody:
      "Hi [First Name],\n\nIf you've thought about selling your home without listing it — Our Town Properties works with homeowners in exactly that situation.\n\nMike Eatmon will walk you through whether a direct-purchase review makes sense for your property, your timeline, and your goals.\n\nAsk Mike: [LINK]\n\nNo obligation. No pressure.",
    ctaLabel: "Ask About a Direct-Purchase Review",
    ctaUrl: "https://askmagicmike.com/ask?q=I+am+interested+in+a+direct+purchase+option+for+my+home&utm_source=campaign&utm_medium=preset&utm_campaign=we-buy-houses",
    placement: "Facebook targeted ad, direct mail follow-up, Google display",
    complianceNote:
      "Do not imply a firm purchase commitment or no-obligation cash transaction — this is an exploration of options, not a binding arrangement. Actual terms depend on property condition, market, and mutual agreement.",
  },

  // ── 4. Agent Profile CTA ──────────────────────────────────────────────────
  {
    id: "agent_profile",
    label: "Agent Profile CTA",
    category: "awareness",
    badge: "Authority",
    badgeColor: "border-amber-400/25 bg-amber-400/[0.05] text-amber-300",
    description: "Position Mike as the go-to broker for Wilson and Eastern NC.",
    headline: "30+ years in Wilson. 2,500+ closed deals. Mike Eatmon reviews every question personally.",
    shortCaption:
      "Mike Eatmon — Eastern NC's most experienced broker. 30+ years, 2,500+ deals. Ask him anything at askmagicmike.com.",
    longCaption:
      "Mike Eatmon has been closing real estate deals in Wilson, NC since 1993.\n\nMore than 2,500 homes. Every market cycle. School zones, lot depths, medical district growth, interest rate swings — he's seen all of it.\n\nIf you have a real estate question about Wilson or Eastern NC, he's the right person to ask. And he reads every question himself.\n\n→ Ask Mike: askmagicmike.com\n→ Our Town Properties: ourtownproperties.com",
    ctaLabel: "Ask Mike a Question",
    ctaUrl: "https://askmagicmike.com/ask?utm_source=campaign&utm_medium=preset&utm_campaign=agent-profile",
    placement: "Agent bio pages, LinkedIn, business card, email signature",
    complianceNote:
      "All credential claims must be accurate and current. Do not imply exclusivity, guaranteed results, or certifications not held.",
    hashtags: "#WilsonNC #EasternNC #RealEstate #MikeEatmon #OurTownProperties",
  },

  // ── 5. Listing Promotion ───────────────────────────────────────────────────
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
      "Just listed: [ADDRESS] in [NEIGHBORHOOD], Wilson, NC.\n\n[BEDS] bed / [BATHS] bath · [SQFT] sq ft · Listed at $[PRICE]\n\n[ONE LINE about the property — school zone, lot, neighborhood feature]\n\nQuestions about this home, the neighborhood, or comparable properties? Ask Mike Eatmon directly at askmagicmike.com — he reviews every inquiry personally.\n\n→ Schedule a showing or ask anything: [CTA LINK]",
    ctaLabel: "Ask About This Listing",
    ctaUrl: "https://askmagicmike.com/ask?chip=tour_home&utm_source=campaign&utm_medium=preset&utm_campaign=listing-[MLSID]",
    placement: "Facebook post, Instagram, email to buyer list, property sign rider",
    complianceNote:
      "Replace all [PLACEHOLDER] values before publishing. Verify MLS ID, pricing, and property details are current. Do not publish inaccurate listing data. Equal Housing Opportunity.",
  },

  // ── 6. Open House Capture ─────────────────────────────────────────────────
  {
    id: "open_house",
    label: "Open House Capture",
    category: "capture",
    badge: "Event",
    badgeColor: "border-blue-400/25 bg-blue-400/[0.05] text-blue-300",
    description: "Drive attendance and capture questions before and after an open house.",
    headline: "Open house this [DAY] — bring your questions. Mike will be there.",
    shortCaption:
      "Open house: [ADDRESS], Wilson NC · [DATE] · [TIME]. Mike Eatmon or the Our Town Properties team on site. Can't make it? Ask Mike anything at askmagicmike.com.",
    longCaption:
      "Join us at [ADDRESS] in Wilson, NC.\n\n[DATE] · [START TIME] – [END TIME]\n\nMike Eatmon or the Our Town Properties team will be on site. Come with questions — about this property, the neighborhood, or the Wilson market in general.\n\nCan't make it? Ask Mike anything online — he reviews every question personally.\n\n→ askmagicmike.com\n\n[ADDRESS] · $[PRICE] · [BEDS]bd / [BATHS]ba",
    ctaLabel: "Ask Mike About This Property",
    ctaUrl: "https://askmagicmike.com/ask?chip=tour_home&utm_source=campaign&utm_medium=preset&utm_campaign=open-house",
    placement: "Facebook event, neighborhood social, email invite, flyer QR code",
    complianceNote:
      "Replace all [PLACEHOLDER] values. Do not publish inaccurate open house times. Equal Housing Opportunity.",
  },

  // ── 7. QR Flyer ──────────────────────────────────────────────────────────
  {
    id: "qr_flyer",
    label: "QR Flyer",
    category: "print",
    badge: "Print",
    badgeColor: "border-purple-400/25 bg-purple-400/[0.05] text-purple-300",
    description: "Optimized copy for print flyers with QR code to Ask Mike.",
    headline: "ASK MAGIC MIKE",
    shortCaption:
      "Mike Eatmon · Our Town Properties · Wilson, NC\n2,500+ closed deals · Eastern NC specialist\n\nAsk him anything: askmagicmike.com\n[QR CODE]\n\nOr call: (252) 341-0645",
    longCaption:
      "WHAT'S YOUR HOME WORTH?\n\nMike Eatmon has closed 2,500+ deals in Wilson, NC. He reviews every question personally and follows up with a real answer — no call centers, no bots.\n\nScan the QR code or visit:\naskmagicmike.com\n\nMike Eatmon · Broker\nOur Town Properties, Inc.\n(252) 341-0645\n\nNot an appraisal. Broker-reviewed guidance only. Equal Housing Opportunity.",
    ctaLabel: "Encode This URL for QR Code",
    ctaUrl: "https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=flyer&utm_content=sign-rider",
    placement: "Door hangers, sign riders, EDDM mailers, open house sign-in sheets",
    complianceNote:
      "Export QR as SVG for print. Use error correction level H. Test scan before full print run. Do not shorten the URL — UTM params must be preserved. Not an appraisal — include disclaimer on final print.",
  },

  // ── 8. Email Blast ────────────────────────────────────────────────────────
  {
    id: "email_blast",
    label: "Email Blast",
    category: "email",
    badge: "Email",
    badgeColor: "border-amber-400/25 bg-amber-400/[0.05] text-amber-300",
    description: "Full email blast for newsletter or database re-engagement.",
    headline: "The Wilson market changed. Here's what that means for you.",
    shortCaption:
      "Wilson NC real estate has shifted. Mike Eatmon breaks it down — ask him directly at askmagicmike.com.",
    longCaption:
      "Hi [First Name],\n\nThe Wilson market has shifted significantly in the last 12–18 months — and most homeowners don't know whether that's good or bad for their situation.\n\nMike Eatmon at Our Town Properties does. He's closed 2,500+ deals in Wilson since 1993. He sees what's actually selling, what isn't, and why.\n\nIf you own property in Wilson or Eastern NC and want a real read on what the market means for you — ask Mike directly. He reviews every question personally and follows up with a real answer.\n\nNo sales pitch. No obligation. Just a straight answer from someone who knows Wilson real estate better than anyone.\n\n→ Ask Mike: [LINK]\n\nMike Eatmon\nBroker, Our Town Properties\nWilson, NC · (252) 341-0645",
    emailSubject: "The Wilson market shifted — here's what that means for you",
    emailBody:
      "Hi [First Name],\n\nThe Wilson real estate market has shifted significantly — and most homeowners don't know whether that's good or bad for their specific situation.\n\nMike Eatmon at Our Town Properties does. He's closed 2,500+ deals in Wilson since 1993. He reads every question personally and follows up with a real answer.\n\nAsk Mike what the current market means for your home or buying situation:\n→ [LINK]\n\nNo obligation. No sales pressure. A straight answer from someone who knows this market.\n\nMike Eatmon\nBroker, Our Town Properties · Wilson, NC",
    ctaLabel: "Ask Mike About the Wilson Market",
    ctaUrl: "https://askmagicmike.com/ask?utm_source=email&utm_medium=newsletter&utm_campaign=market-update",
    placement: "Monthly newsletter, database re-engagement, post-close follow-up",
    complianceNote:
      "CAN-SPAM compliant: include physical address and unsubscribe link in all email blasts. Replace [First Name] with actual merge tag. Do not claim specific market statistics without a citation.",
  },

  // ── 9. Facebook Post ──────────────────────────────────────────────────────
  {
    id: "facebook_post",
    label: "Facebook Post",
    category: "awareness",
    badge: "Facebook",
    badgeColor: "border-blue-500/25 bg-blue-500/[0.05] text-blue-300",
    description: "Optimized Facebook post with hook, story, and call to action.",
    headline: "Most Wilson homeowners have no idea what their home is worth right now.",
    shortCaption:
      "The Wilson market has shifted. If you own a home and you're curious what it could sell for — ask Mike Eatmon directly. He's been doing this in Wilson for 30+ years. askmagicmike.com",
    longCaption:
      "Most Wilson homeowners have no idea what their home is worth right now.\n\nAnd honestly — neither do most online tools. They're using stale county records and regional averages. They don't know about the Fike school zone premium. They don't know what sold three blocks from you last week.\n\nMike Eatmon does.\n\nHe's been the go-to broker in Wilson, NC since 1993. Over 2,500 homes closed. Every market cycle. He reviews every question you send him personally — no call centers, no bots.\n\nGo to askmagicmike.com. Ask him what your home is worth right now. It takes 60 seconds. There's no obligation.\n\n→ askmagicmike.com\n\n#WilsonNC #EasternNC #HomeValue #OurTownProperties #AskMagicMike",
    ctaLabel: "Copy Facebook Post",
    ctaUrl: "https://askmagicmike.com/?utm_source=facebook&utm_medium=social&utm_campaign=home-value",
    placement: "Facebook personal or business page. No paid boost needed — organic reach is strong on local real estate content.",
    complianceNote:
      "Do not guarantee a specific home value. Do not claim MLS data access without authorization. Link must use askmagicmike.com domain for Facebook link preview to load correctly.",
    hashtags: "#WilsonNC #EasternNC #HomeValue #OurTownProperties #AskMagicMike #RealEstate",
  },

  // ── 10. Instagram Caption ─────────────────────────────────────────────────
  {
    id: "instagram_caption",
    label: "Instagram Caption",
    category: "awareness",
    badge: "Instagram",
    badgeColor: "border-pink-400/25 bg-pink-400/[0.05] text-pink-300",
    description: "Instagram caption with strong hook, punchy body, and bio link CTA.",
    headline: "You've lived there for years. Wouldn't it be nice to know what it's worth?",
    shortCaption:
      "You've lived there for years. Wouldn't it be nice to know what it's worth?\n\nAsk Mike Eatmon — link in bio.\n\n#WilsonNC #HomeValue #AskMagicMike",
    longCaption:
      "You've lived there for years. Wouldn't it be nice to actually know what it's worth?\n\nNot an algorithm. Not a Zillow estimate. A real answer from the broker who knows Wilson real estate better than anyone.\n\nMike Eatmon · Our Town Properties · Wilson, NC\n2,500+ deals closed · 30+ years\n\nLink in bio → askmagicmike.com\n\n#WilsonNC #EasternNC #HomeValue #RealEstate #AskMagicMike #OurTownProperties #WilsonNCrealEstate #NCRealEstate",
    ctaLabel: "Copy Instagram Caption",
    ctaUrl: "https://askmagicmike.com/?utm_source=instagram&utm_medium=bio&utm_campaign=home-value",
    placement: "Instagram feed post caption. Add property photo or Mike headshot as the image. Link in bio must point to askmagicmike.com.",
    complianceNote:
      "Do not imply same-day valuations or certified appraisal services. Hashtag mix: 3–5 local + 3–5 category. Instagram bio link: update to this UTM URL for tracking.",
    hashtags: "#WilsonNC #EasternNC #HomeValue #RealEstate #AskMagicMike #OurTownProperties #WilsonNCrealEstate #NCRealEstate",
  },

  // ── 11. Short Video Script ────────────────────────────────────────────────
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
      "[HOOK — 0:00–0:05]\n\"If you own a home in Wilson and you've been wondering what it's worth — this is for you.\"\n\n[PROBLEM — 0:05–0:15]\n\"Most online estimates are off by 10 to 20 percent. They don't know about the Fike school zone. They don't know what actually sold on your street.\"\n\n[SOLUTION — 0:15–0:35]\n\"Ask Magic Mike is different. You type your question — Mike Eatmon at Our Town Properties reads it personally and follows up with a real answer. He's been doing this in Wilson for over 30 years and has closed more than 2,500 deals here.\"\n\n[CTA — 0:35–0:45]\n\"Go to askmagicmike.com. Ask him anything. Takes about 60 seconds. No obligation.\"\n\n[CLOSE — optional]\n\"Mike Eatmon · Our Town Properties · Wilson, NC\"",
    ctaLabel: "Copy Video Script",
    ctaUrl: "https://askmagicmike.com/?utm_source=video&utm_medium=social&utm_campaign=home-value",
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
