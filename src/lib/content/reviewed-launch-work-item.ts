import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import links from "../../../public/launch-20261013/links.json";
import currentKit from "../../../public/launch-20261013/share-manifest-20261021.json";
import { resolveOwnedDemandPlacement } from "../../../app/lib/growth/owned-demand";
import { scanForFairHousingIssues } from "../compliance/fair-housing";

/** Reuse the owner's existing approved low-risk launch kit, not AI permission
 * inferred from a public page. Fixed paths only. This never publishes/sends or
 * manufactures a permalink, consumer segment, rights grant or tracking tag. */
export function reviewedLaunchWorkItem(kind: "seller" | "buyer", channel: "facebook" | "instagram") {
  const posts = readFileSync("public/launch-20261013/posts.md", "utf8");
  const prefix = kind === "seller" ? "Seller 1: " : "Buyer 1: ";
  const line = posts.split("\n").find(row => row.startsWith(prefix));
  if (!line) throw new Error("approved_launch_template_missing");
  const originalLink = links[kind].facebook;
  if (!line.endsWith(originalLink)) throw new Error("approved_launch_link_changed");
  const caption = line.slice(prefix.length, -originalLink.length).trim();
  const link = links[kind][channel];
  const destination = new URL(link);
  if (destination.origin !== "https://www.askmagicmike.com" || destination.pathname !== (kind === "seller" ? "/home-value" : "/buy")
    || !scanForFairHousingIssues(caption).passes) throw new Error("launch_template_review_required");
  const asset = `public/launch-20261013/${kind}-${channel === "instagram" ? "story" : "feed"}.jpg`;
  const assetHash = createHash("sha256").update(readFileSync(asset)).digest("hex");
  return { version: "amm.launch-work-item.v1", status: "DRAFT_REVIEW_REQUIRED_NOT_PUBLISHED", kind, channel, caption, link,
    asset, assetHash, source: "public/launch-20261013/posts.md", sourceHash: createHash("sha256").update(posts).digest("hex"),
    rights: "Existing owner-approved brokerage launch kit only; no new likeness, listing, voice or audience rights inferred",
    linkInstruction: channel === "instagram" ? "Use the existing Story link sticker or profile destination; a caption is not a clickable-link proof." : "Use the matching caption, image and existing tagged link.",
    publication: { permalink: null, publishedAt: null }, customerDataIncluded: false, sends: 0 };
}

/** Fourteen staged work items are an export, not a scheduler or permission to
 * publish fourteen posts. The master's separate publication limits still apply. */
export function reviewedFortnightExport() {
  return Array.from({ length: 14 }, (_, index) => ({ day: index + 1,
    ...reviewedLaunchWorkItem(index % 2 ? "buyer" : "seller", index % 3 === 0 ? "instagram" : "facebook") }));
}

export const CURRENT_LAUNCH_TEMPLATE = "amm.share-kit.20261021.v1";
export type LaunchOffer = "homeValue" | "buyer" | "compare";
const currentOffers = {
  homeValue: { label: "Home Value", placement: "seller_review", asset: "seller", audience: "People considering a home value review" },
  buyer: { label: "Buying Help", placement: "buyer_match", asset: "buyer", audience: "Buyers with a specific property or a preferred search area" },
  compare: { label: "Compare Selling Options", placement: "compare_selling_options", asset: "compare-selling-options", audience: "Owners comparing listing and as-is selling options" },
} as const;

/** Explicit opt-in to the accepted three-offer kit. v1 jobs and exports above
 * remain unchanged. No customer input, remote fetch, approval or publication. */
export function currentLaunchWorkItem(offer: LaunchOffer, channel: "facebook" | "instagram") {
  const definition = currentOffers[offer];
  if (!definition || !["facebook", "instagram"].includes(channel)) throw Error("launch_template_review_required");
  const template = currentKit.offers.find(item => item.offer === definition.label);
  const placement = resolveOwnedDemandPlacement(channel, definition.placement);
  const link = template?.registeredLinks.find(item => item.channel === channel)?.url;
  const filename = `${definition.asset}-${channel === "instagram" ? "story" : "feed"}${offer === "compare" ? "-20261021" : ""}.jpg`;
  const image = currentKit.images.find(item => item.file === filename && item.offer === definition.label);
  if (!template || !placement || link !== placement.trackedUrl || !image || !scanForFairHousingIssues(template.caption).passes)
    throw Error("launch_template_review_required");
  const asset = `public/launch-20261013/${filename}`;
  const assetHash = createHash("sha256").update(readFileSync(asset)).digest("hex");
  if (assetHash !== image.sha256) throw Error("launch_asset_changed_review_required");
  return {
    version: CURRENT_LAUNCH_TEMPLATE, status: "DRAFT_REVIEW_REQUIRED_NOT_PUBLISHED" as const,
    offer, channel, audience: definition.audience, title: definition.label, caption: template.caption, alt: template.alt,
    cleanUrl: template.clean, link: placement.trackedUrl, asset, assetHash,
    assetUrl: `/launch-20261013/${filename}`,
    source: "public/launch-20261013/share-manifest-20261021.json",
    sourceHash: createHash("sha256").update(readFileSync("public/launch-20261013/share-manifest-20261021.json")).digest("hex"),
    sourceFreshness: "Kit version 20261021; current business/reviewer confirmation not recorded. No market, listing or property-data freshness is established.",
    rights: "Existing brokerage kit only; no new source, likeness, listing or audience rights inferred.",
    linkInstruction: channel === "instagram" ? "Use a verified Story link sticker or profile destination; a caption URL is not clickable-link proof." : "Use the matching image, caption and registered link after review and duplicate-publication checks.",
    reviewer: null, proposedAt: null, publication: { status: "NOT_PUBLISHED" as const, permalink: null, publishedAt: null, scheduledAt: null },
    customerDataIncluded: false, sends: 0, costUsd: 0,
  };
}

