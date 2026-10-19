import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import links from "../../../public/launch-20261013/links.json";
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
