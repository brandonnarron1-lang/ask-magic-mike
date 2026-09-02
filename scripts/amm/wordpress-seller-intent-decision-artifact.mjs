#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateWordPressSellerIntentDecisionArtifact } from "./wordpress-seller-intent-decision-artifact-lib.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
}

async function main() {
  const artifactPath = argumentValue("--artifact");
  const contractPath = argumentValue("--contract");
  const evidencePath = argumentValue("--evidence");
  if (!artifactPath || !evidencePath) {
    throw new Error(
      "usage: node scripts/amm/wordpress-seller-intent-decision-artifact.mjs --artifact <decision.json> --evidence <seller-evidence-packet.json> [--contract <page-cutover-contract.json>]",
    );
  }
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const contract = contractPath
    ? JSON.parse(await readFile(contractPath, "utf8"))
    : {};
  const result = validateWordPressSellerIntentDecisionArtifact(
    artifact,
    contract,
    evidence,
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ready) process.exitCode = 2;
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
