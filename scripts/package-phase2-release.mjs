#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve, relative } from "node:path";

const root = resolve(".");
const releaseDir = resolve(root, "output/release");
const zipName = "Ask_Magic_Mike_Phase2_Operational_Completion_Package_2026-08-14.zip";
const zipPath = resolve(releaseDir, zipName);
const manifestPath = resolve(releaseDir, "PHASE2_PACKAGE_MANIFEST.json");
const sumsPath = resolve(releaseDir, "SHA256SUMS.txt");
const zipSumPath = `${zipPath}.sha256`;

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

await mkdir(releaseDir, { recursive: true });

const changed = run("git", ["diff", "--name-only", "HEAD"])
  .split("\n")
  .filter(Boolean);
const untracked = run("git", ["ls-files", "--others", "--exclude-standard"])
  .split("\n")
  .filter(Boolean);

const excludedPrefixes = [
  ".next/",
  ".amm-run/",
  "artifacts/",
  "node_modules/",
  "output/release/",
  "playwright-report/",
  "test-results/",
];

const files = [...new Set([...changed, ...untracked])]
  .filter((path) => !excludedPrefixes.some((prefix) => path.startsWith(prefix)))
  .sort();

const entries = [];
for (const path of files) {
  const content = await readFile(resolve(root, path));
  entries.push({ path, bytes: content.length, sha256: sha256(content) });
}

const manifest = {
  schema_version: 1,
  created_at: new Date().toISOString(),
  repository: "https://github.com/brandonnarron1-lang/ask-magic-mike.git",
  branch: run("git", ["branch", "--show-current"]).trim(),
  base_commit: run("git", ["rev-parse", "HEAD"]).trim(),
  production_mutations_included: false,
  safety_notes: [
    "No production database migration was applied.",
    "Lead Center RBAC remains disabled unless LEAD_CENTER_RBAC_ENABLED is explicitly enabled.",
    "No WordPress form beyond canonical Form 3 was activated.",
    "No lead, email, Web Push, SMS, consumer message, paid media, or DNS change was created by this package.",
  ],
  files: entries,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const manifestRelative = relative(root, manifestPath);
const manifestContent = await readFile(manifestPath);
const checksumEntries = [
  ...entries,
  { path: manifestRelative, sha256: sha256(manifestContent) },
];
await writeFile(
  sumsPath,
  `${checksumEntries.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`,
);

await rm(zipPath, { force: true });
const packageFiles = [...files, manifestRelative, relative(root, sumsPath)];
run("zip", ["-q", zipPath, ...packageFiles]);

const zipHash = sha256(await readFile(zipPath));
await writeFile(zipSumPath, `${zipHash}  ${zipName}\n`);

console.log(JSON.stringify({ zip: zipPath, sha256: zipHash, files: packageFiles.length }, null, 2));
