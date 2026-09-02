#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { prepareWordPressPageSourceCutover } from "./wordpress-page-source-cutover-lib.mjs";

const page3952CutoverContract = {
  schemaVersion: "amm.wordpress_page_source_cutover_contract.v1",
  placementKey: "wordpress_home_value",
  pageId: 3952,
  sourceUrl:
    "https://www.ourtownproperties.com/how-much-is-your-home-worth/",
  sourceLength: 411,
  sourceSha256:
    "6710a4457945d1aba0308b07def30dfa05a8935121cd02a6baa3c66611ec2bdf",
  currentShortcode:
    '[ask_magic_mike_cta source="home_value_page" button_text="Ask Magic Mike"]',
  proposedShortcode:
    '[ask_magic_mike_cta route="/home-value" source="home_value_page" utm_source="ourtownproperties" utm_medium="owned_media" utm_campaign="amm_owned_demand_2026" utm_content="wordpress_home_value_page" button_text="Ask Magic Mike"]',
  proposedSourceLength: 564,
  proposedSourceSha256:
    "ef9f4f85f3b531644010e4b5e46121a6e12db3807c1f8c928a1945bf12bc266e",
  preservedLiterals: [
    'source="home_value_page"',
    'button_text="Ask Magic Mike"',
  ],
  requiredConnectorVersion: "1.1.0",
  approvalGate: "APPROVE PHASE 9 HOME VALUE CTA WORDPRESS PUBLICATION",
  requiresPostmetaBackup: true,
  requiresRevision: true,
  requiresRevisionSourceHash: true,
};
Object.freeze(page3952CutoverContract);

export const WORDPRESS_PAGE3952_CUTOVER_CONTRACT = page3952CutoverContract;
export const WORDPRESS_PAGE3952_PUBLICATION_GATE =
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT.approvalGate;
export const WORDPRESS_PAGE3952_CURRENT_SHORTCODE =
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT.currentShortcode;
export const WORDPRESS_PAGE3952_PROPOSED_SHORTCODE =
  WORDPRESS_PAGE3952_CUTOVER_CONTRACT.proposedShortcode;

export function prepareWordPressPage3952Cutover(
  source,
  options = {},
  contract = WORDPRESS_PAGE3952_CUTOVER_CONTRACT,
) {
  return prepareWordPressPageSourceCutover(
    source,
    options,
    contract,
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
      "usage: node scripts/amm/wordpress-page3952-cutover-readiness.mjs --source <page-source.txt> [--connector-version 1.1.0] [--postmeta-sha256 <digest>] [--revision-id <id>] [--revision-source-sha256 <digest>]",
    );
  }
  const source = await readFile(sourcePath, "utf8");
  const result = prepareWordPressPage3952Cutover(source, {
    connectorVersion: argumentValue("--connector-version"),
    postmetaBackupSha256: argumentValue("--postmeta-sha256"),
    revisionId: argumentValue("--revision-id"),
    revisionSourceSha256: argumentValue("--revision-source-sha256"),
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