// Review references only, NOT new entries in the approved retrieval registry.
// No third-party passage is copied, fetched on render, ingested or promoted.
const ncReferences = {
  agency: { title: "NCREC · Working with Real Estate Agents Disclosure", url: "https://bulletins.ncrec.gov/working-with-real-estate-agents-disclosure/", publisher: "North Carolina Real Estate Commission", publicationDate: "May 2024", geography: "North Carolina", freshness: "Historical reference; current applicability requires broker verification" },
  preparation: { title: "NCHFA · Home Buying 101", url: "https://www.nchfa.com/home-buying-101", publisher: "North Carolina Housing Finance Agency", publicationDate: "Not recorded", geography: "North Carolina", freshness: "Current program terms, eligibility and reuse rights not established" },
} as const;
type QueueBrief = { offer: LaunchOffer; purpose: "offer" | "education" | "reputation" | "referral"; title?: string; caption?: string; reference?: keyof typeof ncReferences };
const fortnight: readonly QueueBrief[] = [
  { offer: "homeValue", purpose: "offer" }, { offer: "buyer", purpose: "offer" }, { offer: "compare", purpose: "offer" },
  { offer: "buyer", purpose: "education", reference: "agency", title: "NC buyer questions for a broker", caption: "Buying in North Carolina? Ask a broker to explain representation and the agreements relevant to your situation. Request local buying help with your questions. This draft is not legal advice or an agency agreement." },
  { offer: "homeValue", purpose: "offer" }, { offer: "compare", purpose: "offer" }, { offer: "buyer", purpose: "offer" },
  { offer: "buyer", purpose: "education", reference: "preparation", title: "Prepare for a buying conversation", caption: "Planning to buy in North Carolina? Bring your questions about preparation, financing and what still needs confirmation. Request local buying help. A request is not financing approval or a confirmed appointment." },
  { offer: "compare", purpose: "offer" },
  { offer: "homeValue", purpose: "reputation", title: "Neutral feedback invitation — genuine customers only", caption: "If you have worked with Our Town Properties, you may share honest feedback about your experience. Positive, mixed and critical feedback are welcome. No incentive or favorable rating is requested. Please do not include private transaction or contact details." },
  { offer: "compare", purpose: "education", reference: "agency", title: "NC seller questions before choosing a path", caption: "Selling in North Carolina? Write down your priorities and questions about representation before comparing listing and as-is paths. Request a property review. No offer, valuation or closing date is promised." },
  { offer: "buyer", purpose: "offer" },
  { offer: "homeValue", purpose: "referral", title: "Share a useful starting point", caption: "Know someone considering a move? You can share this home value review link with them. Let them choose whether to request help directly; please do not send us another person's private contact or property details without permission." },
  { offer: "compare", purpose: "offer" },
];

/** Successor to the historical fortnight export, not an installed schedule.
 * Relative days deliberately have no invented reviewer, date or account. */
export function currentFortnightReviewQueue() {
  return fortnight.map((brief, index) => {
    const work = currentLaunchWorkItem(brief.offer, index % 3 === 0 ? "instagram" : "facebook");
    const reference = brief.reference ? ncReferences[brief.reference] : null;
    return {
      ...work, queueVersion: "amm.fortnight-review.v2", day: index + 1, purpose: brief.purpose,
      title: brief.title ?? work.title, caption: brief.caption ?? work.caption,
      audience: brief.purpose === "reputation" ? "Genuine past customers, without sentiment filtering" : work.audience,
      substantiation: reference ? "Original question-oriented draft only; no legal rule, program benefit or eligibility claim is approved." : brief.purpose === "offer" ? "Existing versioned offer invitation; no guaranteed valuation, availability, financing, offer or appointment." : "Voluntary neutral invitation, not a testimonial, consumer consent or permission to contact.",
      reference: reference ? { ...reference, state: "REFERENCE_ONLY_NOT_REGISTERED", rights: "Display/retrieval/marketing/embedding/training permission not established; broker/source review required", reviewedAt: null, reviewer: null } : null,
      holds: ["Human copy/asset/account review and duplicate-post check required; existing October 15/22 posts remain unchanged.",
        ...(reference ? ["NC source rights, freshness and broker review required before publication or retrieval."] : []),
        ...(brief.purpose === "reputation" ? ["Verify genuine customer relationship, approved feedback destination and channel permission. The intake link is not a review/rating endpoint."] : []),
        ...(brief.purpose === "referral" ? ["No third-party contact upload or automatic outreach."] : [])],
    };
  });
}

export function formatFortnightReviewItem(item: ReturnType<typeof currentFortnightReviewQueue>[number]) {
  return [`REVIEW DRAFT — day ${item.day}; NOT SCHEDULED / NOT PUBLISHED`, item.title,
    `Audience: ${item.audience}`, item.caption, `Destination: ${item.link}`, `Image: ${item.assetUrl}`, `Alt: ${item.alt}`,
    `Source freshness: ${item.reference?.freshness ?? item.sourceFreshness}`,
    ...(item.reference ? [`Reference only: ${item.reference.url}`, item.reference.rights] : []),
    `Reviewer / proposed time: not recorded`, ...item.holds, item.linkInstruction].join("\n\n");
}
