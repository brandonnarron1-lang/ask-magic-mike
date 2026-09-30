#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateWordPressFormCutover } from "./wordpress-form-cutover-lib.mjs";

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const snapshotPath = resolve(process.cwd(), argumentValue(
  "--snapshot",
  "docs/phase9/form7-live-snapshot-2026-09-01.json",
));
const contractPath = resolve(process.cwd(), argumentValue(
  "--contract",
  "wordpress/ask-magic-mike-canonical-bridge/form-contracts/form-7-property-alert-v1.json",
));
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const report = evaluateWordPressFormCutover(snapshot, contract);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== "GO" && !process.argv.includes("--allow-hold")) {
  process.exitCode = 2;
}
