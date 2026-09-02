#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { prepareWordPressPageSourceCutover } from "./wordpress-page-source-cutover-lib.mjs";

const page3631CutoverContract = {
  schemaVersion: "amm.wordpress_page_source_cutover_contract.v1",
  placementKey: "wordpress_we_buy_homes",
  pageId: 3631,
  sourceUrl: "https://www.ourtownproperties.com/we-buy-homes/",
  sourceLength: 2480,
  sourceSha256:
    "2c6c4a1b75afd133b92840d0f846f2a82f059b25f73aa0b2914d97d02ab1b8df",
  currentShortcode:
    '[ask_magic_mike_cta source="seller_page_cta" headline="Thinking about selling but not sure where to start?" text="Ask Magic Mike for local guidance before you make your next move." button="Get Local Guidance"]',
  proposedShortcode:
    '[ask_magic_mike_cta route="/sell" source="seller_page_cta" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_we_buy_homes" headline="Thinking about selling but not sure where to start?" text="Ask Magic Mike for local guidance before you make your next move." button="Get Local Guidance"]',
  proposedSourceLength: 2624,
  proposedSourceSha256:
    "1919ec017662efd5dfa04e81bf789f72ec478c16cbae7d0c0e59e0f7899c08e2",
  preservedLiterals: [
    'headline="Thinking about selling but not sure where to start?"',
    'text="Ask Magic Mike for local guidance before you make your next move."',
    'button="Get Local Guidance"',
  ],
  requiredConnectorVersion: "1.1.0",
  approvalGate: "APPROVE PHASE 9 WE BUY HOMES CTA WORDPRESS PUBLICATION",
  requiresPostmetaBackup: true,
  requiresRevision: true,
  requiresRevisionSourceHash: true,
  requiresSellerIntentDecision: true,
  requiredCanonicalSourcePage:
    "https://www.ourtownproperties.com/we-buy-homes/",
  requiredCaptureOwner: "ask_magic_mike",
  requiredPlacementKey: "wordpress_we_buy_homes",
  requiresBicCopyReview: true,
};
Object.freeze(page3631CutoverContract);

export const WORDPRESS_PAGE3631_CUTOVER_CONTRACT = page3631CutoverContract;
export const WORDPRESS_PAGE3631_PUBLICATION_GATE =
  WORDPRESS_PAGE3631_CUTOVER_CONTRACT.approvalGate;
export const WORDPRESS_PAGE3631_CURRENT_SHORTCODE =
  WORDPRESS_PAGE3631_CUTOVER_CONTRACT.currentShortcode;
export const WORDPRESS_PAGE3631_PROPOSED_SHORTCODE =
  WORDPRESS_PAGE3631_CUTOVER_CONTRACT.proposedShortcode;

export function prepareWordPressPage3631Cutover(source, options = {}) {
  return prepareWordPressPageSourceCutover(
    source,
    options,
    WORDPRESS_PAGE3631_CUTOVER_CONTRACT,
  );
}

function argumentValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

async function main() {
  const sourcePath = argumentValue("--source");
  if (!sourcePath) {
    throw new Error(
      "usage: node scripts/amm/wordpress-page3631-cutover-readiness.mjs --source <page-source.txt> [--connector-version 1.1.0] [--postmeta-sha256 <digest>] [--revision-id <id>] [--revision-source-sha256 <digest>] [--seller-intent-decision-sha256 <digest>] [--canonical-source-page <url>] [--capture-owner ask_magic_mike] [--duplicate-page-disposition <decision>] [--placement-key wordpress_we_buy_homes] [--bic-copy-review-sha256 <digest>]",
    );
  }
  const source = await readFile(sourcePath, "utf8");
  const result = prepareWordPressPage3631Cutover(source, {
    connectorVersion: argumentValue("--connector-version"),
    postmetaBackupSha256: argumentValue("--postmeta-sha256"),
    revisionId: argumentValue("--revision-id"),
    revisionSourceSha256: argumentValue("--revision-source-sha256"),
    approvedSellerIntentDecisionSha256: argumentValue(
      "--seller-intent-decision-sha256",
    ),
    approvedCanonicalSourcePage: argumentValue("--canonical-source-page"),
    approvedCaptureOwner: argumentValue("--capture-owner"),
    approvedDuplicatePageDisposition: argumentValue(
      "--duplicate-page-disposition",
    ),
    approvedPlacementKey: argumentValue("--placement-key"),
    bicCopyReviewSha256: argumentValue("--bic-copy-review-sha256"),
  });
  process.stdout.write(`${JSON.stringify(result.manifest, null, 2)}\n`);
  if (!["ready_for_approval", "already_cutover"].includes(result.manifest.status)) {
    process.exitCode = 2;
  }
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
